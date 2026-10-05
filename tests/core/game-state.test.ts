import { describe, expect, it } from 'vitest';
import { buildSpecialBox } from '../../src/core/boxes';
import type { DrawResult } from '../../src/core/draw';
import {
  NotEnoughTicketsError,
  addTickets,
  boostFor,
  playRoulette,
  setRouletteBoost,
  allEntries,
  applyDailyDraw,
  caughtForms,
  caughtSpecies,
  claimRouletteBonus,
  emptyGameState,
  ensureTodayDraw,
  historyEntries,
  renameEntry,
  replaceTodayWithPrize,
  setMonthlyTeam,
  todayEntry,
  type GameState,
} from '../../src/core/game-state';
import type { EventModifiers, GameEvent } from '../../src/core/events/types';
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

const result = (e: PokemonEntry, over: Partial<DrawResult> = {}): DrawResult => ({
  entry: e,
  reason: 'species',
  pity: { daysWithoutForm: 3 },
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
  ...over,
});

const ev = (modifiers: EventModifiers, month = 10, day = 5): GameEvent => ({
  id: 'e',
  nameFr: 'e',
  nameEn: 'e',
  descriptionFr: 'e',
  descriptionEn: 'e',
  type: 'recurring_date',
  month,
  day,
  modifiers,
});

describe('état vide', () => {
  it('rien du tout au départ', () => {
    const s = emptyGameState();
    expect(todayEntry(s)).toBeNull();
    expect(historyEntries(s)).toEqual([]);
    expect(s).toMatchObject({
      tickets: 0,
      lastDrawDay: null,
      caught: [],
      boxes: [],
      monthlyTeam: null,
    });
    expect(s.pity).toEqual({ daysWithoutForm: 0 });
  });

  it('chaque appel donne un état neuf (rien de partagé)', () => {
    const a = emptyGameState();
    a.caught.push(1);
    expect(emptyGameState().caught).toEqual([]);
  });
});

describe('applyDailyDraw', () => {
  it('enregistre le Pokémon, le jour, le compteur de formes et la collection', () => {
    const s = applyDailyDraw(emptyGameState(), result(entry('2026-10-05', 25)));
    expect(todayEntry(s)).toEqual(entry('2026-10-05', 25));
    expect(s.lastDrawDay).toBe('2026-10-05');
    expect(s.pity).toEqual({ daysWithoutForm: 3 });
    expect(s.caught).toEqual([25]);
    expect(s.caughtShiny).toEqual([]);
  });

  it('un shiny entre aussi dans la collection des shiny ; les listes restent triées sans doublon', () => {
    let s = applyDailyDraw(emptyGameState(), result(entry('2026-10-01', 30, { isShiny: true })));
    s = applyDailyDraw(s, result(entry('2026-10-02', 5)));
    s = applyDailyDraw(s, result(entry('2026-10-03', 30)));
    expect(s.caught).toEqual([5, 30]);
    expect(s.caughtShiny).toEqual([30]);
  });

  it('additionne les tickets', () => {
    let s = applyDailyDraw(emptyGameState(), result(entry('2026-10-01'), { tickets: 2 }));
    s = applyDailyDraw(s, result(entry('2026-10-02'), { tickets: 1 }));
    expect(s.tickets).toBe(3);
  });

  it('refuse un deuxième tirage le même jour, ou un jour passé (horloge reculée)', () => {
    const s = applyDailyDraw(emptyGameState(), result(entry('2026-10-05')));
    expect(() => applyDailyDraw(s, result(entry('2026-10-05', 2)))).toThrow(RangeError);
    expect(() => applyDailyDraw(s, result(entry('2026-10-04', 2)))).toThrow(RangeError);
  });

  it('ne modifie pas l’état d’origine', () => {
    const before = emptyGameState();
    const frozen = JSON.stringify(before);
    applyDailyDraw(before, result(entry('2026-10-05')));
    expect(JSON.stringify(before)).toBe(frozen);
  });

  it('boîtes : les périmées disparaissent, la nouvelle remplace celle du même genre', () => {
    const old = buildSpecialBox('lucky_day', '2026-03-13', seededRng(1), testPool);
    const april = buildSpecialBox('april_fools', '2026-10-01', seededRng(1), testPool);
    const newLucky = buildSpecialBox('lucky_day', '2026-10-05', seededRng(2), testPool);
    const start: GameState = { ...emptyGameState(), boxes: [old, april] };
    const s = applyDailyDraw(start, result(entry('2026-10-05'), { boxes: [newLucky] }));
    expect(s.boxes.map((b) => b.kind).sort()).toEqual(['april_fools', 'lucky_day']);
    expect(s.boxes.find((b) => b.kind === 'lucky_day')).toBe(newLucky); // l'ancienne (mars) a disparu
  });
});

