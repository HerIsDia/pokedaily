import type { Day } from '../dates';

/** Ce qu'un événement change au tirage du jour. Tous les champs sont facultatifs. */
export interface EventModifiers {
  /** Force CE Pokémon avec la probabilité `forcedPokemonChance`. */
  forcedPokemonId?: number;
  /** Force UN des Pokémon de cette liste (tiré au hasard) avec la probabilité `forcedPokemonChance`. */
  forcedPokemonIds?: number[];
  /** Probabilité (0 exclu – 1) que le Pokémon forcé soit choisi. */
  forcedPokemonChance?: number;
  /** Le Pokémon est forcément shiny (s'il peut l'être). */
  forcedShiny?: boolean;
  /** Chance shiny de 1/N à la place de 1/69. */
  shinyRate?: number;
  /** Niveau imposé. */
  forcedLevel?: number;
  /** Tickets Victini offerts : tirage entre min et max (inclus). */
  victiniTicketsMin?: number;
  victiniTicketsMax?: number;
  /** Offre la boîte spéciale Lucky Day (13 Pokémon au hasard + 3 Victini). */
  luckyDayBox?: boolean;
  /** Offre la boîte spéciale Poisson d'avril (Magicarpe et Léviator, dont des shiny garantis). */
  aprilFoolsBox?: boolean;
}

/** `once` : n'a lieu qu'une fois (les dates contiennent l'année) ; `yearly` : revient chaque année. */
export type Repeats = 'once' | 'yearly';

export interface MonthDay {
  month: number;
  day: number;
}

interface EventBase {
  id: string;
  nameFr: string;
  nameEn: string;
  descriptionFr: string;
  descriptionEn: string;
  modifiers: EventModifiers;
}

export type GameEvent = EventBase &
  (
    | { type: 'date_range'; startDate: Day; endDate: Day; repeats: Repeats }
    | { type: 'recurring_date'; month: number; day: number }
    | { type: 'recurring_dates'; dates: MonthDay[] }
    /** Ex. chaque vendredi 13 : `weekday` 5 (0 = dimanche) et `day` 13. */
    | { type: 'recurring_weekday_date'; weekday: number; day: number }
    /** Ex. chaque dimanche pendant une période. */
    | {
        type: 'date_range_weekday';
        startDate: Day;
        endDate: Day;
        weekday: number;
        repeats: Repeats;
      }
  );

export type EventType = GameEvent['type'];
export const EVENT_TYPES: readonly EventType[] = [
  'date_range',
  'recurring_date',
  'recurring_dates',
  'recurring_weekday_date',
  'date_range_weekday',
];
