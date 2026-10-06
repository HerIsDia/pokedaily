import { POKEMON_TYPES, type PokemonType } from '../core/pokemon-types';
import dexFile from './dex.json';
import naturesFile from './natures.json';

/**
 * Accès typé aux données générées par `pnpm dex` (PokéAPI). Les fichiers JSON sont
 * versionnés : l'application n'appelle JAMAIS PokéAPI.
 */

export type FormCategory =
  | 'mega'
  | 'gmax'
  | 'alola'
  | 'galar'
  | 'hisui'
  | 'paldea'
  | 'primal'
  | 'totem'
  | 'costume'
  | 'partner'
  | 'other';

export interface DexEntry {
  /** Identifiant PokéAPI : 1–1025 (espèces), 10001+ (formes). */
  id: number;
  speciesId: number;
  fr: string;
  en: string;
  types: PokemonType[];
  form?: { slug: string; category: FormCategory };
}

/** Les statistiques qu'une nature peut monter ou baisser (noms de PokéAPI). */
export type NatureStat = 'attack' | 'defense' | 'special-attack' | 'special-defense' | 'speed';

export interface Nature {
  id: number;
  key: string;
  fr: string;
  en: string;
  /** Statistique augmentée (`null` pour les 5 natures neutres). */
  up: NatureStat | null;
  /** Statistique baissée (`null` pour les 5 natures neutres). */
  down: NatureStat | null;
}

export const dex = dexFile.entries as DexEntry[];
export const natures = naturesFile.natures as Nature[];

const byId = new Map<number, DexEntry>(dex.map((entry) => [entry.id, entry]));
const natureByKey = new Map<string, Nature>(natures.map((nature) => [nature.key, nature]));

export function getEntry(id: number): DexEntry | undefined {
  return byId.get(id);
}

export function getNature(key: string): Nature | undefined {
  return natureByKey.get(key);
}

export const species: readonly DexEntry[] = dex.filter((entry) => !entry.form);
export const forms: readonly DexEntry[] = dex.filter((entry) => entry.form);

/** Nombre d'espèces (= taille du Pokédex « classique »). */
export const DEX_SIZE = species.length;

export { POKEMON_TYPES };