describe('historique', () => {
  const days = ['2026-10-01', '2026-10-02', '2026-10-03', '2026-10-04'];
  const s = days.reduce(
    (state, day, i) => applyDailyDraw(state, result(entry(day, i + 1))),
    emptyGameState(),
  );

  it('le Pokémon du jour est le dernier tiré ; l’historique est le reste, du plus récent au plus ancien', () => {
    expect(todayEntry(s)?.day).toBe('2026-10-04');
    expect(historyEntries(s).map((e) => e.day)).toEqual(['2026-10-03', '2026-10-02', '2026-10-01']);
    expect(allEntries(s).map((e) => e.day)).toEqual([
      '2026-10-04',
      '2026-10-03',
      '2026-10-02',
      '2026-10-01',
    ]);
  });
});

describe('ensureTodayDraw (au lancement et quand minuit passe)', () => {
  const input = { rng: seededRng(7), pool: testPool, events: [] as GameEvent[] };

  it('1ᵉʳ lancement : tire le Pokémon du jour', () => {
    const { state, result: drawn } = ensureTodayDraw(emptyGameState(), {
      ...input,
      today: '2026-10-05',
    });
    expect(drawn).not.toBeNull();
    expect(todayEntry(state)?.day).toBe('2026-10-05');
    expect(testPool.isDrawable(todayEntry(state)!.id)).toBe(true);
  });

  it('même jour : ne touche à rien (le Pokémon du jour ne change pas en rouvrant l’app)', () => {
    const first = ensureTodayDraw(emptyGameState(), { ...input, today: '2026-10-05' });
    const second = ensureTodayDraw(first.state, { ...input, today: '2026-10-05' });
    expect(second.result).toBeNull();
    expect(second.state).toBe(first.state); // exactement le même objet
  });

  it('jour suivant : un nouveau Pokémon, l’ancien passe dans l’historique', () => {
    const first = ensureTodayDraw(emptyGameState(), { ...input, today: '2026-10-05' });
    const second = ensureTodayDraw(first.state, { ...input, today: '2026-10-06' });
    expect(todayEntry(second.state)?.day).toBe('2026-10-06');
    expect(historyEntries(second.state).map((e) => e.day)).toEqual(['2026-10-05']);
  });

  it('plusieurs jours sans ouvrir l’app : UN seul nouveau tirage (pas de rattrapage)', () => {
    const first = ensureTodayDraw(emptyGameState(), { ...input, today: '2026-10-01' });
    const later = ensureTodayDraw(first.state, { ...input, today: '2026-10-09' });
    expect(Object.keys(later.state.entries)).toEqual(['2026-10-01', '2026-10-09']);
    expect(later.state.pity.daysWithoutForm).toBeLessThanOrEqual(2); // 2 tirages, pas 9
  });

  it('horloge reculée : on ne retire pas et le Pokémon du jour reste le même', () => {
    const first = ensureTodayDraw(emptyGameState(), { ...input, today: '2026-10-06' });
    const back = ensureTodayDraw(first.state, { ...input, today: '2026-10-05' });
    expect(back.result).toBeNull();
    expect(todayEntry(back.state)).toEqual(todayEntry(first.state));
  });

  it('applique les événements du jour (tickets et boîte spéciale)', () => {
    const events = [ev({ victiniTicketsMin: 2, victiniTicketsMax: 2, luckyDayBox: true })];
    const { state } = ensureTodayDraw(emptyGameState(), { ...input, events, today: '2026-10-05' });
    expect(state.tickets).toBeGreaterThanOrEqual(2);
    expect(state.boxes.map((b) => b.kind)).toEqual(['lucky_day']);
  });

  it('le compteur de formes avance d’un tirage à l’autre et revient à 0 après une forme', () => {
    let state = emptyGameState();
    let formSeen = false;
    const rng = seededRng(2026);
    for (let i = 0; i < 400; i++) {
      const today = new Date(Date.UTC(2027, 0, 1 + i)).toISOString().slice(0, 10);
      const before = state.pity.daysWithoutForm;
      const out = ensureTodayDraw(state, { rng, pool: testPool, events: [], today });
      state = out.state;
      if (out.result?.reason === 'form') {
        formSeen = true;
        expect(state.pity.daysWithoutForm).toBe(0);
      } else {
        expect(state.pity.daysWithoutForm).toBe(before + 1);
      }
      expect(state.pity.daysWithoutForm).toBeLessThan(100);
    }
    expect(formSeen).toBe(true);
  });
});

