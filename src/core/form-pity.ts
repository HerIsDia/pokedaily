import {
  FORM_CHANCE_MAX_PERCENT,
  FORM_CHANCE_START_PERCENT,
  FORM_CHANCE_STEP_PERCENT,
} from './constants';

/**
 * Le « pourcentage progressif » des formes alternatives (voulu par Diamant) :
 * 1 % le premier jour ; chaque jour SANS forme ajoute 1 % ; dès qu'une forme sort, retour à 1 %.
 * Au 100ᵉ jour sans forme la chance atteint 100 % : une forme est garantie.
 *
 * Mesuré par simulation : en moyenne 12,2 jours entre deux formes (≈ 8,2 % des jours).
 */
export interface FormPity {
  /** Nombre de tirages consécutifs sans forme depuis la dernière (0 au départ). */
  daysWithoutForm: number;
}

export const INITIAL_FORM_PITY: FormPity = { daysWithoutForm: 0 };

function sanitize(value: number): number {
  return Number.isFinite(value) && value > 0 ? Math.floor(value) : 0;
}

/** La chance du prochain tirage, en pourcentage (1, 2, 3 … 100). */
export function formChancePercent(state: FormPity): number {
  const percent =
    FORM_CHANCE_START_PERCENT + FORM_CHANCE_STEP_PERCENT * sanitize(state.daysWithoutForm);
  return Math.min(FORM_CHANCE_MAX_PERCENT, percent);
}

/** La même chance, entre 0 et 1. */
export function formChance(state: FormPity): number {
  return formChancePercent(state) / 100;
}

/** Le compteur après un tirage : remis à zéro si on a obtenu une forme, +1 sinon. */
export function nextFormPity(state: FormPity, gotForm: boolean): FormPity {
  return { daysWithoutForm: gotForm ? 0 : sanitize(state.daysWithoutForm) + 1 };
}
