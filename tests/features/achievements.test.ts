import { describe, expect, it } from 'vitest';
import { emptyGameState, type GameState } from '../../src/core/game-state';
import type { PokemonEntry } from '../../src/core/model';
import { POKEMON_TYPES } from '../../src/core/pokemon-types';
import {
  ACHIEVEMENT_IDS,
  achievementTotals,
  computeAchievements,
  type AchievementId,
  type AchievementLookup,
} from '../../src/features/achievements/achievements';
import { getEntry } from '../../src/data';
import { events } from '../../src/data/events';

const lookup: AchievementLookup = {
  typesOf: (id) => getEntry(id)?.types ?? [],
  isForm: (id) => getEntry(id)?.form !== undefined,
  speciesOf: (id) => getEntry(id)?.speciesId ?? id,
};

const entry = (day: string, over: Partial<PokemonEntry> = {}): PokemonEntry => ({
  id: 25,
  natureKey: 'jolly',
  level: 50,
  isShiny: false,
  day,
  rename: '',
  ...over,
});

/** Un état avec ces jours ; `caught` / `caughtShiny` sont déduits des entrées. */
function stateOf(list: PokemonEntry[], extra: Partial<GameState> = {}): GameState {
  return {
    ...emptyGameState(),
    entries: Object.fromEntries(list.map((e) => [e.day, e])),
    caught: [...new Set(list.map((e) => e.id))].sort((a, b) => a - b),
    caughtShiny: [...new Set(list.filter((e) => e.isShiny).map((e) => e.id))],
    ...extra,
  };
}

const done = (state: GameState): AchievementId[] =>
  computeAchievements(state, events, lookup)
    .filter((a) => a.done)
    .map((a) => a.id);

