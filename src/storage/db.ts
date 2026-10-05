import { StorageUnavailableError } from './repository';

/** Nom de la base de la v4 (l'ancienne v3.1 s'appelait « pokedaily »). */
export const DB_NAME = 'pokedaily4';
export const DB_VERSION = 1;

/** Un enregistrement par jour : le Pokémon de ce jour. */
export const STORE_DAYS = 'days';
/** Tout le reste (tickets, boîtes, collection…) : { key, value }. */
export const STORE_META = 'meta';

/**
 * L'IndexedDB du navigateur, ou `null`. Certains navigateurs LÈVENT une erreur rien qu'à la
 * lecture de `indexedDB` (stockage bloqué, mode strict) : on ne doit pas planter pour ça.
 */
export function browserIndexedDb(): IDBFactory | null {
  try {
    return globalThis.indexedDB ?? null;
  } catch {
    return null;
  }
}

/** Ouvre (et au besoin crée) la base. Rejette avec `StorageUnavailableError` si impossible. */
export function openGameDb(
  factory: IDBFactory | null = browserIndexedDb(),
  name: string = DB_NAME,
): Promise<IDBDatabase> {
  if (!factory) {
    return Promise.reject(new StorageUnavailableError("IndexedDB n'est pas disponible."));
  }
  return new Promise((resolve, reject) => {
    let request: IDBOpenDBRequest;
    try {
      request = factory.open(name, DB_VERSION);
    } catch (error) {
      reject(new StorageUnavailableError(`Ouverture impossible : ${String(error)}`));
      return;
    }
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_DAYS)) {
        db.createObjectStore(STORE_DAYS, { keyPath: 'day' });
      }
      if (!db.objectStoreNames.contains(STORE_META)) {
        db.createObjectStore(STORE_META, { keyPath: 'key' });
      }
    };
    request.onsuccess = () => {
      const db = request.result;
      // Une autre version de l'app veut mettre la base à jour : on se retire pour ne pas la bloquer.
      db.onversionchange = () => db.close();
      resolve(db);
    };
    request.onerror = () =>
      reject(new StorageUnavailableError(`Ouverture refusée : ${String(request.error)}`));
    request.onblocked = () =>
      reject(new StorageUnavailableError('Ouverture bloquée par un autre onglet.'));
  });
}
