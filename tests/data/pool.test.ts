import { describe, expect, it } from 'vitest';
import { drawPool } from '../../src/data/pool';

describe('réserve de tirage (vraies données)', () => {
  it('1 025 espèces, 324 formes (2 sans image écartées), 25 natures', () => {
    expect(drawPool.species).toHaveLength(1025);
    expect(drawPool.forms).toHaveLength(324);
    expect(drawPool.natures).toHaveLength(25);
  });

  it('les 2 formes sans image ne sont jamais tirables', () => {
    for (const id of [10266, 10270]) {
      expect(drawPool.forms).not.toContain(id);
      expect(drawPool.isDrawable(id)).toBe(false);
    }
  });

  it('isForm / canBeShiny / isDrawable', () => {
    expect(drawPool.isForm(25)).toBe(false);
    expect(drawPool.isForm(10034)).toBe(true);
    expect(drawPool.isDrawable(25)).toBe(true);
    expect(drawPool.isDrawable(99999)).toBe(false);
    expect(drawPool.canBeShiny(25)).toBe(true);
    expect(drawPool.canBeShiny(10096)).toBe(false); // casquette Sinnoh
  });
});
