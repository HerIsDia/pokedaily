import { SHINY_RATE } from '../constants';
import { chance, pickOne, randomInt, type Rng } from '../rng';
import type { GameEvent } from './types';

export type SpecialBoxKind = 'lucky_day' | 'april_fools';

/** Ce que l'ensemble des événements actifs change au tirage du jour. */
export interface EventEffects {
  /** Pokémon imposé (le tirage normal est alors ignoré), ou `null`. */
  forcedPokemonId: number | null;
  /** Shiny garanti (si le Pokémon peut l'être). */
  forcedShiny: boolean;
  /** Dénominateur de la chance shiny : 69 par défaut, plus bas si un événement l'améliore. */
  shinyRate: number;
  /** Niveau imposé, ou `null`. */
  forcedLevel: number | null;
  /** Tickets Victini offerts aujourd'hui (hors Victini tiré comme Pokémon du jour). */
  tickets: number;
  /** Boîtes spéciales offertes aujourd'hui. */
  boxes: SpecialBoxKind[];
  /** Identifiants des événements actifs (pour l'affichage et la traçabilité). */
  eventIds: string[];
}

/**
 * Combine les événements actifs. Règles quand plusieurs événements agissent le même jour :
 *  - Pokémon forcé : on lance chaque événement dans l'ordre du fichier ; le DERNIER qui
 *    « réussit » son jet l'emporte ;
 *  - shiny : un seul événement qui l'impose suffit ; sinon chaque événement REMPLACE la chance
 *    par défaut (même quand la sienne est moins bonne : le Poisson d'avril est à 1/100) et, s'il
 *    y en a plusieurs, la MEILLEURE d'entre elles l'emporte, quel que soit l'ordre (en v3.1
 *    le dernier écrasait les autres) ;
 *  - niveau : le PLUS ÉLEVÉ l'emporte ;
 *  - tickets : on additionne ; boîtes : on les cumule (sans doublon).
 */
export function resolveEventEffects(active: readonly GameEvent[], rng: Rng): EventEffects {
  const effects: EventEffects = {
    forcedPokemonId: null,
    forcedShiny: false,
    shinyRate: SHINY_RATE,
    forcedLevel: null,
    tickets: 0,
    boxes: [],
    eventIds: active.map((event) => event.id),
  };
  let eventShinyRate: number | null = null;

  for (const { modifiers: m } of active) {
    if (m.forcedPokemonChance !== undefined) {
      if (m.forcedPokemonId !== undefined) {
        if (chance(rng, m.forcedPokemonChance)) effects.forcedPokemonId = m.forcedPokemonId;
      } else if (m.forcedPokemonIds && m.forcedPokemonIds.length > 0) {
        if (chance(rng, m.forcedPokemonChance)) {
          effects.forcedPokemonId = pickOne(rng, m.forcedPokemonIds);
        }
      }
    }

    if (m.forcedShiny) effects.forcedShiny = true;
    if (m.shinyRate !== undefined) {
      eventShinyRate = Math.min(eventShinyRate ?? m.shinyRate, m.shinyRate);
    }
    if (m.forcedLevel !== undefined) {
      effects.forcedLevel = Math.max(effects.forcedLevel ?? 0, m.forcedLevel);
    }

    if (m.victiniTicketsMin !== undefined && m.victiniTicketsMax !== undefined) {
      effects.tickets += randomInt(rng, m.victiniTicketsMin, m.victiniTicketsMax);
    }
    if (m.luckyDayBox && !effects.boxes.includes('lucky_day')) effects.boxes.push('lucky_day');
    if (m.aprilFoolsBox && !effects.boxes.includes('april_fools'))
      effects.boxes.push('april_fools');
  }

  if (eventShinyRate !== null) effects.shinyRate = eventShinyRate;
  return effects;
}
