import { describe, expect, it } from 'vitest';
import sprites from '../../src/data/sprites.json';
import { dex, getEntry } from '../../src/data';

describe('disponibilité des images (générée par `pnpm sprites`)', () => {
  const lists = [
    ...sprites.missing.normal,
    ...sprites.missing.shiny,
    ...sprites.extras.normal,
    ...sprites.extras.shiny,
    ...sprites.identicalShiny,
    ...Object.values(sprites.fallbacks.normal).flat(),
    ...Object.values(sprites.fallbacks.shiny).flat(),
  ];

  it('ne parle que de Pokémon qui existent', () => {
    for (const id of lists) expect(getEntry(id), `#${id}`).toBeDefined();
  });

  it('AUCUNE espèce (1–1025) ne manque, ni en normal ni en shiny (bug B-1 de la v3)', () => {
    const missingSpecies = [...sprites.missing.normal, ...sprites.missing.shiny].filter(
      (id) => id <= 1025,
    );
    expect(missingSpecies).toEqual([]);
  });

  it('listes triées sans doublon', () => {
    for (const list of [sprites.missing.normal, sprites.missing.shiny, sprites.identicalShiny]) {
      expect([...list].sort((a, b) => a - b)).toEqual(list);
      expect(new Set(list).size).toBe(list.length);
    }
  });

  it("sans image normale, il n'y a pas non plus de shiny ; les faux shiny sont écartés", () => {
    for (const id of sprites.missing.normal) expect(sprites.missing.shiny).toContain(id);
    for (const id of sprites.identicalShiny) expect(sprites.missing.shiny).toContain(id);
  });

  it('un shiny de repli vient de la même source que son normal (pas de mélange 2D/3D)', () => {
    for (const [source, ids] of Object.entries(sprites.fallbacks.shiny)) {
      const normalIds = (sprites.fallbacks.normal as Record<string, number[]>)[source] ?? [];
      for (const id of ids) expect(normalIds, `#${id} (${source})`).toContain(id);
    }
  });

  it('source épinglée sur un commit', () => {
    expect(sprites.source.commit).toMatch(/^[0-9a-f]{40}$/);
    expect(sprites.schemaVersion).toBe(2);
  });

  it('couvre bien toutes les entrées du dex', () => {
    expect(dex.length).toBeGreaterThan(1300);
  });
});