describe('renameEntry', () => {
  const base = applyDailyDraw(emptyGameState(), result(entry('2026-10-05', 25)));

  it('change le surnom du jour demandé', () => {
    const s = renameEntry(base, '2026-10-05', '  Sparky  ');
    expect(todayEntry(s)?.rename).toBe('Sparky');
  });

  it('limite à 16 caractères réels (sans couper un emoji)', () => {
    expect(todayEntry(renameEntry(base, '2026-10-05', '🔥'.repeat(30)))?.rename).toBe(
      '🔥'.repeat(16),
    );
  });

  it('un jour inconnu ne change rien', () => {
    expect(renameEntry(base, '2026-01-01', 'X')).toBe(base);
  });

  it('un surnom vide remet le nom d’origine', () => {
    const named = renameEntry(base, '2026-10-05', 'Sparky');
    expect(todayEntry(renameEntry(named, '2026-10-05', ''))?.rename).toBe('');
  });
});

describe('V-Roulette : replaceTodayWithPrize (bug B-2 de la v3.1)', () => {
  const withTickets = (n: number): GameState => ({
    ...applyDailyDraw(emptyGameState(), result(entry('2026-10-05', 25, { rename: 'Sparky' }))),
    tickets: n,
  });

  it('le prix remplace le Pokémon du jour (sans surnom) et UN ticket est dépensé', () => {
    const s = replaceTodayWithPrize(
      withTickets(3),
      entry('1999-01-01', 6, { isShiny: true, level: 77 }),
    );
    expect(todayEntry(s)).toEqual(entry('2026-10-05', 6, { isShiny: true, level: 77, rename: '' }));
    expect(s.tickets).toBe(2);
    expect(s.caught).toEqual([6, 25]); // l'ancien reste dans la collection
    expect(s.caughtShiny).toEqual([6]);
  });

  it('sans ticket : refus, rien ne bouge', () => {
    const s = withTickets(0);
    expect(() => replaceTodayWithPrize(s, entry('2026-10-05', 6))).toThrow(NotEnoughTicketsError);
    expect(s.tickets).toBe(0);
  });

  it('sans Pokémon du jour : refus', () => {
    expect(() =>
      replaceTodayWithPrize({ ...emptyGameState(), tickets: 5 }, entry('2026-10-05')),
    ).toThrow(RangeError);
  });

  it('ne dépense jamais plus d’un ticket par tour', () => {
    const s = withTickets(1);
    expect(replaceTodayWithPrize(s, entry('x', 3)).tickets).toBe(0);
  });
});

describe('tickets et bonus', () => {
  it('le bonus du premier passage à la roulette ne se donne qu’une fois', () => {
    const once = claimRouletteBonus(emptyGameState());
    expect(once).toMatchObject({ tickets: 1, rouletteBonusClaimed: true });
    expect(claimRouletteBonus(once)).toBe(once);
  });

  it('addTickets : jamais en dessous de 0, entiers seulement', () => {
    const s = { ...emptyGameState(), tickets: 3 };
    expect(addTickets(s, 2).tickets).toBe(5);
    expect(addTickets(s, -10).tickets).toBe(0);
    expect(addTickets(s, 1.9).tickets).toBe(4);
  });
});

