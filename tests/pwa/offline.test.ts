import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createOfflinePanel } from '../../src/features/offline/offline-panel';
import { createI18n } from '../../src/i18n';
import type { DownloadResult } from '../../src/pwa/offline-images';
import { SPRITE_CACHE } from '../../src/pwa/constants';
import {
  allSpriteUrls,
  clearCachedSprites,
  countCachedSprites,
  downloadSprites,
} from '../../src/pwa/offline-images';
import { requestPersistence } from '../../src/pwa/persist';
import { Scope } from '../../src/ui/scope';

/** Un faux « CacheStorage » en mémoire. */
function fakeCaches() {
  const store = new Map<string, Map<string, Response>>();
  const open = (name: string) => {
    if (!store.has(name)) store.set(name, new Map());
    const m = store.get(name)!;
    return Promise.resolve({
      match: (url: string) => Promise.resolve(m.get(url)),
      put: (url: string, r: Response) => Promise.resolve(void m.set(url, r)),
      keys: () => Promise.resolve([...m.keys()].map((u) => ({ url: u }) as Request)),
    });
  };
  return {
    store,
    caches: {
      open,
      delete: (name: string) => Promise.resolve(store.delete(name)),
    } as unknown as CacheStorage,
  };
}
const ok = () => Promise.resolve(new Response('img', { status: 200 }));

describe('liste des images à télécharger', () => {
  it('toutes les images qui existent, sans doublon, aux deux tailles', () => {
    const small = allSpriteUrls(128);
    const large = allSpriteUrls(512);
    expect(new Set(small).size).toBe(small.length);
    expect(small.length).toBe(large.length);
    expect(small.length).toBeGreaterThan(2500); // ≈ 2 679 par taille
    expect(small.every((u) => u.startsWith('/sprites/128/'))).toBe(true);
    expect(small).toContain('/sprites/128/25.webp');
    expect(small).toContain('/sprites/128/25s.webp');
    // une forme sans image (#10266) n'est jamais demandée ; un shiny absent n'est pas dupliqué
    expect(small.some((u) => u.endsWith('/10266.webp'))).toBe(false);
    expect(small.some((u) => u.endsWith('/10094s.webp'))).toBe(false);
  });
});

describe('téléchargement hors-ligne', () => {
  it('met tout dans le cache des images, avec la progression', async () => {
    const { caches, store } = fakeCaches();
    const fetchImpl = vi.fn(ok) as unknown as typeof fetch;
    const progress: number[] = [];
    const result = await downloadSprites(128, {
      caches,
      fetchImpl,
      onProgress: (done) => progress.push(done),
    });
    const total = allSpriteUrls(128).length;
    expect(result).toEqual({ downloaded: total, skipped: 0, failed: 0, cancelled: false });
    expect(store.get(SPRITE_CACHE)?.size).toBe(total);
    expect(progress.at(-1)).toBe(total);
    expect(await countCachedSprites(caches)).toBe(total);
  });

  it('ne retélécharge pas ce qui est déjà là', async () => {
    const { caches } = fakeCaches();
    const fetchImpl = vi.fn(ok) as unknown as typeof fetch;
    await downloadSprites(128, { caches, fetchImpl });
    const second = vi.fn(ok) as unknown as typeof fetch;
    const result = await downloadSprites(128, { caches, fetchImpl: second });
    expect(second).not.toHaveBeenCalled();
    expect(result.skipped).toBe(allSpriteUrls(128).length);
  });

  it('compte les échecs sans s’arrêter, et ne garde jamais une réponse en erreur', async () => {
    const { caches, store } = fakeCaches();
    let n = 0;
    const fetchImpl = (() =>
      ++n % 10 === 0 ? Promise.resolve(new Response('', { status: 404 })) : ok()) as typeof fetch;
    const result = await downloadSprites(128, { caches, fetchImpl });
    expect(result.failed).toBeGreaterThan(100);
    expect(store.get(SPRITE_CACHE)?.size).toBe(result.downloaded);
    const failing = (() => Promise.reject(new Error('réseau'))) as typeof fetch;
    const r2 = await downloadSprites(512, { caches: fakeCaches().caches, fetchImpl: failing });
    expect(r2.failed).toBe(allSpriteUrls(512).length);
  });

  it('peut être annulé : ce qui est déjà reçu reste en cache', async () => {
    const { caches, store } = fakeCaches();
    const controller = new AbortController();
    let count = 0;
    const fetchImpl = (() => {
      if (++count === 50) controller.abort();
      return ok();
    }) as typeof fetch;
    const result = await downloadSprites(128, { caches, fetchImpl, signal: controller.signal });
    expect(result.cancelled).toBe(true);
    expect(store.get(SPRITE_CACHE)!.size).toBeGreaterThanOrEqual(40);
    expect(store.get(SPRITE_CACHE)!.size).toBeLessThan(allSpriteUrls(128).length);
  });

  it('libérer l’espace supprime le cache', async () => {
    const { caches, store } = fakeCaches();
    await downloadSprites(128, { caches, fetchImpl: vi.fn(ok) as unknown as typeof fetch });
    await clearCachedSprites(caches);
    expect(store.has(SPRITE_CACHE)).toBe(false);
  });
});

