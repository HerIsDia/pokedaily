import { isValidDay, type Day } from '../core/dates';

/**
 * Simulation d'une date (mode développeur) : `?simulate=2026-10-31` ouvre l'application comme si
 * nous étions ce jour-là, dans un bac à sable en mémoire (rien n'est enregistré).
 */
export const SIMULATE_PARAM = 'simulate';

/** Le jour demandé dans l'adresse, ou `null` (absent ou invalide). */
export function parseSimulateParam(search: string): Day | null {
  const value = new URLSearchParams(search).get(SIMULATE_PARAM);
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value) || !isValidDay(value)) return null;
  const year = Number(value.slice(0, 4));
  return year >= 2000 && year <= 2100 ? value : null;
}

/** Midi du jour demandé, heure locale : loin de minuit, donc stable. */
export function noonOf(day: Day): Date {
  const [year = 0, month = 1, date = 1] = day.split('-').map(Number);
  return new Date(year, month - 1, date, 12, 0, 0);
}

/** L'adresse qui simule `day` (on garde la langue et on revient à l'accueil). */
export function simulationUrl(href: string, day: Day): string {
  const url = new URL(href);
  url.searchParams.delete('preview');
  url.searchParams.set(SIMULATE_PARAM, day);
  url.hash = '';
  return url.toString();
}

/** L'adresse normale (sans simulation). */
export function exitSimulationUrl(href: string): string {
  const url = new URL(href);
  url.searchParams.delete(SIMULATE_PARAM);
  url.hash = '';
  return url.toString();
}
