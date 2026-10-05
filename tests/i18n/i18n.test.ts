import { describe, expect, it, vi } from 'vitest';
import { en } from '../../src/i18n/en';
import { fr } from '../../src/i18n/fr';
import { createI18n, detectLang } from '../../src/i18n';
import { POKEMON_TYPES } from '../../src/core/pokemon-types';

describe('dictionnaires', () => {
  it('FR et EN ont exactement les mêmes clés', () => {
    expect(Object.keys(en).sort()).toEqual(Object.keys(fr).sort());
  });

  it("aucune traduction n'est vide", () => {
    for (const dict of [fr, en]) {
      for (const [key, value] of Object.entries(dict)) expect(value.trim(), key).not.toBe('');
    }
  });

  it('les 18 types ont un nom dans les deux langues', () => {
    for (const type of POKEMON_TYPES) {
      expect(fr[`type.${type}`]).toBeTruthy();
      expect(en[`type.${type}`]).toBeTruthy();
    }
  });

  it('les paramètres {…} sont les mêmes dans les deux langues', () => {
    const params = (s: string) => [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();
    for (const key of Object.keys(fr) as (keyof typeof fr)[]) {
      expect(params(en[key]), key).toEqual(params(fr[key]));
    }
  });
});

describe('detectLang', () => {
  it.each([
    ['?lang=en', null, 'fr-FR', 'en'],
    ['?lang=fr', 'en', 'en-US', 'fr'],
    ['', 'en', 'fr-FR', 'en'],
    ['', null, 'fr-CA', 'fr'],
    ['', null, 'de-DE', 'en'],
    ['?lang=zz', null, 'fr', 'fr'],
    ['', 'zz', 'en', 'en'],
  ])('%j / stocké=%j / navigateur=%j → %s', (search, stored, browser, expected) => {
    expect(detectLang(search, stored, browser)).toBe(expected);
  });
});

describe('createI18n', () => {
  it('traduit, remplace les paramètres et change de langue', () => {
    const i18n = createI18n('fr');
    expect(i18n.t('card.level')).toBe('Niv.');
    expect(i18n.t('about.version', { version: '9.9' })).toBe('Version 9.9');
    i18n.setLang('en');
    expect(i18n.t('card.level')).toBe('Lv.');
  });

  it('prévient quand la langue change (pour la mémoriser) mais pas si elle est identique', () => {
    const onChange = vi.fn();
    const i18n = createI18n('fr', onChange);
    i18n.setLang('fr');
    i18n.setLang('en');
    expect(onChange).toHaveBeenCalledExactlyOnceWith('en');
  });
});
