import { describe, expect, it } from 'vitest';
import { addDays, daysBetween, weekdayOf } from '../../src/core/dates';
import {
  activeEvents,
  daysUntilNextActive,
  eventStatuses,
  isEventActive,
  nextEvent,
  upcomingEvents,
} from '../../src/core/events/engine';
import type { GameEvent } from '../../src/core/events/types';
import { events } from '../../src/data/events';

const ids = (list: readonly GameEvent[]) => list.map((e) => e.id);
const byId = (id: string) => events.find((e) => e.id === id)!;

describe('événements actifs (les 12 de la v3.1 gardent les mêmes résultats ; 4 ajoutés depuis)', () => {
  it.each([
    ['2026-03-13', ['pokopia_2026', 'lucky_day']], // vendredi 13 pendant Pokopia
    ['2026-03-15', ['pokopia_2026', 'victini_launch_march_2026']], // dimanche de mars
    ['2026-03-29', ['pokopia_2026', 'victini_launch_march_2026']],
    ['2026-03-01', ['pokopia_2026', 'victini_launch_march_2026']], // dimanche 1er mars
    ['2026-03-02', ['pokopia_2026']],
    ['2026-04-01', ['april_fools']],
    ['2026-02-13', ['lucky_day']],
    ['2026-02-14', ['valentine']],
    ['2026-02-27', ['pokemon_day', 'pokemon_day_caps']], // Pikachu + ses casquettes
    ['2026-06-21', ['season_change', 'music_day']], // solstice + fête de la musique
    ['2026-08-08', ['cat_day']],
    ['2026-08-26', ['dog_day']],
    ['2026-06-14', ['go_fest']],
    ['2026-06-15', ['go_fest']],
    ['2026-06-16', []],
    ['2026-10-31', ['halloween']],
    ['2026-11-13', ['lucky_day']],
    ['2026-11-18', ['diamant_day']],
    ['2026-12-21', ['season_change']],
    ['2026-12-25', ['christmas']],
    ['2027-01-01', ['new_year']],
    ['2026-10-05', []],
  ])('%s → %j', (day, expected) => {
    expect(ids(activeEvents(events, day))).toEqual(expected);
  });

  it('les 4 changements de saison', () => {
    for (const day of ['2027-03-20', '2027-09-22', '2027-12-21']) {
      expect(ids(activeEvents(events, day))).toEqual(['season_change']);
    }
    // le solstice d'été tombe le jour de la fête de la musique : les deux sont actifs
    expect(ids(activeEvents(events, '2027-06-21'))).toEqual(['season_change', 'music_day']);
  });

  it('Vendredi 13 : exactement les vendredis 13, ni plus ni moins', () => {
    const lucky = byId('lucky_day');
    for (const year of [2026, 2027, 2028]) {
      const found: string[] = [];
      for (let d = `${year}-01-01`; d < `${year + 1}-01-01`; d = addDays(d, 1)) {
        if (isEventActive(lucky, d)) found.push(d);
      }
      const expected: string[] = [];
      for (let m = 1; m <= 12; m++) {
        const d = `${year}-${String(m).padStart(2, '0')}-13`;
        if (weekdayOf(d) === 5) expected.push(d);
      }
      expect(found, String(year)).toEqual(expected);
    }
    expect(['2026-02-13', '2026-03-13', '2026-11-13'].every((d) => isEventActive(lucky, d))).toBe(
      true,
    );
  });
});

describe('événements ponctuels (bug B-4 de la v3.1)', () => {
  it("Pokopia et le lancement de la V-Roulette n'ont lieu qu'en mars 2026", () => {
    for (const day of ['2027-03-01', '2027-03-10', '2027-03-14', '2028-03-15']) {
      expect(ids(activeEvents(events, day))).not.toContain('pokopia_2026');
      expect(ids(activeEvents(events, day))).not.toContain('victini_launch_march_2026');
    }
  });

  it('une fois terminés, ils n’ont plus de compte à rebours (v3.1 : « dans 147 j »)', () => {
    expect(daysUntilNextActive(byId('pokopia_2026'), '2026-10-05')).toBeNull();
    expect(daysUntilNextActive(byId('pokopia_2026'), '2026-04-01')).toBeNull();
    expect(daysUntilNextActive(byId('victini_launch_march_2026'), '2026-10-05')).toBeNull();
    expect(ids(eventStatuses(events, '2026-10-05').map((s) => s.event))).not.toContain(
      'pokopia_2026',
    );
  });

  it('avant leur début, le compte à rebours est juste', () => {
    expect(daysUntilNextActive(byId('pokopia_2026'), '2026-02-20')).toBe(9); // 1er mars
    expect(daysUntilNextActive(byId('victini_launch_march_2026'), '2026-03-02')).toBe(6); // dimanche 8
    expect(daysUntilNextActive(byId('victini_launch_march_2026'), '2026-03-29')).toBeNull(); // dernier dimanche
  });
});

