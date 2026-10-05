import { describe, expect, it } from 'vitest';
import {
  SOURCE,
  normalizeAvailability,
  parseIds,
  parseSizes,
  sourceUrl,
  spriteFile,
  stringifyAvailability,
} from '../../scripts/lib/sprites.ts';

describe('sprites : adresses et noms', () => {
  it('construit les adresses de la source, épinglée sur un commit précis', () => {
    expect(SOURCE.commit).toMatch(/^[0-9a-f]{40}$/);
    expect(sourceUrl(25, false)).toBe(
      `https://raw.githubusercontent.com/PokeAPI/sprites/${SOURCE.commit}/sprites/pokemon/other/home/25.png`,
    );
    expect(sourceUrl(10034, true)).toMatch(/\/home\/shiny\/10034\.png$/);
  });

  it('nomme les fichiers générés', () => {
    expect(spriteFile(25, false)).toBe('25.webp');
    expect(spriteFile(25, true)).toBe('25s.webp');
    expect(spriteFile(10034, false)).toBe('10034.webp');
  });
});

describe('arguments', () => {
  it('parseSizes : défaut, tri, doublons, validation', () => {
    expect(parseSizes(undefined)).toEqual([128, 256, 512]);
    expect(parseSizes('512, 128,512')).toEqual([128, 512]);
    expect(() => parseSizes('10')).toThrow(/invalide/);
    expect(() => parseSizes('abc')).toThrow(/invalide/);
    expect(() => parseSizes('2000')).toThrow(/invalide/);
  });

  it('parseIds', () => {
    expect(parseIds(undefined)).toBeUndefined();
    expect(parseIds('25, 10034')).toEqual([25, 10034]);
    expect(() => parseIds('0')).toThrow();
    expect(() => parseIds('x')).toThrow();
  });
});

describe('disponibilité', () => {
  it('trie et dédoublonne ; le JSON écrit est valide et stable', () => {
    const input = {
      missing: { normal: [5, 3, 5], shiny: [9] },
      extras: { normal: [], shiny: [2, 1] },
    };
    expect(normalizeAvailability(input).missing.normal).toEqual([3, 5]);
    const text = stringifyAvailability(input);
    const parsed = JSON.parse(text);
    expect(parsed.missing).toEqual({ normal: [3, 5], shiny: [9] });
    expect(parsed.extras.shiny).toEqual([1, 2]);
    expect(parsed.source.repo).toBe('PokeAPI/sprites');
    expect(stringifyAvailability(input)).toBe(text); // reproductible
  });
});
