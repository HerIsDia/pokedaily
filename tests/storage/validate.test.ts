import { describe, expect, it } from 'vitest';
import { emptyGameState } from '../../src/core/game-state';
import { parseEntry, parseState, type StateLookup } from '../../src/storage/validate';

const lookup: StateLookup = {
  hasId: (id) => (id >= 1 && id <= 1025) || id === 10034,
  hasNature: (key) => ['jolly', 'timid', 'hardy'].includes(key),
};

const good = (day: string, over: Record<string, unknown> = {}) => ({
  id: 25,
  natureKey: 'jolly',
  level: 50,
  isShiny: false,
  day,
  rename: '',
  ...over,
});

const box = (over: Record<string, unknown> = {}) => ({
  kind: 'lucky_day',
  receivedDay: '2026-03-17',
  validUntil: '2026-03-23',
  ids: Array<number>(16).fill(494),
  shinySlots: [],
  ...over,
});

describe('parseEntry', () => {
  it('accepte une entrée valide et borne le surnom', () => {
    const r = parseEntry(good('2026-01-02', { rename: '  ' + 'a'.repeat(30) }), lookup);
    expect('entry' in r && r.entry.rename).toBe('a'.repeat(16));
  });

  it.each([
    ['pas un objet', 'oups'],
    ['id inconnu', good('2026-01-02', { id: 9999 })],
    ['id décimal', good('2026-01-02', { id: 1.5 })],
    ['nature inconnue', good('2026-01-02', { natureKey: 'zzz' })],
    ['niveau 0', good('2026-01-02', { level: 0 })],
    ['niveau 101', good('2026-01-02', { level: 101 })],
    ['shiny en texte', good('2026-01-02', { isShiny: 'true' })],
    ['jour impossible', good('2026-02-30')],
    ['surnom non texte', good('2026-01-02', { rename: 5 })],
  ])('refuse : %s', (_label, raw) => {
    expect(parseEntry(raw, lookup)).toHaveProperty('problem');
  });
});

