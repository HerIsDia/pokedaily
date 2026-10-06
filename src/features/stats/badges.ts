import type { MessageKey } from '../../i18n';

/** Les paliers de la série de jours d'affilée qui donnent un badge. */
export const STREAK_BADGES = [7, 30, 100, 365] as const;
export type StreakBadgeDays = (typeof STREAK_BADGES)[number];

export const BADGE_NAME_KEY: Record<StreakBadgeDays, MessageKey> = {
  7: 'badge.7',
  30: 'badge.30',
  100: 'badge.100',
  365: 'badge.365',
};

export interface BadgeStatus {
  days: StreakBadgeDays;
  /** Obtenu un jour (la MEILLEURE série l'a atteint) : un badge ne se perd jamais. */
  earned: boolean;
  /** Jours qu'il reste à tenir pour l'obtenir, d'après la série EN COURS ; `null` si déjà obtenu. */
  remaining: number | null;
}

export function streakBadges(current: number, best: number): BadgeStatus[] {
  return STREAK_BADGES.map((days) => {
    const earned = best >= days;
    return { days, earned, remaining: earned ? null : Math.max(0, days - current) };
  });
}

/** Le badge qu'on vient de gagner AUJOURD'HUI (la série en cours vaut exactement un palier). */
export function badgeUnlockedToday(current: number): StreakBadgeDays | null {
  return STREAK_BADGES.find((days) => days === current) ?? null;
}
