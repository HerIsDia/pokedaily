import { beforeEach, describe, expect, it } from 'vitest';
import { mountApp } from '../../src/app/app';
import { emptyGameState } from '../../src/core/game-state';
import { stateLookup } from '../../src/data/lookup';
import { drawPool } from '../../src/data/pool';
import { createTypeTheme } from '../../src/features/theme/type-theme';
import { createI18n } from '../../src/i18n';
import { createGame } from '../../src/state/game';
import { createMemoryRepository } from '../../src/storage/memory';

function memoryStorage(initial: Record<string, string> = {}) {
  const data = { ...initial };
  return {
    data,
    getItem: (k: string) => data[k] ?? null,
    setItem: (k: string, v: string) => void (data[k] = v),
  };
}

describe('réglage du thème', () => {
  it('activé par défaut, mémorisé quand on le change', () => {
    const storage = memoryStorage();
    const theme = createTypeTheme(storage);
    expect(theme.enabled.get()).toBe(true);
    theme.enabled.set(false);
    expect(storage.data['pokedaily.typeTheme']).toBe('off');
    expect(createTypeTheme(storage).enabled.get()).toBe(false);
    theme.enabled.set(true);
    expect(createTypeTheme(storage).enabled.get()).toBe(true);
  });

  it('un stockage qui plante ne casse rien', () => {
    const broken = {
      getItem: () => {
        throw new Error('bloqué');
      },
      setItem: () => {
        throw new Error('bloqué');
      },
    };
    const theme = createTypeTheme(broken);
    expect(theme.enabled.get()).toBe(true);
    expect(() => theme.enabled.set(false)).not.toThrow();
    expect(createTypeTheme(null).enabled.get()).toBe(true);
  });
});

describe('thème selon le type du jour', () => {
  beforeEach(() => document.body.replaceChildren());

  async function mount(theme = createTypeTheme(memoryStorage())) {
    const root = document.createElement('div');
    document.body.append(root);
    const game = createGame({
      repository: createMemoryRepository({
        ...emptyGameState(),
        lastDrawDay: '2026-05-20',
        entries: {
          '2026-05-20': {
            id: 25, // Pikachu : électrique
            natureKey: 'jolly',
            level: 5,
            isShiny: false,
            day: '2026-05-20',
            rename: '',
          },
        },
      }),
      pool: drawPool,
      events: [],
      lookup: stateLookup,
      now: () => new Date(2026, 4, 20, 10),
    });
    await game.start();
    mountApp(root, { i18n: createI18n('fr'), game, theme });
    return { root, game, theme };
  }

  it('pose le type du Pokémon du jour sur la coquille', async () => {
    const { root } = await mount();
    expect(root.querySelector('.app-shell')?.getAttribute('data-type')).toBe('electric');
  });

  it('se désactive et se réactive depuis « À propos »', async () => {
    const { root, theme } = await mount();
    window.location.hash = '#/about';
    window.dispatchEvent(new Event('hashchange'));
    const checkbox = root.querySelector<HTMLInputElement>('.theme-toggle input')!;
    expect(checkbox.checked).toBe(true);
    checkbox.checked = false;
    checkbox.dispatchEvent(new Event('change'));
    expect(theme.enabled.get()).toBe(false);
    expect(root.querySelector('.app-shell')?.hasAttribute('data-type')).toBe(false);
    checkbox.checked = true;
    checkbox.dispatchEvent(new Event('change'));
    expect(root.querySelector('.app-shell')?.getAttribute('data-type')).toBe('electric');
    window.location.hash = '';
  });

  it('changer de Pokémon du jour change le thème', async () => {
    const { root, game } = await mount();
    await game.devApply((s) => ({
      ...s,
      entries: { ...s.entries, '2026-05-20': { ...s.entries['2026-05-20']!, id: 7 } }, // Carapuce
    }));
    expect(root.querySelector('.app-shell')?.getAttribute('data-type')).toBe('water');
  });
});
