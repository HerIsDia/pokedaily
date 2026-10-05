import { describe, expect, it } from 'vitest';
import {
  SOURCE,
  SPRITE_SOURCES,
  emptyAvailability,
  normalizeAvailability,
  parseIds,
  parseSizes,
  sourceUrl,
  spriteFile,
  stringifyAvailability,
} from '../../scripts/lib/sprites.ts';

describe('sprites : adresses et noms', () => {
  it('la chaîne de repli commence par « home » et les adresses sont distinctes', () => {
    expect(SPRITE_SOURCES[0]).toBe('home');
    const urls = SPRITE_SOURCES.map((s) => sourceUrl(10265, false, s));
    expect(new Set(urls).size).toBe(SPRITE_SOURCES.length);
    expect(urls[1]).toContain('/other/official-artwork/10265.png');
    expect(urls[2]).toContain('/versions/generation-ix/scarlet-violet/10265.png');
    expect(sourceUrl(10265, true, 'official-artwork')).toContain(
      '/official-artwork/shiny/10265.png',
    );
  });

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
    expect(parseSizes(undefined)).toEqual([128, 512]);
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
  const input = {
    missing: { normal: [5, 3, 5], shiny: [9] },
    extras: { normal: [], shiny: [2, 1] },
    fallbacks: {
      normal: { 'official-artwork': [20, 10], 'scarlet-violet': [] },
      shiny: {},
    },
    identicalShiny: [7, 7, 4],
  };

  it('trie et dédoublonne ; les listes de repli vides disparaissent', () => {
    const n = normalizeAvailability(input);
    expect(n.missing.normal).toEqual([3, 5]);
    expect(n.fallbacks.normal).toEqual({ 'official-artwork': [10, 20] });
    expect(n.identicalShiny).toEqual([4, 7]);
  });

  it('le JSON écrit est valide, complet et reproductible', () => {
    const text = stringifyAvailability(input);
    const parsed = JSON.parse(text);
    expect(parsed.schemaVersion).toBe(2);
    expect(parsed.missing).toEqual({ normal: [3, 5], shiny: [9] });
    expect(parsed.extras.shiny).toEqual([1, 2]);
    expect(parsed.fallbacks.normal['official-artwork']).toEqual([10, 20]);
    expect(parsed.identicalShiny).toEqual([4, 7]);
    expect(parsed.source.repo).toBe('PokeAPI/sprites');
    expect(stringifyAvailability(input)).toBe(text);
  });

  it('emptyAvailability part de rien', () => {
    expect(stringifyAvailability(emptyAvailability())).toContain('"identicalShiny": []');
  });
});
