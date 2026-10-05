import { beforeEach, describe, expect, it } from 'vitest';
import { emptyGameState, type GameState } from '../../src/core/game-state';
import type { PokemonEntry } from '../../src/core/model';
import { stateLookup } from '../../src/data/lookup';
import { drawPool } from '../../src/data/pool';
import { createStatsView } from '../../src/features/stats/stats-view';
import { createI18n } from '../../src/i18n';
import { createGame, type Game } from '../../src/state/game';
import { createMemoryRepository } from '../../src/storage/memory';
import { Scope } from '../../src/ui/scope';

const entry = (day: string, id: number, over: Partial<PokemonEntry> = {}): PokemonEntry => ({
  id,
  natureKey: 'hardy',
  level: 20,
  isShiny: false,
  day,
  rename: '',
  ...over,
});

async function makeGame(entries: PokemonEntry[], tickets = 0, start = true): Promise<Game> {
  const state: GameState = { ...emptyGameState(), tickets };
  for (const e of entries) {
    state.entries[e.day] = e;
    state.caught.push(e.id);
    if (e.isShiny) state.caughtShiny.push(e.id);
  }
  const days = entries.map((e) => e.day).sort();
  const last = days[days.length - 1] ?? '2999-01-01';
  state.lastDrawDay = entries.length ? last : null;
  // « Aujourd'hui » = le dernier jour enregistré : aucun nouveau tirage ne vient fausser les chiffres.
  const [y = 0, m = 1, d = 1] = last.split('-').map(Number);
  const game = createGame({
    repository: createMemoryRepository(state),
    pool: drawPool,
    events: [],
    lookup: stateLookup,
    now: () => new Date(y, m - 1, d),
  });
  if (start) await game.start();
  return game;
}

async function mount(game: Game, lang: 'fr' | 'en' = 'fr') {
  const i18n = createI18n(lang);
  const root = createStatsView({ i18n, game })({ scope: new Scope() });
  document.body.replaceChildren(root);
  return { root, i18n };
}
const cards = (root: HTMLElement) =>
  Object.fromEntries(
    [...root.querySelectorAll('.stat-card')].map((c) => [
      c.querySelector('.stat-card-label')!.textContent,
      c.querySelector('.stat-card-value')!.textContent,
    ]),
  );

describe('écran statistiques', () => {
  beforeEach(() => document.body.replaceChildren());

  it('collection vide : zéros partout, messages « pas encore de données »', async () => {
    // Avant la 1ʳᵉ ouverture (le jeu n'a encore rien tiré) : l'écran ne doit ni planter ni afficher NaN.
    const { root } = await mount(await makeGame([], 0, false));
    const c = cards(root);
    expect(c['Pokémon obtenus']).toBe('0');
    expect(c['Taux de shiny']).toBe('0,0 %');
    expect(root.querySelectorAll('.stats-empty')).toHaveLength(2);
  });

  it('chiffres clés, tickets, complétion, types et favoris', async () => {
    const game = await makeGame(
      [
        entry('2026-05-01', 25, { isShiny: true, level: 10 }),
        entry('2026-05-02', 25, { level: 30 }),
        entry('2026-05-03', 6),
        entry('2026-05-10', 10034, { level: 40 }),
      ],
      7,
    );
    const { root } = await mount(game);
    const c = cards(root);
    expect(c['Pokémon obtenus']).toBe('4');
    expect(c['Shiny']).toBe('✦ 1');
    expect(c['Taux de shiny']).toBe('25,0 %');
    expect(c['Niveau moyen']).toBe('25'); // (10+30+20+40)/4
    expect(c["Jours d'affilée"]).toBe('1'); // le 10 mai est isolé
    expect(c['Meilleure série']).toBe('3'); // 1, 2, 3 mai
    expect(c['Formes obtenues']).toBe('1');
    expect(c['Tickets Victini']).toBe('7');
    // complétion : 2 espèces (Pikachu et Dracaufeu, aussi via sa Méga), 1 seul shiny, 1 forme
    const labels = [...root.querySelectorAll('.completion-value')].map((n) => n.textContent);
    expect(labels).toEqual(['2 / 1025', '1 / 1025', '1 / 326']);
    expect(root.querySelector('.top-name')?.textContent).toBe('Pikachu');
    expect(root.querySelector('.top-count')?.textContent).toBe('×2');
    expect(root.querySelector('.type-bar-row .type-electric')).not.toBeNull();
  });

  it('suit la langue (virgule ↔ point) et la collection en direct', async () => {
    const game = await makeGame([entry('2026-05-01', 25, { isShiny: true })]);
    const { root, i18n } = await mount(game);
    expect(cards(root)['Taux de shiny']).toBe('100,0 %');
    i18n.setLang('en');
    expect(cards(root)['Shiny rate']).toBe('100.0 %');
    await game.rename('2026-05-01', 'Zap');
    expect(cards(root)['Shiny']).toBe('✦ 1');
  });
});
