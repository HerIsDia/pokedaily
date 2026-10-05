import type { GameState } from '../core/game-state';
import { emptyGameState } from '../core/game-state';
import type { LoadResult, Repository } from './repository';

/** Dépôt en mémoire : tout disparaît à la fermeture de l'onglet (tests, mode secours). */
export function createMemoryRepository(initial: GameState = emptyGameState()): Repository {
  let state = structuredClone(initial);
  return {
    persistent: false,
    load(): Promise<LoadResult> {
      return Promise.resolve({ state: structuredClone(state), warnings: [] });
    },
    save(_previous, next): Promise<void> {
      state = structuredClone(next);
      return Promise.resolve();
    },
    replaceAll(next): Promise<void> {
      state = structuredClone(next);
      return Promise.resolve();
    },
    close() {},
  };
}