describe('protection contre l’effacement', () => {
  const storage = (persisted: boolean, grant: boolean) => ({
    persisted: vi.fn(() => Promise.resolve(persisted)),
    persist: vi.fn(() => Promise.resolve(grant)),
  });

  it('dans un simple onglet : on ne demande rien', async () => {
    const s = storage(false, true);
    expect(await requestPersistence({ isInstalled: () => false, storage: s })).toBeNull();
    expect(s.persist).not.toHaveBeenCalled();
  });

  it('application installée : on demande, une seule fois', async () => {
    const s = storage(false, true);
    expect(await requestPersistence({ isInstalled: () => true, storage: s })).toBe(true);
    const already = storage(true, false);
    expect(await requestPersistence({ isInstalled: () => true, storage: already })).toBe(true);
    expect(already.persist).not.toHaveBeenCalled();
  });

  it('refus ou erreur : jamais d’exception', async () => {
    expect(
      await requestPersistence({ isInstalled: () => true, storage: storage(false, false) }),
    ).toBe(false);
    const broken = {
      persisted: () => Promise.reject(new Error('x')),
      persist: () => Promise.reject(new Error('x')),
    };
    expect(await requestPersistence({ isInstalled: () => true, storage: broken })).toBe(false);
    expect(await requestPersistence({ isInstalled: () => true })).toBeNull();
  });
});

describe('bloc « Hors-ligne » de la page À propos', () => {
  beforeEach(() => document.body.replaceChildren());

  function mount(
    over: Partial<NonNullable<Parameters<typeof createOfflinePanel>[0]['api']>> = {},
    confirm = () => true,
  ) {
    const api = {
      available: () => true,
      count: vi.fn(() => Promise.resolve(7)),
      download: vi.fn(() =>
        Promise.resolve({ downloaded: 3, skipped: 0, failed: 0, cancelled: false }),
      ),
      clear: vi.fn(() => Promise.resolve()),
      ...over,
    };
    const root = createOfflinePanel({
      i18n: createI18n('fr'),
      scope: new Scope(),
      api,
      confirmAction: confirm,
    });
    document.body.append(root);
    return { root, api };
  }
  const buttons = (root: HTMLElement) => [...root.querySelectorAll<HTMLButtonElement>('button')];

  it('affiche le nombre d’images gardées et les tailles proposées', async () => {
    const { root } = mount();
    await vi.waitFor(() =>
      expect(root.querySelector('.offline-status')?.textContent).toBe(
        'Images gardées sur cet appareil : 7',
      ),
    );
    expect(buttons(root).map((b) => b.textContent)).toEqual([
      'Miniatures (≈ 13 Mo)',
      'Grandes images (≈ 47 Mo)',
      'Annuler',
      "Libérer l'espace",
    ]);
    expect(buttons(root)[2]!.hidden).toBe(true); // « Annuler » seulement pendant un téléchargement
  });

  it('un téléchargement : progression, boutons bloqués, message final, compteur relu', async () => {
    let finish: (r: {
      downloaded: number;
      skipped: number;
      failed: number;
      cancelled: boolean;
    }) => void = () => {};
    let report: (d: number, t: number) => void = () => {};
    const { root, api } = mount({
      download: vi.fn((_size, onProgress) => {
        report = onProgress;
        return new Promise<DownloadResult>((resolve) => (finish = resolve));
      }),
    });
    buttons(root)[0]!.click();
    await vi.waitFor(() => expect(api.download).toHaveBeenCalled());
    report(10, 40);
    await vi.waitFor(() =>
      expect(root.querySelector('.offline-status')?.textContent).toBe('Téléchargement : 10 / 40'),
    );
    expect(buttons(root)[0]!.disabled).toBe(true);
    expect(buttons(root)[2]!.hidden).toBe(false);
    expect(root.querySelector<HTMLProgressElement>('progress')!.value).toBe(10);
    finish({ downloaded: 40, skipped: 0, failed: 0, cancelled: false });
    await vi.waitFor(() =>
      expect(root.querySelector('.offline-status')?.textContent).toBe('✓ Images téléchargées.'),
    );
    expect(buttons(root)[0]!.disabled).toBe(false);
    expect(api.count).toHaveBeenCalledTimes(2);
  });

  it('annulation et échecs sont expliqués', async () => {
    const a = mount({
      download: vi.fn(() =>
        Promise.resolve({ downloaded: 1, skipped: 0, failed: 0, cancelled: true }),
      ),
    });
    buttons(a.root)[0]!.click();
    await vi.waitFor(() =>
      expect(a.root.querySelector('.offline-status')?.textContent).toContain('annulé'),
    );
    const b = mount({
      download: vi.fn(() =>
        Promise.resolve({ downloaded: 1, skipped: 0, failed: 12, cancelled: false }),
      ),
    });
    buttons(b.root)[1]!.click();
    await vi.waitFor(() =>
      expect(b.root.querySelector('.offline-status')?.textContent).toContain('12 images'),
    );
    const c = mount({ download: vi.fn(() => Promise.reject(new Error('x'))) });
    buttons(c.root)[0]!.click();
    await vi.waitFor(() =>
      expect(c.root.querySelector('.offline-status')?.textContent).toContain('a échoué'),
    );
  });

  it('libérer l’espace : demande confirmation', async () => {
    const no = mount({}, () => false);
    buttons(no.root)[3]!.click();
    expect(no.api.clear).not.toHaveBeenCalled();
    const yes = mount();
    buttons(yes.root)[3]!.click();
    await vi.waitFor(() => expect(yes.api.clear).toHaveBeenCalled());
    await vi.waitFor(() =>
      expect(yes.root.querySelector('.offline-status')?.textContent).toBe('✓ Espace libéré.'),
    );
  });

  it('navigateur sans cache : message clair, aucun bouton', () => {
    const { root } = mount({ available: () => false });
    expect(root.querySelector('button')).toBeNull();
    expect(root.textContent).toContain('ne permet pas');
  });
});
