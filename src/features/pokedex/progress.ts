import type { GameState } from '../../core/game-state';
import { getEntry, type DexEntry, type FormCategory } from '../../data';

/**
 * Ce que le joueur a déjà obtenu, vu par le Pokédex.
 * Règle (décidée avec Diamant) : le Pokédex reste à 1 025 ESPÈCES. Une forme alternative
 * compte pour son espèce (Méga-Dracaufeu X coche Dracaufeu) et apparaît AUSSI dans l'onglet
 * « Formes ».
 */
export interface DexProgress {
  /** Espèces obtenues (en direct ou via l'une de leurs formes). */
  species: Set<number>;
  /** Espèces obtenues en shiny (idem). */
  speciesShiny: Set<number>;
  /** Formes obtenues (identifiants de formes). */
  forms: Set<number>;
  formsShiny: Set<number>;
}

const speciesOf = (id: number): number => getEntry(id)?.speciesId ?? id;
const isForm = (id: number): boolean => getEntry(id)?.form !== undefined;

export function dexProgress(state: Pick<GameState, 'caught' | 'caughtShiny'>): DexProgress {
  return {
    species: new Set(state.caught.map(speciesOf)),
    speciesShiny: new Set(state.caughtShiny.map(speciesOf)),
    forms: new Set(state.caught.filter(isForm)),
    formsShiny: new Set(state.caughtShiny.filter(isForm)),
  };
}

/** Catégories présentes parmi `forms`, avec leur nombre, dans l'ordre de première apparition. */
export function formCategories(
  forms: readonly DexEntry[],
): { category: FormCategory; count: number }[] {
  const counts = new Map<FormCategory, number>();
  for (const entry of forms) {
    const category = entry.form?.category;
    if (category) counts.set(category, (counts.get(category) ?? 0) + 1);
  }
  return [...counts].map(([category, count]) => ({ category, count }));
}
