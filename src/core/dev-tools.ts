import { LEVEL_CAP, LEVEL_MIN } from './constants';
import { addDays, type Day } from './dates';
import type { GameEvent } from './events/types';
import { emptyGameState, ensureTodayDraw, todayEntry, type GameState } from './game-state';
import type { DrawPool, PokemonEntry } from './model';
import { clampName } from './names';
import { createPokemon } from './pokemon';
import { pickOne, type Rng } from './rng';

/**
 * Outils du MODE DÉVELOPPEUR (gardé pour tout le monde : décision de Diamant). Ce sont des
 * transitions pures comme les autres, donc testées et sauvegardées normalement.
 */

/** Maximum de jours que « remplir l'historique » peut générer d'un coup. */
export const MAX_FILL_DAYS = 30;

/** Recalcule la collection à partir de ce qui existe vraiment (jours + team du mois). */
function rebuildCollection(state: GameState): GameState {
  const caught = new Set<number>();
  const shiny = new Set<number>();
  for (const entry of [...Object.values(state.entries), ...(state.monthlyTeam?.pokemon ?? [])]) {
    caught.add(entry.id);
    if (entry.isShiny) shiny.add(entry.id);
  }
  const sorted = (set: Set<number>) => [...set].sort((a, b) => a - b);
  return { ...state, caught: sorted(caught), caughtShiny: sorted(shiny) };
}

/** Ajoute des identifiants à la collection (sans rien retirer). */
function withCaught(state: GameState, entries: readonly PokemonEntry[]): GameState {
  const caught = new Set(state.caught);
  const shiny = new Set(state.caughtShiny);
  for (const entry of entries) {
    caught.add(entry.id);
    if (entry.isShiny) shiny.add(entry.id);
  }
  const sorted = (set: Set<number>) => [...set].sort((a, b) => a - b);
  return { ...state, caught: sorted(caught), caughtShiny: sorted(shiny) };
}

function withoutDay(entries: GameState['entries'], day: Day): GameState['entries'] {
  return Object.fromEntries(Object.entries(entries).filter(([key]) => key !== day));
}

export interface TodayPatch {
  level?: number;
  isShiny?: boolean;
  rename?: string;
}

/** Modifie le niveau, le shiny ou le surnom du Pokémon du jour. */
export function devSetToday(state: GameState, patch: TodayPatch, pool: DrawPool): GameState {
  const current = todayEntry(state);
  if (!current || state.lastDrawDay === null) return state;
  const entry: PokemonEntry = { ...current };
  if (patch.level !== undefined && Number.isFinite(patch.level)) {
    entry.level = Math.min(LEVEL_CAP, Math.max(LEVEL_MIN, Math.trunc(patch.level)));
  }
  // Pas d'image shiny = pas de shiny, même pour un outil de développement.
  if (patch.isShiny !== undefined) entry.isShiny = patch.isShiny && pool.canBeShiny(entry.id);
  if (patch.rename !== undefined) entry.rename = clampName(patch.rename);
  return withCaught({ ...state, entries: { ...state.entries, [state.lastDrawDay]: entry } }, [
    entry,
  ]);
}

/** Remplace le Pokémon du jour par `id` (nature, niveau et shiny tirés comme d'habitude). */
export function devForceToday(state: GameState, id: number, rng: Rng, pool: DrawPool): GameState {
  if (state.lastDrawDay === null) return state;
  const entry = createPokemon({ id, day: state.lastDrawDay, rng, pool });
  return withCaught({ ...state, entries: { ...state.entries, [state.lastDrawDay]: entry } }, [
    entry,
  ]);
}

export interface RedrawInput {
  today: Day;
  rng: Rng;
  pool: DrawPool;
  events: readonly GameEvent[];
}

/** Efface le Pokémon d'aujourd'hui et refait le VRAI tirage du jour (événements compris). */
export function devRedrawToday(
  state: GameState,
  { today, rng, pool, events }: RedrawInput,
): GameState {
  const entries = withoutDay(state.entries, today);
  const earlier = Object.keys(entries)
    .filter((day) => day < today)
    .sort();
  const reopened: GameState = {
    ...state,
    entries,
    lastDrawDay: earlier[earlier.length - 1] ?? null,
  };
  return ensureTodayDraw(reopened, { today, rng, pool, events }).state;
}

export interface FillInput {
  days: number;
  today: Day;
  rng: Rng;
  pool: DrawPool;
}

/** Génère `days` jours de Pokémon (espèces au hasard) AVANT aujourd'hui, sans toucher aux jours existants. */
export function devFillHistory(state: GameState, { days, today, rng, pool }: FillInput): GameState {
  const count = Math.min(MAX_FILL_DAYS, Math.max(1, Math.trunc(days) || 1));
  const entries = { ...state.entries };
  const added: PokemonEntry[] = [];
  for (let i = 1; i <= count; i++) {
    const day = addDays(today, -i);
    if (entries[day]) continue;
    const entry = createPokemon({ id: pickOne(rng, pool.species), day, rng, pool });
    entries[day] = entry;
    added.push(entry);
  }
  return added.length === 0 ? state : withCaught({ ...state, entries }, added);
}

/** Supprime un jour de l'historique (jamais le Pokémon du jour). */
export function devDeleteEntry(state: GameState, day: Day): GameState {
  if (day === state.lastDrawDay || !state.entries[day]) return state;
  const entries = withoutDay(state.entries, day);
  return rebuildCollection({ ...state, entries });
}

/** Vide l'historique : il ne reste que le Pokémon du jour. */
export function devClearHistory(state: GameState): GameState {
  const current = todayEntry(state);
  const entries = current && state.lastDrawDay ? { [state.lastDrawDay]: current } : {};
  return rebuildCollection({ ...state, entries });
}

/** Tout remettre à zéro (le Pokémon du jour sera retiré juste après par `ensureToday`). */
export function devResetAll(): GameState {
  return emptyGameState();
}
