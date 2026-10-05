import { describe, expect, it } from 'vitest';
import { SHINY_RATE } from '../../src/core/constants';
import { resolveEventEffects } from '../../src/core/events/effects';
import { activeEvents } from '../../src/core/events/engine';
import type { EventModifiers, GameEvent } from '../../src/core/events/types';
import { seededRng } from '../../src/core/rng';
import { events } from '../../src/data/events';

const always = { next: () => 0 }; // tous les jets de chance réussissent
const never = { next: () => 0.999999 }; // tous les jets < 1 échouent

function ev(id: string, modifiers: EventModifiers): GameEvent {
  return {
    id,
    nameFr: id,
    nameEn: id,
    descriptionFr: id,
    descriptionEn: id,
    type: 'recurring_date',
    month: 1,
    day: 1,
    modifiers,
  };
}

describe('resolveEventEffects', () => {
  it('sans événement : rien ne change (chance shiny 1/69)', () => {
    expect(resolveEventEffects([], always)).toEqual({
      forcedPokemonId: null,
      forcedShiny: false,
      shinyRate: SHINY_RATE,
      forcedLevel: null,
      tickets: 0,
      boxes: [],
      eventIds: [],
    });
  });

  it('Pokémon forcé : selon la chance de l’événement', () => {
    const e = ev('a', { forcedPokemonId: 132, forcedPokemonChance: 0.1 });
    expect(resolveEventEffects([e], always).forcedPokemonId).toBe(132);
    expect(resolveEventEffects([e], never).forcedPokemonId).toBeNull();
    // 100 % = toujours
    const sure = ev('b', { forcedPokemonId: 129, forcedPokemonChance: 1 });
    expect(resolveEventEffects([sure], never).forcedPokemonId).toBe(129);
  });

  it('liste de Pokémon : en choisit un dans la liste, uniformément', () => {
    const e = ev('a', { forcedPokemonIds: [10, 20, 30], forcedPokemonChance: 1 });
    const rng = seededRng(5);
    const counts = new Map<number, number>();
    for (let i = 0; i < 9000; i++) {
      const id = resolveEventEffects([e], rng).forcedPokemonId!;
      counts.set(id, (counts.get(id) ?? 0) + 1);
    }
    expect([...counts.keys()].sort()).toEqual([10, 20, 30]);
    for (const n of counts.values()) expect(n / 9000).toBeCloseTo(1 / 3, 1);
  });

  it('fréquence réelle du Pokémon forcé (Pokopia : Métamorph 10 %)', () => {
    const pokopia = events.find((e) => e.id === 'pokopia_2026')!;
    const rng = seededRng(21);
    let forced = 0;
    for (let i = 0; i < 50_000; i++) {
      if (resolveEventEffects([pokopia], rng).forcedPokemonId === 132) forced++;
    }
    expect(forced / 50_000).toBeCloseTo(0.1, 1);
  });

  it('plusieurs événements : le dernier jet réussi l’emporte', () => {
    const a = ev('a', { forcedPokemonId: 1, forcedPokemonChance: 1 });
    const b = ev('b', { forcedPokemonId: 2, forcedPokemonChance: 1 });
    expect(resolveEventEffects([a, b], always).forcedPokemonId).toBe(2);
    const c = ev('c', { forcedPokemonId: 3, forcedPokemonChance: 0.5 });
    // c échoue (jet 0.999) : a l'emporte
    expect(resolveEventEffects([a, c], never).forcedPokemonId).toBe(1);
  });

  it('shiny : la MEILLEURE chance gagne, quel que soit l’ordre (la v3.1 prenait le dernier)', () => {
    const a = ev('a', { shinyRate: 13 });
    const b = ev('b', { shinyRate: 30 });
    expect(resolveEventEffects([a, b], always).shinyRate).toBe(13);
    expect(resolveEventEffects([b, a], always).shinyRate).toBe(13);
  });

  it("un événement REMPLACE la chance par défaut, même s'il la rend moins bonne (Poisson d'avril : 1/100)", () => {
    expect(resolveEventEffects([ev('a', { shinyRate: 100 })], always).shinyRate).toBe(100);
    // mais avec un événement plus généreux le même jour, le meilleur gagne
    expect(
      resolveEventEffects([ev('a', { shinyRate: 100 }), ev('b', { shinyRate: 13 })], always)
        .shinyRate,
    ).toBe(13);
  });

  it('shiny forcé : un seul événement suffit', () => {
    expect(
      resolveEventEffects([ev('a', {}), ev('b', { forcedShiny: true })], always).forcedShiny,
    ).toBe(true);
  });

  it('niveau : le plus élevé gagne', () => {
    expect(
      resolveEventEffects([ev('a', { forcedLevel: 69 }), ev('b', { forcedLevel: 100 })], always)
        .forcedLevel,
    ).toBe(100);
    expect(
      resolveEventEffects([ev('a', { forcedLevel: 100 }), ev('b', { forcedLevel: 69 })], always)
        .forcedLevel,
    ).toBe(100);
  });

  it('tickets : tirage entre min et max, additionnés entre événements', () => {
    const lucky = ev('a', { victiniTicketsMin: 1, victiniTicketsMax: 3 });
    const seen = new Set<number>();
    const rng = seededRng(2);
    for (let i = 0; i < 500; i++) seen.add(resolveEventEffects([lucky], rng).tickets);
    expect([...seen].sort()).toEqual([1, 2, 3]);
    const fixed = ev('b', { victiniTicketsMin: 1, victiniTicketsMax: 1 });
    expect(resolveEventEffects([fixed, fixed], always).tickets).toBe(2);
  });

  it('boîtes spéciales : cumulées, sans doublon', () => {
    const a = ev('a', { luckyDayBox: true });
    const b = ev('b', { aprilFoolsBox: true });
    expect(resolveEventEffects([a, b, a], always).boxes).toEqual(['lucky_day', 'april_fools']);
  });

  it('garde la trace des événements actifs', () => {
    expect(resolveEventEffects([ev('a', {}), ev('b', {})], always).eventIds).toEqual(['a', 'b']);
  });
});

