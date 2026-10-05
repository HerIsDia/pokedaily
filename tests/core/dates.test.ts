import { describe, expect, it } from 'vitest';
import {
  addDays,
  daysBetween,
  isValidDay,
  localDay,
  monthKey,
  needsNewDraw,
  parseDay,
  weekdayOf,
} from '../../src/core/dates';

describe('localDay', () => {
  it('donne le jour LOCAL, avec des zéros devant', () => {
    expect(localDay(new Date(2026, 0, 5, 12, 0))).toBe('2026-01-05');
    expect(localDay(new Date(2026, 11, 31, 12, 0))).toBe('2026-12-31');
  });

  it('bascule exactement à minuit, heure locale', () => {
    expect(localDay(new Date(2026, 9, 5, 23, 59, 59, 999))).toBe('2026-10-05');
    expect(localDay(new Date(2026, 9, 6, 0, 0, 0, 0))).toBe('2026-10-06');
  });

  it('ne dépend pas de l’heure d’été (passage à 2 h du matin)', () => {
    // 2026-03-29 : changement d'heure en Europe. Quelle que soit la machine, le jour reste cohérent.
    expect(localDay(new Date(2026, 2, 29, 1, 30))).toBe('2026-03-29');
    expect(localDay(new Date(2026, 2, 29, 12, 0))).toBe('2026-03-29');
    expect(localDay(new Date(2026, 2, 30, 0, 30))).toBe('2026-03-30');
  });
});

describe('validation et lecture', () => {
  it.each([
    '2026-02-29',
    '2026-13-01',
    '2026-00-10',
    '2026-1-1',
    '26-01-01',
    '2026/01/01',
    '',
    'abc',
  ])('refuse %j', (value) => {
    expect(isValidDay(value)).toBe(false);
    expect(() => parseDay(value)).toThrow(RangeError);
  });

  it('accepte les jours réels, dont le 29 février d’une année bissextile', () => {
    expect(isValidDay('2028-02-29')).toBe(true);
    expect(isValidDay('2026-12-31')).toBe(true);
    expect(parseDay('2026-10-05')).toEqual({ year: 2026, month: 10, day: 5 });
  });
});

describe('calcul de jours', () => {
  it('addDays passe les fins de mois, d’année et les années bissextiles', () => {
    expect(addDays('2026-01-31', 1)).toBe('2026-02-01');
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
    expect(addDays('2028-02-28', 1)).toBe('2028-02-29');
    expect(addDays('2026-02-28', 1)).toBe('2026-03-01');
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28');
    expect(addDays('2026-10-05', 0)).toBe('2026-10-05');
    expect(addDays('2026-01-01', 365)).toBe('2027-01-01');
  });

  it('addDays traverse les changements d’heure sans décalage', () => {
    // 2026-03-28 → 2026-03-30 : 2 jours, même si l'une des journées fait 23 h
    expect(addDays('2026-03-28', 2)).toBe('2026-03-30');
    expect(addDays('2026-10-24', 2)).toBe('2026-10-26');
  });

  it('daysBetween est exact et signé', () => {
    expect(daysBetween('2026-10-05', '2026-10-05')).toBe(0);
    expect(daysBetween('2026-10-05', '2026-10-12')).toBe(7);
    expect(daysBetween('2026-10-12', '2026-10-05')).toBe(-7);
    expect(daysBetween('2026-03-28', '2026-03-30')).toBe(2);
    expect(daysBetween('2026-01-01', '2027-01-01')).toBe(365);
    expect(daysBetween('2027-01-01', '2028-01-01')).toBe(365);
    expect(daysBetween('2028-01-01', '2029-01-01')).toBe(366);
  });

  it('weekdayOf : 0 = dimanche', () => {
    expect(weekdayOf('2026-10-05')).toBe(1); // lundi
    expect(weekdayOf('2026-03-13')).toBe(5); // vendredi 13 (jour de la V-Roulette !)
    expect(weekdayOf('2026-03-01')).toBe(0); // dimanche
    expect(weekdayOf('2026-02-28')).toBe(6);
  });

  it('monthKey', () => {
    expect(monthKey('2026-10-05')).toBe('2026-10');
  });
});

describe('needsNewDraw', () => {
  it('premier lancement : oui', () => {
    expect(needsNewDraw(null, '2026-10-05')).toBe(true);
  });

  it('même jour : non ; jour suivant : oui', () => {
    expect(needsNewDraw('2026-10-05', '2026-10-05')).toBe(false);
    expect(needsNewDraw('2026-10-05', '2026-10-06')).toBe(true);
    expect(needsNewDraw('2026-12-31', '2027-01-01')).toBe(true);
  });

  it('si l’horloge recule (autre fuseau, réglage de l’appareil) : on ne retire PAS', () => {
    expect(needsNewDraw('2026-10-06', '2026-10-05')).toBe(false);
  });

  it('plusieurs jours sans ouvrir l’app : un seul nouveau tirage', () => {
    expect(needsNewDraw('2026-10-01', '2026-10-09')).toBe(true);
  });
});
