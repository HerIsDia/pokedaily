import { TEAM_SIZE } from './constants';
import type { Day } from './dates';
import type { DrawPool, PokemonEntry } from './model';
import { createPokemon } from './pokemon';
import { sampleDistinct, type Rng } from './rng';

/**
 * La team du mois : 6 espèces différentes, avec nature, niveau et chance de shiny ordinaires.
 * Les événements ne s'appliquent pas à elle (décision de la v3.1, conservée).
 */
export function buildMonthlyTeam(day: Day, rng: Rng, pool: DrawPool): PokemonEntry[] {
  return sampleDistinct(rng, pool.species, TEAM_SIZE).map((id) =>
    createPokemon({ id, day, rng, pool }),
  );
}
