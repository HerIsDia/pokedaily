import { describe, expect, it } from 'vitest';
import {
  ROULETTE_BOOST_CHANCE,
  ROULETTE_BOX_COUNT,
  ROULETTE_BOX_SIZE,
} from '../../src/core/constants';
import { seededRng } from '../../src/core/rng';
import { monthlyBoxes, spinRoulette } from '../../src/core/roulette';
import { buildMonthlyTeam } from '../../src/core/team';
import { testPool } from './helpers';

describe('boîtes du mois', () => {
  const boxes = monthlyBoxes('2026-10', testPool);

  it('3 boîtes de 16 espèces DIFFÉRENTES', () => {
    expect(boxes).toHaveLength(ROULETTE_BOX_COUNT);
    for (const box of boxes) {
      expect(box).toHaveLength(ROULETTE_BOX_SIZE);
      expect(new Set(box).size).toBe(ROULETTE_BOX_SIZE);
      for (const id of box) expect(testPool.species).toContain(id);
    }
  });

  it('identiques pour tout le monde un même mois, différentes d’un mois à l’autre', () => {
    expect(monthlyBoxes('2026-10', testPool)).toEqual(boxes);
    expect(monthlyBoxes('2026-11', testPool)).not.toEqual(boxes);
  });
});

describe('tour de roulette', () => {
  const ids = Array.from({ length: 16 }, (_, i) => 100 + i);

  it('le Pokémon boosté sort EXACTEMENT 1 fois sur 4 (v3.1 : ≈ 29,7 % au lieu de 25 %, bug B-5)', () => {
    const rng = seededRng(2026);
    const spins = 400_000;
    let boosted = 0;
    for (let i = 0; i < spins; i++) if (spinRoulette(rng, ids, 107).id === 107) boosted++;
    expect(boosted / spins).toBeGreaterThan(ROULETTE_BOOST_CHANCE - 0.004);
    expect(boosted / spins).toBeLessThan(ROULETTE_BOOST_CHANCE + 0.004);
  });

  it('les 15 autres cases se partagent le reste à égalité (5 % chacune)', () => {
    const rng = seededRng(7);
    const spins = 300_000;
    const counts = new Map<number, number>();
    for (let i = 0; i < spins; i++) {
      const { id } = spinRoulette(rng, ids, 107);
      counts.set(id, (counts.get(id) ?? 0) + 1);
    }
    for (const id of ids.filter((x) => x !== 107)) {
      expect((counts.get(id) ?? 0) / spins).toBeGreaterThan(0.045);
      expect((counts.get(id) ?? 0) / spins).toBeLessThan(0.055);
    }
  });

  it('sans Pokémon boosté (ou boosté absent de la boîte) : tirage uniforme', () => {
    for (const boosted of [null, 999]) {
      const rng = seededRng(3);
      const counts = new Map<number, number>();
      for (let i = 0; i < 160_000; i++) {
        const { id } = spinRoulette(rng, ids, boosted);
        counts.set(id, (counts.get(id) ?? 0) + 1);
      }
      expect(counts.size).toBe(16);
      for (const n of counts.values()) expect(n / 160_000).toBeCloseTo(1 / 16, 2);
    }
  });

  it('l’index renvoyé correspond bien au Pokémon', () => {
    const rng = seededRng(1);
    for (let i = 0; i < 1000; i++) {
      const { index, id } = spinRoulette(rng, ids, 103);
      expect(ids[index]).toBe(id);
    }
  });

  it('chance de boost à 0 ou 1, boîte d’une seule case, boîte vide', () => {
    expect(spinRoulette({ next: () => 0 }, ids, 105, 1).id).toBe(105);
    const rng = seededRng(4);
    for (let i = 0; i < 2000; i++) expect(spinRoulette(rng, ids, 105, 0).id).not.toBe(105);
    expect(spinRoulette(rng, [42], 42).id).toBe(42);
    expect(() => spinRoulette(rng, [], null)).toThrow(RangeError);
  });
});

describe('team du mois', () => {
  it('6 espèces différentes, chacune bien formée', () => {
    const team = buildMonthlyTeam('2026-10-05', seededRng(1), testPool);
    expect(team).toHaveLength(6);
    expect(new Set(team.map((p) => p.id)).size).toBe(6);
    for (const p of team) {
      expect(testPool.species).toContain(p.id);
      expect(p.day).toBe('2026-10-05');
      expect(p.rename).toBe('');
    }
  });
});
