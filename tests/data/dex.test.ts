import { describe, expect, it } from 'vitest';
import { POKEMON_TYPES } from '../../src/core/pokemon-types';
import { DEX_SIZE, dex, forms, getEntry, getNature, natures, species } from '../../src/data';

describe('données Pokémon (générées par `pnpm dex`)', () => {
  it('contient les 1 025 espèces, numérotées de 1 à 1025 sans trou', () => {
    expect(DEX_SIZE).toBe(1025);
    expect(species.map((e) => e.id)).toEqual(Array.from({ length: 1025 }, (_, i) => i + 1));
  });

  it('contient les 326 formes alternatives (toutes, sans exception)', () => {
    expect(forms).toHaveLength(326);
    for (const form of forms) expect(form.id).toBeGreaterThan(10000);
  });

  it('chaque forme appartient à une espèce qui existe', () => {
    for (const form of forms) {
      expect(getEntry(form.speciesId)?.form, `forme #${form.id}`).toBeUndefined();
      expect(getEntry(form.speciesId), `forme #${form.id}`).toBeDefined();
    }
  });

  it('les identifiants sont uniques', () => {
    expect(new Set(dex.map((e) => e.id)).size).toBe(dex.length);
  });

  it('toutes les entrées ont un nom FR et EN lisible (jamais un identifiant technique)', () => {
    for (const e of dex) {
      expect(e.fr.trim(), `#${e.id} fr`).not.toBe('');
      expect(e.en.trim(), `#${e.id} en`).not.toBe('');
      if (e.form) {
        expect(e.en, `#${e.id} en`).not.toBe(e.form.slug);
        expect(e.fr, `#${e.id} fr`).not.toBe(e.form.slug);
      }
    }
  });

  it('chaque entrée a 1 ou 2 types valides', () => {
    for (const e of dex) {
      expect(e.types.length, `#${e.id}`).toBeGreaterThanOrEqual(1);
      expect(e.types.length, `#${e.id}`).toBeLessThanOrEqual(2);
      for (const type of e.types) expect(POKEMON_TYPES).toContain(type);
    }
  });

  it('aucun doublon de nom entre formes (même langue)', () => {
    for (const lang of ['fr', 'en'] as const) {
      const names = forms.map((f) => f[lang]);
      expect(
        names.filter((n, i) => names.indexOf(n) !== i),
        lang,
      ).toEqual([]);
    }
  });

  it('exemples connus', () => {
    expect(getEntry(25)).toMatchObject({ fr: 'Pikachu', en: 'Pikachu', types: ['electric'] });
    expect(getEntry(6)).toMatchObject({ fr: 'Dracaufeu', en: 'Charizard' });
    expect(getEntry(10034)).toMatchObject({
      fr: 'Méga-Dracaufeu X',
      en: 'Mega Charizard X',
      speciesId: 6,
      form: { slug: 'charizard-mega-x', category: 'mega' },
    });
    expect(getEntry(10264)?.en).toBe('Limited Build Koraidon'); // nom ajouté à la main (override)
  });

  it('25 natures, avec noms FR et EN', () => {
    expect(natures).toHaveLength(25);
    expect(getNature('jolly')).toMatchObject({ fr: 'Jovial', en: 'Jolly' });
    for (const n of natures) {
      expect(n.fr).toBeTruthy();
      expect(n.en).toBeTruthy();
    }
  });
});
