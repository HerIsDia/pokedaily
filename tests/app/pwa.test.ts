import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mountApp } from '../../src/app/app';
import { emptyGameState } from '../../src/core/game-state';
import { stateLookup } from '../../src/data/lookup';
import { drawPool } from '../../src/data/pool';
import { createI18n } from '../../src/i18n';
import { createUpdater, type WorkboxLike } from '../../src/pwa/register';
import { createGame } from '../../src/state/game';
import { createMemoryRepository } from '../../src/storage/memory';

/** Un faux `workbox-window` qu'on peut piloter à la main. */
function fakeWorkbox() {
  const listeners = new Map<string, () => void>();
  const wb: WorkboxLike & { sent: number; updates: number; registered: number } = {
    sent: 0,
    updates: 0,
    registered: 0,
    addEventListener: (type, listener) => void listeners.set(type, listener),
    register: () => Promise.resolve((wb.registered += 1)),
    messageSkipWaiting: () => void (wb.sent += 1),
    update: () => Promise.resolve(void (wb.updates += 1)),
  };
  return { wb, fire: (type: string) => listeners.get(type)?.() };
}

describe('mise à jour avec confirmation', () => {
  beforeEach(() => vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval'] }));
  afterEach(() => vi.useRealTimers());

  it('rien à proposer tant qu’aucune nouvelle version n’attend', async () => {
    const { wb } = fakeWorkbox();
    const reload = vi.fn();
    const updater = createUpdater(() => Promise.resolve(wb), reload);
    await vi.waitFor(() => expect(wb.registered).toBe(1));
    expect(updater.available.get()).toBe(false);
    expect(reload).not.toHaveBeenCalled();
    updater.stop();
  });

  it('une version qui attend est PROPOSÉE ; rien ne change sans accord', async () => {
    const { wb, fire } = fakeWorkbox();
    const reload = vi.fn();
    const updater = createUpdater(() => Promise.resolve(wb), reload);
    await vi.waitFor(() => expect(wb.registered).toBe(1));
    fire('waiting');
    expect(updater.available.get()).toBe(true);
    expect(wb.sent).toBe(0);
    // un « controlling » sans demande du joueur (autre onglet) ne recharge pas la page
    fire('controlling');
    expect(reload).not.toHaveBeenCalled();
    updater.stop();
  });

  it('« Mettre à jour » : demande l’activation, puis recharge UNE fois', async () => {
    const { wb, fire } = fakeWorkbox();
    const reload = vi.fn();
    const updater = createUpdater(() => Promise.resolve(wb), reload);
    await vi.waitFor(() => expect(wb.registered).toBe(1));
    fire('waiting');
    updater.apply();
    expect(wb.sent).toBe(1);
    fire('controlling');
    expect(reload).toHaveBeenCalledTimes(1);
    updater.stop();
  });

  it('« Plus tard » masque la proposition', async () => {
    const { wb, fire } = fakeWorkbox();
    const updater = createUpdater(() => Promise.resolve(wb), vi.fn());
    await vi.waitFor(() => expect(wb.registered).toBe(1));
    fire('waiting');
    updater.dismiss();
    expect(updater.available.get()).toBe(false);
    updater.stop();
  });

  it('cherche une nouvelle version toutes les heures, puis plus du tout une fois arrêté', async () => {
    const { wb } = fakeWorkbox();
    const updater = createUpdater(() => Promise.resolve(wb), vi.fn());
    await vi.waitFor(() => expect(wb.registered).toBe(1));
    await vi.advanceTimersByTimeAsync(3 * 60 * 60 * 1000 + 1000);
    expect(wb.updates).toBe(3);
    updater.stop();
    await vi.advanceTimersByTimeAsync(2 * 60 * 60 * 1000);
    expect(wb.updates).toBe(3);
  });

  it('un service worker qui ne se charge pas n’empêche pas l’application de fonctionner', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const updater = createUpdater(() => Promise.reject(new Error('non')), vi.fn());
    await vi.waitFor(() => expect(warn).toHaveBeenCalled());
    expect(updater.available.get()).toBe(false);
    expect(() => updater.apply()).not.toThrow();
    updater.stop();
    warn.mockRestore();
  });
});

describe('bandeau de mise à jour', () => {
  it('apparaît quand une version attend, avec Mettre à jour / Plus tard', async () => {
    document.body.replaceChildren();
    const root = document.createElement('div');
    document.body.append(root);
    const { wb, fire } = fakeWorkbox();
    const reload = vi.fn();
    const updater = createUpdater(() => Promise.resolve(wb), reload);
    const game = createGame({
      repository: createMemoryRepository(emptyGameState()),
      pool: drawPool,
      events: [],
      lookup: stateLookup,
    });
    const stop = mountApp(root, { i18n: createI18n('fr'), game, updater });
    const banner = root.querySelector<HTMLElement>('.update-banner')!;
    expect(banner.hidden).toBe(true);
    await vi.waitFor(() => expect(wb.registered).toBe(1));
    fire('waiting');
    expect(banner.hidden).toBe(false);
    expect(banner.textContent).toContain('nouvelle version');
    root.querySelector<HTMLButtonElement>('.update-apply')!.click();
    expect(wb.sent).toBe(1);
    fire('controlling');
    expect(reload).toHaveBeenCalledTimes(1);
    root.querySelector<HTMLButtonElement>('.update-later')!.click();
    expect(banner.hidden).toBe(true);
    updater.stop();
    stop();
  });

  it('absent quand il n’y a pas de mise à jour gérée (développement)', () => {
    document.body.replaceChildren();
    const root = document.createElement('div');
    document.body.append(root);
    const game = createGame({
      repository: createMemoryRepository(emptyGameState()),
      pool: drawPool,
      events: [],
      lookup: stateLookup,
    });
    const stop = mountApp(root, { i18n: createI18n('fr'), game });
    expect(root.querySelector<HTMLElement>('.update-banner')!.hidden).toBe(true);
    stop();
  });
});