describe('compte à rebours depuis le 5 octobre 2026 (mêmes valeurs que la v3.1)', () => {
  it.each([
    ['halloween', 26],
    ['lucky_day', 39],
    ['diamant_day', 44],
    ['season_change', 77],
    ['christmas', 81],
    ['new_year', 88],
    ['valentine', 132],
    ['pokemon_day', 145],
    ['april_fools', 178],
    ['go_fest', 252],
  ])('%s dans %i jours', (id, expected) => {
    expect(daysUntilNextActive(byId(id), '2026-10-05')).toBe(expected);
  });

  it('nextEvent = le plus proche, jamais un événement déjà actif', () => {
    expect(nextEvent(events, '2026-10-05')).toMatchObject({
      event: { id: 'halloween' },
      daysUntil: 26,
    });
    expect(nextEvent(events, '2026-10-31')?.event.id).toBe('lucky_day'); // Halloween est actif : on passe au suivant
  });

  it('upcomingEvents : seulement les événements non actifs, dans la fenêtre', () => {
    const upcoming = upcomingEvents(events, '2026-10-28', 7);
    expect(upcoming.map((u) => [u.event.id, u.daysUntil])).toEqual([['halloween', 3]]);
    expect(upcomingEvents(events, '2026-10-31', 7)).toEqual([]);
    expect(upcomingEvents(events, '2026-12-20', 7).map((u) => [u.event.id, u.daysUntil])).toEqual([
      ['season_change', 1],
      ['christmas', 5],
    ]); // le Nouvel An est à 12 jours : hors fenêtre
    expect(upcomingEvents(events, '2026-12-26', 7).map((u) => [u.event.id, u.daysUntil])).toEqual([
      ['new_year', 6],
    ]);
  });

  it('eventStatuses : actifs d’abord, puis du plus proche au plus lointain', () => {
    const list = eventStatuses(events, '2026-03-15');
    expect(list.slice(0, 2).map((s) => [s.event.id, s.isActive])).toEqual([
      ['pokopia_2026', true],
      ['victini_launch_march_2026', true],
    ]);
    const days = list.filter((s) => !s.isActive).map((s) => s.daysUntil);
    expect(days).toEqual([...days].sort((a, b) => a - b));
    expect(list.every((s) => s.isActive || s.daysUntil > 0)).toBe(true);
  });

  it('un événement qui revient « chaque année » est bien trouvé de l’autre côté du 31 décembre', () => {
    expect(daysUntilNextActive(byId('new_year'), '2026-12-31')).toBe(1);
    expect(daysUntilNextActive(byId('new_year'), '2027-01-01')).toBe(
      daysBetween('2027-01-01', '2028-01-01'),
    );
  });
});

describe('périodes (synthétiques) : once / yearly', () => {
  const base = {
    id: 'x',
    nameFr: 'x',
    nameEn: 'x',
    descriptionFr: 'x',
    descriptionEn: 'x',
    modifiers: {},
  };

  it('yearly : revient chaque année', () => {
    const e: GameEvent = {
      ...base,
      type: 'date_range',
      startDate: '2026-03-01',
      endDate: '2026-03-31',
      repeats: 'yearly',
    };
    expect(isEventActive(e, '2027-03-10')).toBe(true);
    expect(isEventActive(e, '2027-04-01')).toBe(false);
    expect(daysUntilNextActive(e, '2026-10-05')).toBe(daysBetween('2026-10-05', '2027-03-01'));
  });

  it('yearly : une période peut enjamber le nouvel an', () => {
    const e: GameEvent = {
      ...base,
      type: 'date_range',
      startDate: '2026-12-20',
      endDate: '2027-01-05',
      repeats: 'yearly',
    };
    for (const d of [
      '2026-12-20',
      '2026-12-31',
      '2027-01-01',
      '2027-01-05',
      '2030-12-25',
      '2031-01-02',
    ]) {
      expect(isEventActive(e, d), d).toBe(true);
    }
    for (const d of ['2026-12-19', '2027-01-06', '2027-06-01'])
      expect(isEventActive(e, d), d).toBe(false);
  });

  it('once : ne revient jamais', () => {
    const e: GameEvent = {
      ...base,
      type: 'date_range',
      startDate: '2026-03-01',
      endDate: '2026-03-31',
      repeats: 'once',
    };
    expect(isEventActive(e, '2026-03-15')).toBe(true);
    expect(isEventActive(e, '2027-03-15')).toBe(false);
    expect(daysUntilNextActive(e, '2026-10-05')).toBeNull();
  });

  it('once dans plus d’un an : le compte à rebours le trouve quand même', () => {
    const e: GameEvent = {
      ...base,
      type: 'date_range',
      startDate: '2028-06-01',
      endDate: '2028-06-30',
      repeats: 'once',
    };
    expect(daysUntilNextActive(e, '2026-10-05')).toBe(daysBetween('2026-10-05', '2028-06-01'));
  });

  it('un événement ponctuel de jours précis (date_range_weekday)', () => {
    const e: GameEvent = {
      ...base,
      type: 'date_range_weekday',
      startDate: '2026-03-01',
      endDate: '2026-03-31',
      weekday: 0,
      repeats: 'once',
    };
    expect(isEventActive(e, '2026-03-08')).toBe(true); // dimanche
    expect(isEventActive(e, '2026-03-09')).toBe(false); // lundi
    expect(isEventActive(e, '2026-04-05')).toBe(false); // dimanche mais après la période
  });
});
