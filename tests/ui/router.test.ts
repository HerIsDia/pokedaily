import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createRouter, parseHash, type Route } from '../../src/ui/router';
import { h } from '../../src/ui/dom';

function setup() {
  const disposed: string[] = [];
  const outlet = h('main');
  const mk = (path: string): Route => ({
    path,
    view: ({ scope }) => {
      scope.add(() => disposed.push(path));
      return h('div', { class: `view-${path || 'home'}` }, path || 'home');
    },
  });
  const router = createRouter(outlet, [mk(''), mk('about')], { fallback: '' });
  return { outlet, router, disposed };
}

describe('parseHash', () => {
  it.each([
    ['', ''],
    ['#', ''],
    ['#/', ''],
    ['#/about', 'about'],
    ['#about', 'about'],
  ])('%j → %j', (hash, expected) => expect(parseHash(hash)).toBe(expected));
});

describe('createRouter', () => {
  beforeEach(() => {
    window.location.hash = '';
  });
  afterEach(() => vi.restoreAllMocks());

  it("affiche la route d'accueil au démarrage", () => {
    const { outlet, router } = setup();
    router.start();
    expect(outlet.querySelector('.view-home')).not.toBeNull();
    expect(router.current.get()).toBe('');
    router.stop();
  });

  it('réagit à hashchange (bouton « retour » du navigateur : bug B-6 de la v3)', () => {
    const { outlet, router } = setup();
    router.start();
    window.location.hash = '#/about';
    window.dispatchEvent(new Event('hashchange'));
    expect(outlet.querySelector('.view-about')).not.toBeNull();
    expect(router.current.get()).toBe('about');

    window.location.hash = '';
    window.dispatchEvent(new Event('hashchange'));
    expect(outlet.querySelector('.view-home')).not.toBeNull();
    router.stop();
  });

  it('détruit la vue précédente quand on change de route', () => {
    const { router, disposed } = setup();
    router.start();
    router.navigate('about');
    expect(disposed).toEqual(['']);
    router.stop();
    expect(disposed).toEqual(['', 'about']);
  });

  it('utilise la route de repli pour une adresse inconnue', () => {
    window.location.hash = '#/nimportequoi';
    const { outlet, router } = setup();
    router.start();
    expect(outlet.querySelector('.view-home')).not.toBeNull();
    router.stop();
  });

  it('ne re-rend pas si on revient sur la même route', () => {
    const { outlet, router } = setup();
    router.start();
    const first = outlet.firstElementChild;
    window.dispatchEvent(new Event('hashchange'));
    expect(outlet.firstElementChild).toBe(first);
    router.stop();
  });

  it('ne réagit plus après stop()', () => {
    const { outlet, router } = setup();
    router.start();
    router.stop();
    window.location.hash = '#/about';
    window.dispatchEvent(new Event('hashchange'));
    expect(outlet.querySelector('.view-about')).toBeNull();
  });
});
