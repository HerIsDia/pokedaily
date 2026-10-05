import { IDBFactory } from 'fake-indexeddb';
import { beforeEach, describe, expect, it } from 'vitest';
import {
  applyDailyDraw,
  emptyGameState,
  renameEntry,
  type GameState,
} from '../../src/core/game-state';
import type { DrawResult } from '../../src/core/draw';
import type { PokemonEntry } from '../../src/core/model';
import {
  DB_NAME,
  STORE_DAYS,
  STORE_META,
  browserIndexedDb,
  openGameDb,
} from '../../src/storage/db';
import { createIndexedDbRepository } from '../../src/storage/indexeddb';
import { createMemoryRepository } from '../../src/storage/memory';
import {
  ConflictError,
  StorageUnavailableError,
  UnsupportedSchemaError,
  type Repository,
} from '../../src/storage/repository';
import type { StateLookup } from '../../src/storage/validate';

const lookup: StateLookup = {
  hasId: (id) => id >= 1 && id <= 1025,
  hasNature: (key) => key === 'jolly',
};

const entry = (day: string, id = 25, over: Partial<PokemonEntry> = {}): PokemonEntry => ({
  id,
  natureKey: 'jolly',
  level: 12,
  isShiny: false,
  day,
  rename: '',
  ...over,
});

