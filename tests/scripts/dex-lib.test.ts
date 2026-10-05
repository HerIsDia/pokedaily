import { describe, expect, it } from 'vitest';
import {
  applyOverrides,
  classifyForm,
  findDuplicateNames,
  idFromUrl,
  pickName,
  stringifyRows,
  type DexEntry,
} from '../../scripts/lib/dex.ts';

describe('classifyForm', () => {
  it.each([
    ['charizard-mega-x', 'mega'],
    ['charizard-mega-y', 'mega'],
    ['venusaur-mega', 'mega'],
    ['meowstic-female-mega', 'mega'],
    ['charizard-gmax', 'gmax'],
    ['urshifu-single-strike-gmax', 'gmax'],
    ['pikachu-gmax', 'gmax'],
    ['raichu-alola', 'alola'],
    ['darumaka-galar', 'galar'],
    ['darmanitan-galar-zen', 'galar'],
    ['zorua-hisui', 'hisui'],
    ['tauros-paldea-blaze-breed', 'paldea'],
    ['groudon-primal', 'primal'],
    ['gumshoos-totem', 'totem'],
    ['raticate-totem-alola', 'totem'], // totem l'emporte sur alola
    ['pikachu-rock-star', 'costume'],
    ['pikachu-sinnoh-cap', 'costume'],
    ['pikachu-alola-cap', 'costume'], // casquette, pas « alola »
    ['pikachu-starter', 'partner'],
    ['eevee-starter', 'partner'],
    ['deoxys-attack', 'other'],
    ['minior-red', 'other'],
    ['koraidon-limited-build', 'other'],
  ])('%s → %s', (slug, expected) => expect(classifyForm(slug)).toBe(expected));
});

describe('helpers', () => {
  it('idFromUrl', () => {
    expect(idFromUrl('https://pokeapi.co/api/v2/pokemon-species/25/')).toBe(25);
    expect(idFromUrl('https://pokeapi.co/api/v2/pokemon/10034')).toBe(10034);
    expect(() => idFromUrl('https://pokeapi.co/api/v2/pokemon/')).toThrow();
  });

  it('pickName choisit la bonne langue et ignore le vide', () => {
    const names = [
      { language: { name: 'en' }, name: 'Pikachu' },
      { language: { name: 'fr' }, name: '  ' },
    ];
    expect(pickName(names, 'en')).toBe('Pikachu');
    expect(pickName(names, 'fr')).toBeUndefined();
    expect(pickName(undefined, 'fr')).toBeUndefined();
  });

  const entry = (id: number, fr: string, en = fr): DexEntry => ({
    id,
    speciesId: id,
    fr,
    en,
    types: ['normal'],
  });

  it('applyOverrides ne touche que ce qui est indiqué', () => {
    const out = applyOverrides([entry(1, 'A', 'a'), entry(2, 'B', 'b')], {
      names: { '2': { fr: 'Béta', source: 'test' } },
    });
    expect(out[0]).toEqual(entry(1, 'A', 'a'));
    expect(out[1]).toMatchObject({ fr: 'Béta', en: 'b' });
  });

  it('findDuplicateNames repère les doublons par langue', () => {
    const list = [entry(1, 'X', 'one'), entry(2, 'X', 'two'), entry(3, 'Y', 'two')];
    expect(findDuplicateNames(list, 'fr')).toEqual([['X', [1, 2]]]);
    expect(findDuplicateNames(list, 'en')).toEqual([['two', [2, 3]]]);
  });

  it('stringifyRows donne un JSON valide, une ligne par entrée, sans date', () => {
    const text = stringifyRows({ schemaVersion: 1 }, 'rows', [{ a: 1 }, { a: 2 }]);
    expect(JSON.parse(text)).toEqual({ schemaVersion: 1, rows: [{ a: 1 }, { a: 2 }] });
    expect(text.split('\n').filter((l) => l.includes('"a"'))).toHaveLength(2);
    expect(text).not.toMatch(/\d{4}-\d{2}-\d{2}/);
  });
});
