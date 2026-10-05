import { describe, expect, it } from 'vitest';
import {
  MAX_FILL_DAYS,
  devClearHistory,
  devDeleteEntry,
  devFillHistory,
  devForceToday,
  devRedrawToday,
  devResetAll,
  devSetToday,
} from '../../src/core/dev-tools';
import {
  applyDailyDraw,
  emptyGameState,
  todayEntry,
  type GameState,
} from '../../src/core/game-state';
import type { DrawResult } from '../../src/core/draw';
import type { PokemonEntry } from '../../src/core/model';
import { seededRng } from '../../src/core/rng';
import { testPool } from './helpers';

const entry = (day: string, id = 1, over: Partial<PokemonEntry> = {}): PokemonEntry => ({
  id,
  natureKey: 'jolly',
  level: 10,
  isShiny: false,
  day,
  rename: '',
  ...over,
});
const draw = (e: PokemonEntry): DrawResult => ({
  entry: e,
  reason: 'species',
  pity: { daysWithoutForm: 0 },
  tickets: 0,
  boxes: [],
  effects: {
    forcedPokemonId: null,
    forcedShiny: false,
    shinyRate: 69,
    forcedLevel: null,
    tickets: 0,
    boxes: [],
    eventIds: [],
  },
});
const TODAY = '2026-05-10';
const withDays = (...days: [string, number][]): GameState =>
  days.reduce((s, [day, id]) => applyDailyDraw(s, draw(entry(day, id))), emptyGameState());

describe('outils du mode développeur', () => {
  it('niveau borné, surnom borné, shiny refusé si impossible', () => {
    const s = withDays(['2026-05-09', 5], [TODAY, 7]); // #7 ne peut pas être shiny (monde de test)
    const a = devSetToday(s, { level: 250, rename: 'x'.repeat(40), isShiny: true }, testPool);
    expect(todayEntry(a)).toMatchObject({ level: 100, rename: 'x'.repeat(16), isShiny: false });
    const b = devSetToday(s, { level: -3 }, testPool);
    expect(todayEntry(b)?.level).toBe(1);
    const shiny = devSetToday(withDays([TODAY, 5]), { isShiny: true }, testPool);
    expect(todayEntry(shiny)?.isShiny).toBe(true);
    expect(shiny.caughtShiny).toContain(5);
  });

  it('forcer un Pokémon : remplace celui du jour, garde la date, garde la collection', () => {
    const s = withDays(['2026-05-09', 5], [TODAY, 6]);
    const forced = devForceToday(s, 12, seededRng(1), testPool);
    expect(todayEntry(forced)).toMatchObject({ id: 12, day: TODAY, rename: '' });
    expect(forced.caught).toEqual([5, 6, 12]); // l'ancien reste « obtenu »
    expect(forced.entries['2026-05-09']).toEqual(s.entries['2026-05-09']);
  });

  it('refaire le tirage : un nouveau Pokémon pour aujourd’hui, l’historique est intact', () => {
    const s = withDays(['2026-05-09', 5], [TODAY, 6]);
    const redo = devRedrawToday(s, { today: TODAY, rng: seededRng(5), pool: testPool, events: [] });
    expect(redo.lastDrawDay).toBe(TODAY);
    expect(redo.entries['2026-05-09']).toEqual(s.entries['2026-05-09']);
    expect(Object.keys(redo.entries)).toEqual(['2026-05-09', TODAY]);
  });

  it('remplir l’historique : jours manquants seulement, bornes respectées', () => {
    const s = withDays(['2026-05-08', 5], [TODAY, 6]);
    const filled = devFillHistory(s, { days: 4, today: TODAY, rng: seededRng(2), pool: testPool });
    expect(Object.keys(filled.entries).sort()).toEqual([
      '2026-05-06',
      '2026-05-07',
      '2026-05-08',
      '2026-05-09',
      TODAY,
    ]);
    expect(filled.entries['2026-05-08']).toEqual(s.entries['2026-05-08']); // jour existant gardé
    expect(filled.lastDrawDay).toBe(TODAY);
    const huge = devFillHistory(emptyGameState(), {
      days: 9999,
      today: TODAY,
      rng: seededRng(2),
      pool: testPool,
    });
    expect(Object.keys(huge.entries)).toHaveLength(MAX_FILL_DAYS);
    const none = devFillHistory(emptyGameState(), {
      days: 0,
      today: TODAY,
      rng: seededRng(2),
      pool: testPool,
    });
    expect(Object.keys(none.entries)).toHaveLength(1); // 0 est ramené à 1 jour
  });

  it('supprimer un jour : la collection suit ; le Pokémon du jour est protégé', () => {
    const s = withDays(['2026-05-08', 5], ['2026-05-09', 6], [TODAY, 7]);
    const d = devDeleteEntry(s, '2026-05-08');
    expect(Object.keys(d.entries)).toEqual(['2026-05-09', TODAY]);
    expect(d.caught).toEqual([6, 7]);
    expect(devDeleteEntry(s, TODAY)).toBe(s);
    expect(devDeleteEntry(s, '2000-01-01')).toBe(s);
  });

  it('vider l’historique : il ne reste que le Pokémon du jour', () => {
    const s = withDays(['2026-05-08', 5], ['2026-05-09', 6], [TODAY, 7]);
    const c = devClearHistory(s);
    expect(Object.keys(c.entries)).toEqual([TODAY]);
    expect(c.caught).toEqual([7]);
    expect(c.lastDrawDay).toBe(TODAY);
  });

  it('tout remettre à zéro : un état vide', () => {
    expect(devResetAll()).toEqual(emptyGameState());
  });
});
