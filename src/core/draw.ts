import { buildSpecialBox, type SpecialBox } from './boxes';
import { VICTINI_ID } from './constants';
import type { Day } from './dates';
import { resolveEventEffects, type EventEffects } from './events/effects';
import { activeEvents } from './events/engine';
import type { GameEvent } from './events/types';
import { formChance, nextFormPity, type FormPity } from './form-pity';
import type { DrawPool, PokemonEntry } from './model';
import { createPokemon } from './pokemon';
import { chance, pickOne, type Rng } from './rng';

export interface DrawInput {
  /** Le jour LOCAL du tirage. */
  day: Day;
  rng: Rng;
  pool: DrawPool;
  /** TOUS les événements du jeu (le tirage retient ceux qui sont actifs ce jour-là). */
  events: readonly GameEvent[];
  /** Compteur du pourcentage progressif, tel qu'il était sauvegardé. */
  pity: FormPity;
}

/** Pourquoi ce Pokémon : un événement l'a imposé, le pourcentage progressif a donné une forme, ou tirage ordinaire. */
export type DrawReason = 'event' | 'form' | 'species';

export interface DrawResult {
  entry: PokemonEntry;
  reason: DrawReason;
  /** Nouveau compteur à sauvegarder. */
  pity: FormPity;
  /** Tickets Victini gagnés aujourd'hui (événements + Victini obtenu). */
  tickets: number;
  /** Boîtes spéciales offertes aujourd'hui. */
  boxes: SpecialBox[];
  /** Ce que les événements ont changé (pour l'affichage). */
  effects: EventEffects;
}

/**
 * Le tirage du Pokémon du jour. Fonction pure : mêmes entrées (dont la graine) = même résultat.
 *
 * 1. Les événements actifs ce jour-là sont combinés (`resolveEventEffects`).
 * 2. Quel Pokémon ?
 *      - un événement peut l'imposer (avec sa propre chance) ;
 *      - sinon, jet du pourcentage progressif : réussi → une FORME au hasard parmi toutes les
 *        formes tirables (à égalité) ; raté → une ESPÈCE au hasard (à égalité) ;
 * 3. Le compteur de formes est remis à zéro si le Pokémon obtenu est une forme (quelle qu'en
 *    soit la cause, événement compris), sinon il avance d'un jour.
 * 4. Nature, niveau et shiny sont tirés (`createPokemon`), en tenant compte des événements.
 * 5. Tickets Victini : ceux des événements, +1 si le Pokémon du jour est Victini.
 */
export function drawOfTheDay(input: DrawInput): DrawResult {
  const { day, rng, pool, events, pity } = input;

  const effects = resolveEventEffects(activeEvents(events, day), rng);

  // Le jet du pourcentage progressif est TOUJOURS consommé (séquence de hasard stable).
  const formRoll = chance(rng, formChance(pity));

  let id: number;
  let reason: DrawReason;
  if (effects.forcedPokemonId !== null && pool.isDrawable(effects.forcedPokemonId)) {
    id = effects.forcedPokemonId;
    reason = 'event';
  } else if (formRoll && pool.forms.length > 0) {
    id = pickOne(rng, pool.forms);
    reason = 'form';
  } else {
    id = pickOne(rng, pool.species);
    reason = 'species';
  }

  const entry = createPokemon({
    id,
    day,
    rng,
    pool,
    shinyRate: effects.shinyRate,
    forcedShiny: effects.forcedShiny,
    forcedLevel: effects.forcedLevel,
  });

  return {
    entry,
    reason,
    pity: nextFormPity(pity, pool.isForm(id)),
    tickets: effects.tickets + (id === VICTINI_ID ? 1 : 0),
    boxes: effects.boxes.map((kind) => buildSpecialBox(kind, day, rng, pool)),
    effects,
  };
}
