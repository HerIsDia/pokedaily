import { LEVEL_MIN, LEVEL_RANDOM_MAX, SHINY_RATE } from './constants';
import type { Day } from './dates';
import type { DrawPool, PokemonEntry } from './model';
import { chance, pickOne, randomInt, type Rng } from './rng';

export interface CreatePokemonOptions {
  id: number;
  day: Day;
  rng: Rng;
  pool: DrawPool;
  /** Chance shiny de 1/N (défaut : 1/69). */
  shinyRate?: number;
  /** Shiny garanti (si le Pokémon peut l'être). */
  forcedShiny?: boolean;
  /** Niveau imposé (sinon tiré entre 1 et 99). */
  forcedLevel?: number | null;
}

/**
 * LA fonction qui fabrique un Pokémon. En v3.1, ce code existait en 5 exemplaires
 * (tirage du jour, V-Roulette, Team du mois, mode dev, migration).
 *
 * Ordre des jets de hasard (figé : le changer changerait les résultats d'une même graine) :
 * nature, niveau, shiny. Le jet shiny est TOUJOURS consommé, même si le Pokémon ne peut pas
 * l'être, pour que le reste d'une séquence ne dépende pas du Pokémon tiré.
 */
export function createPokemon(options: CreatePokemonOptions): PokemonEntry {
  const {
    id,
    day,
    rng,
    pool,
    shinyRate = SHINY_RATE,
    forcedShiny = false,
    forcedLevel = null,
  } = options;

  const natureKey = pickOne(rng, pool.natures);
  const randomLevel = randomInt(rng, LEVEL_MIN, LEVEL_RANDOM_MAX);
  const shinyRoll = chance(rng, 1 / shinyRate);

  return {
    id,
    natureKey,
    level: forcedLevel ?? randomLevel,
    // Pas d'image shiny = pas de shiny possible, même un jour où il est « garanti ».
    isShiny: pool.canBeShiny(id) && (forcedShiny || shinyRoll),
    day,
    rename: '',
  };
}
