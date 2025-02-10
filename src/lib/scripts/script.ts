import type { Nature, Pokemon, PokemonSpecies, Type } from 'pokenode-ts';
import { getPokemonNature, getPokemonData, getPokemonTypes } from './pokeAPI';

const version = 'FINAL';

export interface AppData {
  _lastVersion: string;
  _lastDate: number;
  pokemonOfTheDay: PokemonData;
  history: HistoryData[];
  pokedex: Number[];
}

interface PokemonData {
  id: number;
  rename: string;
  natureID: number;
  level: number;
  isShiny: boolean;
  fetched: {
    pokemon: { pokemon: Pokemon; species: PokemonSpecies };
    nature: Nature;
    types: Type[];
  };
}

interface HistoryData {
  _date: number;
  pokemon: PokemonData;
}

export const script = async () => {
  const LocalData: AppData | undefined = localStorage.getItem('data')
    ? (JSON.parse(localStorage.getItem('data')!) as AppData)
    : undefined;
  const dateNow = Date.now() - (Date.now() % 86400000);
  let lastDay = LocalData ? LocalData._lastDate : 0;
  const online = navigator.onLine;
  const difference =
    (dateNow - lastDay >= 86400000 || LocalData._lastVersion != version) &&
    online;
  let pokemonOfTheDay = LocalData ? LocalData.pokemonOfTheDay : undefined;
  let history = LocalData ? LocalData.history : [];
  if (difference) {
    const randomPokemon = Math.floor(Math.random() * 1024) + 1;
    const fetchedNewPokemon = await getPokemonData(randomPokemon);
    const randomNature = Math.floor(Math.random() * 24) + 1;
    const fetchedNewNature: Nature = (await getPokemonNature(
      randomNature
    )) as Nature;
    const fetchedNewTypes: Type[] = [
      (await getPokemonTypes(
        fetchedNewPokemon.pokemon.types[0].type.name
      )) as Type,
      fetchedNewPokemon.pokemon.types.length == 2
        ? ((await getPokemonTypes(
          fetchedNewPokemon.pokemon.types[1].type.name
        )) as Type)
        : null,
    ];
    let dex = [];
    if (pokemonOfTheDay) {
      dex = LocalData.pokedex ? LocalData.pokedex : [];
      for (let index = 5; index < history.length;) {
        const a = history.shift();
        dex.push(a.pokemon.id);
      }
      history.push({
        _date: dateNow,
        pokemon: pokemonOfTheDay,
      });
      history.forEach((p) => {
        dex.push(p.pokemon.id);
      });
    }
    pokemonOfTheDay = {
      id: randomPokemon,
      rename: '',
      natureID: randomNature,
      level: Math.floor(Math.random() * 99) + 1,
      isShiny: Math.random() < 1 / 69,
      fetched: {
        pokemon: fetchedNewPokemon,
        nature: fetchedNewNature,
        types: fetchedNewTypes,
      },
    };
    lastDay = dateNow;
    dex.push(pokemonOfTheDay.id);
    const newData: AppData = {
      _lastVersion: version,
      _lastDate: lastDay,
      pokemonOfTheDay: pokemonOfTheDay,
      history: history,
      pokedex: [...new Set(dex)],
    };
    localStorage.setItem('data', JSON.stringify(newData));
    sessionStorage.setItem('done', '0');
    return newData;
  } else {
    sessionStorage.setItem('done', '1');
    return LocalData;
  }
};

export const setRename = (rename: string) => {
  const LocalData: AppData | undefined = localStorage.getItem('data')
    ? (JSON.parse(localStorage.getItem('data')!) as AppData)
    : undefined;
  if (!LocalData) return;
  const newData: AppData = {
    ...LocalData,
    pokemonOfTheDay: { ...LocalData.pokemonOfTheDay, rename: rename },
  };
  localStorage.setItem('data', JSON.stringify(newData));
};
