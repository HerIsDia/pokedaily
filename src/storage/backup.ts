import { localDay } from '../core/dates';
import { STATE_SCHEMA_VERSION, type GameState } from '../core/game-state';
import { parseState, type StateLookup } from './validate';

/**
 * Export / import de la collection : un fichier JSON que la joueuse garde où elle veut
 * (elle seule le voit : rien ne part sur Internet).
 *
 * Contrairement à la LECTURE de la base (indulgente : on répare ce qu'on peut), l'IMPORT est
 * STRICT : au moindre problème le fichier est refusé en entier et RIEN n'est modifié. Mieux vaut
 * un refus clair qu'une collection à moitié importée.
 */

export const BACKUP_APP = 'pokedaily';
/** Un fichier de plus de 20 Mo n'est pas une sauvegarde Pokédaily (une vie entière fait < 5 Mo). */
export const MAX_BACKUP_BYTES = 20 * 1024 * 1024;

export interface BackupFile {
  app: typeof BACKUP_APP;
  schemaVersion: number;
  /** Date d'export, ISO 8601 (information seulement). */
  exportedAt: string;
  data: {
    entries: GameState['entries'][string][];
    lastDrawDay: GameState['lastDrawDay'];
    pity: GameState['pity'];
    tickets: number;
    boxes: GameState['boxes'];
    caught: number[];
    caughtShiny: number[];
    rouletteBonusClaimed: boolean;
    monthlyTeam: GameState['monthlyTeam'];
  };
}

/** Le contenu du fichier d'export, et le nom sous lequel le proposer. */
export function buildBackup(
  state: GameState,
  now: Date = new Date(),
): { filename: string; json: string } {
  const file: BackupFile = {
    app: BACKUP_APP,
    schemaVersion: STATE_SCHEMA_VERSION,
    exportedAt: now.toISOString(),
    data: {
      entries: Object.values(state.entries).sort((a, b) => (a.day < b.day ? -1 : 1)),
      lastDrawDay: state.lastDrawDay,
      pity: state.pity,
      tickets: state.tickets,
      boxes: state.boxes,
      caught: state.caught,
      caughtShiny: state.caughtShiny,
      rouletteBonusClaimed: state.rouletteBonusClaimed,
      monthlyTeam: state.monthlyTeam,
    },
  };
  return { filename: `pokedaily-${localDay(now)}.json`, json: JSON.stringify(file, null, 2) };
}

export type BackupResult =
  { ok: true; state: GameState } | { ok: false; reason: BackupFailure; details: string[] };

export type BackupFailure =
  | 'too_big' // fichier énorme
  | 'not_json' // pas du JSON
  | 'not_pokedaily' // du JSON, mais pas une sauvegarde Pokédaily
  | 'too_new' // faite par une version plus récente
  | 'damaged'; // contenu invalide (détails dans `details`)

/** Lit et valide un fichier d'import. N'a aucun effet de bord. */
export function parseBackup(text: string, lookup: StateLookup): BackupResult {
  if (text.length > MAX_BACKUP_BYTES) return { ok: false, reason: 'too_big', details: [] };

  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    return { ok: false, reason: 'not_json', details: [] };
  }
  if (
    typeof json !== 'object' ||
    json === null ||
    (json as { app?: unknown }).app !== BACKUP_APP ||
    typeof (json as { data?: unknown }).data !== 'object' ||
    (json as { data?: unknown }).data === null
  ) {
    return { ok: false, reason: 'not_pokedaily', details: [] };
  }
  const file = json as { schemaVersion?: unknown; data: Record<string, unknown> };
  if (typeof file.schemaVersion !== 'number' || !Number.isInteger(file.schemaVersion)) {
    return { ok: false, reason: 'not_pokedaily', details: [] };
  }
  if (file.schemaVersion > STATE_SCHEMA_VERSION) {
    return { ok: false, reason: 'too_new', details: [] };
  }

  const { state, problems } = parseState(file.data, lookup);
  if (problems.length > 0) return { ok: false, reason: 'damaged', details: problems };
  return { ok: true, state };
}
