import { describe, expect, it } from 'vitest';
import { seededRng } from '../../src/core/rng';
import { buildSpinSchedule } from '../../src/features/kit/spin-schedule';

describe('film de la roulette', () => {
  it('se termine TOUJOURS sur la case gagnante, quelle que soit la graine', () => {
    for (let seed = 0; seed < 300; seed++) {
      const target = seed % 16;
      const steps = buildSpinSchedule(16, target, seededRng(seed));
      expect(steps.at(-1)?.index).toBe(target);
    }
  });

  it('ralentit (les attentes ne diminuent jamais) et reste de durée raisonnable', () => {
    for (let seed = 0; seed < 100; seed++) {
      const steps = buildSpinSchedule(16, 5, seededRng(seed));
      for (let i = 1; i < steps.length; i++) {
        expect(steps[i]!.delay).toBeGreaterThanOrEqual(steps[i - 1]!.delay);
      }
      const total = steps.reduce((sum, s) => sum + s.delay, 0);
      expect(total).toBeGreaterThan(2000);
      expect(total).toBeLessThan(9000);
    }
  });

  it('n’allume jamais deux fois de suite la même case', () => {
    for (let seed = 0; seed < 100; seed++) {
      const steps = buildSpinSchedule(16, seed % 16, seededRng(seed));
      for (let i = 1; i < steps.length; i++) {
        expect(steps[i]!.index).not.toBe(steps[i - 1]!.index);
      }
    }
  });

  it('« réduire les animations » : saute directement au résultat', () => {
    expect(buildSpinSchedule(16, 9, seededRng(1), true)).toEqual([{ index: 9, delay: 0 }]);
  });

  it('une seule case : résultat immédiat ; case hors boîte : erreur', () => {
    expect(buildSpinSchedule(1, 0, seededRng(1))).toEqual([{ index: 0, delay: 0 }]);
    expect(() => buildSpinSchedule(16, 16, seededRng(1))).toThrow(RangeError);
    expect(() => buildSpinSchedule(16, -1, seededRng(1))).toThrow(RangeError);
  });
});
