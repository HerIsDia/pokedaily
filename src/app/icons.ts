import { svg } from '../ui/dom';

/** Icônes du menu (traits simples, dessinés pour Pokédaily). */
const PATHS = {
  card: [
    ['rect', { x: 5, y: 3, width: 14, height: 18, rx: 3 }],
    ['circle', { cx: 12, cy: 10, r: 3 }],
    ['path', { d: 'M9 17h6' }],
  ],
  history: [
    ['rect', { x: 3, y: 5, width: 18, height: 16, rx: 2 }],
    ['path', { d: 'M3 10h18M8 3v4M16 3v4' }],
  ],
  pokedex: [
    ['circle', { cx: 12, cy: 12, r: 9 }],
    ['circle', { cx: 12, cy: 12, r: 3 }],
    ['path', { d: 'M3 12h6M15 12h6' }],
  ],
  stats: [['path', { d: 'M5 21V11M12 21V4M19 21v-7' }]],
  about: [
    ['circle', { cx: 12, cy: 12, r: 9 }],
    ['path', { d: 'M12 11v6M12 7.5v.5' }],
  ],
} as const;

export type IconName = keyof typeof PATHS;

export function icon(name: IconName): SVGElement {
  return svg(
    'svg',
    {
      class: 'nav-icon',
      viewBox: '0 0 24 24',
      fill: 'none',
      stroke: 'currentColor',
      'stroke-width': 2,
      'stroke-linecap': 'round',
      'stroke-linejoin': 'round',
      'aria-hidden': 'true',
    },
    ...PATHS[name].map(([tag, attrs]) => svg(tag, attrs)),
  );
}
