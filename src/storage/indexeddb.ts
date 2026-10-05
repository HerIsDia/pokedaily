import { STATE_SCHEMA_VERSION, type GameState } from '../core/game-state';
import { STORE_DAYS, STORE_META } from './db';
import {
  ConflictError,
  UnsupportedSchemaError,
  type LoadResult,
  type Repository,
} from './repository';
import { parseState, type StateLookup } from './validate';

/**
 * Le dépôt IndexedDB. Deux « tiroirs » :
 *  - `days` : un enregistrement par jour (le Pokémon de ce jour) ;
 *  - `meta` : le reste, une ligne par sujet (tickets, boîtes, collection…) + deux lignes
 *    techniques : `schema` (version du format) et `revision` (compteur de sauvegardes).
 *
 * Chaque sauvegarde est UNE transaction : elle réussit en entier ou pas du tout (la v3.1 faisait
 * plusieurs écritures séparées et pouvait en laisser la moitié). Le compteur `revision` sert de
 * garde-fou entre onglets : si un autre onglet a sauvegardé depuis notre dernière lecture, on
 * refuse d'écraser (`ConflictError`) au lieu de perdre ses changements.
 */

const KEY_SCHEMA = 'schema';
const KEY_REVISION = 'revision';

/** Les sujets de `meta` (hors lignes techniques), dans l'ordre. */
const META_FIELDS = [
  'lastDrawDay',
  'pity',
  'tickets',
  'boxes',
  'caught',
  'caughtShiny',
  'rouletteBonusClaimed',
  'rouletteBoost',
  'monthlyTeam',
] as const satisfies readonly (keyof GameState)[];

interface MetaRow {
  key: string;
  value: unknown;
}

const same = (a: unknown, b: unknown): boolean =>
  a === b || JSON.stringify(a) === JSON.stringify(b);

/** Attend la fin d'une transaction (réussie, annulée ou en erreur). */
function finished(tx: IDBTransaction, failure: () => Error | null): Promise<void> {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onabort = () => reject(failure() ?? tx.error ?? new Error('Sauvegarde annulée.'));
    tx.onerror = () => {
      // L'événement `abort` suit : c'est lui qui rejette.
    };
  });
}

export function createIndexedDbRepository(db: IDBDatabase, lookup: StateLookup): Repository {
  /** Compteur de sauvegardes tel que NOUS l'avons lu / écrit en dernier. */
  let revision = 0;
  let closed = false;

  /** Prépare une transaction d'écriture qui vérifie d'abord la révision. */
  function writeTransaction(
    apply: (days: IDBObjectStore, meta: IDBObjectStore) => void,
  ): Promise<void> {
    if (closed) return Promise.reject(new Error('La sauvegarde est fermée.'));
    let failure: Error | null = null;
    let tx: IDBTransaction;
    try {
      tx = db.transaction([STORE_DAYS, STORE_META], 'readwrite');
    } catch (error) {
      return Promise.reject(error instanceof Error ? error : new Error(String(error)));
    }
    const days = tx.objectStore(STORE_DAYS);
    const meta = tx.objectStore(STORE_META);
    const done = finished(tx, () => failure);
    const abort = (error: Error) => {
      failure ??= error;
      try {
        tx.abort();
      } catch {
        // déjà terminée
      }
    };

    const read = meta.get(KEY_REVISION);
    read.onsuccess = () => {
      const stored = (read.result as MetaRow | undefined)?.value;
      const current = typeof stored === 'number' ? stored : 0;
      if (current !== revision) {
        abort(new ConflictError());
        return;
      }
      try {
        apply(days, meta);
        meta.put({ key: KEY_SCHEMA, value: STATE_SCHEMA_VERSION } satisfies MetaRow);
        meta.put({ key: KEY_REVISION, value: current + 1 } satisfies MetaRow);
      } catch (error) {
        // Ex. une valeur impossible à enregistrer : on annule TOUT.
        abort(error instanceof Error ? error : new Error(String(error)));
      }
    };
    read.onerror = () => abort(read.error ?? new Error('Lecture impossible.'));

    return done.then(() => {
      revision += 1;
    });
  }

  return {
    persistent: true,

    async load(): Promise<LoadResult> {
      if (closed) throw new Error('La sauvegarde est fermée.');
      const tx = db.transaction([STORE_DAYS, STORE_META], 'readonly');
      const daysRequest = tx.objectStore(STORE_DAYS).getAll();
      const metaRequest = tx.objectStore(STORE_META).getAll();
      await finished(tx, () => null);

      const meta = new Map<string, unknown>(
        (metaRequest.result as MetaRow[]).map((row) => [row.key, row.value]),
      );
      const schema = meta.get(KEY_SCHEMA);
      if (typeof schema === 'number' && schema > STATE_SCHEMA_VERSION) {
        throw new UnsupportedSchemaError(schema);
      }
      const stored = meta.get(KEY_REVISION);
      revision = typeof stored === 'number' ? stored : 0;

      const raw: Record<string, unknown> = { entries: daysRequest.result };
      for (const field of META_FIELDS) raw[field] = meta.get(field);
      const { state, problems } = parseState(raw, lookup);
      return { state, warnings: problems };
    },

    save(previous, next): Promise<void> {
      return writeTransaction((days, meta) => {
        for (const [day, entry] of Object.entries(next.entries)) {
          if (!same(previous.entries[day], entry)) days.put(entry);
        }
        for (const day of Object.keys(previous.entries)) {
          if (!(day in next.entries)) days.delete(day);
        }
        for (const field of META_FIELDS) {
          if (!same(previous[field], next[field])) {
            meta.put({ key: field, value: next[field] } satisfies MetaRow);
          }
        }
      });
    },

    replaceAll(state): Promise<void> {
      return writeTransaction((days, meta) => {
        days.clear();
        // On garde les deux lignes techniques : `writeTransaction` les réécrit.
        for (const field of META_FIELDS) meta.delete(field);
        for (const entry of Object.values(state.entries)) days.put(entry);
        for (const field of META_FIELDS) {
          meta.put({ key: field, value: state[field] } satisfies MetaRow);
        }
      });
    },

    close() {
      closed = true;
      db.close();
    },
  };
}
