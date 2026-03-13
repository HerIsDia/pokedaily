import type { Nature, Type } from 'pokenode-ts';
import { getPokemonNature, getPokemonData, getPokemonTypes } from './pokeAPI';
import {
  openDB,
  getState, saveState,
  getTodayEntry, saveTodayEntry,
  getHistory, addHistoryEntry,
  updateRename,
  getVictiniTickets, saveVictiniTickets,
  saveLuckyDayBox,
  type PokemonEntry, type AppState,
} from './db';
import {
  loadEvents, getActiveEvents, getNextEvent, getUpcomingEvents, applyEventModifiers,
  type GameEvent,
} from './events';

export type { PokemonEntry };
export type { AppState };
export type { GameEvent };

export interface AppData {
  pokemonOfTheDay: PokemonEntry;
  /** All past entries sorted newest-first. Does NOT include today. */
  history: PokemonEntry[];
  pokedex: number[];
  shinydex: number[];
  /** Currently active event, or null. */
  activeEvent: GameEvent | null;
  /** All currently active events. */
  activeEvents: GameEvent[];
  /** The soonest upcoming event (excluding active), or null. */
  nextEvent: { event: GameEvent; daysUntil: number } | null;
  /** All upcoming events within 7 days. */
  upcomingEvents: { event: GameEvent; daysUntil: number }[];
  /** Current Victini ticket count. */
  victiniTickets: number;
  /** All loaded events for the events calendar. */
  allEvents: GameEvent[];
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

  // Load events (fail-safe)
  const events = await loadEvents();
  const nowDate = new Date();
  const activeEvents = getActiveEvents(events, nowDate);
  const activeEvent = activeEvents.length > 0 ? activeEvents[0] : null;
  const nonActiveEvents = events.filter((e) => !activeEvents.includes(e));
  const nextEventResult = getNextEvent(nonActiveEvents, nowDate);
  const upcomingEvents = getUpcomingEvents(nonActiveEvents, nowDate, 7);

  const state = await getState(db);
  const todayEntry = await getTodayEntry(db);
  const dateNow = Date.now() - (Date.now() % 86400000); // UTC start of day
  const shouldRefresh = dateNow - state.lastDate >= 86400000 && navigator.onLine;

  if (!shouldRefresh) {
    if (todayEntry) {
      const [history, victiniTickets] = await Promise.all([getHistory(db), getVictiniTickets(db)]);
      return {
        pokemonOfTheDay: todayEntry,
        history: history.sort((a, b) => b.date - a.date),
        pokedex: state.pokedex,
        shinydex: state.shinydex,
        activeEvent,
        activeEvents,
        nextEvent: nextEventResult,
        upcomingEvents,
        victiniTickets,
        allEvents: events,
      };
    }
    throw new Error('offline-no-data');
  }

  // Archive current day to history before fetching new one
  if (todayEntry) {
    await addHistoryEntry(db, todayEntry);
  }

  // Base random values
  const devNextId = localStorage.getItem('_devNextId');
  const baseId = devNextId ? parseInt(devNextId, 10) : Math.floor(Math.random() * 1025) + 1;
  if (devNextId) localStorage.removeItem('_devNextId');
  const baseIsShiny = Math.random() < 1 / 69;
  const baseLevel = Math.floor(Math.random() * 99) + 1;

  // Apply event modifiers
  const { id: randomId, isShiny, level } = applyEventModifiers(activeEvents, {
    id: baseId,
    isShiny: baseIsShiny,
    level: baseLevel,
  });

  const randomNatureId = Math.floor(Math.random() * 25) + 1;

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

  // Victini ticket logic
  let victiniTickets = await getVictiniTickets(db);

  // Award ticket if the Pokémon is Victini
  if (randomId === 494) {
    victiniTickets += 1;
  }

  // Award tickets from active events (Lucky Day, etc.)
  for (const event of activeEvents) {
    const m = event.modifiers;
    if (m.victiniTicketsMin !== undefined && m.victiniTicketsMax !== undefined) {
      victiniTickets += Math.floor(Math.random() * (m.victiniTicketsMax - m.victiniTicketsMin + 1)) + m.victiniTicketsMin;
    }
    // Generate Lucky Day box
    if (m.luckyDayBox) {
      const luckyIds: number[] = [];
      for (let i = 0; i < 13; i++) {
        luckyIds.push(Math.floor(Math.random() * 1025) + 1);
      }
      // Add 3 Victini (ID 494)
      luckyIds.push(494, 494, 494);
      await saveLuckyDayBox(db, { date: new Date(dateNow).toISOString().slice(0, 10), box: luckyIds });
    }
  }

  await saveVictiniTickets(db, victiniTickets);

  const history = await getHistory(db);
  sessionStorage.setItem('done', '0');

  return {
    pokemonOfTheDay: newEntry,
    history: history.sort((a, b) => b.date - a.date),
    pokedex: newPokedex,
    shinydex: newShinydex,
    activeEvent,
    activeEvents,
    nextEvent: nextEventResult,
    upcomingEvents,
    victiniTickets,
    allEvents: events,
  };
};

export const setRename = async (date: number, rename: string): Promise<void> => {
  const db = await openDB();
  await updateRename(db, date, rename);
};
