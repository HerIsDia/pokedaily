import { localDay } from '../core/dates';
import { emptyGameState, type GameState } from '../core/game-state';
import type { PokemonEntry } from '../core/model';
import { stateLookup } from '../data/lookup';
import { events } from '../data/events';
import { drawPool } from '../data/pool';
import { createPreviewEntry } from '../features/card/preview';
import type { I18n } from '../i18n';
import { createBroadcastSync, createGame, type Game } from '../state/game';
import { openGameDb } from '../storage/db';
import { createIndexedDbRepository } from '../storage/indexeddb';
import { cleanupLegacy } from '../storage/legacy';
import { createMemoryRepository } from '../storage/memory';
import type { Repository } from '../storage/repository';
import { mountApp } from './app';

export interface BootDeps {
  i18n: I18n;
  /** Pour les tests : par défaut, l'IndexedDB du navigateur. `null` = indisponible. */
  indexedDB?: IDBFactory | null;
  /** Aperçu de développement (`?preview=…`), lu dans l'adresse par défaut. */
  preview?: PokemonEntry | null;
  cleanup?: () => Promise<void>;
}

function stateWithToday(entry: PokemonEntry): GameState {
  return {
    ...emptyGameState(),
    entries: { [entry.day]: entry },
    lastDrawDay: entry.day,
    caught: [entry.id],
    caughtShiny: entry.isShiny ? [entry.id] : [],
  };
}

async function openRepository(factory: IDBFactory | null): Promise<Repository> {
  try {
    const db = await openGameDb(factory);
    return createIndexedDbRepository(db, stateLookup);
  } catch (error) {
    // Navigation privée stricte, stockage bloqué… : on joue quand même, sans sauvegarde.
    console.warn('[pokedaily] sauvegarde indisponible, mode mémoire', error);
    return createMemoryRepository();
  }
}

/**
 * Démarre l'application : ouvre la sauvegarde, monte l'écran, tire le Pokémon du jour, puis —
 * seulement après un démarrage réussi sur une sauvegarde durable — supprime les restes de la
 * v3.1 (jamais sur un aperçu, jamais en mode secours). Renvoie la fonction qui arrête tout.
 */
export async function boot(
  root: HTMLElement,
  {
    i18n,
    indexedDB = globalThis.indexedDB ?? null,
    preview = createPreviewEntry(),
    cleanup = cleanupLegacy,
  }: BootDeps,
): Promise<{ game: Game; stop: () => void }> {
  const repository = preview
    ? createMemoryRepository(stateWithToday({ ...preview, day: localDay() }))
    : await openRepository(indexedDB);

  const game = createGame({
    repository,
    pool: drawPool,
    events,
    lookup: stateLookup,
    sync: preview ? undefined : createBroadcastSync(),
  });

  const unmount = mountApp(root, { i18n, game });
  await game.start();
  const stopWatching = game.watch();

  if (game.status.get() === 'ready' && repository.persistent) void cleanup();

  return {
    game,
    stop: () => {
      stopWatching();
      unmount();
      game.close();
    },
  };
}
