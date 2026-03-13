export interface EventModifiers {
  /** Force a specific Pokémon ID with the given chance */
  forcedPokemonId?: number;
  /** Pick a random ID from this list with the given chance */
  forcedPokemonIds?: number[];
  /** Probability (0–1) that the forced Pokémon is chosen */
  forcedPokemonChance?: number;
  /** If true, the Pokémon is always shiny regardless of shinyRate */
  forcedShiny?: boolean;
  /** Custom shiny rate denominator (e.g. 30 = 1/30). Overrides the default 1/69. */
  shinyRate?: number;
  /** Force a specific level */
  forcedLevel?: number;
  /** Min Victini tickets to award */
  victiniTicketsMin?: number;
  /** Max Victini tickets to award */
  victiniTicketsMax?: number;
  /** Generate a special Lucky Day box for V-Roulette */
  luckyDayBox?: boolean;
}

export interface RecurringDate {
  month: number;
  day: number;
}

export interface GameEvent {
  id: string;
  nameFr: string;
  nameEn: string;
  descriptionFr: string;
  descriptionEn: string;
  type: 'date_range' | 'recurring_date' | 'recurring_dates' | 'recurring_weekday_date' | 'date_range_weekday';
  // date_range / date_range_weekday
  startDate?: string;
  endDate?: string;
  // recurring_date
  month?: number;
  day?: number;
  // recurring_dates
  dates?: RecurringDate[];
  // recurring_weekday_date / date_range_weekday
  weekday?: number; // 0=Sunday, 5=Friday, etc.
  modifiers: EventModifiers;
}

// ── Event loading ───────────────────────────────────────────────────────────

let _cachedEvents: GameEvent[] | null = null;

export async function loadEvents(): Promise<GameEvent[]> {
  if (_cachedEvents) return _cachedEvents;
  try {
    const res = await fetch('/events.json');
    if (!res.ok) return [];
    const data = await res.json() as { events: GameEvent[] };
    _cachedEvents = data.events ?? [];
    return _cachedEvents;
  } catch {
    return [];
  }
}

// ── Active event detection ──────────────────────────────────────────────────

function isEventActive(event: GameEvent, date: Date): boolean {
  const month = date.getUTCMonth() + 1; // 1-indexed
  const day = date.getUTCDate();
  const weekday = date.getUTCDay(); // 0=Sunday

  if (event.type === 'date_range' && event.startDate && event.endDate) {
    const d = date.toISOString().slice(0, 10);
    return d >= event.startDate && d <= event.endDate;
  }

  if (event.type === 'recurring_date') {
    return event.month === month && event.day === day;
  }

  if (event.type === 'recurring_dates' && event.dates) {
    return event.dates.some((rd) => rd.month === month && rd.day === day);
  }

  // e.g. every Friday the 13th
  if (event.type === 'recurring_weekday_date') {
    return event.weekday === weekday && event.day === day;
  }

  // e.g. every Sunday during a date range
  if (event.type === 'date_range_weekday' && event.startDate && event.endDate) {
    const d = date.toISOString().slice(0, 10);
    return d >= event.startDate && d <= event.endDate && event.weekday === weekday;
  }

  return false;
}

export function getActiveEvents(events: GameEvent[], date: Date): GameEvent[] {
  return events.filter((e) => isEventActive(e, date));
}

// ── Next event detection ────────────────────────────────────────────────────

/** Returns the soonest upcoming event within the next 365 days. */
export function getNextEvent(
  events: GameEvent[],
  date: Date
): { event: GameEvent; daysUntil: number } | null {
  let best: { event: GameEvent; daysUntil: number } | null = null;

  for (const event of events) {
    const daysUntil = daysUntilNextOccurrence(event, date);
    if (daysUntil === null) continue;
    if (!best || daysUntil < best.daysUntil) {
      best = { event, daysUntil };
    }
  }

  return best;
}

