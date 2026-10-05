import type { Day } from './dates';

/**
 * Un Pokémon obtenu un jour donné (le Pokémon du jour, une ligne de l'historique…).
 * On ne stocke que l'essentiel : les noms, types et images se retrouvent depuis `id`
 * (en v3.1 chaque entrée recopiait six noms : ajouter une langue obligeait à tout migrer).
 */
export interface PokemonEntry {
  /** Identifiant PokéAPI : 1–1025 (espèces), 10001+ (formes). */
  id: number;
  /** Clé de nature (« jolly », « timid »…). */
  natureKey: string;
  level: number;
  isShiny: boolean;
  /** Jour LOCAL de l'obtention, AAAA-MM-JJ. */
  day: Day;
  /** Surnom choisi par le joueur ; chaîne vide = nom d'origine. */
  rename: string;
}

/**
 * Ce dont le tirage a besoin de savoir sur les Pokémon. Fournie par `src/data/pool.ts`
 * (vraies données) ou par un petit jeu de données dans les tests : `core/` ne lit aucun fichier.
 */
export interface DrawPool {
  /** Espèces qu'on peut tirer (toutes ont une image). */
  species: readonly number[];
  /** Formes alternatives qu'on peut tirer (seulement celles qui ont une image). */
  forms: readonly number[];
  /** Clés des natures. */
  natures: readonly string[];
  /** Peut-on tirer ce Pokémon ? (il existe et a une image). */
  isDrawable(id: number): boolean;
  /** Ce Pokémon peut-il être shiny ? (sinon il ne l'est jamais). */
  canBeShiny(id: number): boolean;
  /** Est-ce une forme alternative (et non une espèce) ? */
  isForm(id: number): boolean;
}
