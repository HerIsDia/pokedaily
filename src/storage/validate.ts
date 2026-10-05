import { ROULETTE_BOX_SIZE, LEVEL_CAP, LEVEL_MIN } from '../core/constants';
import { isValidDay, type Day } from '../core/dates';
import {
  STATE_SCHEMA_VERSION,
  emptyGameState,
  type GameState,
  type MonthlyTeam,
} from '../core/game-state';
import type { SpecialBox } from '../core/boxes';
import type { PokemonEntry } from '../core/model';
import { clampName } from '../core/names';

/**
 * Lit un état « brut » (venu d'IndexedDB ou d'un fichier d'import) et en fait un `GameState`
 * SÛR. Les données ne sont jamais crues sur parole : une base abîmée ou un fichier modifié à la
 * main ne doit pas pouvoir faire planter l'application.
 *
 * Renvoie l'état nettoyé ET la liste des problèmes rencontrés (en français) :
 *  - à la lecture de la base : on supprime ce qui est invalide et on prévient (`warnings`) ;
 *  - à l'import d'un fichier : l'appelant REFUSE le fichier s'il y a le moindre problème.
 */

/** Ce que la validation a besoin de savoir sur les données du jeu. */
export interface StateLookup {
  hasId(id: number): boolean;
  hasNature(key: string): boolean;
}

export interface RawState {
  entries?: unknown;
  lastDrawDay?: unknown;
  pity?: unknown;
  tickets?: unknown;
  boxes?: unknown;
  caught?: unknown;
  caughtShiny?: unknown;
  rouletteBonusClaimed?: unknown;
  rouletteBoost?: unknown;
  monthlyTeam?: unknown;
}

export const MAX_ENTRIES = 40_000; // ≈ 100 ans de Pokémon du jour
const MAX_IDS = 5_000;
const MAX_TICKETS = 1_000_000;

const isObject = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v);
const isInt = (v: unknown): v is number => typeof v === 'number' && Number.isInteger(v);
const isMonth = (v: string): boolean => /^\d{4}-(0[1-9]|1[0-2])$/.test(v);

/** Valide UNE entrée ; renvoie l'entrée nettoyée ou le motif du refus. */
export function parseEntry(
  raw: unknown,
  lookup: StateLookup,
): { entry: PokemonEntry } | { problem: string } {
  if (!isObject(raw)) return { problem: 'entrée illisible' };
  const { id, natureKey, level, isShiny, day, rename } = raw;
  if (!isInt(id) || !lookup.hasId(id)) return { problem: `Pokémon #${String(id)} inconnu` };
  if (typeof natureKey !== 'string' || !lookup.hasNature(natureKey))
    return { problem: `nature « ${String(natureKey)} » inconnue` };
  if (!isInt(level) || level < LEVEL_MIN || level > LEVEL_CAP)
    return { problem: `niveau ${String(level)} impossible` };
  if (typeof isShiny !== 'boolean') return { problem: '« shiny » doit valoir vrai ou faux' };
  if (typeof day !== 'string' || !isValidDay(day))
    return { problem: `jour « ${String(day)} » invalide` };
  if (rename !== undefined && typeof rename !== 'string') return { problem: 'surnom illisible' };
  return {
    entry: {
      id,
      natureKey,
      level,
      isShiny,
      day,
      rename: clampName(typeof rename === 'string' ? rename : ''),
    },
  };
}

function parseIds(raw: unknown, lookup: StateLookup, label: string, problems: string[]): number[] {
  if (raw === undefined || raw === null) return [];
  if (!Array.isArray(raw)) {
    problems.push(`${label} : une liste est attendue`);
    return [];
  }
  if (raw.length > MAX_IDS) {
    problems.push(`${label} : trop d'éléments (${raw.length})`);
    return [];
  }
  const ids = new Set<number>();
  for (const id of raw) {
    if (isInt(id) && lookup.hasId(id)) ids.add(id);
    else problems.push(`${label} : identifiant #${String(id)} inconnu (ignoré)`);
  }
  return [...ids].sort((a, b) => a - b);
}

function parseBox(raw: unknown, lookup: StateLookup): SpecialBox | string {
  if (!isObject(raw)) return 'boîte illisible';
  const { kind, receivedDay, validUntil, ids, shinySlots } = raw;
  if (kind !== 'lucky_day' && kind !== 'april_fools')
    return `genre de boîte « ${String(kind)} » inconnu`;
  if (typeof receivedDay !== 'string' || !isValidDay(receivedDay))
    return 'jour de réception invalide';
  if (typeof validUntil !== 'string' || !isValidDay(validUntil) || validUntil < receivedDay)
    return 'fin de validité invalide';
  if (
    !Array.isArray(ids) ||
    ids.length !== ROULETTE_BOX_SIZE ||
    !ids.every((id) => isInt(id) && lookup.hasId(id))
  ) {
    return `la boîte doit contenir exactement ${ROULETTE_BOX_SIZE} Pokémon connus`;
  }
  if (
    !Array.isArray(shinySlots) ||
    !shinySlots.every((s) => isInt(s) && s >= 0 && s < ROULETTE_BOX_SIZE)
  ) {
    return 'cases shiny invalides';
  }
  return {
    kind,
    receivedDay,
    validUntil,
    ids: [...ids] as number[],
    shinySlots: [...new Set(shinySlots as number[])].sort((a, b) => a - b),
  };
}

