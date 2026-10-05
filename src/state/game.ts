import { localDay } from '../core/dates';
import type { GameEvent } from '../core/events/types';
import {
  NotEnoughTicketsError,
  claimRouletteBonus,
  emptyGameState,
  ensureTodayDraw,
  playRoulette,
  renameEntry,
  setMonthlyTeam,
  setRouletteBoost,
  todayEntry,
  type GameState,
} from '../core/game-state';
import { monthKey } from '../core/dates';
import { buildMonthlyTeam } from '../core/team';
import type { DrawPool, PokemonEntry } from '../core/model';
import { mathRng, type Rng } from '../core/rng';
import { buildBackup, parseBackup, type BackupResult } from '../storage/backup';
import { ConflictError, UnsupportedSchemaError, type Repository } from '../storage/repository';
import type { StateLookup } from '../storage/validate';
import { createStore, derived, type ReadStore } from '../ui/store';

/**
 * L'état PARTAGÉ du jeu : la source de vérité que tous les écrans lisent (bug B-7 de la v3.1 :
 * chaque composant relisait IndexedDB et rechargeait la page pour se mettre à jour).
 *
 * Règles :
 *  - toutes les modifications passent par UNE file d'attente : jamais deux sauvegardes en même
 *    temps, jamais d'ordre mélangé ;
 *  - on sauvegarde d'abord, puis on met l'écran à jour ; si la sauvegarde échoue, l'écran garde
 *    quand même le résultat (le joueur voit son Pokémon) et un bandeau prévient que ce n'est
 *    pas enregistré. La sauvegarde suivante rattrape tout ;
 *  - si un AUTRE onglet a sauvegardé entre-temps (`ConflictError`), on relit puis on refait la
 *    modification sur les données fraîches ;
 *  - un onglet qui sauvegarde prévient les autres (`sync`) pour qu'ils se rafraîchissent.
 */

export type GameStatus = 'loading' | 'ready' | 'error';
/** Pourquoi le jeu n'a pas pu démarrer. */
export type GameError = 'too_new' | 'load_failed';

/** Messagerie entre onglets (BroadcastChannel dans le navigateur). */
export interface GameSync {
  post(): void;
  /** Appelle `listener` quand un autre onglet a sauvegardé ; renvoie la fonction d'arrêt. */
  listen(listener: () => void): () => void;
}

export interface GameDeps {
  repository: Repository;
  pool: DrawPool;
  events: readonly GameEvent[];
  lookup: StateLookup;
  rng?: Rng;
  now?: () => Date;
  sync?: GameSync;
}

export type ImportOutcome = { ok: true } | { ok: false };

export type SpinOutcome =
  | { ok: true; index: number; prize: PokemonEntry }
  | { ok: false; reason: 'no_tickets' | 'no_pokemon' };

export interface SpinRequest {
  /** Les 16 Pokémon de la boîte choisie. */
  ids: readonly number[];
  /** Cases au shiny garanti (boîtes spéciales). */
  shinySlots: readonly number[];
  boostedId: number | null;
}

export interface Game {
  state: ReadStore<GameState>;
  /** Le Pokémon du jour (`null` tant que rien n'est tiré). */
  today: ReadStore<PokemonEntry | null>;
  status: ReadStore<GameStatus>;
  error: ReadStore<GameError | null>;
  /** Données abîmées trouvées (et réparées) à la lecture. */
  warnings: ReadStore<readonly string[]>;
  /** Vrai quand la dernière sauvegarde a échoué : ce qui est affiché n'est pas enregistré. */
  saveFailed: ReadStore<boolean>;
  /** Faux en mode « sans sauvegarde » (IndexedDB indisponible, ou aperçu de développement). */
  readonly persistent: boolean;