describe('avec les vrais événements', () => {
  const on = (day: string, rng = seededRng(1)) =>
    resolveEventEffects(activeEvents(events, day), rng);

  it('Poisson d’avril : Magicarpe à coup sûr, shiny 1/100, 1 ticket, boîte spéciale', () => {
    const fx = on('2026-04-01');
    expect(fx).toMatchObject({
      forcedPokemonId: 129,
      shinyRate: 100,
      tickets: 1,
      boxes: ['april_fools'],
    });
  });

  it('Lucky Day : shiny 1/13, 1 à 3 tickets, boîte spéciale', () => {
    const fx = on('2026-11-13');
    expect(fx.shinyRate).toBe(13);
    expect(fx.tickets).toBeGreaterThanOrEqual(1);
    expect(fx.tickets).toBeLessThanOrEqual(3);
    expect(fx.boxes).toEqual(['lucky_day']);
  });

  it('Diamant Day : shiny garanti, niveau 69', () => {
    expect(on('2026-11-18')).toMatchObject({ forcedShiny: true, forcedLevel: 69 });
  });

  it('Bonne Année : niveau 100 (au-dessus du maximum ordinaire de 99), shiny 1/50', () => {
    expect(on('2027-01-01')).toMatchObject({ forcedLevel: 100, shinyRate: 50 });
  });

  it('un vendredi 13 pendant Pokopia : la meilleure chance shiny (1/13) l’emporte sur 1/30', () => {
    expect(on('2026-03-13').shinyRate).toBe(13);
  });

  it('jour sans événement : aucun effet', () => {
    expect(on('2026-10-05')).toMatchObject({
      forcedPokemonId: null,
      forcedShiny: false,
      tickets: 0,
      boxes: [],
    });
  });
});
