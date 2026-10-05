/**
 * Aléa « injectable » : la logique du jeu ne tire JAMAIS directement `Math.random()`,
 * elle reçoit un `Rng`. En production c'est le vrai hasard ; dans les tests c'est un hasard
 * à graine (toujours la même suite de nombres), donc des résultats reproductibles.
 */
export interface Rng {
  /** Un nombre au hasard dans [0, 1[. */
  next(): number;
}

export const mathRng: Rng = { next: () => Math.random() };

/** Hasard à graine (mulberry32) : même graine → même suite, sur toutes les machines. */
export function seededRng(seed: number): Rng {
  let state = seed | 0;
  return {
    next() {
      state = (state + 0x6d2b79f5) | 0;
      let t = Math.imul(state ^ (state >>> 15), 1 | state);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    },
  };
}

/** Transforme un texte (ex. « 2026-10 ») en graine. Même texte → même graine. */
export function seedFromString(text: string): number {
  let seed = 0;
  for (let i = 0; i < text.length; i++) {
    seed = ((seed << 5) - seed + text.charCodeAt(i)) | 0;
  }
  return seed;
}

/** Entier au hasard dans [min, max], bornes comprises. */
export function randomInt(rng: Rng, min: number, max: number): number {
  if (!Number.isInteger(min) || !Number.isInteger(max) || max < min) {
    throw new RangeError(`randomInt: intervalle invalide [${min}, ${max}]`);
  }
  return min + Math.floor(rng.next() * (max - min + 1));
}

/** Vrai avec la probabilité donnée (0 = jamais, 1 = toujours). */
export function chance(rng: Rng, probability: number): boolean {
  if (probability <= 0) return false;
  if (probability >= 1) return true;
  return rng.next() < probability;
}

/** Un élément au hasard (tirage uniforme). */
export function pickOne<T>(rng: Rng, items: readonly T[]): T {
  if (items.length === 0) throw new RangeError('pickOne: liste vide');
  return items[Math.floor(rng.next() * items.length)] as T;
}

/** `count` éléments DISTINCTS au hasard (sans remise). */
export function sampleDistinct<T>(rng: Rng, items: readonly T[], count: number): T[] {
  if (count < 0 || count > items.length) {
    throw new RangeError(`sampleDistinct: impossible de tirer ${count} parmi ${items.length}`);
  }
  const pool = [...items];
  const picked: T[] = [];
  for (let i = 0; i < count; i++) {
    const index = Math.floor(rng.next() * pool.length);
    picked.push(pool[index] as T);
    pool[index] = pool[pool.length - 1] as T; // on remplace par le dernier : O(1)
    pool.pop();
  }
  return picked;
}

/** Les mêmes éléments dans un ordre aléatoire (la liste d'origine n'est pas modifiée). */
export function shuffled<T>(rng: Rng, items: readonly T[]): T[] {
  return sampleDistinct(rng, items, items.length);
}
