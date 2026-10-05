import { describe, expect, it } from 'vitest';
import { drawOfTheDay } from '../../src/core/draw';
import type { EventModifiers, GameEvent } from '../../src/core/events/types';
import { INITIAL_FORM_PITY } from '../../src/core/form-pity';
import { seededRng } from '../../src/core/rng';
import { testPool } from './helpers';

const day = '2026-10-31';
const always = { next: () => 0 }; // tous les jets de chance réussissent
const never = { next: () => 0.9999999 }; // tous les jets < 1 échouent

/** Événement actif TOUS les 31 octobre, pour les tests. */
function ev(modifiers: EventModifiers, id = 'e'): GameEvent {
  return {
    id,
    nameFr: id,
    nameEn: id,
    descriptionFr: id,
    descriptionEn: id,
    type: 'recurring_date',
    month: 10,
    day: 31,
    modifiers,
  };
}

const draw = (over: Partial<Parameters<typeof drawOfTheDay>[0]> = {}) =>
  drawOfTheDay({
    day,
    rng: seededRng(1),
    pool: testPool,
    events: [],
    pity: INITIAL_FORM_PITY,
    ...over,
  });

describe('tirage ordinaire', () => {
  it('même graine → même résultat (reproductible)', () => {
    expect(draw({ rng: seededRng(42) })).toEqual(draw({ rng: seededRng(42) }));
  });

  it('des graines différentes donnent des Pokémon différents', () => {
    const ids = new Set(Array.from({ length: 40 }, (_, s) => draw({ rng: seededRng(s) }).entry.id));
    expect(ids.size).toBeGreaterThan(5);
  });

  it('une espèce, avec le jour du tirage, sans surnom ni ticket', () => {
    const r = draw({ rng: never });
    expect(r.reason).toBe('species');
    expect(testPool.species).toContain(r.entry.id);
    expect(r.entry.day).toBe(day);
    expect(r.entry.rename).toBe('');
    expect(r.tickets).toBe(0);
    expect(r.boxes).toEqual([]);
  });

  it('chaque espèce peut sortir, à égalité', () => {
    const counts = new Map<number, number>();
    const rng = seededRng(8);
    const n = 46_000;
    for (let i = 0; i < n; i++) {
      const { entry } = draw({ rng });
      counts.set(entry.id, (counts.get(entry.id) ?? 0) + 1);
    }
    // 23 espèces ; les formes (pourcentage progressif) ne sont pas dans ce décompte
    const speciesCounts = testPool.species.map((id) => counts.get(id) ?? 0);
    expect(Math.min(...speciesCounts)).toBeGreaterThan(0);
    const spread = Math.max(...speciesCounts) / Math.min(...speciesCounts);
    expect(spread).toBeLessThan(1.2);
  });
});

describe('pourcentage progressif dans le tirage', () => {
  it('compteur à 99 jours sans forme : une FORME est garantie, et le compteur repart à 0', () => {
    const r = draw({ rng: never, pity: { daysWithoutForm: 99 } });
    expect(r.reason).toBe('form');
    expect(testPool.forms).toContain(r.entry.id);
    expect(r.pity).toEqual({ daysWithoutForm: 0 });
  });

  it('jour sans forme : le compteur avance de 1', () => {
    const r = draw({ rng: never, pity: { daysWithoutForm: 4 } });
    expect(r.reason).toBe('species');
    expect(r.pity).toEqual({ daysWithoutForm: 5 });
  });

  it('une forme est tirée parmi toutes les formes, à égalité', () => {
    const counts = new Map<number, number>();
    const rng = seededRng(5);
    for (let i = 0; i < 30_000; i++) {
      const r = draw({ rng, pity: { daysWithoutForm: 99 } });
      counts.set(r.entry.id, (counts.get(r.entry.id) ?? 0) + 1);
    }
    expect([...counts.keys()].sort()).toEqual([...testPool.forms].sort());
    for (const n of counts.values()) expect(n / 30_000).toBeCloseTo(1 / 3, 1);
  });

  it('sans aucune forme tirable : pas de plantage, on tire une espèce', () => {
    const noForms = { ...testPool, forms: [] };
    const r = draw({ pool: noForms, rng: always, pity: { daysWithoutForm: 99 } });
    expect(r.reason).toBe('species');
  });

  it('au fil des jours, on retrouve ≈ 12 jours entre deux formes', () => {
    const rng = seededRng(2027);
    let pity = INITIAL_FORM_PITY;
    let forms = 0;
    const days = 30_000;
    for (let i = 0; i < days; i++) {
      const r = draw({ rng, pity });
      pity = r.pity;
      if (r.reason === 'form') forms++;
    }
    expect(days / forms).toBeGreaterThan(11.7);
    expect(days / forms).toBeLessThan(12.7);
  });
});

