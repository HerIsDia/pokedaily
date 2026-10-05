import { beforeEach, describe, expect, it } from 'vitest';
import { emptyGameState } from '../../src/core/game-state';
import { forms, species } from '../../src/data';
import { stateLookup } from '../../src/data/lookup';
import { drawPool } from '../../src/data/pool';
import { createPokedexView } from '../../src/features/pokedex/pokedex';
import { dexProgress, formCategories } from '../../src/features/pokedex/progress';
import { createI18n } from '../../src/i18n';
import { createGame, type Game } from '../../src/state/game';
import { createMemoryRepository } from '../../src/storage/memory';
import { Scope } from '../../src/ui/scope';

async function makeGame(caught: number[], shiny: number[]): Promise<Game> {
  const game = createGame({
    repository: createMemoryRepository({
      ...emptyGameState(),
      caught,
      caughtShiny: shiny,
      // un jour déjà tiré pour qu'aucun nouveau tirage ne vienne changer la collection
      lastDrawDay: '2999-01-01',
    }),
    pool: drawPool,
    events: [],
    lookup: stateLookup,
    now: () => new Date(2999, 0, 1),
  });
  await game.start();
  return game;
}

describe('progression du Pokédex', () => {
  it('une forme compte pour son espèce ET apparaît dans les formes', () => {
    const megaX = 10034; // Méga-Dracaufeu X
    const p = dexProgress({ caught: [25, megaX], caughtShiny: [megaX] });
    expect([...p.species].sort((a, b) => a - b)).toEqual([6, 25]);
    expect([...p.speciesShiny]).toEqual([6]);
    expect([...p.forms]).toEqual([megaX]);
    expect([...p.formsShiny]).toEqual([megaX]);
  });

  it('collection vide', () => {
    const p = dexProgress({ caught: [], caughtShiny: [] });
    expect(p.species.size + p.speciesShiny.size + p.forms.size + p.formsShiny.size).toBe(0);
  });

  it('les catégories de formes couvrent toutes les formes', () => {
    const cats = formCategories(forms);
    expect(cats.reduce((n, c) => n + c.count, 0)).toBe(forms.length);
    expect(forms).toHaveLength(326);
    expect(species).toHaveLength(1025);
  });
});

describe('écran Pokédex', () => {
  beforeEach(() => document.body.replaceChildren());

  async function mount(caught: number[], shiny: number[], lang: 'fr' | 'en' = 'fr') {
    const game = await makeGame(caught, shiny);
    const i18n = createI18n(lang);
    const root = createPokedexView({ i18n, game })({ scope: new Scope() });
    document.body.append(root);
    return { root, i18n, game };
  }
  const tab = (root: HTMLElement, id: string) =>
    root.querySelector<HTMLButtonElement>(`.tab-${id}`)!;

  it('affiche 1 025 cases, le compteur et la barre', async () => {
    const { root } = await mount([1, 4, 7], []);
    expect(root.querySelectorAll('.grid-cell')).toHaveLength(1025);
    expect(root.querySelectorAll('.grid-cell.caught')).toHaveLength(3);
    expect(root.querySelector('.counter-badge')?.textContent).toBe(
      'Tu as été 3 Pokémon différents',
    );
    expect(root.querySelector('.progress-label')?.textContent).toBe('3 / 1025');
    expect(root.querySelector('.progress-bar')?.getAttribute('aria-valuenow')).toBe('3');
    expect(root.querySelector('.progress-bar')?.getAttribute('aria-valuemax')).toBe('1025');
  });

  it('cache le nom des Pokémon pas encore obtenus (seulement le numéro)', async () => {
    const { root } = await mount([25], []);
    const cells = root.querySelectorAll('.grid-cell');
    expect(cells[24]!.getAttribute('title')).toBe('Pikachu');
    expect(cells[0]!.getAttribute('title')).toBe('N°0001');
  });

  it('Shinydex : vide au départ, puis les shiny obtenus', async () => {
    const { root } = await mount([25, 6], []);
    tab(root, 'shinydex').click();
    expect(root.querySelector<HTMLElement>('.dex-empty')!.hidden).toBe(false);
    expect(root.querySelector('.progress-label')?.textContent).toBe('0 / 1025');

    const { root: root2 } = await mount([25], [25]);
    tab(root2, 'shinydex').click();
    expect(root2.querySelector<HTMLElement>('.dex-empty')!.hidden).toBe(true);
    expect(root2.querySelectorAll('.grid-cell.caught')).toHaveLength(1);
    expect(root2.querySelector('.grid-cell.caught img')?.getAttribute('src')).toMatch(/25s\.webp$/);
    expect(root2.querySelector('.counter-badge')?.textContent).toBe('1 Pokémon shiny');
  });

  it('onglet Formes : 326 formes, filtre par catégorie, une forme obtenue est cochée', async () => {
    const { root } = await mount([10034, 25], []);
    tab(root, 'forms').click();
    expect(root.querySelectorAll('.grid-cell')).toHaveLength(326);
    expect(root.querySelectorAll('.grid-cell.caught')).toHaveLength(1);
    expect(root.querySelector('.progress-label')?.textContent).toBe('1 / 326');
    expect(root.querySelector<HTMLElement>('.form-filter')!.hidden).toBe(false);

    const megaChip = [...root.querySelectorAll<HTMLButtonElement>('.chip')].find((c) =>
      c.textContent?.startsWith('Méga'),
    )!;
    megaChip.click();
    const count = Number(megaChip.textContent?.match(/\d+$/)?.[0]);
    expect(root.querySelectorAll('.grid-cell')).toHaveLength(count);
    expect(count).toBeGreaterThan(10);
    expect(count).toBeLessThan(326);
  });

  it('le filtre des formes est caché sur les autres onglets', async () => {
    const { root } = await mount([], []);
    expect(root.querySelector<HTMLElement>('.form-filter')!.hidden).toBe(true);
  });

  it('les formes sans image affichent un « ? » sans requête', async () => {
    const { root } = await mount([], []);
    tab(root, 'forms').click();
    // #10266 et #10270 n'ont aucune image
    expect(root.querySelectorAll('.grid-cell .sprite-missing').length).toBeGreaterThanOrEqual(2);
  });

  it('suit la langue et la collection en direct', async () => {
    const { root, i18n, game } = await mount([25], []);
    i18n.setLang('en');
    expect(root.querySelector('.counter-badge')?.textContent).toBe(
      "You've been 1 different Pokémon",
    );
    expect(root.querySelector('.grid-cell:nth-child(25)')?.getAttribute('title')).toBe('Pikachu');
    // un nouveau Pokémon arrive (import) : l'écran se met à jour sans rechargement
    await game.importState({ ...game.state.get(), caught: [25, 150] });
    expect(root.querySelector('.progress-label')?.textContent).toBe('2 / 1025');
  });
});
