import type { DrawPool } from '../core/model';
import { dex, getEntry, natures } from './index';
import { canBeShiny, isDrawable } from './sprites';

/**
 * Les Pokémon que le tirage a le droit de choisir : ceux qui existent ET ont une image
 * (une forme sans image n'est jamais tirée : jamais d'image cassée).
 */
export const drawPool: DrawPool = {
  species: dex.filter((e) => !e.form && isDrawable(e.id)).map((e) => e.id),
  forms: dex.filter((e) => e.form && isDrawable(e.id)).map((e) => e.id),
  natures: natures.map((n) => n.key),
  isDrawable: (id) => getEntry(id) !== undefined && isDrawable(id),
  canBeShiny,
  isForm: (id) => getEntry(id)?.form !== undefined,
};
