import type { MessageKey } from './fr';

/** Anglais : TypeScript refuse de compiler si une clé manque ou est en trop par rapport à `fr.ts`. */
export const en: Record<MessageKey, string> = {
  'app.name': 'Pokédaily',
  'app.tagline': 'Which Pokémon are you today?',
  'lang.label': 'Language',
  'nav.card': 'Pokémon of the day',
  'nav.about': 'About',

  'card.level': 'Lv.',
  'card.nature': 'Nature',
  'card.shiny': '✦ Shiny',
  'card.rename': 'Rename',
  'card.renamePlaceholder': 'Nickname (16 characters max.)',
  'card.imageMissing': 'Image unavailable',

  'about.title': 'About',
  'about.principles':
    'Pokédaily is a fan project: free, with no ads and no tracking. Everything stays on your device.',
  'about.disclaimer':
    'Pokédaily is not affiliated with Nintendo, Game Freak or The Pokémon Company. Pokémon and its characters are trademarks of their respective owners.',
  'about.version': 'Version {version}',

  'footer.madeBy': 'Made by {author}',

  'type.normal': 'Normal',
  'type.fire': 'Fire',
  'type.water': 'Water',
  'type.electric': 'Electric',
  'type.grass': 'Grass',
  'type.ice': 'Ice',
  'type.fighting': 'Fighting',
  'type.poison': 'Poison',
  'type.ground': 'Ground',
  'type.flying': 'Flying',
  'type.psychic': 'Psychic',
  'type.bug': 'Bug',
  'type.rock': 'Rock',
  'type.ghost': 'Ghost',
  'type.dragon': 'Dragon',
  'type.dark': 'Dark',
  'type.steel': 'Steel',
  'type.fairy': 'Fairy',
};