const draw = (e: PokemonEntry, tickets = 0): DrawResult => ({
  entry: e,
  reason: 'species',
  pity: { daysWithoutForm: 2 },
  tickets,
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

let factory: IDBFactory;
const open = async (): Promise<Repository> =>
  createIndexedDbRepository(await openGameDb(factory), lookup);

beforeEach(() => {
  factory = new IDBFactory();
});

describe('dépôt IndexedDB', () => {
  it('une base neuve donne un état vide', async () => {
    const repo = await open();
    const { state, warnings } = await repo.load();
    expect(state).toEqual(emptyGameState());
    expect(warnings).toEqual([]);
  });

  it('sauvegarde puis relit, y compris après réouverture de la base', async () => {
    const repo = await open();
    const start = (await repo.load()).state;
    const next = applyDailyDraw(start, draw(entry('2026-05-01', 6, { isShiny: true }), 2));
    await repo.save(start, next);
    const renamed = renameEntry(next, '2026-05-01', 'Dracaufeu');
    await repo.save(next, renamed);
    repo.close();

    const again = await open();
    const loaded = await again.load();
    expect(loaded.warnings).toEqual([]);
    expect(loaded.state).toEqual(renamed);
    expect(loaded.state.tickets).toBe(2);
    expect(loaded.state.caughtShiny).toEqual([6]);
  });

  it("n'écrit que ce qui a changé et supprime ce qui disparaît", async () => {
    const repo = await open();
    const s0 = (await repo.load()).state;
    const s1 = applyDailyDraw(s0, draw(entry('2026-05-01')));
    await repo.save(s0, s1);
    const s2: GameState = { ...s1, entries: {}, lastDrawDay: null };
    await repo.save(s1, s2);
    expect((await repo.load()).state.entries).toEqual({});
  });

  it('une sauvegarde qui échoue en cours de route ne laisse RIEN (atomicité)', async () => {
    const repo = await open();
    const s0 = (await repo.load()).state;
    const s1 = applyDailyDraw(s0, draw(entry('2026-05-01')));
    await repo.save(s0, s1);

    // Un tirage correct + une valeur qu'IndexedDB ne sait pas enregistrer (une fonction).
    const poisoned = {
      ...applyDailyDraw(s1, draw(entry('2026-05-02', 7), 5)),
      pity: { daysWithoutForm: () => 1 } as unknown as GameState['pity'],
    };
    await expect(repo.save(s1, poisoned)).rejects.toMatchObject({ name: 'DataCloneError' });

    const after = await repo.load();
    expect(after.state).toEqual(s1);
    expect(after.state.entries['2026-05-02']).toBeUndefined();
    expect(after.state.tickets).toBe(0);
  });

  it("après un échec, le dépôt reste utilisable (la révision n'a pas bougé)", async () => {
    const repo = await open();
    const s0 = (await repo.load()).state;
    const bad = { ...s0, pity: { daysWithoutForm: () => 1 } as unknown as GameState['pity'] };
    await expect(repo.save(s0, bad)).rejects.toBeInstanceOf(Error);
    const s1 = applyDailyDraw(s0, draw(entry('2026-05-01')));
    await repo.save(s0, s1);
    expect((await repo.load()).state).toEqual(s1);
  });

  describe('deux onglets', () => {
    it("refuse d'écraser les changements d'un autre onglet", async () => {
      const a = await open();
      const b = await open();
      const a0 = (await a.load()).state;
      const b0 = (await b.load()).state;

      await a.save(a0, applyDailyDraw(a0, draw(entry('2026-05-01', 1))));
      await expect(
        b.save(b0, applyDailyDraw(b0, draw(entry('2026-05-01', 4)))),
      ).rejects.toBeInstanceOf(ConflictError);

      // Rien de B n'a été écrit ; après relecture, B peut continuer.
      const reread = await b.load();
      expect(reread.state.entries['2026-05-01']?.id).toBe(1);
      await b.save(reread.state, { ...reread.state, tickets: 9 });
      expect((await a.load()).state.tickets).toBe(9);
    });

    it("l'import (replaceAll) est lui aussi protégé", async () => {
      const a = await open();
      const b = await open();
      await a.load();
      const b0 = (await b.load()).state;
      await a.save(emptyGameState(), { ...emptyGameState(), tickets: 1 });
      await expect(b.replaceAll({ ...b0, tickets: 50 })).rejects.toBeInstanceOf(ConflictError);
    });
  });

  it('replaceAll remplace tout (anciens jours compris)', async () => {
    const repo = await open();
    const s0 = (await repo.load()).state;
    await repo.save(s0, applyDailyDraw(s0, draw(entry('2026-05-01'))));
    const imported = applyDailyDraw(emptyGameState(), draw(entry('2025-12-24', 150), 3));
    await repo.replaceAll(imported);
    const { state } = await repo.load();
    expect(state).toEqual(imported);
    expect(Object.keys(state.entries)).toEqual(['2025-12-24']);
  });

  describe('données abîmées', () => {
    async function corrupt(fn: (db: IDBDatabase) => void) {
      const db = await openGameDb(factory);
      fn(db);
      await new Promise<void>((r) => {
        // laisser les écritures se terminer
        const tx = db.transaction([STORE_DAYS, STORE_META], 'readonly');
        tx.oncomplete = () => r();
      });
      db.close();
    }

    it('ignore les lignes illisibles et prévient, sans planter', async () => {
      await corrupt((db) => {
        const tx = db.transaction([STORE_DAYS, STORE_META], 'readwrite');
        tx.objectStore(STORE_DAYS).put(entry('2026-05-01'));
        tx.objectStore(STORE_DAYS).put({ day: '2026-05-02', id: 'oups' });
        tx.objectStore(STORE_META).put({ key: 'tickets', value: 'beaucoup' });
      });
      const { state, warnings } = await (await open()).load();
      expect(Object.keys(state.entries)).toEqual(['2026-05-01']);
      expect(state.tickets).toBe(0);
      expect(warnings.length).toBeGreaterThanOrEqual(2);
    });

    it('refuse une sauvegarde d’une version plus récente', async () => {
      await corrupt((db) => {
        db.transaction([STORE_META], 'readwrite')
          .objectStore(STORE_META)
          .put({ key: 'schema', value: 99 });
      });
      await expect((await open()).load()).rejects.toBeInstanceOf(UnsupportedSchemaError);
    });
  });

  it('après close(), le dépôt refuse de travailler', async () => {
    const repo = await open();
    repo.close();
    await expect(repo.load()).rejects.toBeInstanceOf(Error);
    await expect(repo.save(emptyGameState(), emptyGameState())).rejects.toBeInstanceOf(Error);
  });
});

describe('ouverture de la base', () => {
  it('utilise le bon nom et crée les deux tiroirs', async () => {
    const db = await openGameDb(factory);
    expect(db.name).toBe(DB_NAME);
    expect([...db.objectStoreNames].sort()).toEqual([STORE_DAYS, STORE_META].sort());
    db.close();
  });

  it("signale clairement qu'IndexedDB est absent", async () => {
    await expect(openGameDb(null)).rejects.toBeInstanceOf(StorageUnavailableError);
  });
});

describe("accès à l'IndexedDB du navigateur", () => {
  it("ne plante pas si le navigateur lève une erreur rien qu'à la lecture", () => {
    const original = Object.getOwnPropertyDescriptor(globalThis, 'indexedDB');
    Object.defineProperty(globalThis, 'indexedDB', {
      configurable: true,
      get() {
        throw new DOMException('refusé', 'SecurityError');
      },
    });
    try {
      expect(browserIndexedDb()).toBeNull();
    } finally {
      if (original) Object.defineProperty(globalThis, 'indexedDB', original);
      else delete (globalThis as { indexedDB?: unknown }).indexedDB;
    }
  });
});

describe('dépôt en mémoire', () => {
  it('garde l’état et le copie (pas de partage accidentel)', async () => {
    const repo = createMemoryRepository();
    const s0 = (await repo.load()).state;
    const s1 = applyDailyDraw(s0, draw(entry('2026-05-01')));
    await repo.save(s0, s1);
    const loaded = (await repo.load()).state;
    expect(loaded).toEqual(s1);
    loaded.tickets = 99;
    expect((await repo.load()).state.tickets).toBe(0);
    expect(repo.persistent).toBe(false);
  });
});

describe('StorageUnavailableError', () => {
  it('a un nom lisible', () => {
    expect(new StorageUnavailableError('x').name).toBe('StorageUnavailableError');
  });
});
