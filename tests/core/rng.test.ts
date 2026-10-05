import { describe, expect, it } from 'vitest';
import {
  chance,
  mathRng,
  pickOne,
  randomInt,
  sampleDistinct,
  seedFromString,
  seededRng,
} from '../../src/core/rng';

describe('seededRng', () => {
  it('donne toujours la même suite pour la même graine (reproductible)', () => {
    const a = seededRng(42);
    const b = seededRng(42);
    const suite = Array.from({ length: 5 }, () => a.next());
    expect(suite).toEqual(Array.from({ length: 5 }, () => b.next()));
    // valeurs de référence : si elles changent, TOUS les boîtes mensuelles changent aussi
    expect(suite[0]).toBeCloseTo(0.6011037519, 8);
  });

  it('des graines différentes donnent des suites différentes', () => {
    expect(seededRng(1).next()).not.toBe(seededRng(2).next());
  });

  it('reste dans [0, 1[', () => {
    const rng = seededRng(7);
    for (let i = 0; i < 10_000; i++) {
      const x = rng.next();
      expect(x).toBeGreaterThanOrEqual(0);
      expect(x).toBeLessThan(1);
    }
  });

  it('est à peu près uniforme (moyenne ≈ 0,5)', () => {
    const rng = seededRng(99);
    let sum = 0;
    for (let i = 0; i < 100_000; i++) sum += rng.next();
    expect(sum / 100_000).toBeCloseTo(0.5, 1);
  });
});

describe('seedFromString', () => {
  it('est stable et distingue les mois', () => {
    expect(seedFromString('2026-10')).toBe(seedFromString('2026-10'));
    expect(seedFromString('2026-10')).not.toBe(seedFromString('2026-11'));
  });
});

describe('randomInt', () => {
  it('couvre toutes les valeurs, bornes comprises, et rien d’autre', () => {
    const rng = seededRng(3);
    const seen = new Set<number>();
    for (let i = 0; i < 5_000; i++) seen.add(randomInt(rng, 1, 6));
    expect([...seen].sort()).toEqual([1, 2, 3, 4, 5, 6]);
  });

  it('accepte min = max et refuse un intervalle invalide', () => {
    expect(randomInt(seededRng(1), 5, 5)).toBe(5);
    expect(() => randomInt(seededRng(1), 6, 1)).toThrow(RangeError);
    expect(() => randomInt(seededRng(1), 1.5, 3)).toThrow(RangeError);
  });
});

describe('chance', () => {
  it('0 = jamais, 1 = toujours (sans consulter le hasard)', () => {
    const rng = { next: () => 0.5 };
    expect(chance(rng, 0)).toBe(false);
    expect(chance(rng, -1)).toBe(false);
    expect(chance(rng, 1)).toBe(true);
    expect(chance(rng, 2)).toBe(true);
  });

  it('respecte la fréquence demandée', () => {
    const rng = seededRng(11);
    let hits = 0;
    for (let i = 0; i < 100_000; i++) if (chance(rng, 1 / 69)) hits++;
    expect(hits / 100_000).toBeCloseTo(1 / 69, 2);
  });
});

describe('pickOne / sampleDistinct', () => {
  it('pickOne tire uniformément et refuse une liste vide', () => {
    const rng = seededRng(5);
    const counts = new Map<string, number>();
    for (let i = 0; i < 30_000; i++) {
      const x = pickOne(rng, ['a', 'b', 'c']);
      counts.set(x, (counts.get(x) ?? 0) + 1);
    }
    for (const n of counts.values()) expect(n / 30_000).toBeCloseTo(1 / 3, 1);
    expect(() => pickOne(rng, [])).toThrow(RangeError);
  });

  it('sampleDistinct ne répète jamais et ne modifie pas la liste d’origine', () => {
    const rng = seededRng(8);
    const source = Array.from({ length: 50 }, (_, i) => i);
    const copy = [...source];
    for (let round = 0; round < 200; round++) {
      const sample = sampleDistinct(rng, source, 16);
      expect(sample).toHaveLength(16);
      expect(new Set(sample).size).toBe(16);
    }
    expect(source).toEqual(copy);
    expect(sampleDistinct(rng, source, 50).sort((a, b) => a - b)).toEqual(copy);
    expect(sampleDistinct(rng, source, 0)).toEqual([]);
    expect(() => sampleDistinct(rng, source, 51)).toThrow(RangeError);
  });
});

describe('mathRng', () => {
  it('fournit des nombres dans [0, 1[', () => {
    for (let i = 0; i < 100; i++) {
      const x = mathRng.next();
      expect(x >= 0 && x < 1).toBe(true);
    }
  });
});
