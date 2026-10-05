import { spriteUrl, type SpriteSize } from '../../data/sprites';
import { h } from '../../ui/dom';

export interface SpriteOptions {
  id: number;
  shiny?: boolean;
  size: SpriteSize;
  alt: string;
  class?: string;
}

/**
 * Une image de Pokémon. Si elle est introuvable, elle est remplacée par un repère « ? » :
 * jamais d'icône d'image cassée (l'écran reste propre même si un fichier manque).
 */
export function createSprite({ id, shiny = false, size, alt, class: className }: SpriteOptions) {
  const img = h('img', {
    class: className,
    src: spriteUrl(id, shiny, size),
    alt,
    width: size === 128 ? 64 : 200,
    height: size === 128 ? 64 : 200,
    loading: 'lazy',
    decoding: 'async',
    onerror: () => {
      img.replaceWith(h('span', { class: 'sprite-missing', role: 'img', 'aria-label': alt }, '?'));
    },
  });
  return img;
}
