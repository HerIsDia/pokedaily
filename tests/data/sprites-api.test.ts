import { describe, expect, it } from 'vitest';
import { forms, species } from '../../src/data';
import { canBeShiny, hasSprite, isDrawable, spriteSource, spriteUrl } from '../../src/data/sprites';
import { createSampleEntry } from '../../src/features/card/sample-entry';

describe('accès aux images', () => {
  it('toute espèce a une image normale ET shiny, issues du rendu de référence « home »', () => {
    for (const e of species) {
      expect(hasSprite(e.id), `#${e.id}`).toBe(true);
      expect(canBeShiny(e.id), `#${e.id}`).toBe(true);
    }
    expect(spriteSource(25)).toBe('home');
    expect(spriteSource(774, true)).toBe('home'); // Minior shiny : manquait en v3
  });

  it('les formes de repli sont identifiées (style différent de « home »)', () => {
    expect(spriteSource(10080)).toBe('official-artwork'); // Pikachu Rockeur
    expect(spriteSource(10264)).toBe('scarlet-violet'); // Koraidon, forme limitée
  });

  it("une forme sans aucune image n'est jamais tirée au sort", () => {
    expect(isDrawable(10266)).toBe(false); // koraidon-swimming-build
    expect(isDrawable(10270)).toBe(false); // miraidon-aquatic-mode
    expect(forms.filter((f) => !isDrawable(f.id))).toHaveLength(2);
  });

  it('un Pokémon sans image shiny ne peut pas être shiny', () => {
    expect(canBeShiny(10096)).toBe(false); // casquette Sinnoh : shiny inexistant
    expect(canBeShiny(10277)).toBe(false); // Terapagos stellaire : shiny identique au normal
    expect(spriteSource(10096, true)).toBeNull();
  });

  it("spriteUrl retombe sur l'image normale quand le shiny n'existe pas", () => {
    expect(spriteUrl(25, false, 512)).toBe('/sprites/512/25.webp');
    expect(spriteUrl(25, true, 256)).toBe('/sprites/256/25s.webp');
    expect(spriteUrl(10096, true, 512)).toBe('/sprites/512/10096.webp');
  });
});

describe("entrée d'essai (paramètres d'adresse, développement)", () => {
  it('valeurs par défaut et paramètres valides', () => {
    expect(createSampleEntry('')).toMatchObject({
      id: 25,
      level: 42,
      natureKey: 'jolly',
      isShiny: false,
    });
    expect(createSampleEntry('?id=10034&shiny=1&level=88&nature=timid')).toMatchObject({
      id: 10034,
      level: 88,
      natureKey: 'timid',
      isShiny: true,
    });
  });

  it('ignore les valeurs invalides', () => {
    expect(createSampleEntry('?id=99999&level=500&nature=nope')).toMatchObject({
      id: 25,
      level: 42,
      natureKey: 'jolly',
    });
  });

  it('refuse un shiny impossible', () => {
    expect(createSampleEntry('?id=10096&shiny=1').isShiny).toBe(false);
  });
});
