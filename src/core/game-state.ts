import { addBox, validBoxes, type SpecialBox } from './boxes';
import { needsNewDraw, type Day } from './dates';
import { drawOfTheDay, type DrawResult } from './draw';
import type { GameEvent } from './events/types';
import { INITIAL_FORM_PITY, type FormPity } from './form-pity';
import type { DrawPool, PokemonEntry } from './model';
import { createPokemon } from './pokemon';
import { spinRoulette } from './roulette';
import { clampName } from './names';
import type { Rng } from './rng';

/**
 * L'état complet du jeu d'un joueur, et ses transitions. Tout est PUR : une transition reçoit
 * un état et en renvoie un nouveau (rien n'est modifié sur place). La sauvegarde (`src/storage`)
 * et l'écran (`src/state`) s'appuient dessus : c'est la source de vérité unique que la v3.1
 * n'avait pas (chaque composant lisait/écrivait IndexedDB puis rechargeait la page).
 */

/** Numéro de version du format sauvegardé (sert aux migrations futures). */
export const STATE_SCHEMA_VERSION = 1;

export interface MonthlyTeam {
  /** « AAAA-MM » */
  month: string;
  pokemon: PokemonEntry[];
}

/** Le Pokémon « boosté » choisi pour la V-Roulette (valable pour un mois, comme les boîtes). */
export interface RouletteBoost {
  /** « AAAA-MM » */
  month: string;
  id: number;
}

export interface GameState {
  /** Le Pokémon de chaque jour d'ouverture, indexé par jour (AAAA-MM-JJ). */
  entries: Record<Day, PokemonEntry>;
  /** Dernier jour tiré (= le jour du « Pokémon du jour »), ou `null` avant le 1ᵉʳ tirage. */
  lastDrawDay: Day | null;
  /** Compteur du pourcentage progressif des formes. */
  pity: FormPity;
  tickets: number;
  boxes: SpecialBox[];
  /** Tous les identifiants déjà obtenus (espèces ET formes), triés, sans doublon. */
  caught: number[];
  /** Ceux obtenus en shiny. */
  caughtShiny: number[];
  /** Le ticket offert au tout premier passage à la V-Roulette a-t-il été donné ? */
  rouletteBonusClaimed: boolean;
  /** Le boost choisi ce mois-ci (un nouveau mois l'efface : voir `boostFor`). */
  rouletteBoost: RouletteBoost | null;
  monthlyTeam: MonthlyTeam | null;
}

export function emptyGameState(): GameState {
  return {
    entries: {},
    lastDrawDay: null,
    pity: INITIAL_FORM_PITY,
    tickets: 0,
    boxes: [],
    caught: [],
    caughtShiny: [],
    rouletteBonusClaimed: false,
    rouletteBoost: null,
    monthlyTeam: null,
  };
}

// ── Lecture ────────────────────────────────────────────────────────────────

/** Le Pokémon du jour (celui du dernier tirage), ou `null`. */
export function todayEntry(state: GameState): PokemonEntry | null {
  return state.lastDrawDay ? (state.entries[state.lastDrawDay] ?? null) : null;
}

/** Toutes les entrées, de la plus récente à la plus ancienne. */
export function allEntries(state: GameState): PokemonEntry[] {
  return Object.values(state.entries).sort((a, b) => (a.day < b.day ? 1 : a.day > b.day ? -1 : 0));
}

/** L'historique : tout sauf le Pokémon du jour, du plus récent au plus ancien. */
export function historyEntries(state: GameState): PokemonEntry[] {
  return allEntries(state).filter((entry) => entry.day !== state.lastDrawDay);
}

/** Espèces obtenues (une forme compte pour son espèce : le Pokédex reste à 1 025). */
export function caughtSpecies(state: GameState, speciesOf: (id: number) => number): Set<number> {
  return new Set(state.caught.map(speciesOf));
}

/** Formes alternatives obtenues (onglet « Formes »). */
export function caughtForms(state: GameState, isForm: (id: number) => boolean): number[] {
  return state.caught.filter(isForm);
}

// ── Transitions ────────────────────────────────────────────────────────────

function withId(list: readonly number[], id: number): number[] {
  if (list.includes(id)) return [...list];
  return [...list, id].sort((a, b) => a - b);
}

function withEntryCaught(
  state: GameState,
  entry: PokemonEntry,
): Pick<GameState, 'caught' | 'caughtShiny'> {
  return {
    caught: withId(state.caught, entry.id),
    caughtShiny: entry.isShiny ? withId(state.caughtShiny, entry.id) : [...state.caughtShiny],
  };
}

/**
 * Enregistre le résultat du tirage du jour : le Pokémon, le compteur de formes, les tickets,
 * les boîtes spéciales (les périmées disparaissent, une nouvelle remplace celle du même genre),
 * et la collection.
 */
export function applyDailyDraw(state: GameState, result: DrawResult): GameState {
  const day = result.entry.day;
  if (!needsNewDraw(state.lastDrawDay, day)) {
    throw new RangeError(
      `Le tirage du ${day} a déjà été fait (dernier tirage : ${state.lastDrawDay}).`,
    );
  }
  let boxes = validBoxes(state.boxes, day);
  for (const box of result.boxes) boxes = addBox(boxes, box);
  return {
    ...state,
    ...withEntryCaught(state, result.entry),
    entries: { ...state.entries, [day]: result.entry },
    lastDrawDay: day,
    pity: result.pity,
    tickets: state.tickets + result.tickets,
    boxes,
  };
}

