import { describe, expect, it } from 'vitest';
import {
  INITIAL_FORM_PITY,
  formChance,
  formChancePercent,
  nextFormPity,
  type FormPity,
} from '../../src/core/form-pity';
import { chance, seededRng } from '../../src/core/rng';

describe('pourcentage progressif des formes', () => {
  it('1 % au départ, puis +1 % par jour sans forme', () => {
    let state: FormPity = INITIAL_FORM_PITY;
    const seen: number[] = [];
    for (let i = 0; i < 5; i++) {
      seen.push(formChancePercent(state));
      state = nextFormPity(state, false);
    }
    expect(seen).toEqual([1, 2, 3, 4, 5]);
  });

  it('retombe à 1 % dès qu’une forme sort', () => {
    expect(nextFormPity({ daysWithoutForm: 41 }, true)).toEqual({ daysWithoutForm: 0 });
    expect(formChancePercent(nextFormPity({ daysWithoutForm: 41 }, true))).toBe(1);
  });

  it('atteint 100 % au 100ᵉ jour (forme garantie) et ne dépasse jamais 100 %', () => {
    expect(formChancePercent({ daysWithoutForm: 98 })).toBe(99);
    expect(formChancePercent({ daysWithoutForm: 99 })).toBe(100);
    expect(formChancePercent({ daysWithoutForm: 500 })).toBe(100);
    expect(formChance({ daysWithoutForm: 99 })).toBe(1);
    expect(formChance({ daysWithoutForm: 0 })).toBeCloseTo(0.01, 10);
  });

  it('se protège d’un compteur abîmé (négatif, décimal, NaN)', () => {
    expect(formChancePercent({ daysWithoutForm: -5 })).toBe(1);
    expect(formChancePercent({ daysWithoutForm: Number.NaN })).toBe(1);
    expect(formChancePercent({ daysWithoutForm: 2.9 })).toBe(3);
    expect(nextFormPity({ daysWithoutForm: Number.NaN }, false)).toEqual({ daysWithoutForm: 1 });
  });

  it('ne modifie pas l’état reçu', () => {
    const state = { daysWithoutForm: 3 };
    nextFormPity(state, false);
    expect(state).toEqual({ daysWithoutForm: 3 });
  });
});

/** Nombre de tirages jusqu'à la prochaine forme, en suivant exactement les règles du jeu. */
function daysUntilForm(rng: { next(): number }): number {
  let state: FormPity = INITIAL_FORM_PITY;
  for (let day = 1; ; day++) {
    const gotForm = chance(rng, formChance(state));
    if (gotForm) return day;
    state = nextFormPity(state, false);
  }
}

describe('simulation : que donne vraiment ce mécanisme ?', () => {
  // Calcul exact (pas une simulation) de la loi : P(forme au jour n) = n % × P(pas de forme avant)
  const exact = (() => {
    const cdf: number[] = [];
    let survive = 1;
    let mean = 0;
    for (let n = 1; n <= 100; n++) {
      const p = n / 100;
      mean += n * survive * p;
      survive *= 1 - p;
      cdf.push(1 - survive);
    }
    return { mean, cdf };
  })();

  it('le calcul exact donne bien ≈ 12,2 jours entre deux formes', () => {
    expect(exact.mean).toBeCloseTo(12.2, 1);
    expect(exact.cdf[6]).toBeCloseTo(0.25, 2); // dans les 7 premiers jours
    expect(exact.cdf[13]).toBeCloseTo(0.669, 2); // dans les 14 premiers jours
    expect(exact.cdf[20]).toBeCloseTo(0.918, 2); // dans les 21 premiers jours
    expect(exact.cdf[29]).toBeCloseTo(0.995, 2); // dans les 30 premiers jours
  });

  it('la simulation (60 000 cycles) retrouve le calcul : moyenne, médiane, répartition', () => {
    const rng = seededRng(2026);
    const cycles = 60_000;
    const lengths: number[] = [];
    for (let i = 0; i < cycles; i++) lengths.push(daysUntilForm(rng));

    const mean = lengths.reduce((a, b) => a + b, 0) / cycles;
    expect(mean).toBeGreaterThan(exact.mean - 0.15);
    expect(mean).toBeLessThan(exact.mean + 0.15);

    const within = (days: number) => lengths.filter((l) => l <= days).length / cycles;
    expect(within(7)).toBeCloseTo(exact.cdf[6]!, 1);
    expect(within(14)).toBeCloseTo(exact.cdf[13]!, 1);
    expect(within(30)).toBeCloseTo(exact.cdf[29]!, 1);

    const sorted = [...lengths].sort((a, b) => a - b);
    expect(sorted[Math.floor(cycles / 2)]).toBeGreaterThanOrEqual(11);
    expect(sorted[Math.floor(cycles / 2)]).toBeLessThanOrEqual(13);
    expect(sorted[sorted.length - 1]).toBeLessThanOrEqual(100);
  });

  it('part des jours avec une forme ≈ 8,2 %', () => {
    const rng = seededRng(5);
    let state: FormPity = INITIAL_FORM_PITY;
    let forms = 0;
    const days = 200_000;
    for (let i = 0; i < days; i++) {
      const gotForm = chance(rng, formChance(state));
      if (gotForm) forms++;
      state = nextFormPity(state, gotForm);
    }
    expect(forms / days).toBeCloseTo(0.082, 2);
  });

  it('même avec la pire malchance possible, une forme sort exactement au 100ᵉ jour', () => {
    expect(daysUntilForm({ next: () => 0.9999999 })).toBe(100);
  });

  it('avec une chance insolente (hasard à 0), une forme sort dès le 1ᵉʳ jour', () => {
    expect(daysUntilForm({ next: () => 0 })).toBe(1);
  });
});
