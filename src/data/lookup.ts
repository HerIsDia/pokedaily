import type { StateLookup } from '../storage/validate';
import { getEntry, getNature } from './index';

/** Ce que la validation des sauvegardes doit savoir des données du jeu. */
export const stateLookup: StateLookup = {
  hasId: (id) => getEntry(id) !== undefined,
  hasNature: (key) => getNature(key) !== undefined,
};
