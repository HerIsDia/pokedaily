import { describe, expect, it } from 'vitest';
import { LEVEL_CAP, LEVEL_MIN, LEVEL_RANDOM_MAX } from '../../src/core/constants';
import { createPokemon } from '../../src/core/pokemon';
import { seededRng } from '../../src/core/rng';
import { testPool } from './helpers';

const base = { day: '2026-10-05', pool: testPool };

describe('createPokemon (la fabrique unique)', () => {
  it('même graine → même Pokémon (reproductible)', () => {
    const a = createPokemon({ ...base, id: 5, rng: seededRng(42) });
    const b = createPokemon({ ...base, id: 5, rng: seededRng(42) });
    expect(a).toEqual(b);
  });

  it('remplit toutes les informations, sans surnom', () => {
    const e = createPokemon({ ...base, id: 5, rng: seededRng(1) });
    expect(e).toMatchObject({ id: 5, day: '2026-10-05', rename: '' });
    expect(testPool.natures).toContain(e.natureKey);
    expect(e.level).toBeGreaterThanOrEqual(LEVEL_MIN);
    expect(e.level).toBeLessThanOrEqual(LEVEL_RANDOM_MAX);
  });

  it('niveaux : tous de 1 à 99, jamais 100 sans événement, répartition à peu près uniforme', () => {
    const rng = seededRng(3);
    const counts = new Map<number, number>();
    for (let i = 0; i < 99_000; i++) {
      const { level } = createPokemon({ ...base, id: 1, rng });
      counts.set(level, (counts.get(level) ?? 0) + 1);
    }
    expect(counts.size).toBe(99);
    expect(counts.has(100)).toBe(false);
    for (const n of counts.values()) expect(n).toBeGreaterThan(1000 * 0.8); // ≈ 1000 chacun
  });

  it('niveau imposé (jusqu’à 100 : Bonne Année)', () => {
    expect(createPokemon({ ...base, id: 1, rng: seededRng(1), forcedLevel: LEVEL_CAP }).level).toBe(
      100,
    );
    expect(createPokemon({ ...base, id: 1, rng: seededRng(1), forcedLevel: 69 }).level).toBe(69);
  });

  it('natures : toutes sortent, à peu près à égalité', () => {
    const rng = seededRng(4);
    const counts = new Map<string, number>();
    for (let i = 0; i < 30_000; i++) {
      const { natureKey } = createPokemon({ ...base, id: 1, rng });
      counts.set(natureKey, (counts.get(natureKey) ?? 0) + 1);
    }
    expect([...counts.keys()].sort()).toEqual([...testPool.natures].sort());
    for (const n of counts.values()) expect(n / 30_000).toBeCloseTo(1 / testPool.natures.length, 1);
  });

  describe('shiny', () => {
    const rate = (options: object, id = 1, n = 200_000) => {
      const rng = seededRng(77);
      let shiny = 0;
      for (let i = 0; i < n; i++)
        if (createPokemon({ ...base, id, rng, ...options }).isShiny) shiny++;
      return shiny / n;
    };

    it('1 chance sur 69 par défaut', () => {
      expect(rate({})).toBeCloseTo(1 / 69, 2);
    });

    it('chance de 1/N imposée par un événement', () => {
      expect(rate({ shinyRate: 13 })).toBeCloseTo(1 / 13, 2);
      expect(rate({ shinyRate: 100 })).toBeCloseTo(1 / 100, 2);
    });

    it('shiny garanti', () => {
      expect(rate({ forcedShiny: true }, 1, 1000)).toBe(1);
    });

    it('un Pokémon sans image shiny n’est JAMAIS shiny, même le jour où il est « garanti »', () => {
      expect(rate({ forcedShiny: true }, 7, 1000)).toBe(0); // 7 : pas de shiny dans testPool
      expect(rate({ shinyRate: 1 }, 10003, 1000)).toBe(0); // forme sans shiny
    });
  });

  it('le jet shiny est toujours consommé : la suite du hasard ne dépend pas du Pokémon', () => {
    const a = seededRng(9);
    const b = seededRng(9);
    createPokemon({ ...base, id: 1, rng: a }); // peut être shiny
    createPokemon({ ...base, id: 7, rng: b }); // ne peut pas
    expect(a.next()).toBe(b.next());
  });
});
