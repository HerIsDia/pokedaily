import { IDBFactory } from 'fake-indexeddb';
import { describe, expect, it, vi } from 'vitest';
import { LEGACY_DB_NAME, cleanupLegacy } from '../../src/storage/legacy';

const listDbs = async (f: IDBFactory) => (await f.databases()).map((d) => d.name);

describe('nettoyage de l’ancienne installation', () => {
  it('supprime la vieille base, les clés et le cache', async () => {
    const indexedDB = new IDBFactory();
    await new Promise<void>((resolve) => {
      const r = indexedDB.open(LEGACY_DB_NAME, 1);
      r.onsuccess = () => {
        r.result.close();
        resolve();
      };
    });
    await new Promise<void>((resolve) => {
      const r = indexedDB.open('pokedaily4', 1);
      r.onsuccess = () => {
        r.result.close();
        resolve();
      };
    });
    const removedLocal: string[] = [];
    const removedSession: string[] = [];
    const removedCaches: string[] = [];

    await cleanupLegacy({
      indexedDB,
      localStorage: { removeItem: (k) => void removedLocal.push(k) },
      sessionStorage: { removeItem: (k) => void removedSession.push(k) },
      caches: { delete: (n) => Promise.resolve(removedCaches.push(n) > 0) },
    });

    // La NOUVELLE base n'est pas touchée.
    expect(await listDbs(indexedDB)).toEqual(['pokedaily4']);
    expect(removedLocal).toEqual(['data', '_devNextId']);
    expect(removedSession).toEqual(['done']);
    expect(removedCaches).toEqual(['pokemon-images-v1']);
  });

  it('ne plante pas quand tout est absent ou refuse', async () => {
    await expect(cleanupLegacy({})).resolves.toBeUndefined();
    await expect(
      cleanupLegacy({
        indexedDB: null,
        localStorage: {
          removeItem: () => {
            throw new Error('bloqué');
          },
        },
        sessionStorage: null,
        caches: { delete: () => Promise.reject(new Error('non')) },
      }),
    ).resolves.toBeUndefined();
  });

  it('continue même si la suppression de la base est bloquée', async () => {
    vi.useFakeTimers();
    const blocked = {
      deleteDatabase: () => ({}) as IDBOpenDBRequest, // ne répond jamais
    } as unknown as IDBFactory;
    const done = cleanupLegacy({ indexedDB: blocked });
    await vi.advanceTimersByTimeAsync(3500);
    await expect(done).resolves.toBeUndefined();
    vi.useRealTimers();
  });
});
