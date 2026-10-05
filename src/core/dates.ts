/**
 * Les jours sont des textes « AAAA-MM-JJ » dans le fuseau LOCAL du joueur (décision de
 * Diamant : le nouveau Pokémon arrive à minuit chez chacun, pas à minuit UTC).
 *
 * On ne stocke JAMAIS de millisecondes : un texte ne bouge pas quand on change de fuseau
 * ou d'heure d'été, et les jours se comparent comme des textes ('2026-10-05' < '2026-10-06').
 * Les calculs (ajouter des jours, jour de la semaine) passent par UTC uniquement comme
 * « calendrier neutre » : aucune heure d'été ne peut les décaler.
 */
export type Day = string;

const DAY_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

export interface DayParts {
  year: number;
  /** 1–12 */
  month: number;
  /** 1–31 */
  day: number;
}

/** Le jour local de `date` (par défaut : maintenant). */
export function localDay(date: Date = new Date()): Day {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${String(date.getFullYear()).padStart(4, '0')}-${month}-${day}`;
}

export function isValidDay(value: string): boolean {
  const match = DAY_PATTERN.exec(value);
  if (!match) return false;
  const [year, month, day] = [Number(match[1]), Number(match[2]), Number(match[3])];
  const check = new Date(Date.UTC(year, month - 1, day));
  return (
    check.getUTCFullYear() === year &&
    check.getUTCMonth() === month - 1 &&
    check.getUTCDate() === day
  );
}

export function parseDay(value: Day): DayParts {
  if (!isValidDay(value)) throw new RangeError(`Jour invalide : « ${value} » (attendu AAAA-MM-JJ)`);
  const [year, month, day] = value.split('-').map(Number) as [number, number, number];
  return { year, month, day };
}

function toUtcMs(value: Day): number {
  const { year, month, day } = parseDay(value);
  return Date.UTC(year, month - 1, day);
}

function fromUtcMs(ms: number): Day {
  const date = new Date(ms);
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  return `${String(date.getUTCFullYear()).padStart(4, '0')}-${month}-${day}`;
}

export function addDays(value: Day, count: number): Day {
  return fromUtcMs(toUtcMs(value) + count * 86_400_000);
}

/** Nombre de jours entre deux jours (`to` − `from`). */
export function daysBetween(from: Day, to: Day): number {
  return Math.round((toUtcMs(to) - toUtcMs(from)) / 86_400_000);
}

/** 0 = dimanche, 1 = lundi … 6 = samedi. */
export function weekdayOf(value: Day): number {
  return new Date(toUtcMs(value)).getUTCDay();
}

/** « AAAA-MM » : sert de clé pour la V-Roulette et la Team du mois. */
export function monthKey(value: Day): string {
  return value.slice(0, 7);
}

/**
 * Faut-il un nouveau tirage ? Oui seulement si on est APRÈS le dernier jour tiré.
 * Si l'horloge recule (voyage vers l'ouest, réglage de l'appareil), on ne retire pas :
 * le Pokémon du jour ne change pas deux fois.
 */
export function needsNewDraw(lastDay: Day | null, today: Day): boolean {
  return lastDay === null || today > lastDay;
}
