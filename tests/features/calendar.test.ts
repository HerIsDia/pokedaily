import { describe, expect, it } from 'vitest';
import type { PokemonEntry } from '../../src/core/model';
import { buildMonths, dayOf, daysInMonth, monthShape } from '../../src/features/history/calendar';

const entry = (day: string, id = 1): PokemonEntry => ({
  id,
  natureKey: 'hardy',
  level: 5,
  isShiny: false,
  day,
  rename: '',
});

describe('forme d’un mois (semaine commençant le lundi)', () => {
  it.each([
    ['2026-05', 31, 4], // 1ᵉʳ mai 2026 = vendredi
    ['2026-06', 30, 0], // 1ᵉʳ juin 2026 = lundi
    ['2026-03', 31, 6], // 1ᵉʳ mars 2026 = dimanche
    ['2024-02', 29, 3], // 2024 bissextile, 1ᵉʳ février = jeudi
    ['2025-02', 28, 5], // 1ᵉʳ février 2025 = samedi
  ])('%s : %i jours, %i cases vides', (key, days, offset) => {
    const shape = monthShape(key);
    expect(shape.daysInMonth).toBe(days);
    expect(shape.startOffset).toBe(offset);
  });

  it('compte les jours des mois de 28 à 31 jours', () => {
    expect(daysInMonth(2026, 4)).toBe(30);
    expect(daysInMonth(2026, 12)).toBe(31);
    expect(daysInMonth(1900, 2)).toBe(28);
    expect(daysInMonth(2000, 2)).toBe(29);
  });
});

describe('mois avec Pokémon', () => {
  it('regroupe par mois, du plus récent au plus ancien', () => {
    const months = buildMonths([
      entry('2026-03-02', 1),
      entry('2026-05-01', 2),
      entry('2025-12-31', 3),
      entry('2026-05-20', 4),
    ]);
    expect(months.map((m) => m.key)).toEqual(['2026-05', '2026-03', '2025-12']);
    expect(months[0]!.entries.get(1)?.id).toBe(2);
    expect(months[0]!.entries.get(20)?.id).toBe(4);
    expect(months[0]!.entries.size).toBe(2);
  });

  it('sans entrée : aucun mois', () => {
    expect(buildMonths([])).toEqual([]);
  });

  it('retrouve le jour complet d’une case', () => {
    const [month] = buildMonths([entry('2026-05-07')]);
    expect(dayOf(month!, 7)).toBe('2026-05-07');
  });
});
