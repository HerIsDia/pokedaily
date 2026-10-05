import type { GameState } from '../core/game-state';

/**
 * Le « dépôt » : l'endroit où l'état du jeu est conservé. Deux versions :
 *  - `indexeddb.ts` : la vraie, dans le navigateur ;
 *  - `memory.ts` : en mémoire (tests, et secours si le navigateur refuse IndexedDB).
 *
 * Règle d'or : une sauvegarde est TOUT OU RIEN. Si elle échoue, rien n'est écrit à moitié.
 */

export interface LoadResult {
  state: GameState;
  /** Problèmes trouvés et réparés à la lecture (données abîmées ignorées), en français. */
  warnings: string[];
}

export interface Repository {
  /** `persistent` : les données survivent à la fermeture de l'onglet. */
  readonly persistent: boolean;
  load(): Promise<LoadResult>;
  /**
   * Enregistre le passage de `previous` à `next` en une seule opération atomique.
   * Lance `ConflictError` si un AUTRE onglet a modifié la sauvegarde entre-temps.
   */
  save(previous: GameState, next: GameState): Promise<void>;
  /** Remplace TOUT (import d'une collection). Même garde-fou de conflit que `save`. */
  replaceAll(state: GameState): Promise<void>;
  close(): void;
}

/** Un autre onglet a modifié la sauvegarde : il faut relire avant de réessayer. */
export class ConflictError extends Error {
  constructor() {
    super('La sauvegarde a été modifiée dans un autre onglet.');
    this.name = 'ConflictError';
  }
}

/** La sauvegarde vient d'une version de Pokédaily plus récente que celle-ci. */
export class UnsupportedSchemaError extends Error {
  readonly found: number;
  constructor(found: number) {
    super(`La sauvegarde est au format ${found}, plus récent que ce que cette version comprend.`);
    this.found = found;
    this.name = 'UnsupportedSchemaError';
  }
}

/** IndexedDB est indisponible ou a refusé de s'ouvrir. */
export class StorageUnavailableError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'StorageUnavailableError';
  }
}
