import { addDays, daysBetween, weekdayOf, type Day } from '../dates';
import type { GameEvent } from './types';

/** Un événement qui revient chaque année peut se trouver jusqu'à 366 jours plus loin. */
const SCAN_DAYS = 366;

function inRange(
  event: { startDate: Day; endDate: Day; repeats: 'once' | 'yearly' },
  day: Day,
): boolean {
  if (event.repeats === 'once') return day >= event.startDate && day <= event.endDate;
  // Chaque année : on ne compare que « MM-JJ » (une période peut enjamber le 31 décembre).
  const md = day.slice(5);
  const start = event.startDate.slice(5);
  const end = event.endDate.slice(5);
  return start <= end ? md >= start && md <= end : md >= start || md <= end;
}

/** L'événement est-il actif ce jour-là ? (`day` = jour LOCAL au format AAAA-MM-JJ) */
export function isEventActive(event: GameEvent, day: Day): boolean {
  const month = Number(day.slice(5, 7));
  const dayOfMonth = Number(day.slice(8, 10));
  switch (event.type) {
    case 'date_range':
      return inRange(event, day);
    case 'recurring_date':
      return event.month === month && event.day === dayOfMonth;
    case 'recurring_dates':
      return event.dates.some((d) => d.month === month && d.day === dayOfMonth);
    case 'recurring_weekday_date':
      return event.day === dayOfMonth && event.weekday === weekdayOf(day);
    case 'date_range_weekday':
      return inRange(event, day) && event.weekday === weekdayOf(day);
  }
}

/** Les événements actifs ce jour-là, dans l'ordre du fichier. */
export function activeEvents(events: readonly GameEvent[], day: Day): GameEvent[] {
  return events.filter((event) => isEventActive(event, day));
}

/**
 * Dans combien de jours l'événement sera-t-il actif la prochaine fois (strictement après
 * `today`) ? `null` s'il ne reviendra pas : un événement ponctuel passé n'a plus de compte
 * à rebours (bug B-4 de la v3.1 : « Pokopia » affichait « dans 147 j » alors qu'il était fini).
 */
export function daysUntilNextActive(event: GameEvent, today: Day): number | null {
  const once =
    (event.type === 'date_range' || event.type === 'date_range_weekday') &&
    event.repeats === 'once';
  const limit = once ? daysBetween(today, event.endDate) : SCAN_DAYS;
  for (let i = 1; i <= limit; i++) {
    if (isEventActive(event, addDays(today, i))) return i;
  }
  return null;
}

export interface EventStatus {
  event: GameEvent;
  isActive: boolean;
  /** 0 si actif aujourd'hui. */
  daysUntil: number;
}

/**
 * Tous les événements qui ont encore un avenir (actifs d'abord, puis du plus proche au plus
 * lointain). Alimente le calendrier des événements.
 */
export function eventStatuses(events: readonly GameEvent[], today: Day): EventStatus[] {
  const statuses: EventStatus[] = [];
  for (const event of events) {
    if (isEventActive(event, today)) {
      statuses.push({ event, isActive: true, daysUntil: 0 });
      continue;
    }
    const daysUntil = daysUntilNextActive(event, today);
    if (daysUntil !== null) statuses.push({ event, isActive: false, daysUntil });
  }
  // `sort` est stable : à égalité, l'ordre du fichier est conservé.
  return statuses.sort(
    (a, b) => Number(b.isActive) - Number(a.isActive) || a.daysUntil - b.daysUntil,
  );
}

export interface UpcomingEvent {
  event: GameEvent;
  daysUntil: number;
}

/** Les événements qui ne sont PAS actifs aujourd'hui mais le seront dans `withinDays` jours ou moins. */
export function upcomingEvents(
  events: readonly GameEvent[],
  today: Day,
  withinDays: number,
): UpcomingEvent[] {
  return eventStatuses(events, today)
    .filter((s) => !s.isActive && s.daysUntil <= withinDays)
    .map(({ event, daysUntil }) => ({ event, daysUntil }));
}

/** Le prochain événement (hors événements actifs aujourd'hui), ou `null`. */
export function nextEvent(events: readonly GameEvent[], today: Day): UpcomingEvent | null {
  const next = eventStatuses(events, today).find((s) => !s.isActive);
  return next ? { event: next.event, daysUntil: next.daysUntil } : null;
}
