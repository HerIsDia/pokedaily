/**
 * Aperçu de DÉVELOPPEMENT : voir n'importe quel Pokémon sans toucher à la vraie sauvegarde.
 * Rien n'est enregistré (l'application tourne alors « en mémoire »). Exemples :
 *   /?preview=10034                       une forme (Méga-Dracaufeu X)
 *   /?preview=25&shiny=1                  en shiny
 *   /?preview=6&level=88&nature=timid
 * Sans paramètre `preview`, rien ne change : on joue normalement.
 */
import { localDay } from '../../core/dates';
import type { PokemonEntry } from '../../core/model';
import { getEntry, getNature } from '../../data';
import { canBeShiny } from '../../data/sprites';

export function createPreviewEntry(search: string = window.location.search): PokemonEntry | null {
  const params = new URLSearchParams(search);
  if (!params.has('preview')) return null;
  const wantedId = Number(params.get('preview'));
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
