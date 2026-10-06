import { describe, expect, it } from 'vitest';
import { badgeUnlockedToday, streakBadges } from '../../src/features/stats/badges';

describe('badges de série', () => {
  it('rien d’obtenu au départ, avec le nombre de jours restants', () => {
    expect(streakBadges(1, 1)).toEqual([
      { days: 7, earned: false, remaining: 6 },
      { days: 30, earned: false, remaining: 29 },
      { days: 100, earned: false, remaining: 99 },
      { days: 365, earned: false, remaining: 364 },
    ]);
  });

  it('un badge obtenu le reste même si la série retombe', () => {
    const badges = streakBadges(2, 35); // série cassée après 35 jours, puis 2 jours
    expect(badges.map((b) => b.earned)).toEqual([true, true, false, false]);
    expect(badges[0]!.remaining).toBeNull();
    expect(badges[2]!.remaining).toBe(98); // il faut tout refaire depuis la série en cours
  });

  it('la limite exacte compte (7 jours = badge d’une semaine)', () => {
    expect(streakBadges(7, 7)[0]!.earned).toBe(true);
    expect(streakBadges(6, 6)[0]!.earned).toBe(false);
  });

  it('célèbre le badge seulement le jour où le palier est atteint', () => {
    expect(badgeUnlockedToday(6)).toBeNull();
    expect(badgeUnlockedToday(7)).toBe(7);
    expect(badgeUnlockedToday(8)).toBeNull();
    expect(badgeUnlockedToday(365)).toBe(365);
    expect(badgeUnlockedToday(0)).toBeNull();
  });
});