function daysUntilNextOccurrence(event: GameEvent, from: Date): number | null {
  const fromDay = Date.UTC(from.getUTCFullYear(), from.getUTCMonth(), from.getUTCDate());

  if (event.type === 'date_range' && event.startDate && event.endDate) {
    const start = Date.parse(event.startDate);
    const end = Date.parse(event.endDate);
    if (fromDay >= start && fromDay <= end) return 0;
    if (fromDay < start) return Math.round((start - fromDay) / 86400000);
    const startDate = new Date(event.startDate);
    const nextYear = new Date(Date.UTC(from.getUTCFullYear() + 1, startDate.getUTCMonth(), startDate.getUTCDate()));
    const diff = Math.round((nextYear.getTime() - fromDay) / 86400000);
    return diff <= 365 ? diff : null;
  }

  if (event.type === 'recurring_date' && event.month && event.day) {
    return daysUntilDate(from, event.month, event.day);
  }

  if (event.type === 'recurring_dates' && event.dates) {
    const candidates = event.dates.map((d) => daysUntilDate(from, d.month, d.day));
    const filtered = candidates.filter((d): d is number => d !== null && d > 0);
    return filtered.length > 0 ? Math.min(...filtered) : null;
  }

  // recurring_weekday_date: scan ahead up to 365 days for the next matching weekday+day
  if (event.type === 'recurring_weekday_date' && event.weekday !== undefined && event.day !== undefined) {
    for (let i = 1; i <= 365; i++) {
      const future = new Date(fromDay + i * 86400000);
      if (future.getUTCDay() === event.weekday && future.getUTCDate() === event.day) {
        return i;
      }
    }
    return null;
  }

  // date_range_weekday: next matching weekday within the date range
  if (event.type === 'date_range_weekday' && event.startDate && event.endDate && event.weekday !== undefined) {
    const start = Date.parse(event.startDate);
    const end = Date.parse(event.endDate);
    if (fromDay > end) return null; // event is past
    const searchStart = Math.max(fromDay + 86400000, start);
    for (let d = searchStart; d <= end; d += 86400000) {
      const dt = new Date(d);
      if (dt.getUTCDay() === event.weekday) {
        return Math.round((d - fromDay) / 86400000);
      }
    }
    return null;
  }

  return null;
}

function daysUntilDate(from: Date, month: number, day: number): number | null {
  const fromDay = Date.UTC(from.getUTCFullYear(), from.getUTCMonth(), from.getUTCDate());
  const thisYear = Date.UTC(from.getUTCFullYear(), month - 1, day);
  const nextYear = Date.UTC(from.getUTCFullYear() + 1, month - 1, day);

  if (thisYear > fromDay) return Math.round((thisYear - fromDay) / 86400000);
  if (nextYear > fromDay) return Math.round((nextYear - fromDay) / 86400000);
  return null;
}

// ── Modifier application ────────────────────────────────────────────────────

export function applyEventModifiers(
  activeEvents: GameEvent[],
  base: { id: number; isShiny: boolean; level: number }
): { id: number; isShiny: boolean; level: number } {
  let { id, isShiny, level } = base;

  for (const event of activeEvents) {
    const m = event.modifiers;

    // Forced Pokémon selection
    if (m.forcedPokemonId !== undefined && m.forcedPokemonChance !== undefined) {
      if (Math.random() < m.forcedPokemonChance) {
        id = m.forcedPokemonId;
      }
    } else if (m.forcedPokemonIds && m.forcedPokemonIds.length > 0 && m.forcedPokemonChance !== undefined) {
      if (Math.random() < m.forcedPokemonChance) {
        id = m.forcedPokemonIds[Math.floor(Math.random() * m.forcedPokemonIds.length)];
      }
    }

    // Shiny override
    if (m.forcedShiny) {
      isShiny = true;
    } else if (m.shinyRate !== undefined) {
      isShiny = Math.random() < 1 / m.shinyRate;
    }

    // Level override
    if (m.forcedLevel !== undefined) {
      level = m.forcedLevel;
    }
  }

  return { id, isShiny, level };
}
