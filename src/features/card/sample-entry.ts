/**
 * ⚠️ ENTRÉE D'ESSAI (temporaire, jusqu'aux phases 3 et 4 : vrai tirage + sauvegarde).
 *
 * Pour voir n'importe quel Pokémon pendant le développement :
 *   /?id=10034            une forme (Méga-Dracaufeu X)
 *   /?id=25&shiny=1       en shiny
 *   /?id=6&level=88&nature=timid
 */
import { localDay } from '../../core/dates';
import type { PokemonEntry } from '../../core/model';
import { getEntry, getNature } from '../../data';
import { canBeShiny } from '../../data/sprites';

export function createSampleEntry(search: string = window.location.search): PokemonEntry {
  const params = new URLSearchParams(search);
  const wantedId = Number(params.get('id'));
  const id = getEntry(wantedId) ? wantedId : 25;
  const level = Number(params.get('level'));
  const nature = params.get('nature') ?? '';
  return {
    id,
    natureKey: getNature(nature) ? nature : 'jolly',
    level: Number.isInteger(level) && level >= 1 && level <= 100 ? level : 42,
    // Un Pokémon sans image shiny ne peut pas être shiny.
    isShiny: params.get('shiny') === '1' && canBeShiny(id),
    day: localDay(),
    rename: '',
  };
}
