/** Slim Pokémon entry — only essential display fields, no full API payload. */
export interface PokemonEntry {
  id: number;
  natureId: number;
  level: number;
  isShiny: boolean;
  rename: string;
  /** UTC start-of-day timestamp — also used as IDB key in the history store. */
  date: number;
  // Pre-cached localised display fields
  nameFr: string;
  nameEn: string;
  natureFr: string;
  natureEn: string;
  /** Primary type keys, e.g. ['fire', 'flying'] */
  types: string[];
  typeNamesFr: string[];
  typeNamesEn: string[];
}

export interface AppState {
  lastDate: number;
  /** All unique Pokémon IDs ever encountered. */
  pokedex: number[];
  /** All unique Pokémon IDs encountered as shiny. */
  shinydex: number[];
}

export interface MonthlyTeam {
  /** YYYY-MM format */
  month: string;
  pokemon: PokemonEntry[];
}

export interface VRouletteState {
  /** YYYY-MM format */
  month: string;
  /** 3 boxes of 16 Pokémon IDs each */
  boxes: number[][];
  /** ID of the boosted Pokémon (1/4 chance), or null */
  boostedId: number | null;
  /** Whether the first-time bonus ticket has been claimed */
  firstTimeClaimed: boolean;
}

export interface LuckyDayBox {
  /** YYYY-MM-DD format */
  date: string;
  /** 16 Pokémon IDs */
  box: number[];
  /** Indices of slots that are guaranteed shiny when won */
  shinySlots?: number[];
}

// ── IDB setup ──────────────────────────────────────────────────────────────

const DB_NAME = 'pokedaily';
const DB_VERSION = 1;

let _db: IDBDatabase | null = null;

export function openDB(): Promise<IDBDatabase> {
  if (_db) return Promise.resolve(_db);
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);

    req.onupgradeneeded = (e) => {
      const db = (e.target as IDBOpenDBRequest).result;
      // key/value store for lastDate, pokedex[], shinydex[]
      if (!db.objectStoreNames.contains('state')) {
        db.createObjectStore('state', { keyPath: 'k' });
      }
      // single current-day entry (key = 'entry')
      if (!db.objectStoreNames.contains('today')) {
        db.createObjectStore('today', { keyPath: 'k' });
      }
      // all past entries, keyed by date
      if (!db.objectStoreNames.contains('history')) {
        db.createObjectStore('history', { keyPath: 'date' });
      }
    };

    req.onsuccess = (e) => {
      _db = (e.target as IDBOpenDBRequest).result;
      resolve(_db!);
    };
    req.onerror = (e) => reject((e.target as IDBOpenDBRequest).error);
  });
}

// ── Low-level helpers ──────────────────────────────────────────────────────

function idbGet<T>(db: IDBDatabase, store: string, key: IDBValidKey): Promise<T | undefined> {
  return new Promise((resolve, reject) => {
    const req = db.transaction(store, 'readonly').objectStore(store).get(key);
    req.onsuccess = () => resolve(req.result as T | undefined);
    req.onerror = () => reject(req.error);
  });
}

function idbPut(db: IDBDatabase, store: string, value: object): Promise<void> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, 'readwrite');
    tx.objectStore(store).put(value);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

function idbGetAll<T>(db: IDBDatabase, store: string): Promise<T[]> {
  return new Promise((resolve, reject) => {
    const req = db.transaction(store, 'readonly').objectStore(store).getAll();
    req.onsuccess = () => resolve(req.result as T[]);
    req.onerror = () => reject(req.error);
  });
}