export interface EnsureDrawInput {
  /** Le jour LOCAL d'aujourd'hui. */
  today: Day;
  rng: Rng;
  pool: DrawPool;
  events: readonly GameEvent[];
}

/**
 * Au lancement (et quand minuit passe) : si le Pokémon du jour n'a pas encore été tiré, on le
 * tire. Sinon on ne touche à rien. Si l'horloge a reculé, on ne retire pas.
 */
export function ensureTodayDraw(
  state: GameState,
  { today, rng, pool, events }: EnsureDrawInput,
): { state: GameState; result: DrawResult | null } {
  if (!needsNewDraw(state.lastDrawDay, today)) return { state, result: null };
  const result = drawOfTheDay({ day: today, rng, pool, events, pity: state.pity });
  return { state: applyDailyDraw(state, result), result };
}

/** Change le surnom d'un jour (sans effet si ce jour n'existe pas). */
export function renameEntry(state: GameState, day: Day, rename: string): GameState {
  const entry = state.entries[day];
  if (!entry) return state;
  return {
    ...state,
    entries: { ...state.entries, [day]: { ...entry, rename: clampName(rename) } },
  };
}

export class NotEnoughTicketsError extends Error {
  constructor() {
    super('Pas assez de tickets Victini.');
    this.name = 'NotEnoughTicketsError';
  }
}

/**
 * Un tour de V-Roulette GAGNÉ : le prix remplace le Pokémon du jour et UN ticket est dépensé,
 * en un seul mouvement. À appeler seulement quand le prix est prêt : si quoi que ce soit a
 * échoué avant, on n'appelle pas cette fonction et aucun ticket n'est touché (bug B-2 de la
 * v3.1 : le ticket était débité AVANT la requête, puis perdu en silence si elle échouait).
 */
export function replaceTodayWithPrize(state: GameState, prize: PokemonEntry): GameState {
  const current = todayEntry(state);
  if (!current || state.lastDrawDay === null)
    throw new RangeError('Aucun Pokémon du jour à remplacer.');
  if (state.tickets < 1) throw new NotEnoughTicketsError();
  const entry: PokemonEntry = { ...prize, day: state.lastDrawDay, rename: '' };
  return {
    ...state,
    ...withEntryCaught(state, entry),
    entries: { ...state.entries, [state.lastDrawDay]: entry },
    tickets: state.tickets - 1,
  };
}

/** Le ticket offert au tout premier passage à la V-Roulette (une seule fois). */
export function claimRouletteBonus(state: GameState): GameState {
  if (state.rouletteBonusClaimed) return state;
  return { ...state, rouletteBonusClaimed: true, tickets: state.tickets + 1 };
}

/** Ajoute (ou retire, avec un nombre négatif) des tickets ; jamais en dessous de 0. */
export function addTickets(state: GameState, amount: number): GameState {
  return { ...state, tickets: Math.max(0, state.tickets + Math.trunc(amount)) };
}

/** Enregistre la team du mois : ses 6 Pokémon comptent pour la collection. */
export function setMonthlyTeam(state: GameState, team: MonthlyTeam): GameState {
  let { caught, caughtShiny } = state;
  for (const entry of team.pokemon) {
    caught = withId(caught, entry.id);
    if (entry.isShiny) caughtShiny = withId(caughtShiny, entry.id);
  }
  return { ...state, monthlyTeam: team, caught, caughtShiny };
}

/** Le Pokémon boosté valable pour `month`, ou `null` (le choix d'un mois ne passe pas au suivant). */
export function boostFor(state: GameState, month: string): number | null {
  return state.rouletteBoost?.month === month ? state.rouletteBoost.id : null;
}

/** Choisit (ou retire, avec `null`) le Pokémon boosté du mois. */
export function setRouletteBoost(state: GameState, month: string, id: number | null): GameState {
  return { ...state, rouletteBoost: id === null ? null : { month, id } };
}

export interface RoulettePlay {
  /** Les 16 Pokémon de la boîte choisie. */
  ids: readonly number[];
  /** Cases qui donnent un shiny garanti (boîtes spéciales). */
  shinySlots: readonly number[];
  boostedId: number | null;
  rng: Rng;
  pool: DrawPool;
}

/**
 * UN tour de V-Roulette, en un seul mouvement : on tire la case gagnante, on fabrique le
 * Pokémon, il REMPLACE celui du jour et UN ticket est dépensé. S'il manque un ticket ou un
 * Pokémon du jour, rien n'est tiré (aucun jet de hasard consommé).
 */
export function playRoulette(
  state: GameState,
  { ids, shinySlots, boostedId, rng, pool }: RoulettePlay,
): { state: GameState; index: number; prize: PokemonEntry } {
  if (state.lastDrawDay === null || !todayEntry(state))
    throw new RangeError('Aucun Pokémon du jour à remplacer.');
  if (state.tickets < 1) throw new NotEnoughTicketsError();
  const { index, id } = spinRoulette(rng, ids, boostedId);
  const prize = createPokemon({
    id,
    day: state.lastDrawDay,
    rng,
    pool,
    forcedShiny: shinySlots.includes(index),
  });
  const next = replaceTodayWithPrize(state, prize);
  return { state: next, index, prize: next.entries[state.lastDrawDay] as PokemonEntry };
}
