import { NAME_MAX_LENGTH } from './constants';

/**
 * Nettoie un surnom : espaces retirés autour, limité à 16 caractères RÉELS (on ne coupe pas un
 * emoji en deux : `slice` compterait des unités UTF-16, pas des caractères).
 */
export function clampName(raw: string): string {
  return Array.from(raw.trim()).slice(0, NAME_MAX_LENGTH).join('');
}
