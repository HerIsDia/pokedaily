import type { Lang } from '../../i18n';
import type { PokemonType } from '../../core/pokemon-types';

/**
 * ⚠️ DONNÉES TEMPORAIRES de l'essai « carte du jour » (phase 1).
 * Elles seront remplacées par `data/dex.json`, généré depuis PokéAPI en phase 2.
 */

export interface CardEntry {
  /** Identifiant PokéAPI (1–1025 pour les espèces, 10001+ pour les formes). */
  id: number;
  natureKey: string;
  level: number;
  isShiny: boolean;
  /** Jour LOCAL au format AAAA-MM-JJ. */
  day: string;
  /** Surnom choisi par le joueur ; chaîne vide = nom de l'espèce. */
  rename: string;
}

export interface SpeciesInfo {
  names: Record<Lang, string>;
  types: readonly PokemonType[];
}

export const SPECIES: Record<number, SpeciesInfo> = {
  25: { names: { fr: 'Pikachu', en: 'Pikachu' }, types: ['electric'] },
  6: { names: { fr: 'Dracaufeu', en: 'Charizard' }, types: ['fire', 'flying'] },
  // Une forme, pour vérifier que les noms de formes passent par le même chemin.
  10034: { names: { fr: 'Méga-Dracaufeu X', en: 'Mega Charizard X' }, types: ['fire', 'dragon'] },
};

export const NATURES: Record<string, Record<Lang, string>> = {
  jolly: { fr: 'Jovial', en: 'Jolly' },
  timid: { fr: 'Timide', en: 'Timid' },
};

/** Date locale d'aujourd'hui, au format AAAA-MM-JJ. */
export function localDay(date: Date = new Date()): string {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

export function createSampleEntry(): CardEntry {
  return { id: 25, natureKey: 'jolly', level: 42, isShiny: false, day: localDay(), rename: '' };
}