  start(): Promise<void>;
  /** Tire le Pokémon du jour s'il ne l'est pas encore (minuit passé, par exemple). */
  ensureToday(): Promise<void>;
  rename(day: string, name: string): Promise<void>;
  /** Le ticket offert au tout premier passage à la V-Roulette. `true` s'il vient d'être donné. */
  claimRouletteBonus(): Promise<boolean>;
  /** Choisit (ou retire) le Pokémon boosté du mois. */
  setBoost(month: string, id: number | null): Promise<void>;
  /**
   * Un tour de V-Roulette : le résultat est décidé, le Pokémon du jour remplacé et UN ticket
   * dépensé en une seule sauvegarde. Sans ticket : rien n'est touché.
   */
  spin(request: SpinRequest): Promise<SpinOutcome>;
  /** Crée la team du mois `month` si elle n'existe pas encore. */
  ensureMonthlyTeam(month: string): Promise<void>;
  /** Le mois (« AAAA-MM ») d'aujourd'hui, avec l'horloge du jeu. */
  currentMonth(): string;
  exportBackup(): { filename: string; json: string };
  /** Lit un fichier d'import SANS rien modifier. */
  readBackup(text: string): BackupResult;
  /** Remplace toute la collection par `state` (déjà validé par `readBackup`). */
  importState(state: GameState): Promise<ImportOutcome>;
  /** Surveille le changement de jour et les autres onglets ; renvoie la fonction d'arrêt. */
  watch(): () => void;
  close(): void;
}

const MAX_ATTEMPTS = 3;
/** Vérification périodique du changement de jour (en plus du retour sur l'onglet). */
const DAY_CHECK_MS = 30_000;

