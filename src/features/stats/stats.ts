import { addDays, type Day } from '../../core/dates';
import type { PokemonEntry } from '../../core/model';

/** Les chiffres de l'écran « Statistiques » (calcul pur, testé). */
export interface Stats {
  /** Nombre de jours enregistrés (un Pokémon par jour). */
  total: number;
  shiny: number;
  /** Part de jours shiny, en pourcentage (ex. 1.4). */
  shinyPercent: number;
  /** Niveau moyen arrondi. */
  averageLevel: number;
  /** Série en cours : jours consécutifs jusqu'au plus récent. */
  streak: number;
  bestStreak: number;
  /** Combien de jours le Pokémon était une forme alternative. */
  forms: number;
  /** Types vus (un Pokémon à deux types compte pour les deux), du plus fréquent au plus rare. */
  types: { type: string; count: number }[];
  /** Les Pokémon les plus souvent obtenus (égalité : le plus petit numéro d'abord). */
  top: { id: number; count: number }[];
}

export interface StatsLookup {
  typesOf(id: number): readonly string[];
  isForm(id: number): boolean;
}

/** Plus longue suite de jours qui se suivent, et celle qui se termine au jour le plus récent. */
export function streaks(days: readonly Day[]): { current: number; best: number } {
  const sorted = [...new Set(days)].sort();
  let best = 0;
  let run = 0;
  let previous: Day | null = null;
  for (const day of sorted) {
    run = previous !== null && addDays(previous, 1) === day ? run + 1 : 1;
    best = Math.max(best, run);
    previous = day;
  }
  // `run` vaut maintenant la série qui se termine au dernier jour.
  return { current: sorted.length === 0 ? 0 : run, best };
}

export function computeStats(
  entries: readonly PokemonEntry[],
  lookup: StatsLookup,
  topSize = 5,
): Stats {
  const total = entries.length;
  const shiny = entries.filter((e) => e.isShiny).length;
  const typeCounts = new Map<string, number>();
  const idCounts = new Map<number, number>();
  let levelSum = 0;
  let forms = 0;
  for (const entry of entries) {
    levelSum += entry.level;
    if (lookup.isForm(entry.id)) forms++;
    idCounts.set(entry.id, (idCounts.get(entry.id) ?? 0) + 1);
    for (const type of lookup.typesOf(entry.id))
      typeCounts.set(type, (typeCounts.get(type) ?? 0) + 1);
  }
  const { current, best } = streaks(entries.map((e) => e.day));
  return {
    total,
    shiny,
    shinyPercent: total === 0 ? 0 : (shiny / total) * 100,
    averageLevel: total === 0 ? 0 : Math.round(levelSum / total),
    streak: current,
    bestStreak: best,
    forms,
    types: [...typeCounts]
      .map(([type, count]) => ({ type, count }))
      .sort((a, b) => b.count - a.count || (a.type < b.type ? -1 : 1)),
    top: [...idCounts]
      .map(([id, count]) => ({ id, count }))
      .sort((a, b) => b.count - a.count || a.id - b.id)
      .slice(0, topSize),
  };
}
