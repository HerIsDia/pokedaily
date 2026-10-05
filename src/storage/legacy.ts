/**
 * Nettoyage de l'ancienne installation (v3.1, Svelte). Pas de migration (décision de Diamant) :
 * on supprime simplement ses traces. À n'appeler QU'APRÈS l'ouverture réussie de la nouvelle
 * base, et seulement quand la sauvegarde est durable (jamais en mode secours « mémoire »).
 *
 * Sur une prévisualisation (autre adresse web), rien de tout ça n'existe : supprimer une base
 * absente est sans effet. Chaque étape est indépendante : une erreur n'empêche pas les autres.
 */

export const LEGACY_DB_NAME = 'pokedaily';
export const LEGACY_LOCAL_KEYS = ['data', '_devNextId'] as const;
export const LEGACY_SESSION_KEYS = ['done'] as const;
export const LEGACY_CACHE_NAMES = ['pokemon-images-v1'] as const;

export interface LegacyEnv {
  indexedDB?: IDBFactory | null;
  localStorage?: Pick<Storage, 'removeItem'> | null;
  sessionStorage?: Pick<Storage, 'removeItem'> | null;
  caches?: Pick<CacheStorage, 'delete'> | null;
}

/** Délai maximum d'attente de la suppression de l'ancienne base (un vieil onglet peut la bloquer). */
const DELETE_TIMEOUT_MS = 3000;

function deleteDatabase(factory: IDBFactory): Promise<void> {
  return new Promise((resolve) => {
    const timer = setTimeout(resolve, DELETE_TIMEOUT_MS);
    const finish = () => {
      clearTimeout(timer);
      resolve();
    };
    try {
      const request = factory.deleteDatabase(LEGACY_DB_NAME);
      request.onsuccess = finish;
      request.onerror = finish;
      request.onblocked = finish; // la suppression aboutira quand l'autre onglet se fermera
    } catch {
      finish();
    }
  });
}

function currentEnv(): LegacyEnv {
  const safe = <T>(read: () => T): T | null => {
    try {
      return read();
    } catch {
      return null; // certains navigateurs lèvent une erreur rien qu'à l'accès (stockage bloqué)
    }
  };
  return {
    indexedDB: safe(() => globalThis.indexedDB),
    localStorage: safe(() => globalThis.localStorage),
    sessionStorage: safe(() => globalThis.sessionStorage),
    caches: safe(() => globalThis.caches),
  };
}

export async function cleanupLegacy(env: LegacyEnv = currentEnv()): Promise<void> {
  if (env.indexedDB) await deleteDatabase(env.indexedDB);
  for (const key of LEGACY_LOCAL_KEYS) {
    try {
      env.localStorage?.removeItem(key);
    } catch {
      // ignoré
    }
  }
  for (const key of LEGACY_SESSION_KEYS) {
    try {
      env.sessionStorage?.removeItem(key);
    } catch {
      // ignoré
    }
  }
  for (const name of LEGACY_CACHE_NAMES) {
    try {
      await env.caches?.delete(name);
    } catch {
      // ignoré
    }
  }
}
