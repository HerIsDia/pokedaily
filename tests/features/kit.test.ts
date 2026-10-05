import { beforeEach, describe, expect, it, vi } from 'vitest';
import { buildSpecialBox } from '../../src/core/boxes';
import { emptyGameState, type GameState } from '../../src/core/game-state';
import { seededRng } from '../../src/core/rng';
import { monthlyBoxes } from '../../src/core/roulette';
import type { PokemonEntry } from '../../src/core/model';
import { stateLookup } from '../../src/data/lookup';
import { drawPool } from '../../src/data/pool';
import { createKitView } from '../../src/features/kit/kit';
import { createRouletteView } from '../../src/features/kit/roulette';
import { createTeamView } from '../../src/features/kit/team';
import { createI18n } from '../../src/i18n';
import { createGame, type Game } from '../../src/state/game';
import { createMemoryRepository } from '../../src/storage/memory';
import { Scope } from '../../src/ui/scope';

const TODAY = new Date(2026, 4, 20, 10); // 20 mai 2026
const pokemon = (id = 25): PokemonEntry => ({
  id,
  natureKey: 'jolly',
  level: 30,
  isShiny: false,
  day: '2026-05-20',
  rename: 'Sparky',
});

async function makeGame(tickets: number, extra: Partial<GameState> = {}, seed = 3): Promise<Game> {
  const game = createGame({
    repository: createMemoryRepository({
      ...emptyGameState(),
      entries: { '2026-05-20': pokemon() },
      lastDrawDay: '2026-05-20',
      caught: [25],
      tickets,
      // le bonus est déjà pris : les tests ne dépendent pas du ticket offert
      rouletteBonusClaimed: true,
      ...extra,
    }),
    pool: drawPool,
    events: [],
    lookup: stateLookup,
    rng: seededRng(seed),
    now: () => TODAY,
  });
  await game.start();
  return game;
}

const noWait = () => Promise.resolve();

describe('menu du Pokékit', () => {
  beforeEach(() => document.body.replaceChildren());

  it('propose la team et la roulette, avec le nombre de tickets', async () => {
    const game = await makeGame(4);
    const root = createKitView({ i18n: createI18n('fr'), game })({ scope: new Scope() });
    expect([...root.querySelectorAll('.kit-tile')].map((a) => a.getAttribute('href'))).toEqual([
      '#/kit/team',
      '#/kit/roulette',
    ]);
    expect(root.querySelector('.ticket-badge')?.textContent).toBe('Tickets : 4');
  });
});

describe('team du mois', () => {
  beforeEach(() => document.body.replaceChildren());

  it('crée 6 Pokémon différents et les montre', async () => {
    const game = await makeGame(0);
    const root = createTeamView({ i18n: createI18n('fr'), game })({ scope: new Scope() });
    document.body.append(root);
    await vi.waitFor(() => expect(root.querySelectorAll('.team-card')).toHaveLength(6));
    expect(root.querySelector('.kit-subtitle')?.textContent).toBe('Ta team de Mai 2026');
    const names = [...root.querySelectorAll('.team-name')].map((n) => n.textContent);
    expect(new Set(names).size).toBe(6);
    expect(game.state.get().monthlyTeam?.month).toBe('2026-05');
  });

  it('garde la même team quand on revient sur l’écran', async () => {
    const game = await makeGame(0);
    const open = async () => {
      const root = createTeamView({ i18n: createI18n('fr'), game })({ scope: new Scope() });
      await vi.waitFor(() => expect(root.querySelectorAll('.team-card')).toHaveLength(6));
      return [...root.querySelectorAll('.team-name')].map((n) => n.textContent);
    };
    expect(await open()).toEqual(await open());
  });
});