describe('événements', () => {
  it('Pokémon imposé : reason « event »', () => {
    const r = draw({ events: [ev({ forcedPokemonId: 5, forcedPokemonChance: 1 })], rng: never });
    expect(r.entry.id).toBe(5);
    expect(r.reason).toBe('event');
    expect(r.effects.eventIds).toEqual(['e']);
  });

  it('un événement inactif ce jour-là ne change rien', () => {
    const other: GameEvent = {
      ...ev({ forcedPokemonId: 5, forcedPokemonChance: 1 }),
      day: 30,
    } as GameEvent;
    expect(draw({ events: [other], rng: never }).reason).toBe('species');
  });

  it('Pokémon imposé mais SANS image : ignoré (jamais d’image cassée)', () => {
    const r = draw({ events: [ev({ forcedPokemonId: 999, forcedPokemonChance: 1 })], rng: never });
    expect(r.reason).not.toBe('event');
    expect(testPool.isDrawable(r.entry.id)).toBe(true);
  });

  it('un événement qui impose une FORME remet le compteur à zéro', () => {
    const r = draw({
      events: [ev({ forcedPokemonId: 10001, forcedPokemonChance: 1 })],
      rng: never,
      pity: { daysWithoutForm: 30 },
    });
    expect(r.entry.id).toBe(10001);
    expect(r.pity).toEqual({ daysWithoutForm: 0 });
  });

  it('un événement qui impose une ESPÈCE ne fait pas perdre la progression (le compteur avance)', () => {
    const r = draw({
      events: [ev({ forcedPokemonId: 5, forcedPokemonChance: 1 })],
      rng: never,
      pity: { daysWithoutForm: 30 },
    });
    expect(r.pity).toEqual({ daysWithoutForm: 31 });
  });

  it('shiny garanti, niveau imposé', () => {
    const r = draw({
      events: [
        ev({ forcedShiny: true, forcedLevel: 69, forcedPokemonId: 5, forcedPokemonChance: 1 }),
      ],
    });
    expect(r.entry).toMatchObject({ id: 5, isShiny: true, level: 69 });
  });

  it('shiny garanti mais Pokémon sans image shiny : pas shiny', () => {
    const r = draw({
      events: [ev({ forcedShiny: true, forcedPokemonId: 7, forcedPokemonChance: 1 })],
    });
    expect(r.entry).toMatchObject({ id: 7, isShiny: false });
  });

  it('niveau 100 uniquement par événement', () => {
    expect(draw({ events: [ev({ forcedLevel: 100 })] }).entry.level).toBe(100);
  });

  it('tickets Victini : ceux de l’événement', () => {
    const r = draw({ events: [ev({ victiniTicketsMin: 2, victiniTicketsMax: 2 })], rng: never });
    expect(r.tickets).toBe(2);
  });

  it('obtenir Victini rapporte 1 ticket (en plus de ceux de l’événement)', () => {
    const plain = draw({
      events: [ev({ forcedPokemonId: 494, forcedPokemonChance: 1 })],
      rng: never,
    });
    expect(plain.entry.id).toBe(494);
    expect(plain.tickets).toBe(1);
    const withTickets = draw({
      events: [
        ev({
          forcedPokemonId: 494,
          forcedPokemonChance: 1,
          victiniTicketsMin: 2,
          victiniTicketsMax: 2,
        }),
      ],
      rng: never,
    });
    expect(withTickets.tickets).toBe(3);
  });

  it('boîtes spéciales offertes avec leur durée de validité', () => {
    const r = draw({ events: [ev({ luckyDayBox: true }, 'a'), ev({ aprilFoolsBox: true }, 'b')] });
    expect(r.boxes.map((b) => b.kind)).toEqual(['lucky_day', 'april_fools']);
    for (const box of r.boxes) {
      expect(box.receivedDay).toBe(day);
      expect(box.validUntil).toBe('2026-11-06');
      expect(box.ids).toHaveLength(16);
    }
  });
});
