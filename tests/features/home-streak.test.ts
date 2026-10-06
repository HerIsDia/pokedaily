import { beforeEach, describe, expect, it } from 'vitest';
import { emptyGameState, type GameState } from '../../src/core/game-state';
import type { PokemonEntry } from '../../src/core/model';
import { addDays } from '../../src/core/dates';
import { stateLookup } from '../../src/data/lookup';
import { drawPool } from '../../src/data/pool';
import { createHomeView } from '../../src/features/home/home';
import { createStatsView } from '../../src/features/stats/stats-view';
import { createI18n } from '../../src/i18n';
import { createGame, type Game } from '../../src/state/game';
import { createMemoryRepository } from '../../src/storage/memory';
import { Scope } from '../../src/ui/scope';

const TODAY = '2026-05-20';

/** `streak` jours d'affilée jusqu'à aujourd'hui, `gapBefore` jours de trou, puis `earlier` jours. */
async function makeGame(streak: number, earlier = 0): Promise<Game> {
  const state: GameState = { ...emptyGameState(), lastDrawDay: TODAY };
  const add = (day: string) =>
    (state.entries[day] = {
      id: 25,
      natureKey: 'jolly',
      level: 10,
      isShiny: false,
      day,
      rename: '',
    } satisfies PokemonEntry);
  for (let i = 0; i < streak; i++) add(addDays(TODAY, -i));
  for (let i = 0; i < earlier; i++) add(addDays(TODAY, -(streak + 3 + i)));
  state.caught = [25];
  const game = createGame({
    repository: createMemoryRepository(state),
    pool: drawPool,
    events: [],
    lookup: stateLookup,
    now: () => new Date(2026, 4, 20, 10),
  });
  await game.start();
  return game;
}

const pill = (root: HTMLElement) => root.querySelector<HTMLElement>('.streak-pill')!;
const home = (game: Game, lang: 'fr' | 'en' = 'fr') =>
  createHomeView({ i18n: createI18n(lang), game, events: [] })({ scope: new Scope() });

describe('pastille de série (accueil)', () => {
  beforeEach(() => document.body.replaceChildren());

  it('cachée le premier jour', async () => {
    expect(pill(home(await makeGame(1))).hidden).toBe(true);
  });

  it('« Jour N d’affilée » à partir de 2 jours', async () => {
    const root = home(await makeGame(5));
    expect(pill(root).hidden).toBe(false);
    expect(pill(root).textContent).toBe('🔥 Jour 5 d’affilée');
    expect(pill(root).hasAttribute('data-unlocked')).toBe(false);
  });

  it('célèbre le badge le jour exact du palier (7 jours)', async () => {
    const root = home(await makeGame(7));
    expect(pill(root).textContent).toBe('🎉 Badge « Une semaine » débloqué !');
    expect(pill(root).hasAttribute('data-unlocked')).toBe(true);
    expect(pill(home(await makeGame(8))).textContent).toBe('🔥 Jour 8 d’affilée');
  });

  it('un trou d’un jour remet la série à zéro', async () => {
    const root = home(await makeGame(3, 10)); // 3 jours d'affilée, trou, puis 10 jours avant
    expect(pill(root).textContent).toBe('🔥 Jour 3 d’affilée');
  });

  it('en anglais', async () => {
    expect(pill(home(await makeGame(4), 'en')).textContent).toBe('🔥 Day 4 in a row');
  });
});

describe('badges (page Stats)', () => {
  beforeEach(() => document.body.replaceChildren());

  it('badge obtenu (même après une série cassée) et jours restants pour les autres', async () => {
    const game = await makeGame(3, 35); // série en cours : 3 ; ancienne série : 35 jours
    const root = createStatsView({ i18n: createI18n('fr'), game })({ scope: new Scope() });
    const items = [...root.querySelectorAll('.badge-item')];
    expect(items.map((i) => i.classList.contains('earned'))).toEqual([true, true, false, false]);
    expect(items[0]!.textContent).toContain('Une semaine');
    expect(items[0]!.textContent).toContain('Obtenu');
    expect(items[2]!.textContent).toContain('encore 97 j'); // 100 − série en cours (3)
  });
});
