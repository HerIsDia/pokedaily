import { describe, expect, it } from 'vitest';
import { addBox, buildSpecialBox, isBoxValid, validBoxes } from '../../src/core/boxes';
import {
  GYARADOS_ID,
  MAGIKARP_ID,
  ROULETTE_BOX_SIZE,
  SPECIAL_BOX_VALID_DAYS,
  VICTINI_ID,
} from '../../src/core/constants';
import { seededRng } from '../../src/core/rng';
import { testPool } from './helpers';

const count = (ids: number[], id: number) => ids.filter((x) => x === id).length;

describe('boîte Lucky Day', () => {
  const box = buildSpecialBox('lucky_day', '2026-11-13', seededRng(1), testPool);

  it('16 cases : 13 espèces différentes (hors Victini) + 3 Victini', () => {
    expect(box.ids).toHaveLength(ROULETTE_BOX_SIZE);
    expect(count(box.ids, VICTINI_ID)).toBe(3);
    const others = box.ids.filter((id) => id !== VICTINI_ID);
    expect(others).toHaveLength(13);
    expect(new Set(others).size).toBe(13);
    for (const id of others) expect(testPool.species).toContain(id);
    expect(box.shinySlots).toEqual([]);
  });

  it('les Victini sont mélangés dans la grille (pas tous à la fin)', () => {
    const positions = new Set<number>();
    for (let seed = 0; seed < 30; seed++) {
      const b = buildSpecialBox('lucky_day', '2026-11-13', seededRng(seed), testPool);
      b.ids.forEach((id, i) => id === VICTINI_ID && positions.add(i));
    }
    expect(positions.size).toBeGreaterThan(6);
  });

  it('même graine → même boîte', () => {
    expect(buildSpecialBox('lucky_day', '2026-11-13', seededRng(1), testPool)).toEqual(box);
  });
});

describe('boîte Poisson d’avril', () => {
  const box = buildSpecialBox('april_fools', '2026-04-01', seededRng(1), testPool);

  it('12 Magicarpe + 4 Léviator, dont 3 cases shiny garanties en dernier', () => {
    expect(box.ids).toHaveLength(ROULETTE_BOX_SIZE);
    expect(count(box.ids, MAGIKARP_ID)).toBe(12);
    expect(count(box.ids, GYARADOS_ID)).toBe(4);
    expect(box.shinySlots).toEqual([13, 14, 15]);
    expect(box.ids.slice(13)).toEqual([MAGIKARP_ID, MAGIKARP_ID, GYARADOS_ID]);
  });
});

describe('validité (bug B-3 : en v3.1 une boîte n’expirait jamais)', () => {
  const box = buildSpecialBox('lucky_day', '2026-11-13', seededRng(1), testPool);

  it(`valable ${SPECIAL_BOX_VALID_DAYS} jours, jour de réception compris`, () => {
    expect(box.receivedDay).toBe('2026-11-13');
    expect(box.validUntil).toBe('2026-11-19');
    expect(isBoxValid(box, '2026-11-13')).toBe(true);
    expect(isBoxValid(box, '2026-11-19')).toBe(true);
    expect(isBoxValid(box, '2026-11-20')).toBe(false);
    expect(isBoxValid(box, '2027-11-13')).toBe(false);
  });

  it('pas valable avant sa réception (horloge reculée)', () => {
    expect(isBoxValid(box, '2026-11-12')).toBe(false);
  });

  it('validBoxes ne garde que les boîtes encore utilisables', () => {
    const old = buildSpecialBox('april_fools', '2026-04-01', seededRng(1), testPool);
    expect(validBoxes([old, box], '2026-11-15')).toEqual([box]);
    expect(validBoxes([old, box], '2026-12-25')).toEqual([]);
  });
});

describe('deux boîtes ne s’écrasent plus (v3.1 : une seule case de stockage)', () => {
  it('addBox remplace seulement la boîte du MÊME genre', () => {
    const lucky = buildSpecialBox('lucky_day', '2026-11-13', seededRng(1), testPool);
    const april = buildSpecialBox('april_fools', '2026-11-13', seededRng(1), testPool);
    const both = addBox(addBox([], lucky), april);
    expect(both.map((b) => b.kind)).toEqual(['lucky_day', 'april_fools']);

    const newerLucky = buildSpecialBox('lucky_day', '2027-08-13', seededRng(2), testPool);
    const replaced = addBox(both, newerLucky);
    expect(replaced).toHaveLength(2);
    expect(replaced.find((b) => b.kind === 'lucky_day')).toBe(newerLucky);
    expect(replaced.find((b) => b.kind === 'april_fools')).toBe(april);
  });
});
