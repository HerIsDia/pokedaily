import { ROULETTE_BOOST_CHANCE, ROULETTE_BOX_COUNT, ROULETTE_BOX_SIZE } from './constants';
import type { DrawPool } from './model';
import { chance, randomInt, sampleDistinct, seedFromString, seededRng, type Rng } from './rng';

/**
 * Les 3 boîtes du mois de la V-Roulette. Elles ne dépendent que du mois (« AAAA-MM ») :
 * tous les joueurs ont les mêmes ce mois-là (choix de la v3.1, conservé). Chaque boîte contient
 * 16 espèces DIFFÉRENTES (en v3.1 des doublons étaient possibles et le « boost » ambigu).
 */
export function monthlyBoxes(month: string, pool: DrawPool): number[][] {
  const rng = seededRng(seedFromString(month));
  return Array.from({ length: ROULETTE_BOX_COUNT }, () =>
    sampleDistinct(rng, pool.species, ROULETTE_BOX_SIZE),
  );
}

export interface SpinResult {
  /** Position gagnante dans la boîte (0–15). */
  index: number;
  id: number;
}

/**
 * Un tour de roulette. Si un Pokémon « boosté » est dans la boîte, il gagne avec EXACTEMENT
 * la probabilité annoncée (1 sur 4) ; sinon c'est un tirage uniforme parmi toutes les cases.
 * (v3.1 : il gagnait 25 % du temps, PUIS pouvait encore sortir au tirage normal → ≈ 29,7 %,
 * alors que l'écran annonçait 1/4 : bug B-5.)
 */
export function spinRoulette(
  rng: Rng,
  ids: readonly number[],
  boostedId: number | null,
  boostChance: number = ROULETTE_BOOST_CHANCE,
): SpinResult {
  if (ids.length === 0) throw new RangeError('spinRoulette: boîte vide');
  const boostedIndex = boostedId === null ? -1 : ids.indexOf(boostedId);

  if (boostedIndex >= 0) {
    if (chance(rng, boostChance) || ids.length === 1)
      return { index: boostedIndex, id: ids[boostedIndex] as number };
    // Sinon : uniformément parmi les AUTRES cases.
    const other = randomInt(rng, 0, ids.length - 2);
    const index = other >= boostedIndex ? other + 1 : other;
    return { index, id: ids[index] as number };
  }

  const index = randomInt(rng, 0, ids.length - 1);
  return { index, id: ids[index] as number };
}
