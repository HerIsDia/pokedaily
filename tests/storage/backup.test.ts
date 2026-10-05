import { describe, expect, it } from 'vitest';
import { buildSpecialBox } from '../../src/core/boxes';
import {
  applyDailyDraw,
  emptyGameState,
  setMonthlyTeam,
  type GameState,
} from '../../src/core/game-state';
import type { DrawResult } from '../../src/core/draw';
import type { PokemonEntry } from '../../src/core/model';
import { seededRng } from '../../src/core/rng';
import { BACKUP_APP, MAX_BACKUP_BYTES, buildBackup, parseBackup } from '../../src/storage/backup';
import type { StateLookup } from '../../src/storage/validate';
import { testPool } from '../core/helpers';

const lookup: StateLookup = {
  hasId: (id) => id >= 1 && id <= 1025,
  hasNature: (key) => key === 'jolly',
};

const entry = (day: string, id: number, over: Partial<PokemonEntry> = {}): PokemonEntry => ({
  id,
  natureKey: 'jolly',
  level: 33,
  isShiny: false,
  day,
  rename: '',
  ...over,
});

const draw = (e: PokemonEntry, over: Partial<DrawResult> = {}): DrawResult => ({
  entry: e,
  reason: 'species',
  pity: { daysWithoutForm: 4 },
  tickets: 1,
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

function richState(): GameState {
  let s = emptyGameState();
  s = applyDailyDraw(s, draw(entry('2026-03-17', 25, { rename: 'Pika' })));
  const box = buildSpecialBox('lucky_day', '2026-03-18', seededRng(1), testPool);
  s = applyDailyDraw(s, draw(entry('2026-03-18', 6, { isShiny: true }), { boxes: [box] }));
  s = { ...s, rouletteBoost: { month: '2026-03', id: 25 } };
  return setMonthlyTeam(s, { month: '2026-03', pokemon: [entry('2026-03-01', 150)] });
}

describe('export', () => {
  it('nomme le fichier avec le jour local', () => {
    const { filename } = buildBackup(emptyGameState(), new Date(2026, 4, 9, 23, 59));
    expect(filename).toBe('pokedaily-2026-05-09.json');
  });

  it('écrit une enveloppe lisible et versionnée', () => {
    const file = JSON.parse(buildBackup(richState()).json) as Record<string, unknown>;
    expect(file.app).toBe(BACKUP_APP);
    expect(file.schemaVersion).toBe(1);
    expect(typeof file.exportedAt).toBe('string');
    expect(Object.keys(file.data as object)).toContain('entries');
  });
});

describe('import', () => {
  it('relit exactement ce qui a été exporté (aller-retour)', () => {
    const state = richState();
    const result = parseBackup(buildBackup(state).json, lookup);
    expect(result).toEqual({ ok: true, state });
  });

  it('refuse ce qui n’est pas du JSON', () => {
    expect(parseBackup('pas du json', lookup)).toMatchObject({ ok: false, reason: 'not_json' });
  });

  it.each(['null', '42', '[]', '{}', '{"app":"autre","schemaVersion":1,"data":{}}'])(
    'refuse un JSON qui n’est pas une sauvegarde : %s',
    (text) => {
      expect(parseBackup(text, lookup)).toMatchObject({ ok: false, reason: 'not_pokedaily' });
    },
  );

  it('refuse un fichier sans numéro de version', () => {
    expect(parseBackup('{"app":"pokedaily","data":{}}', lookup)).toMatchObject({
      reason: 'not_pokedaily',
    });
  });

  it("refuse un fichier d'une version plus récente", () => {
    const text = '{"app":"pokedaily","schemaVersion":2,"data":{}}';
    expect(parseBackup(text, lookup)).toMatchObject({ ok: false, reason: 'too_new' });
  });

  it('refuse EN ENTIER un fichier dont une entrée est abîmée', () => {
    const file = JSON.parse(buildBackup(richState()).json) as {
      data: { entries: { id: number }[] };
    };
    file.data.entries[0] = { ...file.data.entries[0], id: 99999 };
    const result = parseBackup(JSON.stringify(file), lookup);
    expect(result).toMatchObject({ ok: false, reason: 'damaged' });
    expect(result.ok === false && result.details.length).toBeGreaterThan(0);
  });

  it('refuse un fichier trop gros', () => {
    expect(parseBackup('x'.repeat(MAX_BACKUP_BYTES + 1), lookup)).toMatchObject({
      reason: 'too_big',
    });
  });

  it('accepte une collection vide', () => {
    expect(parseBackup(buildBackup(emptyGameState()).json, lookup)).toEqual({
      ok: true,
      state: emptyGameState(),
    });
  });
});
