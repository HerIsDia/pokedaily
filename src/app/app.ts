import { createStore } from '../ui/store';
import { LANGS, type I18n, type Lang } from '../i18n';
import { bindAttr, bindText, effect, h } from '../ui/dom';
import { createRouter, type Route } from '../ui/router';
import { Scope } from '../ui/scope';
import { createCardView } from '../features/card/card';
import { createSampleEntry } from '../features/card/spike-data';
import { createAboutView } from './about';

export interface AppDeps {
  i18n: I18n;
}

/** Monte l'application dans `root` et renvoie une fonction pour tout démonter. */
export function mountApp(root: HTMLElement, { i18n }: AppDeps): () => void {
  const scope = new Scope();
  const { t, lang, setLang } = i18n;

  // ⚠️ Essai de la phase 1 : l'entrée vient d'un jeu de données temporaire, en mémoire.
  const entry = createStore(createSampleEntry());

  // <html lang="…"> suit la langue choisie (corrige le `lang="fr"` figé de la v3).
  effect(scope, [lang], () => {
    document.documentElement.lang = lang.get();
  });

  const outlet = h('main', { class: 'app-main' });
  const routes: Route[] = [
    { path: '', view: createCardView({ i18n, entry }) },
    { path: 'about', view: createAboutView({ i18n }) },
  ];
  const router = createRouter(outlet, routes, { fallback: '' });

  const link = (path: string, label: () => string) => {
    const a = h('a', { class: 'nav-link', href: `#/${path}` }, bindText(scope, [lang], label));
    bindAttr(scope, a, 'aria-current', [router.current], () =>
      router.current.get() === path ? 'page' : undefined,
    );
    return a;
  };

  const langButton = (code: Lang) => {
    const button = h(
      'button',
      { class: 'lang-btn', type: 'button', lang: code, onclick: () => setLang(code) },
      code.toUpperCase(),
    );
    bindAttr(scope, button, 'aria-pressed', [lang], () => String(lang.get() === code));
    return button;
  };

  const header = h(
    'header',
    { class: 'app-header' },
    h(
      'span',
      { class: 'app-logo' },
      bindText(scope, [lang], () => t('app.name')),
    ),
    h(
      'nav',
      { class: 'app-nav' },
      link('', () => t('nav.card')),
      link('about', () => t('nav.about')),
    ),
    h('div', { class: 'lang-switch', role: 'group' }, ...LANGS.map(langButton)),
  );
  bindAttr(scope, header.querySelector('.lang-switch')!, 'aria-label', [lang], () =>
    t('lang.label'),
  );

  const footer = h(
    'footer',
    { class: 'app-footer' },
    bindText(scope, [lang], () => t('footer.madeBy', { author: 'diamant' })),
  );

  const shell = h('div', { class: 'app-shell' }, header, outlet, footer);
  root.replaceChildren(shell);
  router.start();

  return () => {
    router.stop();
    scope.dispose();
    root.replaceChildren();
  };
}