describe('V-Roulette', () => {
  beforeEach(() => document.body.replaceChildren());

  function mount(game: Game, lang: 'fr' | 'en' = 'fr') {
    const root = createRouletteView({
      i18n: createI18n(lang),
      game,
      reducedMotion: () => true,
      wait: noWait,
    })({ scope: new Scope() });
    document.body.append(root);
    return root;
  }
  const spinButton = (root: HTMLElement) => root.querySelector<HTMLButtonElement>('.spin-btn')!;

  it('montre les tickets et les 16 Pokémon de la boîte 1 du mois', async () => {
    const root = mount(await makeGame(2));
    expect(root.querySelector('.roulette-tickets')?.textContent).toBe('Tickets Victini : 2');
    const cells = root.querySelectorAll('.box-cell');
    expect(cells).toHaveLength(16);
    expect(spinButton(root).disabled).toBe(false);
    expect(monthlyBoxes('2026-05', drawPool)[0]).toHaveLength(16);
  });

  it('change de boîte', async () => {
    const root = mount(await makeGame(1));
    const first = [...root.querySelectorAll('.box-cell')].map((c) => c.getAttribute('title'));
    root.querySelectorAll<HTMLButtonElement>('.box-tab')[1]!.click();
    const second = [...root.querySelectorAll('.box-cell')].map((c) => c.getAttribute('title'));
    expect(second).not.toEqual(first);
    expect(root.querySelectorAll('.box-cell')).toHaveLength(16);
  });

  it('sans ticket : le bouton est bloqué et l’explication visible', async () => {
    const root = mount(await makeGame(0));
    expect(spinButton(root).disabled).toBe(true);
    expect(root.querySelector<HTMLElement>('.roulette-hint')!.hidden).toBe(false);
  });

  it('booster un Pokémon : un 2ᵉ toucher retire le boost', async () => {
    const game = await makeGame(1);
    const root = mount(game);
    const cell = () => root.querySelectorAll<HTMLButtonElement>('.box-cell')[3]!;
    cell().click();
    await vi.waitFor(() => expect(game.state.get().rouletteBoost?.month).toBe('2026-05'));
    expect(cell().classList.contains('boosted')).toBe(true);
    expect(root.querySelector('.boost-hint')?.textContent).toContain('Boosté');
    cell().click();
    await vi.waitFor(() => expect(game.state.get().rouletteBoost).toBeNull());
    expect(root.querySelector('.boost-hint')?.textContent).toContain('Touche un Pokémon');
  });

  it('un tour : ticket dépensé, Pokémon du jour remplacé, résultat affiché', async () => {
    const game = await makeGame(2);
    const root = mount(game);
    const before = game.today.get()!;
    spinButton(root).click();
    await vi.waitFor(() => expect(root.querySelector('.spin-result .action-btn')).not.toBeNull());
    expect(game.state.get().tickets).toBe(1);
    const after = game.today.get()!;
    expect(after).not.toEqual(before);
    expect(after.day).toBe('2026-05-20');
    expect(root.querySelector('.spin-status')?.textContent).toMatch(/^Tu es maintenant /);
    expect(root.querySelector('.winner')).not.toBeNull();
    expect(root.querySelector('dialog')?.open).toBe(true);
    expect(root.querySelector('a.action-btn')?.getAttribute('href')).toBe('#/');
  });

  it('le dernier ticket : après le tour, le bouton se bloque', async () => {
    const game = await makeGame(1);
    const root = mount(game);
    spinButton(root).click();
    await vi.waitFor(() => expect(game.state.get().tickets).toBe(0));
    await vi.waitFor(() => expect(spinButton(root).disabled).toBe(true));
  });

  it('la fenêtre ne peut pas être fermée pendant que ça tourne', async () => {
    const game = await makeGame(1);
    let release: () => void = () => {};
    const root = createRouletteView({
      i18n: createI18n('fr'),
      game,
      reducedMotion: () => false,
      wait: () => new Promise<void>((r) => (release = r)),
    })({ scope: new Scope() });
    document.body.append(root);
    spinButton(root).click();
    const dialog = root.querySelector('dialog')!;
    await vi.waitFor(() => expect(dialog.open).toBe(true));
    root.querySelector<HTMLButtonElement>('.modal-close')!.click();
    expect(dialog.open).toBe(true);
    expect(root.querySelector<HTMLButtonElement>('.modal-close')!.disabled).toBe(true);
    // on laisse finir toute l'animation
    for (let i = 0; i < 80 && !root.querySelector('.spin-result .action-btn'); i++) {
      release();
      await Promise.resolve();
      await new Promise((r) => setTimeout(r, 0));
    }
    await vi.waitFor(() => expect(root.querySelector('.spin-result .action-btn')).not.toBeNull());
    root.querySelector<HTMLButtonElement>('.modal-close')!.click();
    expect(dialog.open).toBe(false);
  });

  it('boîte spéciale valable : proposée avec ses jours restants, avec cases shiny', async () => {
    const lucky = buildSpecialBox('april_fools', '2026-05-18', seededRng(1), drawPool);
    const game = await makeGame(1, { boxes: [lucky] });
    const root = mount(game);
    const tabs = [...root.querySelectorAll('.box-tab')].map((b) => b.textContent);
    expect(tabs).toHaveLength(4);
    expect(tabs[3]).toContain("Poisson d'avril");
    expect(tabs[3]).toContain('encore 5 j'); // 18 → 24 mai, aujourd'hui le 20
    root.querySelectorAll<HTMLButtonElement>('.box-tab')[3]!.click();
    expect(root.querySelectorAll('.box-cell .shiny-dot')).toHaveLength(3);
    spinButton(root).click();
    await vi.waitFor(() => expect(game.state.get().tickets).toBe(0));
  });

  it('une boîte spéciale expirée disparaît', async () => {
    const old = buildSpecialBox('lucky_day', '2026-05-01', seededRng(1), drawPool); // jusqu'au 7 mai
    const root = mount(await makeGame(1, { boxes: [old] }));
    expect(root.querySelectorAll('.box-tab')).toHaveLength(3);
  });

  it('le premier passage offre un ticket, une seule fois', async () => {
    const game = await makeGame(0, { rouletteBonusClaimed: false });
    const root = mount(game);
    await vi.waitFor(() => expect(game.state.get().tickets).toBe(1));
    expect(root.querySelector('.roulette-notice')?.textContent).toContain('première visite');
    mount(game);
    await new Promise((r) => setTimeout(r, 20));
    expect(game.state.get().tickets).toBe(1);
  });

  it('en anglais', async () => {
    const root = mount(await makeGame(1), 'en');
    expect(spinButton(root).textContent).toBe('Spin (1 ticket)');
    expect(root.querySelector('.box-tab')?.textContent).toBe('Box 1');
  });
});
