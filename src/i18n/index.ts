import { createStore, type ReadStore } from '../ui/store';
import { en } from './en';
import { fr, type MessageKey } from './fr';

export type { MessageKey };
export type Lang = 'fr' | 'en';
export const LANGS: readonly Lang[] = ['fr', 'en'];

const messages: Record<Lang, Record<MessageKey, string>> = { fr, en };
const STORAGE_KEY = 'pokedaily.lang';

function isLang(value: string | null | undefined): value is Lang {
  return value === 'fr' || value === 'en';
}

/** Priorité : `?lang=` dans l'adresse > choix mémorisé > langue du navigateur > anglais. */
export function detectLang(search: string, stored: string | null, browserLang: string): Lang {
  const fromUrl = new URLSearchParams(search).get('lang');
  if (isLang(fromUrl)) return fromUrl;
  if (isLang(stored)) return stored;
  return browserLang.slice(0, 2).toLowerCase() === 'fr' ? 'fr' : 'en';
}

export interface I18n {
  lang: ReadStore<Lang>;
  t(key: MessageKey, params?: Record<string, string | number>): string;
  setLang(next: Lang): void;
}

export function createI18n(initial: Lang, onChange?: (lang: Lang) => void): I18n {
  const lang = createStore<Lang>(initial);
  return {
    lang,
    t(key, params) {
      const message = messages[lang.get()][key];
      if (!params) return message;
      return message.replace(/\{(\w+)\}/g, (placeholder, name: string) =>
        name in params ? String(params[name]) : placeholder,
      );
    },
    setLang(next) {
      if (next === lang.get()) return;
      lang.set(next);
      onChange?.(next);
    },
  };
}

/** Version « navigateur » : lit l'adresse, la mémoire locale et la langue de l'appareil. */
export function createBrowserI18n(): I18n {
  let stored: string | null = null;
  try {
    stored = window.localStorage.getItem(STORAGE_KEY);
  } catch {
    // Stockage bloqué (navigation privée…) : on continue sans.
  }
  const initial = detectLang(window.location.search, stored, navigator.language);
  return createI18n(initial, (next) => {
    try {
      window.localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // Idem : le choix ne sera simplement pas mémorisé.
    }
  });
}
