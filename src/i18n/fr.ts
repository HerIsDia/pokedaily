/** Français : c'est LE fichier de référence. `en.ts` doit avoir exactement les mêmes clés. */
export const fr = {
  'app.name': 'Pokédaily',
  'app.tagline': "Quel Pokémon es-tu aujourd'hui ?",
  'lang.label': 'Langue',
  'nav.card': "Aujourd'hui",
  'nav.history': 'Historique',
  'nav.pokedex': 'Pokédex',
  'nav.stats': 'Stats',
  'nav.main': 'Navigation principale',
  'nav.about': 'À propos',

  'card.level': 'Niv.',
  'card.nature': 'Nature',
  'card.shiny': '✦ Shiny',
  'card.rename': 'Renommer',
  'card.renamePlaceholder': 'Surnom (16 caractères max.)',
  'card.imageMissing': 'Image indisponible',
  'card.share': 'Partager',
  'card.copy': 'Copier',
  'card.download': 'Télécharger',
  'card.copied': '✓ Image copiée',
  'card.downloaded': '✓ Image téléchargée',
  'card.shareFailed': "L'image n'a pas pu être créée ou envoyée. Réessaie.",
  'card.shareTitle': "Je suis {name} aujourd'hui !",
  'card.shareText': 'Découvre ton Pokémon du jour sur pokedaily.vercel.app',

  'about.title': 'À propos',
  'about.principles':
    'Pokédaily est un projet de fans, gratuit, sans publicité ni suivi. Tout reste sur ton appareil.',
  'about.disclaimer':
    "Pokédaily n'est pas affilié à Nintendo, Game Freak ou The Pokémon Company. Pokémon et ses personnages sont des marques déposées de leurs propriétaires.",
  'about.madeBy': 'Fait par {author}',
  'about.version': 'Version {version}',

  'history.title': 'Historique',
  'history.empty': "Ton historique est vide pour l'instant : reviens demain !",
  'history.prev': 'Mois précédent',
  'history.next': 'Mois suivant',

  'pokedex.tab.pokedex': 'Pokédex',
  'pokedex.tab.shinydex': '✦ Shinydex',
  'pokedex.tab.forms': 'Formes',
  'pokedex.counter.species': 'Tu as été {count} Pokémon différents',
  'pokedex.counter.shiny': '{count} Pokémon shiny',
  'pokedex.counter.forms': '{count} formes alternatives obtenues',
  'pokedex.allForms': 'Toutes',
  'pokedex.shinyEmpty': "Aucun Pokémon shiny pour l'instant : à surveiller chaque jour !",

  'stats.title': 'Statistiques',
  'stats.total': 'Pokémon obtenus',
  'stats.shiny': 'Shiny',
  'stats.shinyRate': 'Taux de shiny',
  'stats.avgLevel': 'Niveau moyen',
  'stats.streak': "Jours d'affilée",
  'stats.bestStreak': 'Meilleure série',
  'stats.forms': 'Formes obtenues',
  'stats.tickets': 'Tickets Victini',
  'stats.completion': 'Complétion',
  'stats.types': 'Types les plus fréquents',
  'stats.top': 'Pokémon les plus obtenus',
  'stats.noData': 'Pas encore de données : reviens demain !',

  'home.loading': 'Ouverture de ta collection…',
  'home.error.too_new':
    "Ta sauvegarde a été créée par une version plus récente de Pokédaily. Mets l'application à jour (recharge la page) pour la lire.",
  'home.error.load_failed':
    "Impossible de lire ta sauvegarde pour l'instant. Recharge la page ; si ça persiste, ne vide pas les données du site : écris à Diamant.",

  'notice.volatile':
    "Mode sans sauvegarde : rien n'est conservé quand tu fermes l'onglet (ton navigateur refuse le stockage, ou c'est un aperçu).",
  'notice.saveFailed':
    "⚠️ Ta dernière modification n'a pas pu être enregistrée. Elle reste visible ici ; on réessaie à la prochaine action.",
  'notice.warnings': "Certaines données abîmées ont été ignorées à l'ouverture.",
  'notice.warningsDetails': 'Voir le détail',
  'notice.dismiss': 'Fermer',

  'backup.title': 'Ma collection',
  'backup.intro':
    "Tout est enregistré sur cet appareil. Pour la garder en sécurité ou la passer sur un autre appareil, exporte-la dans un fichier, puis importe-la ailleurs. Le fichier reste chez toi : rien n'est envoyé sur Internet.",
  'backup.export': 'Exporter ma collection',
  'backup.exported': 'Fichier « {filename} » prêt : cherche-le dans tes téléchargements.',
  'backup.import': 'Importer une collection…',
  'backup.confirm':
    'Remplacer ta collection actuelle (jours enregistrés : {current}) par celle du fichier (jours enregistrés : {incoming}, Pokémon différents : {caught}) ?\n\nTa collection actuelle sera définitivement perdue. Exporte-la d’abord si tu veux la garder.',
  'backup.imported':
    'Collection importée (jours enregistrés : {incoming}, Pokémon différents : {caught}).',
  'backup.cancelled': 'Import annulé : ta collection n’a pas changé.',
  'backup.failure.too_big': 'Ce fichier est trop gros pour être une sauvegarde Pokédaily.',
  'backup.failure.not_json': "Ce fichier n'est pas lisible (ce n'est pas du JSON).",
  'backup.failure.not_pokedaily': "Ce fichier n'est pas une sauvegarde Pokédaily.",
  'backup.failure.too_new':
    'Ce fichier vient d’une version plus récente de Pokédaily : mets l’application à jour.',
  'backup.failure.damaged':
    'Ce fichier est abîmé ; rien n’a été importé. Premier problème : {first}',
  'backup.failure.save_failed':
    "L'enregistrement a échoué : ta collection n'a pas changé. Réessaie.",
  'backup.failure.read_failed': 'Impossible de lire ce fichier.',

  'form.mega': 'Méga',
  'form.gmax': 'Gigamax',
  'form.alola': 'd’Alola',
  'form.galar': 'de Galar',
  'form.hisui': 'de Hisui',
  'form.paldea': 'de Paldea',
  'form.primal': 'Primo',
  'form.totem': 'Totem',
  'form.costume': 'Costume',
  'form.partner': 'Partenaire',
  'form.other': 'Forme alternative',

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
