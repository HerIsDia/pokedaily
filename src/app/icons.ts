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
  kit: [
    ['rect', { x: 3, y: 8, width: 18, height: 13, rx: 2 }],
    ['path', { d: 'M12 8v13M3 13h18' }],
    ['path', { d: 'M12 8C10 4 6 4 6 6.5S10 8 12 8zM12 8c2-4 6-4 6-1.5S14 8 12 8z' }],
  ],
  team: [
    ['circle', { cx: 9, cy: 8, r: 3.5 }],
    ['path', { d: 'M2.5 20c0-3.6 2.9-6 6.5-6s6.5 2.4 6.5 6' }],
    ['path', { d: 'M16 4.6a3.5 3.5 0 0 1 0 6.8M18 14.4c2 .8 3.5 2.6 3.5 5.6' }],
  ],
  roulette: [
    ['circle', { cx: 12, cy: 12, r: 9 }],
    ['path', { d: 'M12 3v18M3 12h18M5.6 5.6l12.8 12.8M18.4 5.6L5.6 18.4' }],
  ],
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
