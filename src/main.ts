import '@fontsource/roboto-condensed/latin-400.css';
import '@fontsource/roboto-condensed/latin-700.css';
import '@fontsource/roboto-condensed/latin-900.css';
import '@fontsource/roboto-condensed/latin-ext-400.css';
import '@fontsource/roboto-condensed/latin-ext-700.css';
import '@fontsource/roboto-condensed/latin-ext-900.css';
import './ui/tokens.css';
import './ui/types.css';
import './app/app.css';
import './features/card/card.css';
import './features/home/home.css';
import './features/backup/backup.css';

import { createBrowserI18n } from './i18n';
import { boot } from './app/boot';

const root = document.getElementById('app');
if (!root) throw new Error('Élément #app introuvable dans index.html.');

void boot(root, { i18n: createBrowserI18n() });
