import { LANGS, type I18n, type Lang } from '../i18n';
import { bindAttr, bindText, effect, h } from '../ui/dom';
import { createRouter, type Route } from '../ui/router';
import { Scope } from '../ui/scope';
import { createHistoryView } from '../features/history/history';
import { createHomeView } from '../features/home/home';
import { createPokedexView } from '../features/pokedex/pokedex';
import type { Game } from '../state/game';
import { createKitView } from '../features/kit/kit';
import { createRouletteView } from '../features/kit/roulette';
import { createTeamView } from '../features/kit/team';
import { createStatsView } from '../features/stats/stats-view';
import { createAboutView } from './about';
import { icon, type IconName } from './icons';

export interface AppDeps {
  i18n: I18n;
  game: Game;
}

/** Monte l'application dans `root` et renvoie une fonction pour tout démonter. */
export function mountApp(root: HTMLElement, { i18n, game }: AppDeps): () => void {
  const scope = new Scope();
  const { t, lang, setLang } = i18n;

  // <html lang="…"> suit la langue choisie (corrige le `lang="fr"` figé de la v3).
  effect(scope, [lang], () => {
    document.documentElement.lang = lang.get();
  });

  const outlet = h('main', { class: 'app-main' });
  const routes: Route[] = [
    { path: '', view: createHomeView({ i18n, game }) },
    { path: 'history', view: createHistoryView({ i18n, game }) },
    { path: 'pokedex', view: createPokedexView({ i18n, game }) },
    { path: 'stats', view: createStatsView({ i18n, game }) },
    { path: 'kit', view: createKitView({ i18n, game }) },
    { path: 'kit/roulette', view: createRouletteView({ i18n, game }) },
    { path: 'kit/team', view: createTeamView({ i18n, game }) },
    { path: 'about', view: createAboutView({ i18n, game }) },
  ];
  const router = createRouter(outlet, routes, { fallback: '' });

  /** Un lien du menu : `aria-current="page"` quand on est dessus. */
  const link = (
    path: string,
    name: IconName,
    label: () => string,
    className: string,
    /** Les écrans qui comptent comme « dans cette rubrique » (ex. kit/roulette pour kit). */
    isCurrent: (route: string) => boolean = (route) => route === path,
  ) => {
    const text = h('span', { class: 'nav-label' }, bindText(scope, [lang], label));
    const a = h('a', { class: className, href: `#/${path}` }, icon(name), text);
    bindAttr(scope, a, 'aria-label', [lang], label);
    bindAttr(scope, a, 'aria-current', [router.current], () =>
      isCurrent(router.current.get()) ? 'page' : undefined,
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
    link('about', 'about', () => t('nav.about'), 'header-link'),
    h('div', { class: 'lang-switch', role: 'group' }, ...LANGS.map(langButton)),
  );
  bindAttr(scope, header.querySelector('.lang-switch')!, 'aria-label', [lang], () =>
    t('lang.label'),
  );

  // Menu du bas, avec le pouce : les écrans principaux.
  const tabBar = h(
    'nav',
    { class: 'tab-bar' },
    link('', 'card', () => t('nav.card'), 'nav-link'),
    link('history', 'history', () => t('nav.history'), 'nav-link'),
    link('pokedex', 'pokedex', () => t('nav.pokedex'), 'nav-link'),
    link('stats', 'stats', () => t('nav.stats'), 'nav-link'),
    link(
      'kit',
      'kit',
      () => t('nav.kit'),
      'nav-link',
      (route) => route === 'kit' || route.startsWith('kit/'),
    ),
  );
  bindAttr(scope, tabBar, 'aria-label', [lang], () => t('nav.main'));

  const shell = h('div', { class: 'app-shell' }, header, outlet, tabBar);
  root.replaceChildren(shell);
  router.start();

  return () => {
    router.stop();
    scope.dispose();
    root.replaceChildren();
  };
}
