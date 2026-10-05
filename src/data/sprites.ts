import sprites from './sprites.json';

/**
 * Disponibilité des images, générée par `pnpm sprites`.
 * Règle : une image manquante ne casse jamais l'affichage (voir `spriteUrl`).
 */

export type SpriteSource = 'home' | 'official-artwork' | 'scarlet-violet' | 'extra';

/** Tailles générées (px) : 512 pour la carte et le partage, 128 pour les grilles. */
export const SPRITE_SIZES = [128, 512] as const;
export type SpriteSize = (typeof SPRITE_SIZES)[number];

const missingNormal = new Set<number>(sprites.missing.normal);
const missingShiny = new Set<number>(sprites.missing.shiny);

const fallbackSource = new Map<string, SpriteSource>();
for (const kind of ['normal', 'shiny'] as const) {
  const lists = sprites.fallbacks[kind] as Partial<Record<SpriteSource, number[]>>;
  for (const [source, ids] of Object.entries(lists)) {
    for (const id of ids ?? []) fallbackSource.set(`${kind}:${id}`, source as SpriteSource);
  }
}
for (const kind of ['normal', 'shiny'] as const) {
  for (const id of sprites.extras[kind]) fallbackSource.set(`${kind}:${id}`, 'extra');
}

export function hasSprite(id: number, shiny = false): boolean {
  return !(shiny ? missingShiny : missingNormal).has(id);
}

/** Un Pokémon qui n'a pas d'image shiny ne peut pas sortir en shiny (le jeu non plus, en général). */
export function canBeShiny(id: number): boolean {
  return hasSprite(id, true);
}

/** Un Pokémon sans aucune image n'est jamais tiré au sort (jamais d'image cassée). */
export function isDrawable(id: number): boolean {
  return hasSprite(id, false);
}

/** D'où vient l'image (`home` = rendu 3D de référence ; les autres sont des replis). */
export function spriteSource(id: number, shiny = false): SpriteSource | null {
  if (!hasSprite(id, shiny)) return null;
  return fallbackSource.get(`${shiny ? 'shiny' : 'normal'}:${id}`) ?? 'home';
}

/** `25`, shiny, 512 → `/sprites/512/25s.webp` (retombe sur l'image normale si le shiny n'existe pas). */
export function spriteUrl(id: number, shiny: boolean, size: SpriteSize): string {
  const useShiny = shiny && hasSprite(id, true);
  return `/sprites/${size}/${id}${useShiny ? 's' : ''}.webp`;
}
