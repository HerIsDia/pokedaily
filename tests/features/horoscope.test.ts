import { beforeEach, describe, expect, it } from 'vitest';
import { natures } from '../../src/data';
import { natureLines, typeLines } from '../../src/data/horoscope';
import { POKEMON_TYPES } from '../../src/core/pokemon-types';
import type { PokemonEntry } from '../../src/core/model';
import { createHoroscope } from '../../src/features/horoscope/horoscope';
import { createI18n } from '../../src/i18n';
import { Scope } from '../../src/ui/scope';
import { createStore } from '../../src/ui/store';

describe('textes de l’horoscope', () => {
  it('chaque nature (25) et chaque type (18) a sa phrase en français ET en anglais', () => {
    expect(natures).toHaveLength(25);
    for (const n of natures) {
      expect(natureLines[n.key]?.fr, n.key).toBeTruthy();
      expect(natureLines[n.key]?.en, n.key).toBeTruthy();
    }
    expect(Object.keys(natureLines).sort()).toEqual(natures.map((n) => n.key).sort());
    for (const type of POKEMON_TYPES) {
      expect(typeLines[type]?.fr, type).toBeTruthy();
      expect(typeLines[type]?.en, type).toBeTruthy();
    }
  });

  it('phrases courtes, tutoiement, jamais de vouvoiement', () => {
    const all = [...Object.values(natureLines), ...Object.values(typeLines)];
    for (const line of all) {
      expect(line.fr.length, line.fr).toBeLessThan(110);
      expect(line.en.length, line.en).toBeLessThan(120);
      expect(line.fr, line.fr).not.toMatch(/\bvous\b|\bvotre\b|\bvos\b|\bvotre\b/i);
    }
  });

  it('les natures ont leurs effets (PokéAPI) : 20 avec +/−, 5 neutres', () => {
    expect(natures.filter((n) => n.up && n.down)).toHaveLength(20);
    expect(natures.filter((n) => !n.up && !n.down)).toHaveLength(5);
    expect(natures.find((n) => n.key === 'jolly')).toMatchObject({
      up: 'speed',
      down: 'special-attack',
    });
    expect(natures.find((n) => n.key === 'adamant')).toMatchObject({
      up: 'attack',
      down: 'special-attack',
    });
  });
});

describe('horoscope affiché', () => {
  beforeEach(() => document.body.replaceChildren());
  const entry = (id: number, natureKey: string): PokemonEntry => ({
    id,
    natureKey,
    level: 10,
    isShiny: false,
    day: '2026-05-20',
    rename: '',
  });

  it('une phrase de nature + une par type + l’effet de la nature', () => {
    const root = createHoroscope({
      i18n: createI18n('fr'),
      scope: new Scope(),
      entry: createStore(entry(25, 'jolly')), // Pikachu : électrique
    });
    const lines = [...root.querySelectorAll('.horoscope-line')].map((n) => n.textContent);
    expect(lines).toEqual([natureLines.jolly!.fr, typeLines.electric.fr]);
    expect(root.querySelector('.horoscope-effect')?.textContent).toBe(
      'Nature Jovial : Vitesse en hausse (+10 %), Attaque spéciale en baisse (−10 %).',
    );
  });

  it('deux types : deux phrases de type ; nature neutre : le dit', () => {
    const root = createHoroscope({
      i18n: createI18n('fr'),
      scope: new Scope(),
      entry: createStore(entry(6, 'hardy')), // Dracaufeu : feu / vol
    });
    expect(root.querySelectorAll('.horoscope-line')).toHaveLength(3);
    expect(root.querySelector('.horoscope-effect')?.textContent).toBe(
      'Nature Hardi : aucun effet sur les statistiques.',
    );
  });

  it('suit le changement de langue et de Pokémon', () => {
    const i18n = createI18n('fr');
    const store = createStore(entry(25, 'jolly'));
    const root = createHoroscope({ i18n, scope: new Scope(), entry: store });
    i18n.setLang('en');
    expect(root.querySelector('.horoscope-title')?.textContent).toContain('horoscope');
    expect(root.querySelector('.horoscope-effect')?.textContent).toBe(
      'Jolly nature: Speed up (+10%), Special Attack down (−10%).',
    );
    store.set(entry(7, 'bold')); // Carapuce, nature Assuré
    expect(root.querySelector('.horoscope-line')?.textContent).toBe(natureLines.bold!.en);
  });
});