describe('team du mois', () => {
  it('ses Pokémon comptent pour la collection (et ses shiny)', () => {
    const team = {
      month: '2026-10',
      pokemon: [entry('2026-10-05', 3), entry('2026-10-05', 9, { isShiny: true })],
    };
    const s = setMonthlyTeam({ ...emptyGameState(), caught: [3] }, team);
    expect(s.monthlyTeam).toBe(team);
    expect(s.caught).toEqual([3, 9]);
    expect(s.caughtShiny).toEqual([9]);
  });
});

describe('collection : espèces et formes (Pokédex séparé)', () => {
  it('une forme compte pour son espèce ; l’onglet « Formes » ne liste que les formes', () => {
    const state = { ...emptyGameState(), caught: [6, 10034, 25] };
    const speciesOf = (id: number) => (id === 10034 ? 6 : id);
    const isForm = (id: number) => id > 10000;
    expect([...caughtSpecies(state, speciesOf)].sort((a, b) => a - b)).toEqual([6, 25]);
    expect(caughtForms(state, isForm)).toEqual([10034]);
  });
});

describe('V-Roulette : un tour complet', () => {
  const ids = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16];
  const base = (tickets: number): GameState => ({
    ...applyDailyDraw(emptyGameState(), result(entry('2026-05-01', 25, { rename: 'Sparky' }))),
    tickets,
  });
  const play = (state: GameState, over: Partial<Parameters<typeof playRoulette>[1]> = {}) =>
    playRoulette(state, {
      ids,
      shinySlots: [],
      boostedId: null,
      rng: seededRng(7),
      pool: testPool,
      ...over,
    });

  it('remplace le Pokémon du jour, dépense UN ticket, garde le jour, efface le surnom', () => {
    const before = base(3);
    const { state, index, prize } = play(before);
    expect(state.tickets).toBe(2);
    expect(ids[index]).toBe(prize.id);
    expect(todayEntry(state)).toEqual(prize);
    expect(prize.day).toBe('2026-05-01');
    expect(prize.rename).toBe('');
    expect(state.caught).toContain(prize.id);
    expect(before.tickets).toBe(3); // l'ancien état n'est pas modifié
  });

  it('sans ticket : erreur claire, et AUCUN jet de hasard consommé', () => {
    let draws = 0;
    const rng = { next: () => (draws++, 0.5) };
    expect(() => play(base(0), { rng })).toThrow(NotEnoughTicketsError);
    expect(draws).toBe(0);
  });

  it('sans Pokémon du jour : erreur, rien de dépensé', () => {
    expect(() => play({ ...emptyGameState(), tickets: 5 })).toThrow(RangeError);
  });

  it('une case « shiny garanti » donne un shiny (si le Pokémon peut l’être)', () => {
    const { prize } = play(base(1), { ids: [1, 1, 1, 1], shinySlots: [0, 1, 2, 3] });
    expect(prize.isShiny).toBe(true);
    // #7 ne peut pas être shiny dans le monde de test : jamais de shiny, même « garanti »
    const none = play(base(1), { ids: [7], shinySlots: [0] });
    expect(none.prize.isShiny).toBe(false);
  });

  it('un Pokémon boosté gagne environ 1 fois sur 4', () => {
    let wins = 0;
    const rng = seededRng(99);
    const N = 4000;
    for (let i = 0; i < N; i++) {
      const { prize } = play(base(1), { boostedId: 5, rng });
      if (prize.id === 5) wins++;
    }
    expect(wins / N).toBeGreaterThan(0.22);
    expect(wins / N).toBeLessThan(0.28);
  });

  it('le boost est propre à un mois', () => {
    const s = setRouletteBoost(emptyGameState(), '2026-05', 25);
    expect(boostFor(s, '2026-05')).toBe(25);
    expect(boostFor(s, '2026-06')).toBeNull();
    expect(boostFor(setRouletteBoost(s, '2026-05', null), '2026-05')).toBeNull();
  });
});
