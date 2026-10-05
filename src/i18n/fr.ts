/** Français : c'est LE fichier de référence. `en.ts` doit avoir exactement les mêmes clés. */
export const fr = {
  'app.name': 'Pokédaily',
  'app.tagline': "Quel Pokémon es-tu aujourd'hui ?",
  'lang.label': 'Langue',
  'nav.card': 'Pokémon du jour',
  'nav.about': 'À propos',

  'card.level': 'Niv.',
  'card.nature': 'Nature',
  'card.shiny': '✦ Shiny',
  'card.rename': 'Renommer',
  'card.renamePlaceholder': 'Surnom (16 caractères max.)',
  'card.imageMissing': 'Image indisponible',

  'about.title': 'À propos',
  'about.principles':
    'Pokédaily est un projet de fans, gratuit, sans publicité ni suivi. Tout reste sur ton appareil.',
  'about.disclaimer':
    "Pokédaily n'est pas affilié à Nintendo, Game Freak ou The Pokémon Company. Pokémon et ses personnages sont des marques déposées de leurs propriétaires.",
  'about.version': 'Version {version}',

  'footer.madeBy': 'Fait par {author}',

  'type.normal': 'Normal',
  'type.fire': 'Feu',
  'type.water': 'Eau',
  'type.electric': 'Électrik',
  'type.grass': 'Plante',
  'type.ice': 'Glace',
  'type.fighting': 'Combat',
  'type.poison': 'Poison',
  'type.ground': 'Sol',
  'type.flying': 'Vol',
  'type.psychic': 'Psy',
  'type.bug': 'Insecte',
  'type.rock': 'Roche',
  'type.ghost': 'Spectre',
  'type.dragon': 'Dragon',
  'type.dark': 'Ténèbres',
  'type.steel': 'Acier',
  'type.fairy': 'Fée',
} as const;

export type MessageKey = keyof typeof fr;
