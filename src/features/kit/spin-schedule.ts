import type { Rng } from '../../core/rng';

export interface SpinStep {
  /** La case mise en lumière à cette étape. */
  index: number;
  /** Attente (ms) AVANT cette étape. */
  delay: number;
}

/**
 * Le « film » de la roulette : une suite de cases allumées qui ralentit, et se termine TOUJOURS
 * sur la case gagnante `target`. Le résultat est déjà décidé (et sauvegardé) : l'animation n'est
 * que du spectacle, elle ne peut rien changer.
 *
 * Les cases ne se répètent jamais deux fois de suite (sinon on croirait que ça bloque).
 */
export function buildSpinSchedule(
  cellCount: number,
  target: number,
  rng: Rng,
  reducedMotion = false,
): SpinStep[] {
  if (cellCount < 1 || target < 0 || target >= cellCount) throw new RangeError('case invalide');
  // Préférence « réduire les animations » : on saute directement au résultat.
  if (reducedMotion || cellCount === 1) return [{ index: target, delay: 0 }];

  const total = 28 + Math.floor(rng.next() * 10);
  const steps: SpinStep[] = [];
  let delay = 70;
  let previous = -1;
  for (let step = 0; step < total - 1; step++) {
    let index = Math.floor(rng.next() * cellCount);
    if (index === previous) index = (index + 1) % cellCount;
    steps.push({ index, delay });
    previous = index;
    // Ralentit : un peu au milieu, beaucoup à la fin.
    if (step > total * 0.6) delay += 40;
    else if (step > total * 0.4) delay += 15;
  }
  // Dernière étape : la case gagnante (différente de la précédente, sinon on saute l'étape).
  if (previous === target) steps.pop();
  steps.push({ index: target, delay: delay + 40 });
  return steps;
}
