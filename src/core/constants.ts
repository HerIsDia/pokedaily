/**
 * Toutes les « règles chiffrées » du jeu au même endroit.
 * (La v3.1 les avait dispersées : `1025` à 15 endroits, `69`, `494`, `86400000`…)
 */

/** Un Pokémon est shiny avec 1 chance sur SHINY_RATE (≈ 1,45 %). */
export const SHINY_RATE = 69;

export const LEVEL_MIN = 1;
/** Niveau maximal d'un tirage ordinaire. */
export const LEVEL_RANDOM_MAX = 99;
/** Niveau maximal tout court : seul un événement peut l'imposer (Bonne Année = 100). */
export const LEVEL_CAP = 100;

/** Longueur maximale d'un surnom, en caractères. */
export const NAME_MAX_LENGTH = 16;

export const VICTINI_ID = 494;
export const MAGIKARP_ID = 129;
export const GYARADOS_ID = 130;

/**
 * Chance d'obtenir une forme alternative : démarre à 1 %, gagne +1 % par tirage sans forme,
 * retombe à 1 % dès qu'une forme sort (garantie au 100ᵉ tirage).
 */
export const FORM_CHANCE_START_PERCENT = 1;
export const FORM_CHANCE_STEP_PERCENT = 1;
export const FORM_CHANCE_MAX_PERCENT = 100;

/** V-Roulette : 3 boîtes de 16 Pokémon, le Pokémon « boosté » sort une fois sur quatre. */
export const ROULETTE_BOX_COUNT = 3;
export const ROULETTE_BOX_SIZE = 16;
export const ROULETTE_BOOST_CHANCE = 0.25;

/** Team du mois : 6 Pokémon. */
export const TEAM_SIZE = 6;

/**
 * Durée de validité d'une boîte spéciale (Lucky Day, Poisson d'avril), en jours, jour de
 * réception compris. ⚠️ Valeur par défaut proposée, à confirmer par Diamant.
 */
export const SPECIAL_BOX_VALID_DAYS = 7;
