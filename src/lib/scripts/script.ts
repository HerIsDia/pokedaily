import type { Nature, Pokemon, PokemonSpecies, Type } from 'pokenode-ts';
import { getPokemonNature, getPokemonData, getPokemonTypes } from './pokeAPI';

export interface PokemonData {
  id: number;
  rename: string;
  natureID: number;
  level: number;
  isShiny: boolean;
  fetched: {
    pokemon: { pokemon: Pokemon; species: PokemonSpecies };
    nature: Nature;
    types: (Type | null)[];
  };
}

export interface HistoryEntry {
  _date: number;
  pokemon: PokemonData;
}

export interface AppData {
  _lastDate: number;
  pokemonOfTheDay: PokemonData;
  history: HistoryEntry[];
  pokedex: number[];
}

/** Returns a zero-padded 3-digit ID string, with optional shiny suffix. */
export function getPokemonImageId(id: number, isShiny: boolean): string {
  return `${id.toString().padStart(3, '0')}${isShiny ? 'S' : ''}`;
}

/** Returns the path to a Pokemon's image. */
export function getPokemonImagePath(id: number, isShiny: boolean): string {
  return `/images/${getPokemonImageId(id, isShiny)}.png`;
}

/** Returns the user's preferred language (fr or en). */
export function getUserLang(): 'fr' | 'en' {
  const param = new URLSearchParams(window.location.search).get('lang');
  const lang = param ?? navigator.language.slice(0, 2);
  return lang === 'fr' ? 'fr' : 'en';
}

export const script = async (): Promise<AppData> => {
  const stored = localStorage.getItem('data');
  const local: AppData | null = stored ? (JSON.parse(stored) as AppData) : null;

  // Align to start of current UTC day
  const dateNow = Date.now() - (Date.now() % 86400000);
  const lastDay = local?._lastDate ?? 0;
  const shouldRefresh = (dateNow - lastDay >= 86400000) && navigator.onLine;

  if (!shouldRefresh) {
    if (local) return local;
    // No data at all and offline — return empty placeholder
    throw new Error('offline-no-data');
  }

  // --- Fetch new Pokemon of the day ---
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

  const newPokemon: PokemonData = {
    id: randomId,
    rename: '',
    natureID: randomNatureId,
    level,
    isShiny,
    fetched: {
      pokemon: fetchedPokemon,
      nature: fetchedNature,
      types: fetchedTypes,
    },
  };

  // --- Update history and pokedex ---
  let history: HistoryEntry[] = local?.history ?? [];
  let pokedex: number[] = local?.pokedex ?? [];

  if (local?.pokemonOfTheDay) {
    // Archive the previous Pokemon of the day to history
    history = [{ _date: local._lastDate, pokemon: local.pokemonOfTheDay }, ...history];
    // Keep only the last 10 history entries in the main list; older ones go to pokedex
    if (history.length > 10) {
      const overflow = history.splice(10);
      pokedex = [...pokedex, ...overflow.map((e) => e.pokemon.id)];
    }
    // Add all history entries to pokedex (deduplicated)
    pokedex = [...pokedex, ...history.map((e) => e.pokemon.id)];
  }

  pokedex = [...new Set([...pokedex, randomId])];

  const newData: AppData = {
    _lastDate: dateNow,
    pokemonOfTheDay: newPokemon,
    history,
    pokedex,
  };

  localStorage.setItem('data', JSON.stringify(newData));
  sessionStorage.setItem('done', '0');
  return newData;
};

export const setRename = (rename: string): void => {
  const stored = localStorage.getItem('data');
  if (!stored) return;
  const data = JSON.parse(stored) as AppData;
  data.pokemonOfTheDay.rename = rename;
  localStorage.setItem('data', JSON.stringify(data));
};