function idbDelete(db: IDBDatabase, store: string, key: IDBValidKey): Promise<void> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, 'readwrite');
    tx.objectStore(store).delete(key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

function idbClear(db: IDBDatabase, store: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, 'readwrite');
    tx.objectStore(store).clear();
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

// ── Public API ─────────────────────────────────────────────────────────────

export async function getState(db: IDBDatabase): Promise<AppState> {
  const [ld, pd, sd] = await Promise.all([
    idbGet<{ k: string; v: number }>(db, 'state', 'lastDate'),
    idbGet<{ k: string; v: number[] }>(db, 'state', 'pokedex'),
    idbGet<{ k: string; v: number[] }>(db, 'state', 'shinydex'),
  ]);
  return {
    lastDate: ld?.v ?? 0,
    pokedex: pd?.v ?? [],
    shinydex: sd?.v ?? [],
  };
}

export async function saveState(db: IDBDatabase, state: AppState): Promise<void> {
  await Promise.all([
    idbPut(db, 'state', { k: 'lastDate', v: state.lastDate }),
    idbPut(db, 'state', { k: 'pokedex', v: state.pokedex }),
    idbPut(db, 'state', { k: 'shinydex', v: state.shinydex }),
  ]);
}

export async function getTodayEntry(db: IDBDatabase): Promise<PokemonEntry | undefined> {
  const r = await idbGet<{ k: string } & PokemonEntry>(db, 'today', 'entry');
  if (!r) return undefined;
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { k: _k, ...entry } = r;
  return entry as PokemonEntry;
}

export async function saveTodayEntry(db: IDBDatabase, entry: PokemonEntry): Promise<void> {
  await idbPut(db, 'today', { k: 'entry', ...entry });
}

export async function getHistory(db: IDBDatabase): Promise<PokemonEntry[]> {
  return idbGetAll<PokemonEntry>(db, 'history');
}

export async function addHistoryEntry(db: IDBDatabase, entry: PokemonEntry): Promise<void> {
  await idbPut(db, 'history', entry);
}

export async function deleteHistoryEntry(db: IDBDatabase, date: number): Promise<void> {
  await idbDelete(db, 'history', date);
}

export async function clearHistoryEntries(db: IDBDatabase): Promise<void> {
  await idbClear(db, 'history');
}

export async function updateRename(db: IDBDatabase, date: number, rename: string): Promise<void> {
  const today = await getTodayEntry(db);
  if (today && today.date === date) {
    await saveTodayEntry(db, { ...today, rename });
  }
  const hist = await idbGet<PokemonEntry>(db, 'history', date);
  if (hist) {
    await idbPut(db, 'history', { ...hist, rename });
  }
}

export async function clearAll(db: IDBDatabase): Promise<void> {
  await Promise.all([
    idbClear(db, 'state'),
    idbClear(db, 'today'),
    idbClear(db, 'history'),
  ]);
}

// ── Victini Tickets ───────────────────────────────────────────────────────

export async function getVictiniTickets(db: IDBDatabase): Promise<number> {
  const r = await idbGet<{ k: string; v: number }>(db, 'state', 'victiniTickets');
  return r?.v ?? 0;
}

export async function saveVictiniTickets(db: IDBDatabase, count: number): Promise<void> {
  await idbPut(db, 'state', { k: 'victiniTickets', v: count });
}

// ── Monthly Team ──────────────────────────────────────────────────────────

export async function getMonthlyTeam(db: IDBDatabase): Promise<MonthlyTeam | null> {
  const r = await idbGet<{ k: string; v: MonthlyTeam }>(db, 'state', 'monthlyTeam');
  return r?.v ?? null;
}

export async function saveMonthlyTeam(db: IDBDatabase, team: MonthlyTeam): Promise<void> {
  await idbPut(db, 'state', { k: 'monthlyTeam', v: team });
}

// ── V-Roulette State ──────────────────────────────────────────────────────

export async function getVRouletteState(db: IDBDatabase): Promise<VRouletteState | null> {
  const r = await idbGet<{ k: string; v: VRouletteState }>(db, 'state', 'vrouletteState');
  return r?.v ?? null;
}

export async function saveVRouletteState(db: IDBDatabase, state: VRouletteState): Promise<void> {
  await idbPut(db, 'state', { k: 'vrouletteState', v: state });
}

// ── Lucky Day Box ─────────────────────────────────────────────────────────

export async function getLuckyDayBox(db: IDBDatabase): Promise<LuckyDayBox | null> {
  const r = await idbGet<{ k: string; v: LuckyDayBox }>(db, 'state', 'luckyDayBox');
  return r?.v ?? null;
}

export async function saveLuckyDayBox(db: IDBDatabase, box: LuckyDayBox): Promise<void> {
  await idbPut(db, 'state', { k: 'luckyDayBox', v: box });
}
