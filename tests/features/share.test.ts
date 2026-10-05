import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { PokemonEntry } from '../../src/core/model';
import {
  copyImage,
  createShareActions,
  shareImage,
  type ShareEnv,
} from '../../src/features/card/share-actions';
import {
  buildCardImageSpec,
  drawCardImage,
  formatDay,
  IMAGE_HEIGHT,
  IMAGE_WIDTH,
} from '../../src/features/card/share-image';
import { createI18n } from '../../src/i18n';
import { Scope } from '../../src/ui/scope';
import { createStore } from '../../src/ui/store';

const entry: PokemonEntry = {
  id: 25,
  natureKey: 'jolly',
  level: 42,
  isShiny: true,
  day: '2026-05-01',
  rename: 'Sparky',
};

describe('contenu de l’image', () => {
  it('reprend nom, surnom, types, niveau, nature, date et signale le shiny (FR)', () => {
    const spec = buildCardImageSpec(entry, createI18n('fr'), '#f7d02c');
    expect(spec).toMatchObject({
      number: 'N°0025',
      name: 'Sparky',
      originalName: 'Pikachu',
      typeLabels: ['Électrik'],
      shinyLabel: '✦ Shiny',
      levelLabel: 'NIV.',
      level: '42',
      natureLabel: 'NATURE',
      nature: 'Jovial',
      date: 'Vendredi 1 mai',
      color: '#f7d02c',
      footer: 'pokedaily.vercel.app',
    });
    expect(spec.imageUrl).toMatch(/\/sprites\/512\/25s\.webp$/);
  });

  it('en anglais, sans surnom ni shiny', () => {
    const spec = buildCardImageSpec({ ...entry, rename: '', isShiny: false }, createI18n('en'));
    expect(spec.name).toBe('Pikachu');
    expect(spec.originalName).toBeNull();
    expect(spec.shinyLabel).toBeNull();
    expect(spec.typeLabels).toEqual(['Electric']);
    expect(spec.date).toBe('Friday, May 1');
    expect(spec.imageUrl).toMatch(/\/sprites\/512\/25\.webp$/);
  });

  it('une forme garde le numéro de son espèce et tous ses types', () => {
    const spec = buildCardImageSpec({ ...entry, id: 10034, rename: '' }, createI18n('fr'));
    expect(spec.number).toBe('N°0006');
    expect(spec.typeLabels.length).toBe(2);
  });

  it('formatDay met la majuscule', () => {
    expect(formatDay('2026-05-02', 'fr-FR')).toBe('Samedi 2 mai');
  });
});

/** Un faux contexte 2D qui note ce qu'on lui demande de dessiner. */
function fakeCtx() {
  const texts: string[] = [];
  const calls: string[] = [];
  const gradient = { addColorStop: vi.fn() };
  const ctx = new Proxy(
    {
      measureText: (text: string) => ({ width: text.length * 7 }),
      createLinearGradient: () => gradient,
      createRadialGradient: () => gradient,
      fillText: (text: string) => texts.push(text),
      drawImage: () => calls.push('drawImage'),
    } as Record<string, unknown>,
    {
      get(target, prop: string) {
        if (prop in target) return target[prop];
        return () => undefined; // beginPath, fill, stroke, roundRect…
      },
      set() {
        return true;
      },
    },
  );
  return { ctx: ctx as unknown as CanvasRenderingContext2D, texts, calls };
}

describe('dessin', () => {
  it('écrit tous les textes et place l’illustration', () => {
    const { ctx, texts, calls } = fakeCtx();
    drawCardImage(ctx, buildCardImageSpec(entry, createI18n('fr')), {} as CanvasImageSource);
    expect(texts).toEqual(
      expect.arrayContaining([
        'N°0025',
        'ÉLECTRIK',
        '✦ Shiny',
        'Sparky',
        'Pikachu',
        'NIV.',
        '42',
        'NATURE',
        'Jovial',
        'Vendredi 1 mai',
        'Pokédaily',
        'pokedaily.vercel.app',
      ]),
    );
    expect(calls).toContain('drawImage');
  });

  it('sans illustration : repère « ? », pas d’erreur', () => {
    const { ctx, texts, calls } = fakeCtx();
    drawCardImage(ctx, buildCardImageSpec(entry, createI18n('fr')), null);
    expect(texts).toContain('?');
    expect(calls).not.toContain('drawImage');
  });

  it('a des dimensions de carte (portrait)', () => {
    expect(IMAGE_HEIGHT).toBeGreaterThan(IMAGE_WIDTH);
  });
});

