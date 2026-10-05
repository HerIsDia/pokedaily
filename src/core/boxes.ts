import {
  GYARADOS_ID,
  MAGIKARP_ID,
  ROULETTE_BOX_SIZE,
  SPECIAL_BOX_VALID_DAYS,
  VICTINI_ID,
} from './constants';
import { addDays, type Day } from './dates';
import type { SpecialBoxKind } from './events/effects';
import type { DrawPool } from './model';
import { sampleDistinct, shuffled, type Rng } from './rng';

/**
 * Une boîte spéciale offerte par un événement, utilisable à la V-Roulette.
 * En v3.1 elle n'expirait jamais (B-3) et deux boîtes se partageaient la même case de
 * stockage : l'une écrasait l'autre. Ici : une date de fin, et une boîte par genre.
 */
export interface SpecialBox {
  kind: SpecialBoxKind;
  receivedDay: Day;
  /** Dernier jour d'utilisation, compris. */
  validUntil: Day;
  /** Les 16 Pokémon de la boîte. */
  ids: number[];
  /** Positions (0–15) des cases qui donnent un shiny garanti. */
  shinySlots: number[];
}

export function buildSpecialBox(
  kind: SpecialBoxKind,
  day: Day,
  rng: Rng,
  pool: DrawPool,
): SpecialBox {
  const base = { kind, receivedDay: day, validUntil: addDays(day, SPECIAL_BOX_VALID_DAYS - 1) };

  if (kind === 'lucky_day') {
    // 13 espèces différentes au hasard + 3 Victini, mélangés.
    const others = sampleDistinct(
      rng,
      pool.species.filter((id) => id !== VICTINI_ID),
      ROULETTE_BOX_SIZE - 3,
    );
    return {
      ...base,
      ids: shuffled(rng, [...others, VICTINI_ID, VICTINI_ID, VICTINI_ID]),
      shinySlots: [],
    };
  }

  // Poisson d'avril : 10 Magicarpe, 3 Léviator, puis 2 Magicarpe et 1 Léviator SHINY garantis.
  const ids = [
    ...Array<number>(10).fill(MAGIKARP_ID),
    ...Array<number>(3).fill(GYARADOS_ID),
    MAGIKARP_ID,
    MAGIKARP_ID,
    GYARADOS_ID,
  ];
  return { ...base, ids, shinySlots: [13, 14, 15] };
}

export function isBoxValid(box: SpecialBox, today: Day): boolean {
  return today >= box.receivedDay && today <= box.validUntil;
}

/** Les boîtes encore utilisables aujourd'hui. */
export function validBoxes(boxes: readonly SpecialBox[], today: Day): SpecialBox[] {
  return boxes.filter((box) => isBoxValid(box, today));
}

/** Ajoute une boîte : elle REMPLACE l'ancienne du même genre, sans toucher aux autres. */
export function addBox(boxes: readonly SpecialBox[], box: SpecialBox): SpecialBox[] {
  return [...boxes.filter((existing) => existing.kind !== box.kind), box];
}
