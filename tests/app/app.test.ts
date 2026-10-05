import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { mountApp } from '../../src/app/app';
import { createI18n } from '../../src/i18n';

describe('application', () => {
  let unmount: () => void;
  let root: HTMLElement;

  beforeEach(() => {
    window.location.hash = '';
    document.body.replaceChildren();
    root = document.createElement('div');
    document.body.append(root);
  });
  afterEach(() => unmount?.());

  it('monte la carte du jour par défaut et met à jour <html lang>', () => {
    const i18n = createI18n('fr');
    unmount = mountApp(root, { i18n });
    expect(root.querySelector('.card-name')?.textContent).toBe('Pikachu');
    expect(document.documentElement.lang).toBe('fr');
    i18n.setLang('en');
    expect(document.documentElement.lang).toBe('en');
  });

  it('les boutons de langue changent la langue sans recharger la page', () => {
    unmount = mountApp(root, { i18n: createI18n('fr') });
    const en = root.querySelector<HTMLButtonElement>('.lang-btn[lang="en"]')!;
    expect(en.getAttribute('aria-pressed')).toBe('false');
    en.click();
    expect(en.getAttribute('aria-pressed')).toBe('true');
    expect(root.querySelector('.nav-link')?.textContent).toBe('Pokémon of the day');
  });

  it('navigue vers « À propos » et revient (hashchange)', () => {
    unmount = mountApp(root, { i18n: createI18n('fr') });
    window.location.hash = '#/about';
    window.dispatchEvent(new Event('hashchange'));
    expect(root.querySelector('.about-page')).not.toBeNull();
    expect(root.querySelector('.card')).toBeNull();
    expect(root.querySelector('[aria-current="page"]')?.textContent).toBe('À propos');
    expect(root.querySelector('.about-version')?.textContent).toMatch(/^Version \d/);

    window.location.hash = '';
    window.dispatchEvent(new Event('hashchange'));
    expect(root.querySelector('.card')).not.toBeNull();
  });

  it('se démonte proprement', () => {
    unmount = mountApp(root, { i18n: createI18n('fr') });
    unmount();
    expect(root.children).toHaveLength(0);
  });
});
