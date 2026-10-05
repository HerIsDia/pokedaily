import { describe, expect, it } from 'vitest';
import sprites from '../../src/data/sprites.json';
import { dex, getEntry } from '../../src/data';

describe('disponibilité des images (générée par `pnpm sprites`)', () => {
  const ids = [
    ...sprites.missing.normal,
    ...sprites.missing.shiny,
    ...sprites.extras.normal,
    ...sprites.extras.shiny,
  ];

  it('ne parle que de Pokémon qui existent', () => {
    for (const id of ids) expect(getEntry(id), `#${id}`).toBeDefined();
  });

  it('AUCUNE espèce (1–1025) ne manque, ni en normal ni en shiny (bug B-1 de la v3)', () => {
    const missingSpecies = [...sprites.missing.normal, ...sprites.missing.shiny].filter(
      (id) => id <= 1025,
    );
    expect(missingSpecies).toEqual([]);
  });

  it('seules des formes peuvent manquer, et listes triées sans doublon', () => {
    for (const list of [sprites.missing.normal, sprites.missing.shiny]) {
      expect([...list].sort((a, b) => a - b)).toEqual(list);
      expect(new Set(list).size).toBe(list.length);
    }
    expect(dex.length).toBeGreaterThan(1300);
  });

  it("une forme sans image normale n'a pas non plus d'image shiny", () => {
    for (const id of sprites.missing.normal) {
      expect(sprites.missing.shiny, `#${id}`).toContain(id);
    }
  });

  it('source épinglée sur un commit', () => {
    expect(sprites.source.commit).toMatch(/^[0-9a-f]{40}$/);
  });
});
