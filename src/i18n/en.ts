import type { MessageKey } from './fr';

/** Anglais : TypeScript refuse de compiler si une clé manque ou est en trop par rapport à `fr.ts`. */
export const en: Record<MessageKey, string> = {
  'app.name': 'Pokédaily',
  'app.tagline': 'Which Pokémon are you today?',
  'lang.label': 'Language',
  'nav.card': 'Pokémon of the day',
  'nav.history': 'History',
  'nav.about': 'About',

  'card.level': 'Lv.',
  'card.nature': 'Nature',
  'card.shiny': '✦ Shiny',
  'card.rename': 'Rename',
  'card.renamePlaceholder': 'Nickname (16 characters max.)',
  'card.imageMissing': 'Image unavailable',
  'card.share': 'Share',
  'card.copy': 'Copy',
  'card.download': 'Download',
  'card.copied': '✓ Image copied',
  'card.downloaded': '✓ Image downloaded',
  'card.shareFailed': "The image couldn't be created or sent. Try again.",
  'card.shareTitle': 'I am {name} today!',
  'card.shareText': 'Discover your Pokémon of the day at pokedaily.vercel.app',

  'about.title': 'About',
  'about.principles':
    'Pokédaily is a fan project: free, with no ads and no tracking. Everything stays on your device.',
  'about.disclaimer':
    'Pokédaily is not affiliated with Nintendo, Game Freak or The Pokémon Company. Pokémon and its characters are trademarks of their respective owners.',
  'about.version': 'Version {version}',

  'history.title': 'History',
  'history.empty': 'Your history is empty for now: come back tomorrow!',
  'history.prev': 'Previous month',
  'history.next': 'Next month',

  'home.loading': 'Opening your collection…',
  'home.error.too_new':
    'Your save was created by a newer version of Pokédaily. Update the app (reload the page) to read it.',
  'home.error.load_failed':
    "Your save can't be read right now. Reload the page; if it keeps failing, don't clear the site's data: contact Diamant.",

  'notice.volatile':
    'No-save mode: nothing is kept when you close the tab (your browser refuses storage, or this is a preview).',
  'notice.saveFailed':
    "⚠️ Your last change couldn't be saved. It stays visible here; we'll try again on your next action.",
  'notice.warnings': 'Some damaged data was ignored when opening.',
  'notice.warningsDetails': 'Show details',
  'notice.dismiss': 'Close',

  'backup.title': 'My collection',
  'backup.intro':
    'Everything is saved on this device. To keep it safe or move it to another device, export it to a file, then import it elsewhere. The file stays with you: nothing is sent over the Internet.',
  'backup.export': 'Export my collection',
  'backup.exported': 'File “{filename}” is ready: look in your downloads.',
  'backup.import': 'Import a collection…',
  'backup.confirm':
    'Replace your current collection (days recorded: {current}) with the one in the file (days recorded: {incoming}, different Pokémon: {caught})?\n\nYour current collection will be permanently lost. Export it first if you want to keep it.',
  'backup.imported':
    'Collection imported (days recorded: {incoming}, different Pokémon: {caught}).',
  'backup.cancelled': 'Import cancelled: your collection is unchanged.',
  'backup.failure.too_big': 'This file is too big to be a Pokédaily backup.',
  'backup.failure.not_json': "This file can't be read (it isn't JSON).",
  'backup.failure.not_pokedaily': "This file isn't a Pokédaily backup.",
  'backup.failure.too_new': 'This file comes from a newer version of Pokédaily: update the app.',
  'backup.failure.damaged': 'This file is damaged; nothing was imported. First problem: {first}',
  'backup.failure.save_failed': 'Saving failed: your collection is unchanged. Try again.',
  'backup.failure.read_failed': "This file can't be read.",

  'footer.madeBy': 'Made by {author}',

  'form.mega': 'Mega',
  'form.gmax': 'Gigantamax',
  'form.alola': 'Alolan',
  'form.galar': 'Galarian',
  'form.hisui': 'Hisuian',
  'form.paldea': 'Paldean',
  'form.primal': 'Primal',
  'form.totem': 'Totem',
  'form.costume': 'Costume',
  'form.partner': 'Partner',
  'form.other': 'Alternate form',

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