describe('succès', () => {
  it('une collection vide ne débloque rien, et tous les succès sont listés une fois', () => {
    const list = computeAchievements(emptyGameState(), events, lookup);
    expect(list.map((a) => a.id)).toEqual([...ACHIEVEMENT_IDS]);
    expect(achievementTotals(list)).toEqual({ done: 0, total: ACHIEVEMENT_IDS.length });
  });

  it('le premier jour, le shiny et le surnom', () => {
    expect(done(stateOf([entry('2026-10-05')]))).toEqual(['firstDay']);
    expect(done(stateOf([entry('2026-10-05', { isShiny: true, rename: 'Sparky' })]))).toEqual(
      expect.arrayContaining(['firstDay', 'spark', 'nickname']),
    );
    // un surnom fait d'espaces n'en est pas un
    expect(done(stateOf([entry('2026-10-05', { rename: '   ' })]))).not.toContain('nickname');
  });

  it('les formes : une forme compte, dix formes différentes aussi', () => {
    const formIds = [10034, 10035, 10036, 10037, 10038, 10039, 10040, 10041, 10042, 10043];
    const day = (i: number) => `2026-10-${String(i + 1).padStart(2, '0')}`;
    const state = stateOf(formIds.map((id, i) => entry(day(i), { id })));
    expect(done(state)).toEqual(expect.arrayContaining(['otherFace', 'forms10']));
    expect(done(stateOf(formIds.slice(0, 9).map((id, i) => entry(day(i), { id }))))).not.toContain(
      'forms10',
    );
  });

  it('le Pokédex compte les ESPÈCES (une forme coche son espèce)', () => {
    const state = stateOf([entry('2026-10-05', { id: 10034 })]); // forme de Dracaufeu
    const list = computeAchievements(state, events, lookup);
    expect(list.find((a) => a.id === 'dex100')?.progress).toEqual({ current: 1, total: 100 });
    // deux entrées de la même espèce ne comptent qu'une fois
    const twice = stateOf([entry('2026-10-05', { id: 6 }), entry('2026-10-06', { id: 10034 })]);
    expect(
      computeAchievements(twice, events, lookup).find((a) => a.id === 'dex100')?.progress,
    ).toEqual({ current: 1, total: 100 });
  });

  it('le Pokédex : 100 espèces débloquent le palier, 99 non', () => {
    const many = (n: number) => {
      const list = Array.from({ length: n }, (_, i) =>
        entry(
          `2020-${String(Math.floor(i / 28) + 1).padStart(2, '0')}-${String((i % 28) + 1).padStart(2, '0')}`,
          {
            id: i + 1,
          },
        ),
      );
      return stateOf(list);
    };
    expect(done(many(100))).toContain('dex100');
    expect(done(many(99))).not.toContain('dex100');
    expect(done(many(100))).not.toContain('dex500');
  });

  it('les 18 types', () => {
    expect(POKEMON_TYPES).toHaveLength(18);
    const oneOfEach = POKEMON_TYPES.map((type, i) => {
      const found = Array.from({ length: 1025 }, (_, k) => k + 1).find(
        (id) => getEntry(id)?.types[0] === type,
      )!;
      return entry(`2026-09-${String(i + 1).padStart(2, '0')}`, { id: found });
    });
    expect(done(stateOf(oneOfEach))).toContain('allTypes');
    expect(done(stateOf(oneOfEach.slice(1)))).not.toContain('allTypes');
  });

  it('niveau 100, Victini, jour d’événement', () => {
    expect(done(stateOf([entry('2026-10-05', { level: 100 })]))).toContain('summit');
    expect(done(stateOf([entry('2026-10-05', { id: 494 })]))).toContain('victini');
    expect(done(stateOf([entry('2026-10-05')]))).not.toContain('partyDay');
    expect(done(stateOf([entry('2026-10-31')]))).toContain('partyDay'); // Halloween
  });

  describe('secrets', () => {
    it('sont marqués secrets, et seulement eux', () => {
      const list = computeAchievements(emptyGameState(), events, lookup);
      expect(list.filter((a) => a.secret).map((a) => a.id)).toEqual([
        'nice',
        'goldenCarp',
        'backToBack',
        'diamantDay',
        'tiny',
      ]);
    });

    it('niveau 69, niveau 1, Magicarpe shiny', () => {
      expect(done(stateOf([entry('2026-10-05', { level: 69 })]))).toContain('nice');
      expect(done(stateOf([entry('2026-10-05', { level: 1 })]))).toContain('tiny');
      expect(done(stateOf([entry('2026-10-05', { id: 129, isShiny: true })]))).toContain(
        'goldenCarp',
      );
      expect(done(stateOf([entry('2026-10-05', { id: 129 })]))).not.toContain('goldenCarp');
    });

    it('deux shiny de suite (même par-dessus un changement de mois ou d’année), pas deux jours séparés', () => {
      const shiny = (day: string) => entry(day, { isShiny: true });
      // 2028 est bissextile : le 28 février et le 1ᵉʳ mars sont séparés par le 29
      expect(done(stateOf([shiny('2028-02-28'), shiny('2028-03-01')]))).not.toContain('backToBack');
      expect(done(stateOf([shiny('2028-02-29'), shiny('2028-03-01')]))).toContain('backToBack');
      expect(done(stateOf([shiny('2026-02-28'), shiny('2026-03-01')]))).toContain('backToBack');
      expect(done(stateOf([shiny('2026-03-01'), shiny('2026-03-02')]))).toContain('backToBack');
      expect(done(stateOf([shiny('2026-03-01'), shiny('2026-03-03')]))).not.toContain('backToBack');
      expect(done(stateOf([shiny('2026-12-31'), shiny('2027-01-01')]))).toContain('backToBack');
    });

    it('le jour de Diamant : le 18 novembre, quelle que soit l’année', () => {
      expect(done(stateOf([entry('2026-11-18')]))).toContain('diamantDay');
      expect(done(stateOf([entry('2027-11-18')]))).toContain('diamantDay');
      expect(done(stateOf([entry('2026-11-17')]))).not.toContain('diamantDay');
    });
  });

  it('ne se perd pas : retirer un jour ne casse pas ce que la collection garde', () => {
    const state = stateOf([entry('2026-10-05', { isShiny: true })]);
    expect(done(state)).toContain('spark');
    // même état rechargé (copie) : même résultat
    expect(done(structuredClone(state))).toEqual(done(state));
  });
});