function parseTeam(raw: unknown, lookup: StateLookup, problems: string[]): MonthlyTeam | null {
  if (raw === undefined || raw === null) return null;
  if (
    !isObject(raw) ||
    typeof raw.month !== 'string' ||
    !isMonth(raw.month) ||
    !Array.isArray(raw.pokemon)
  ) {
    problems.push('team du mois illisible (ignorée)');
    return null;
  }
  const pokemon: PokemonEntry[] = [];
  for (const p of raw.pokemon.slice(0, 6)) {
    const parsed = parseEntry(p, lookup);
    if ('entry' in parsed) pokemon.push(parsed.entry);
    else problems.push(`team du mois : ${parsed.problem} (ignoré)`);
  }
  return { month: raw.month, pokemon };
}

export function parseState(
  raw: RawState,
  lookup: StateLookup,
): { state: GameState; problems: string[] } {
  const problems: string[] = [];
  const state = emptyGameState();

  // ── Entrées (un Pokémon par jour) ───────────────────────────────────────
  const rows = Array.isArray(raw.entries) ? raw.entries : raw.entries === undefined ? [] : null;
  if (rows === null) problems.push('entrées : une liste est attendue');
  else if (rows.length > MAX_ENTRIES) problems.push(`trop d'entrées (${rows.length})`);
  else {
    for (const row of rows) {
      const parsed = parseEntry(row, lookup);
      if (!('entry' in parsed)) {
        problems.push(
          `Pokémon du ${isObject(row) ? String(row.day) : '?'} : ${parsed.problem} (ignoré)`,
        );
      } else if (state.entries[parsed.entry.day]) {
        problems.push(`deux Pokémon pour le ${parsed.entry.day} (le premier est gardé)`);
      } else {
        state.entries[parsed.entry.day] = parsed.entry;
      }
    }
  }
  const days = Object.keys(state.entries).sort();

  // ── Dernier jour tiré : doit exister, sinon on prend le plus récent ─────
  const last = raw.lastDrawDay;
  if (typeof last === 'string' && isValidDay(last) && state.entries[last]) state.lastDrawDay = last;
  else {
    if (last !== undefined && last !== null)
      problems.push(
        `dernier jour tiré « ${String(last)} » introuvable (le plus récent est utilisé)`,
      );
    state.lastDrawDay = (days[days.length - 1] as Day | undefined) ?? null;
  }

  // ── Compteurs ───────────────────────────────────────────────────────────
  const pity = isObject(raw.pity) ? raw.pity.daysWithoutForm : undefined;
  if (isInt(pity) && pity >= 0) state.pity = { daysWithoutForm: Math.min(pity, 100_000) };
  else if (raw.pity !== undefined) problems.push('compteur de formes illisible (remis à zéro)');

  if (isInt(raw.tickets) && raw.tickets >= 0 && raw.tickets <= MAX_TICKETS)
    state.tickets = raw.tickets;
  else if (raw.tickets !== undefined)
    problems.push(`nombre de tickets « ${String(raw.tickets)} » invalide (remis à zéro)`);

  state.rouletteBonusClaimed = raw.rouletteBonusClaimed === true;

  const boost = raw.rouletteBoost;
  if (
    isObject(boost) &&
    typeof boost.month === 'string' &&
    isMonth(boost.month) &&
    isInt(boost.id) &&
    lookup.hasId(boost.id)
  ) {
    state.rouletteBoost = { month: boost.month, id: boost.id };
  } else if (boost !== undefined && boost !== null) {
    problems.push('Pokémon boosté de la roulette illisible (ignoré)');
  }

  // ── Boîtes spéciales ────────────────────────────────────────────────────
  if (Array.isArray(raw.boxes)) {
    const seen = new Set<string>();
    for (const b of raw.boxes) {
      const box = parseBox(b, lookup);
      if (typeof box === 'string') problems.push(`boîte spéciale : ${box} (ignorée)`);
      else if (seen.has(box.kind))
        problems.push(`deux boîtes « ${box.kind} » (la première est gardée)`);
      else {
        seen.add(box.kind);
        state.boxes.push(box);
      }
    }
  } else if (raw.boxes !== undefined) problems.push('boîtes spéciales : une liste est attendue');

  // ── Collection : toujours au moins ce qu'on a réellement eu ─────────────
  const caught = new Set(parseIds(raw.caught, lookup, 'collection', problems));
  const shiny = new Set(parseIds(raw.caughtShiny, lookup, 'collection shiny', problems));
  state.monthlyTeam = parseTeam(raw.monthlyTeam, lookup, problems);
  for (const entry of [...Object.values(state.entries), ...(state.monthlyTeam?.pokemon ?? [])]) {
    caught.add(entry.id);
    if (entry.isShiny) shiny.add(entry.id);
  }
  for (const id of shiny) caught.add(id);
  state.caught = [...caught].sort((a, b) => a - b);
  state.caughtShiny = [...shiny].sort((a, b) => a - b);

  return { state, problems };
}

export { STATE_SCHEMA_VERSION };
