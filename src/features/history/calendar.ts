import { parseDay, weekdayOf, type Day } from '../../core/dates';
import type { PokemonEntry } from '../../core/model';

/** Un mois du calendrier : « AAAA-MM », ses jours remplis et sa forme (lundi en premier). */
export interface MonthView {
  key: string;
  year: number;
  /** 1–12 */
  month: number;
  daysInMonth: number;
  /** Cases vides avant le 1ᵉʳ : 0 si le mois commence un lundi, 6 si un dimanche. */
  startOffset: number;
  entries: Map<number, PokemonEntry>;
}

export function daysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

/** « AAAA-MM » → forme du mois (sans entrées). */
export function monthShape(key: string): Omit<MonthView, 'entries'> {
  const [year = 0, month = 1] = key.split('-').map(Number);
  const first: Day = `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}-01`;
  return {
    key,
    year,
    month,
    daysInMonth: daysInMonth(year, month),
    // weekdayOf : 0 = dimanche. On veut lundi = 0.
    startOffset: (weekdayOf(first) + 6) % 7,
  };
}

/** Les mois qui contiennent au moins un Pokémon, du plus récent au plus ancien. */
export function buildMonths(entries: readonly PokemonEntry[]): MonthView[] {
  const months = new Map<string, MonthView>();
  for (const entry of entries) {
    const key = entry.day.slice(0, 7);
    let month = months.get(key);
    if (!month) {
      month = { ...monthShape(key), entries: new Map() };
      months.set(key, month);
    }
    month.entries.set(parseDay(entry.day).day, entry);
  }
  return [...months.values()].sort((a, b) => (a.key < b.key ? 1 : a.key > b.key ? -1 : 0));
}

/** Le jour `AAAA-MM-JJ` d'une case du calendrier. */
export function dayOf(month: MonthView, day: number): Day {
  return `${month.key}-${String(day).padStart(2, '0')}`;
}
