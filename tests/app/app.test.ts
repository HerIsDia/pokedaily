import { IDBFactory } from 'fake-indexeddb';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { boot } from '../../src/app/boot';
import type { PokemonEntry } from '../../src/core/model';
import { createI18n } from '../../src/i18n';
import { openGameDb } from '../../src/storage/db';

const preview: PokemonEntry = {
  id: 25,
  natureKey: 'jolly',
  level: 42,
  isShiny: false,
  day: '2000-01-01', // `boot` le ramène au jour d'aujourd'hui
  rename: '',
};

describe('application', () => {
  let stop: (() => void) | undefined;
  let root: HTMLElement;

  beforeEach(() => {
    window.location.hash = '';
    document.body.replaceChildren();
    root = document.createElement('div');
    document.body.append(root);
  });
  afterEach(() => {
    stop?.();
    stop = undefined;
  });

  const start = async (lang: 'fr' | 'en' = 'fr') => {
    const i18n = createI18n(lang);
    const booted = await boot(root, { i18n, preview, indexedDB: null });
    stop = booted.stop;
    return { i18n, ...booted };
  };

  it('monte la carte du jour par défaut et met à jour <html lang>', async () => {
    const { i18n } = await start();
    expect(root.querySelector('.card-name')?.textContent).toBe('Pikachu');
    expect(document.documentElement.lang).toBe('fr');
    i18n.setLang('en');
    expect(document.documentElement.lang).toBe('en');
  });

  it('les boutons de langue changent la langue sans recharger la page', async () => {
    await start();
    const en = root.querySelector<HTMLButtonElement>('.lang-btn[lang="en"]')!;
    expect(en.getAttribute('aria-pressed')).toBe('false');
    en.click();
    expect(en.getAttribute('aria-pressed')).toBe('true');
    expect(root.querySelector('.nav-link')?.textContent).toBe('Pokémon of the day');
  });

  it('navigue vers « À propos » et revient (hashchange)', async () => {
    await start();
    window.location.hash = '#/about';
    window.dispatchEvent(new Event('hashchange'));
    expect(root.querySelector('.about-page')).not.toBeNull();
    expect(root.querySelector('.card')).toBeNull();
    expect(root.querySelector('[aria-current="page"]')?.textContent).toBe('À propos');
    expect(root.querySelector('.about-version')?.textContent).toMatch(/^Version \d/);
    expect(root.querySelector('.backup-panel')).not.toBeNull();

    window.location.hash = '';
    window.dispatchEvent(new Event('hashchange'));
    expect(root.querySelector('.card')).not.toBeNull();
  });

  it('se démonte proprement', async () => {
    await start();
    stop?.();
    stop = undefined;
    expect(root.children).toHaveLength(0);
  });

  it("un surnom donné sur la carte est pris en compte par l'état du jeu", async () => {
    const { game } = await start();
    root.querySelector<HTMLButtonElement>('.rename-btn')!.click();
    const input = root.querySelector<HTMLInputElement>('.name-input')!;
    input.value = 'Sparky';
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));
    await vi.waitFor(() => expect(game.today.get()?.rename).toBe('Sparky'));
    expect(root.querySelector('.card-name')?.textContent).toBe('Sparky');
  });
});

describe('démarrage', () => {
  let root: HTMLElement;
  let stop: (() => void) | undefined;
  beforeEach(() => {
    window.location.hash = '';
    document.body.replaceChildren();
    root = document.createElement('div');
    document.body.append(root);
  });
  afterEach(() => {
    stop?.();
    stop = undefined;
  });

  it('tire un vrai Pokémon du jour, le garde au 2ᵉ lancement, et nettoie la v3.1 une fois prêt', async () => {
    const indexedDB = new IDBFactory();
    const cleanup = vi.fn(() => Promise.resolve());

    const first = await boot(root, { i18n: createI18n('fr'), indexedDB, preview: null, cleanup });
    const pokemon = first.game.today.get();
    expect(pokemon).not.toBeNull();
    expect(root.querySelector('.card')).not.toBeNull();
    expect(root.querySelector('.notice-volatile')?.hasAttribute('hidden')).toBe(true);
    expect(cleanup).toHaveBeenCalledTimes(1);
    first.stop();

    const second = await boot(root, { i18n: createI18n('fr'), indexedDB, preview: null, cleanup });
    stop = second.stop;
    expect(second.game.today.get()).toEqual(pokemon);
  });

  it("sans IndexedDB : on joue quand même, le bandeau l'explique, la v3.1 n'est PAS supprimée", async () => {
    const cleanup = vi.fn(() => Promise.resolve());
    const booted = await boot(root, {
      i18n: createI18n('fr'),
      indexedDB: null,
      preview: null,
      cleanup,
    });
    stop = booted.stop;
    expect(booted.game.persistent).toBe(false);
    expect(root.querySelector('.card')).not.toBeNull();
    expect(root.querySelector('.notice-volatile')?.hasAttribute('hidden')).toBe(false);
    expect(cleanup).not.toHaveBeenCalled();
  });

  it("l'aperçu de développement ne touche ni à la base ni à la v3.1", async () => {
    const indexedDB = new IDBFactory();
    const cleanup = vi.fn(() => Promise.resolve());
    const booted = await boot(root, { i18n: createI18n('fr'), indexedDB, preview, cleanup });
    stop = booted.stop;
    expect(cleanup).not.toHaveBeenCalled();
    expect(await indexedDB.databases()).toEqual([]);
  });

  it("une sauvegarde plus récente que l'application affiche une explication, pas une carte", async () => {
    const indexedDB = new IDBFactory();
    const db = await openGameDb(indexedDB);
    await new Promise<void>((resolve) => {
      const tx = db.transaction(['meta'], 'readwrite');
      tx.objectStore('meta').put({ key: 'schema', value: 99 });
      tx.oncomplete = () => resolve();
    });
    db.close();
    const cleanup = vi.fn(() => Promise.resolve());
    const booted = await boot(root, { i18n: createI18n('fr'), indexedDB, preview: null, cleanup });
    stop = booted.stop;
    expect(root.querySelector('.card')).toBeNull();
    expect(root.querySelector('.home-message')?.textContent).toContain('plus récente');
    expect(cleanup).not.toHaveBeenCalled();
  });
});
