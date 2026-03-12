import type { Nature, Type } from 'pokenode-ts';
import { getPokemonNature, getPokemonData, getPokemonTypes } from './pokeAPI';
import {
  openDB,
  getState, saveState,
  getTodayEntry, saveTodayEntry,
  getHistory, addHistoryEntry,
  updateRename,
  type PokemonEntry, type AppState,
} from './db';

export type { PokemonEntry };
export type { AppState };

export interface AppData {
  pokemonOfTheDay: PokemonEntry;
  /** All past entries sorted newest-first. Does NOT include today. */
  history: PokemonEntry[];
  pokedex: number[];
  shinydex: number[];
}

/** Returns `/images/001.png` or `/images/001S.png` for shiny. */
export function getPokemonImagePath(id: number, isShiny: boolean): string {
  return `/images/${id.toString().padStart(3, '0')}${isShiny ? 'S' : ''}.png`;
}

export function getUserLang(): 'fr' | 'en' {
  const param = new URLSearchParams(window.location.search).get('lang');
  const lang = param ?? navigator.language.slice(0, 2);
  return lang === 'fr' ? 'fr' : 'en';
}

// ── localStorage → IDB migration ──────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapOldEntry(p: any, date: number): PokemonEntry {
  const sp = p.fetched?.pokemon;
  const nat = p.fetched?.nature;
  const tps: unknown[] = (p.fetched?.types ?? []).filter(Boolean);
  return {
    id: p.id ?? 0,
    natureId: p.natureID ?? p.natureId ?? 1,
    level: p.level ?? 1,
    isShiny: p.isShiny ?? false,
    rename: p.rename ?? '',
    date,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    nameFr: sp?.species?.names?.find((n: any) => n.language.name === 'fr')?.name ?? sp?.pokemon?.name ?? '',
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    nameEn: sp?.species?.names?.find((n: any) => n.language.name === 'en')?.name ?? sp?.pokemon?.name ?? '',
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    natureFr: nat?.names?.find((n: any) => n.language.name === 'fr')?.name ?? nat?.name ?? '',
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    natureEn: nat?.names?.find((n: any) => n.language.name === 'en')?.name ?? nat?.name ?? '',
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    types: (tps as any[]).map((t) => t.name ?? ''),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    typeNamesFr: (tps as any[]).map((t) => t.names?.find((n: any) => n.language.name === 'fr')?.name ?? t.name ?? ''),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    typeNamesEn: (tps as any[]).map((t) => t.names?.find((n: any) => n.language.name === 'en')?.name ?? t.name ?? ''),
  };
}

async function migrateFromLocalStorage(db: IDBDatabase): Promise<void> {
  const stored = localStorage.getItem('data');
  if (!stored) return;
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const old = JSON.parse(stored) as any;
    if (!old?.pokemonOfTheDay) return;

    const todayEntry = mapOldEntry(old.pokemonOfTheDay, old._lastDate ?? Date.now());
    await saveTodayEntry(db, todayEntry);

    const histEntries: PokemonEntry[] = [];
    for (const h of (old.history ?? [])) {
      const entry = mapOldEntry(h.pokemon, h._date ?? 0);
      if (entry.date > 0) {
        await addHistoryEntry(db, entry);
        histEntries.push(entry);
      }
    }

    const pokedex = [...new Set([
      ...(old.pokedex ?? []) as number[],
      todayEntry.id,
      ...histEntries.map((e) => e.id),
    ])];
    const shinydex = [...new Set([
      ...(todayEntry.isShiny ? [todayEntry.id] : []),
      ...histEntries.filter((e) => e.isShiny).map((e) => e.id),
    ])];

    await saveState(db, { lastDate: old._lastDate ?? 0, pokedex, shinydex });
    localStorage.removeItem('data');
  } catch (err) {
    console.warn('[Pokédaily] localStorage migration failed:', err);
  }
}

// ── Main script ────────────────────────────────────────────────────────────

export const script = async (): Promise<AppData> => {
  const db = await openDB();

  // One-time migration
  if (localStorage.getItem('data')) {
    await migrateFromLocalStorage(db);
  }

  const state = await getState(db);
  const todayEntry = await getTodayEntry(db);
  const dateNow = Date.now() - (Date.now() % 86400000); // UTC start of day
  const shouldRefresh = dateNow - state.lastDate >= 86400000 && navigator.onLine;

  if (!shouldRefresh) {
    if (todayEntry) {
      const history = await getHistory(db);
      return {
        pokemonOfTheDay: todayEntry,
        history: history.sort((a, b) => b.date - a.date),
        pokedex: state.pokedex,
        shinydex: state.shinydex,
      };
    }
    throw new Error('offline-no-data');
  }

  // Archive current day to history before fetching new one
  if (todayEntry) {
    await addHistoryEntry(db, todayEntry);
  }

  // Fetch new Pokémon of the day
  const devNextId = localStorage.getItem('_devNextId');
  const randomId = devNextId ? parseInt(devNextId, 10) : Math.floor(Math.random() * 1025) + 1;
  if (devNextId) localStorage.removeItem('_devNextId');
  const randomNatureId = Math.floor(Math.random() * 25) + 1;
  const isShiny = Math.random() < 1 / 69;
  const level = Math.floor(Math.random() * 99) + 1;

  const [fetchedPokemon, fetchedNature] = await Promise.all([
    getPokemonData(randomId),
    getPokemonNature(randomNatureId) as Promise<Nature>,
  ]);

  const typeNames = fetchedPokemon.pokemon.types.map((t) => t.type.name);
  const fetchedTypes = await Promise.all(
    typeNames.map((name) => getPokemonTypes(name) as Promise<Type>)
  );

  const newEntry: PokemonEntry = {
    id: randomId,
    natureId: randomNatureId,
    level,
    isShiny,
    rename: '',
    date: dateNow,
    nameFr: fetchedPokemon.species.names.find((n) => n.language.name === 'fr')?.name ?? fetchedPokemon.pokemon.name,
    nameEn: fetchedPokemon.species.names.find((n) => n.language.name === 'en')?.name ?? fetchedPokemon.pokemon.name,
    natureFr: fetchedNature.names.find((n) => n.language.name === 'fr')?.name ?? fetchedNature.name,
    natureEn: fetchedNature.names.find((n) => n.language.name === 'en')?.name ?? fetchedNature.name,
    types: typeNames,
    typeNamesFr: fetchedTypes.map((t) => t.names.find((n) => n.language.name === 'fr')?.name ?? t.name),
    typeNamesEn: fetchedTypes.map((t) => t.names.find((n) => n.language.name === 'en')?.name ?? t.name),
  };

  await saveTodayEntry(db, newEntry);

  const newPokedex = [...new Set([...state.pokedex, randomId])];
  const newShinydex = isShiny ? [...new Set([...state.shinydex, randomId])] : state.shinydex;
  const newState: AppState = { lastDate: dateNow, pokedex: newPokedex, shinydex: newShinydex };
  await saveState(db, newState);

  const history = await getHistory(db);
  sessionStorage.setItem('done', '0');

  return {
    pokemonOfTheDay: newEntry,
    history: history.sort((a, b) => b.date - a.date),
    pokedex: newPokedex,
    shinydex: newShinydex,
  };
};

export const setRename = async (date: number, rename: string): Promise<void> => {
  const db = await openDB();
  await updateRename(db, date, rename);
};
