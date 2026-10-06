import { describe, expect, it } from 'vitest';
import { validateEvents } from '../../src/core/events/validate';
import { events } from '../../src/data/events';
import { getEntry } from '../../src/data';
import { isDrawable } from '../../src/data/sprites';

const drawable = (id: number) => !!getEntry(id) && isDrawable(id);

type Draft = Record<string, unknown> & { modifiers: Record<string, unknown> };

const good = (): Draft => ({
  id: 'test',
  nameFr: 'Test',
  nameEn: 'Test',
  descriptionFr: 'Un test',
  descriptionEn: 'A test',
  type: 'recurring_date',
  month: 10,
  day: 31,
  modifiers: { forcedPokemonId: 25, forcedPokemonChance: 0.5, shinyRate: 30 },
});

describe('validateEvents', () => {
  it('le vrai fichier events.json est valide (16 événements)', () => {
    expect(events).toHaveLength(16);
    expect(validateEvents(events, drawable)).toEqual([]);
  });

  it('chaque Pokémon forcé du vrai fichier existe et a une image', () => {
    for (const e of events) {
      const m = e.modifiers;
      for (const id of [m.forcedPokemonId, ...(m.forcedPokemonIds ?? [])]) {
        if (id !== undefined) expect(drawable(id), `${e.id} → #${id}`).toBe(true);
      }
    }
  });

  it('accepte un événement bien formé', () => {
    expect(validateEvents([good()], drawable)).toEqual([]);
  });

  const mutations: [string, (e: Draft) => void, RegExp][] = [
    ['identifiant manquant', (e) => delete e.id, /identifiant/],
    ['texte vide', (e) => (e.nameFr = '  '), /nameFr/],
    ['type inconnu', (e) => (e.type = 'tous_les_lundis'), /type inconnu/],
    ['31 février', (e) => ((e.month = 2), (e.day = 31)), /jour valide/],
    ['mois 13', (e) => (e.month = 13), /jour valide/],
    ['Pokémon inexistant', (e) => (e.modifiers.forcedPokemonId = 99999), /inconnu ou sans image/],
    ['Pokémon sans image', (e) => (e.modifiers.forcedPokemonId = 10266), /inconnu ou sans image/],
    ['chance absente', (e) => delete e.modifiers.forcedPokemonChance, /obligatoire/],
    ['chance à 0', (e) => (e.modifiers.forcedPokemonChance = 0), /entre 0/],
    ['chance à 150 %', (e) => (e.modifiers.forcedPokemonChance = 1.5), /entre 0/],
    [
      'chance sans Pokémon',
      (e) => (delete e.modifiers.forcedPokemonId, (e.modifiers.forcedPokemonChance = 0.2)),
      /sans Pokémon/,
    ],
    ['les deux formes de Pokémon forcé', (e) => (e.modifiers.forcedPokemonIds = [25]), /exclusifs/],
    ['shinyRate décimal', (e) => (e.modifiers.shinyRate = 12.5), /shinyRate/],
    ['niveau 101', (e) => (e.modifiers.forcedLevel = 101), /forcedLevel/],
    [
      'tickets min > max',
      (e) => ((e.modifiers.victiniTicketsMin = 3), (e.modifiers.victiniTicketsMax = 1)),
      /min ≤ max/,
    ],
    ['tickets min sans max', (e) => (e.modifiers.victiniTicketsMin = 1), /vont ensemble/],
    ['drapeau pas booléen', (e) => (e.modifiers.luckyDayBox = 'oui'), /luckyDayBox/],
    [
      'modificateur inconnu (faute de frappe)',
      (e) => (e.modifiers.shinyRat = 30),
      /modificateur inconnu/,
    ],
  ];
  it.each(mutations)('détecte : %s', (_name, mutate, pattern) => {
    const e = good();
    mutate(e);
    const problems = validateEvents([e], drawable);
    expect(problems.length).toBeGreaterThan(0);
    expect(problems.join('\n')).toMatch(pattern);
  });

  it('détecte les identifiants en double', () => {
    expect(validateEvents([good(), good()], drawable).join('\n')).toMatch(/en double/);
  });

  it('détecte une période sans « repeats » (le piège de la v3.1)', () => {
    const e = { ...good(), type: 'date_range', startDate: '2026-03-01', endDate: '2026-03-31' };
    delete (e as Record<string, unknown>).month;
    delete (e as Record<string, unknown>).day;
    expect(validateEvents([e], drawable).join('\n')).toMatch(/repeats/);
    expect(validateEvents([{ ...e, repeats: 'once' }], drawable)).toEqual([]);
  });

  it('détecte une période à l’envers, un jour de semaine invalide, une liste vide', () => {
    const range = {
      ...good(),
      type: 'date_range',
      startDate: '2026-04-01',
      endDate: '2026-03-01',
      repeats: 'once',
    };
    expect(validateEvents([range], drawable).join('\n')).toMatch(/après/);
    const weekday = { ...good(), type: 'recurring_weekday_date', weekday: 7, day: 13 };
    expect(validateEvents([weekday], drawable).join('\n')).toMatch(/weekday/);
    const list = { ...good(), type: 'recurring_dates', dates: [] };
    expect(validateEvents([list], drawable).join('\n')).toMatch(/liste non vide/);
  });

  it("refuse un fichier qui n'est pas une liste", () => {
    expect(validateEvents({}, drawable)).toHaveLength(1);
  });
});