export function createGame(deps: GameDeps): Game {
  const { repository, pool, events, lookup } = deps;
  const rng = deps.rng ?? mathRng;
  const now = deps.now ?? (() => new Date());

  // Valeur de départ jamais montrée : `status` vaut 'loading' jusqu'à la 1ʳᵉ lecture.
  const state = createStore<GameState>(emptyGameState());
  const status = createStore<GameStatus>('loading');
  const error = createStore<GameError | null>(null);
  const warnings = createStore<readonly string[]>([]);
  const saveFailed = createStore(false);

  /** Ce que le dépôt contient réellement (≠ `state` si une sauvegarde a échoué). */
  let persisted = state.get();
  let closed = false;

  // ── File d'attente ────────────────────────────────────────────────────────
  let chain: Promise<unknown> = Promise.resolve();
  function enqueue<T>(job: () => Promise<T>): Promise<T> {
    const run = chain.then(job);
    chain = run.catch(() => undefined);
    return run;
  }

  async function reload(): Promise<void> {
    const loaded = await repository.load();
    persisted = loaded.state;
    state.set(loaded.state);
    warnings.set(loaded.warnings);
  }

  /** Applique une transition, la sauvegarde, puis met l'écran à jour. */
  async function commit(transition: (current: GameState) => GameState): Promise<void> {
    for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt += 1) {
      const current = state.get();
      const next = transition(current);
      if (next === current) return;
      try {
        await repository.save(persisted, next);
        persisted = next;
        state.set(next);
        saveFailed.set(false);
        deps.sync?.post();
        return;
      } catch (failure) {
        if (failure instanceof ConflictError) {
          try {
            await reload(); // un autre onglet a sauvegardé : on repart de ses données
            continue;
          } catch {
            // lecture impossible : on traite comme un échec de sauvegarde ci-dessous
          }
        }
        state.set(next);
        saveFailed.set(true);
        return;
      }
    }
    saveFailed.set(true);
  }

  const ensureTodayTransition = (current: GameState): GameState =>
    ensureTodayDraw(current, { today: localDay(now()), rng, pool, events }).state;

  const ensureToday = () => enqueue(() => commit(ensureTodayTransition));

  return {
    state,
    today: derived(state, todayEntry),
    status,
    error,
    warnings,
    saveFailed,
    persistent: repository.persistent,

    start() {
      return enqueue(async () => {
        try {
          await reload();
        } catch (failure) {
          error.set(failure instanceof UnsupportedSchemaError ? 'too_new' : 'load_failed');
          status.set('error');
          return;
        }
        await commit(ensureTodayTransition);
        status.set('ready');
      });
    },

    ensureToday,

    rename(day, name) {
      return enqueue(() => commit((current) => renameEntry(current, day, name)));
    },

    async claimRouletteBonus() {
      let granted = false;
      await enqueue(() =>
        commit((current) => {
          granted = !current.rouletteBonusClaimed; // recalculé si on rejoue après un conflit
          return claimRouletteBonus(current);
        }),
      );
      return granted;
    },

    setBoost(month, id) {
      return enqueue(() => commit((current) => setRouletteBoost(current, month, id)));
    },

    spin(request) {
      return enqueue(async (): Promise<SpinOutcome> => {
        let outcome: SpinOutcome = { ok: false, reason: 'no_pokemon' };
        try {
          await commit((current) => {
            const played = playRoulette(current, { ...request, rng, pool });
            outcome = { ok: true, index: played.index, prize: played.prize };
            return played.state;
          });
        } catch (failure) {
          if (failure instanceof NotEnoughTicketsError) return { ok: false, reason: 'no_tickets' };
          if (failure instanceof RangeError) return { ok: false, reason: 'no_pokemon' };
          throw failure;
        }
        return outcome;
      });
    },

    ensureMonthlyTeam(month) {
      return enqueue(() =>
        commit((current) => {
          if (current.monthlyTeam?.month === month) return current;
          const day = localDay(now());
          return setMonthlyTeam(current, { month, pokemon: buildMonthlyTeam(day, rng, pool) });
        }),
      );
    },

    currentMonth: () => monthKey(localDay(now())),

    exportBackup() {
      return buildBackup(state.get(), now());
    },

    readBackup(text) {
      return parseBackup(text, lookup);
    },

    importState(next) {
      return enqueue(async (): Promise<ImportOutcome> => {
        for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt += 1) {
          try {
            await repository.replaceAll(next);
          } catch (failure) {
            if (failure instanceof ConflictError) {
              try {
                await reload();
                continue;
              } catch {
                return { ok: false };
              }
            }
            return { ok: false }; // rien n'a été modifié : l'écran garde la collection actuelle
          }
          persisted = next;
          state.set(next);
          saveFailed.set(false);
          deps.sync?.post();
          await commit(ensureTodayTransition); // un fichier ancien : le jour d'aujourd'hui reste à tirer
          return { ok: true };
        }
        return { ok: false };
      });
    },

    watch() {
      const check = () => {
        if (!closed && status.get() === 'ready') void ensureToday();
      };
      const timer = setInterval(check, DAY_CHECK_MS);
      const onVisible = () => {
        if (document.visibilityState === 'visible') check();
      };
      document.addEventListener('visibilitychange', onVisible);
      window.addEventListener('focus', check);
      const stopSync = deps.sync?.listen(() => {
        if (closed) return;
        void enqueue(async () => {
          try {
            await reload();
          } catch {
            // on garde ce qu'on a ; la prochaine sauvegarde signalera un conflit si besoin
          }
        });
      });
      return () => {
        clearInterval(timer);
        document.removeEventListener('visibilitychange', onVisible);
        window.removeEventListener('focus', check);
        stopSync?.();
      };
    },

    close() {
      closed = true;
      repository.close();
    },
  };
}

/** Messagerie entre onglets via BroadcastChannel (absente → pas de synchronisation, sans erreur). */
export function createBroadcastSync(name = 'pokedaily4'): GameSync | undefined {
  if (typeof BroadcastChannel === 'undefined') return undefined;
  const channel = new BroadcastChannel(name);
  return {
    post: () => channel.postMessage('saved'),
    listen(listener) {
      const handler = () => listener();
      channel.addEventListener('message', handler);
      return () => channel.removeEventListener('message', handler);
    },
  };
}