describe('parseState', () => {
  it('un état vide donne un état vide, sans problème', () => {
    const { state, problems } = parseState({}, lookup);
    expect(state).toEqual(emptyGameState());
    expect(problems).toEqual([]);
  });

  it('relit un état sain à l’identique', () => {
    const { state, problems } = parseState(
      {
        entries: [good('2026-01-02'), good('2026-01-03', { id: 10034, isShiny: true })],
        lastDrawDay: '2026-01-03',
        pity: { daysWithoutForm: 4 },
        tickets: 3,
        boxes: [box()],
        caught: [25, 10034],
        caughtShiny: [10034],
        rouletteBonusClaimed: true,
      },
      lookup,
    );
    expect(problems).toEqual([]);
    expect(Object.keys(state.entries)).toEqual(['2026-01-02', '2026-01-03']);
    expect(state.lastDrawDay).toBe('2026-01-03');
    expect(state.pity.daysWithoutForm).toBe(4);
    expect(state.tickets).toBe(3);
    expect(state.boxes).toHaveLength(1);
    expect(state.rouletteBonusClaimed).toBe(true);
  });

  it('ignore les entrées abîmées et le dit', () => {
    const { state, problems } = parseState(
      { entries: [good('2026-01-02'), good('2026-01-03', { id: 9999 }), 42] },
      lookup,
    );
    expect(Object.keys(state.entries)).toEqual(['2026-01-02']);
    expect(problems).toHaveLength(2);
  });

  it('garde la première entrée en cas de doublon de jour', () => {
    const { state, problems } = parseState(
      { entries: [good('2026-01-02', { level: 10 }), good('2026-01-02', { level: 99 })] },
      lookup,
    );
    expect(state.entries['2026-01-02']?.level).toBe(10);
    expect(problems).toHaveLength(1);
  });

  it('retrouve le dernier jour tiré s’il est absent ou faux', () => {
    const entries = [good('2026-01-02'), good('2026-01-05')];
    expect(parseState({ entries }, lookup).state.lastDrawDay).toBe('2026-01-05');
    const wrong = parseState({ entries, lastDrawDay: '2026-02-01' }, lookup);
    expect(wrong.state.lastDrawDay).toBe('2026-01-05');
    expect(wrong.problems).toHaveLength(1);
  });

  it('remet à zéro les compteurs illisibles', () => {
    const { state, problems } = parseState({ pity: { daysWithoutForm: -2 }, tickets: -1 }, lookup);
    expect(state.pity.daysWithoutForm).toBe(0);
    expect(state.tickets).toBe(0);
    expect(problems).toHaveLength(2);
  });

  it('refuse un nombre de tickets délirant', () => {
    expect(parseState({ tickets: 1e12 }, lookup).state.tickets).toBe(0);
    expect(parseState({ tickets: 2.5 }, lookup).problems).toHaveLength(1);
  });

  it('complète la collection avec les Pokémon réellement obtenus', () => {
    const { state } = parseState(
      {
        entries: [good('2026-01-02', { id: 7, isShiny: true })],
        caught: [3, 3, 1],
        caughtShiny: [9],
      },
      lookup,
    );
    expect(state.caught).toEqual([1, 3, 7, 9]);
    expect(state.caughtShiny).toEqual([7, 9]);
  });

  it('ignore les identifiants inconnus de la collection', () => {
    const { state, problems } = parseState({ caught: [1, 99999, 'x'] }, lookup);
    expect(state.caught).toEqual([1]);
    expect(problems).toHaveLength(2);
  });

  it('refuse les types faux sans planter', () => {
    const { state, problems } = parseState(
      { entries: 'non', boxes: 'non', caught: 'non', monthlyTeam: 12 },
      lookup,
    );
    expect(state).toEqual(emptyGameState());
    expect(problems.length).toBeGreaterThanOrEqual(4);
  });

  describe('Pokémon boosté de la roulette', () => {
    it('est relu tel quel', () => {
      const { state, problems } = parseState(
        { rouletteBoost: { month: '2026-05', id: 25 } },
        lookup,
      );
      expect(problems).toEqual([]);
      expect(state.rouletteBoost).toEqual({ month: '2026-05', id: 25 });
    });

    it.each([
      [{ month: '2026-13', id: 25 }],
      [{ month: '2026-05', id: 99999 }],
      [{ month: 5, id: 25 }],
      ['oups'],
    ])('ignore un boost abîmé (%j) et le dit', (boost) => {
      const { state, problems } = parseState({ rouletteBoost: boost }, lookup);
      expect(state.rouletteBoost).toBeNull();
      expect(problems).toHaveLength(1);
    });

    it('absent : null, sans problème', () => {
      expect(parseState({}, lookup).state.rouletteBoost).toBeNull();
    });
  });

  describe('boîtes spéciales', () => {
    it('refuse les boîtes mal formées', () => {
      const bad = [
        box({ kind: 'autre' }),
        box({ ids: [1, 2, 3] }),
        box({ ids: Array<number>(16).fill(99999) }),
        box({ validUntil: '2026-03-01' }),
        box({ shinySlots: [16] }),
        'oups',
      ];
      const { state, problems } = parseState({ boxes: bad }, lookup);
      expect(state.boxes).toEqual([]);
      expect(problems).toHaveLength(bad.length);
    });

    it('garde une seule boîte par genre', () => {
      const { state, problems } = parseState({ boxes: [box(), box()] }, lookup);
      expect(state.boxes).toHaveLength(1);
      expect(problems).toHaveLength(1);
    });
  });

  describe('team du mois', () => {
    it('la relit et la compte dans la collection', () => {
      const { state, problems } = parseState(
        {
          monthlyTeam: {
            month: '2026-03',
            pokemon: [good('2026-03-01', { id: 6, isShiny: true })],
          },
        },
        lookup,
      );
      expect(problems).toEqual([]);
      expect(state.monthlyTeam?.pokemon).toHaveLength(1);
      expect(state.caught).toContain(6);
      expect(state.caughtShiny).toContain(6);
    });

    it('refuse un mois impossible', () => {
      const r = parseState({ monthlyTeam: { month: '2026-13', pokemon: [] } }, lookup);
      expect(r.state.monthlyTeam).toBeNull();
      expect(r.problems).toHaveLength(1);
    });

    it('limite la team à 6 Pokémon', () => {
      const pokemon = Array.from({ length: 9 }, (_, i) => good('2026-03-01', { id: i + 1 }));
      const r = parseState({ monthlyTeam: { month: '2026-03', pokemon } }, lookup);
      expect(r.state.monthlyTeam?.pokemon).toHaveLength(6);
    });
  });
});
