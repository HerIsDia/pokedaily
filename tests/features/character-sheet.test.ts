import { describe, expect, it } from 'vitest';
import type { PokemonEntry } from '../../src/core/model';
import { buildCharacterSheet, sheetFilename } from '../../src/features/card/character-sheet';
import { createI18n } from '../../src/i18n';

const entry: PokemonEntry = {
  id: 25,
  natureKey: 'jolly',
  level: 42,
  isShiny: true,
  day: '2026-05-01',
  rename: 'Sparky',
};

describe('fiche personnage (Markdown)', () => {
  it('nomme le fichier avec le jour', () => {
    expect(sheetFilename(entry)).toBe('pokedaily-2026-05-01-fiche.md');
  });

  it('en français : identité, tableau, horoscope et lignes à compléter', () => {
    const sheet = buildCharacterSheet(entry, createI18n('fr'));
    expect(sheet).toContain('# Sparky');
    expect(sheet).toContain('*Vendredi 1 mai*');
    expect(sheet).toContain('> N°0025 · Électrik · ✦ Shiny');
    expect(sheet).toContain('| **Espèce** | Pikachu |');
    expect(sheet).toContain('| **Niv.** | 42 |');
    expect(sheet).toContain('| **Nature** | Jovial |');
    expect(sheet).toContain('## Ce que disent les astres');
    expect(sheet).toMatch(/- Nature Jovial : .+ en hausse \(\+10 %\), .+ en baisse/);
    expect(sheet).toContain('## À toi de jouer');
    expect(sheet).toContain('- Sa phrase fétiche :');
    expect(sheet).toContain('pokedaily.vercel.app');
  });

  it('en anglais, sans surnom ni shiny', () => {
    const sheet = buildCharacterSheet({ ...entry, rename: '', isShiny: false }, createI18n('en'));
    expect(sheet).toContain('# Pikachu');
    expect(sheet).toContain('> N°0025 · Electric\n');
    expect(sheet).not.toContain('Shiny');
    expect(sheet).toContain('## Your turn');
  });

  it('un Pokémon à nature neutre ne promet aucun effet', () => {
    const sheet = buildCharacterSheet({ ...entry, natureKey: 'hardy' }, createI18n('fr'));
    expect(sheet).toContain('aucun effet sur les statistiques');
  });

  it('est déterministe', () => {
    const i18n = createI18n('fr');
    expect(buildCharacterSheet(entry, i18n)).toBe(buildCharacterSheet(entry, i18n));
  });
});