function env(over: Partial<ShareEnv> = {}): ShareEnv & { downloads: string[] } {
  const downloads: string[] = [];
  return {
    supportsShare: () => true,
    canShareFiles: () => true,
    share: () => Promise.resolve(),
    canCopyImage: () => true,
    copyImage: () => Promise.resolve(),
    download: (name) => void downloads.push(name),
    downloads,
    ...over,
  };
}
const blob = new Blob(['x'], { type: 'image/png' });
const text = { title: 't', text: 'x' };

describe('partager / copier', () => {
  it('partage le fichier quand le navigateur sait faire', async () => {
    const share = vi.fn(() => Promise.resolve());
    const e = env({ share });
    expect(await shareImage(blob, 'a.png', text, e)).toBe('shared');
    expect(share).toHaveBeenCalledTimes(1);
    expect(e.downloads).toEqual([]);
  });

  it('télécharge quand le partage de fichiers est impossible', async () => {
    const e = env({ canShareFiles: () => false });
    expect(await shareImage(blob, 'a.png', text, e)).toBe('downloaded');
    expect(e.downloads).toEqual(['a.png']);
  });

  it('annuler le partage n’est pas une erreur', async () => {
    const e = env({ share: () => Promise.reject(new DOMException('annulé', 'AbortError')) });
    expect(await shareImage(blob, 'a.png', text, e)).toBe('cancelled');
  });

  it('une vraie erreur de partage est signalée', async () => {
    const e = env({ share: () => Promise.reject(new Error('boum')) });
    expect(await shareImage(blob, 'a.png', text, e)).toBe('failed');
  });

  it('copie, ou télécharge à défaut, ou signale l’échec', async () => {
    expect(await copyImage(blob, 'a.png', env())).toBe('copied');
    const noCopy = env({ canCopyImage: () => false });
    expect(await copyImage(blob, 'a.png', noCopy)).toBe('downloaded');
    expect(noCopy.downloads).toEqual(['a.png']);
    const denied = env({ copyImage: () => Promise.reject(new Error('refusé')) });
    expect(await copyImage(blob, 'a.png', denied)).toBe('failed');
  });
});

describe('boutons sous la carte', () => {
  beforeEach(() => document.body.replaceChildren());

  function mount(e: ShareEnv, render = () => Promise.resolve(blob)) {
    const i18n = createI18n('fr');
    const root = createShareActions({
      i18n,
      entry: createStore(entry),
      scope: new Scope(),
      env: e,
      render,
    });
    document.body.append(root);
    return { root, i18n };
  }
  const labels = (root: HTMLElement) =>
    [...root.querySelectorAll('button')].map((b) => b.textContent);

  it('affiche Partager, Copier, Télécharger quand tout est possible', () => {
    expect(labels(mount(env()).root)).toEqual(['Partager', 'Copier', 'Télécharger']);
  });

  it('cache ce que le navigateur ne sait pas faire', () => {
    const e = env({ supportsShare: () => false, canCopyImage: () => false });
    expect(labels(mount(e).root)).toEqual(['Télécharger']);
  });

  it('télécharger : nomme le fichier avec le jour et confirme', async () => {
    const e = env();
    const { root } = mount(e);
    root.querySelectorAll('button')[2]!.click();
    await vi.waitFor(() => expect(e.downloads).toEqual(['pokedaily-2026-05-01.png']));
    await vi.waitFor(() =>
      expect(root.querySelector('.share-status')?.textContent).toBe('✓ Image téléchargée'),
    );
  });

  it('copier : confirme ; les boutons sont bloqués pendant le travail', async () => {
    let release: (b: Blob) => void = () => {};
    const render = () => new Promise<Blob>((r) => (release = r));
    const { root } = mount(env(), render);
    const copy = root.querySelectorAll('button')[1]!;
    copy.click();
    await vi.waitFor(() => expect(copy.disabled).toBe(true));
    release(blob);
    await vi.waitFor(() => expect(copy.disabled).toBe(false));
    expect(root.querySelector('.share-status')?.textContent).toBe('✓ Image copiée');
  });

  it('une image qui ne peut pas être créée affiche une erreur claire', async () => {
    const { root } = mount(env(), () => Promise.reject(new Error('canvas')));
    root.querySelectorAll('button')[2]!.click();
    await vi.waitFor(() =>
      expect(root.querySelector('.share-status')?.textContent).toContain('pas pu être créée'),
    );
  });
});
