import { describe, expect, it } from 'vitest';
import type { PokemonEntry } from '../../src/core/model';
import { computeStats, streaks, type StatsLookup } from '../../src/features/stats/stats';

const types: Record<number, string[]> = {
  1: ['grass', 'poison'],
  4: ['fire'],
  25: ['electric'],
  10034: ['fire', 'dragon'],
};
const lookup: StatsLookup = { typesOf: (id) => types[id] ?? [], isForm: (id) => id > 10000 };

const entry = (day: string, id: number, over: Partial<PokemonEntry> = {}): PokemonEntry => ({
  id,
  natureKey: 'hardy',
  level: 10,
  isShiny: false,
  day,
  rename: '',
  ...over,
});

describe('séries de jours consécutifs', () => {
  it('sans jour : 0', () => expect(streaks([])).toEqual({ current: 0, best: 0 }));
  it('un seul jour : 1', () => expect(streaks(['2026-05-01'])).toEqual({ current: 1, best: 1 }));

  it('compte la série qui se termine au jour le plus récent, et la meilleure', () => {
    const days = [
      '2026-05-01',
      '2026-05-02',
      '2026-05-03',
      '2026-05-04',
      '2026-05-10',
      '2026-05-11',
    ];
    expect(streaks(days)).toEqual({ current: 2, best: 4 });
  });

  it('traverse les fins de mois, d’année et le 29 février sans se tromper', () => {
    expect(streaks(['2023-12-30', '2023-12-31', '2024-01-01'])).toEqual({ current: 3, best: 3 });
    expect(streaks(['2024-02-28', '2024-02-29', '2024-03-01'])).toEqual({ current: 3, best: 3 });
    expect(streaks(['2025-02-28', '2025-03-01'])).toEqual({ current: 2, best: 2 });
  });

  it('ignore l’ordre et les doublons', () => {
    expect(streaks(['2026-05-03', '2026-05-01', '2026-05-02', '2026-05-02'])).toEqual({
      current: 3,
      best: 3,
    });
  });

  it('un trou d’un jour casse la série', () => {
    expect(streaks(['2026-05-01', '2026-05-03'])).toEqual({ current: 1, best: 1 });
  });
});

describe('statistiques', () => {
  it('une collection vide ne produit ni NaN ni erreur', () => {
    const s = computeStats([], lookup);
    expect(s).toMatchObject({
      total: 0,
      shiny: 0,
      shinyPercent: 0,
      averageLevel: 0,
      streak: 0,
      bestStreak: 0,
      forms: 0,
    });
    expect(s.types).toEqual([]);
    expect(s.top).toEqual([]);
  });

  it('compte shiny, formes, niveau moyen et pourcentage', () => {
    const s = computeStats(
      [
        entry('2026-05-01', 25, { level: 10, isShiny: true }),
        entry('2026-05-02', 10034, { level: 21 }),
        entry('2026-05-03', 4, { level: 30 }),
        entry('2026-05-04', 25, { level: 40 }),
      ],
      lookup,
    );
    expect(s.total).toBe(4);
    expect(s.shiny).toBe(1);
    expect(s.shinyPercent).toBe(25);
    expect(s.averageLevel).toBe(25); // (10+21+30+40)/4 = 25,25
    expect(s.forms).toBe(1);
    expect(s.streak).toBe(4);
  });

  it('classe les types (deux types comptent deux fois) et les Pokémon les plus obtenus', () => {
    const s = computeStats(
      [
        entry('2026-05-01', 4),
        entry('2026-05-02', 10034),
        entry('2026-05-03', 25),
        entry('2026-05-04', 25),
        entry('2026-05-05', 1),
      ],
      lookup,
    );
    // égalité à 2 : ordre alphabétique (stable, jamais au hasard)
    expect(s.types.slice(0, 2)).toEqual([
      { type: 'electric', count: 2 },
      { type: 'fire', count: 2 },
    ]);
    expect(s.types.find((t) => t.type === 'dragon')?.count).toBe(1);
    expect(s.top[0]).toEqual({ id: 25, count: 2 });
    // égalité à 1 : le plus petit numéro d'abord
    expect(s.top.slice(1).map((t) => t.id)).toEqual([1, 4, 10034]);
  });

  it('limite le classement', () => {
    const entries = Array.from({ length: 9 }, (_, i) => entry(`2026-05-0${i + 1}`, i + 1));
    expect(computeStats(entries, lookup, 5).top).toHaveLength(5);
  });
});
