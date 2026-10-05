import { Scope } from './scope';
import { createStore, type ReadStore } from './store';

export interface ViewContext {
  /** Nettoyage automatique quand on quitte la vue. */
  scope: Scope;
}

export type View = (context: ViewContext) => HTMLElement;

export interface Route {
  path: string;
  view: View;
}

export interface Router {
  current: ReadStore<string>;
  start(): void;
  stop(): void;
  navigate(path: string): void;
}

/** `#/stats` → `stats` ; `` ou `#` ou `#/` → ``. */
export function parseHash(hash: string): string {
  return hash.replace(/^#\/?/, '');
}

/**
 * Routage par `location.hash`, AVEC écoute de `hashchange`
 * (le bouton « retour » du navigateur change bien d'écran : bug B-6 de la v3).
 */
export function createRouter(
  outlet: HTMLElement,
  routes: readonly Route[],
  options: { fallback: string },
): Router {
  const current = createStore<string>('');
  let scope: Scope | null = null;
  let started = false;

  function resolve(path: string): Route {
    const route =
      routes.find((r) => r.path === path) ?? routes.find((r) => r.path === options.fallback);
    if (!route) throw new Error(`Route de repli « ${options.fallback} » introuvable.`);
    return route;
  }

  function render(): void {
    const route = resolve(parseHash(window.location.hash));
    if (started && scope && current.get() === route.path) return;
    scope?.dispose();
    scope = new Scope();
    outlet.replaceChildren(route.view({ scope }));
    outlet.scrollTop = 0;
    current.set(route.path);
  }

  const onHashChange = (): void => render();

  return {
    current,
    start() {
      if (started) return;
      started = true;
      window.addEventListener('hashchange', onHashChange);
      render();
    },
    stop() {
      if (!started) return;
      started = false;
      window.removeEventListener('hashchange', onHashChange);
      scope?.dispose();
      scope = null;
    },
    navigate(path) {
      const target = `#/${path}`;
      if (window.location.hash === target) return;
      window.location.hash = target;
      // Certains environnements n'émettent `hashchange` qu'en différé : on rend tout de suite.
      render();
    },
  };
}
