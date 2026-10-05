import { beforeEach, describe, expect, it } from 'vitest';
import { createHistoryView } from '../../src/features/history/history';
import { stateLookup } from '../../src/data/lookup';
import { createI18n } from '../../src/i18n';
import { createGame, type Game } from '../../src/state/game';
import { createMemoryRepository } from '../../src/storage/memory';
import { emptyGameState, type GameState } from '../../src/core/game-state';
import type { PokemonEntry } from '../../src/core/model';
import { drawPool } from '../../src/data/pool';
import { Scope } from '../../src/ui/scope';

const entry = (day: string, id: number, over: Partial<PokemonEntry> = {}): PokemonEntry => ({
  id,
  natureKey: 'jolly',
  level: 30,
  isShiny: false,
  day,
  rename: '',
  ...over,
});

async function makeGame(entries: PokemonEntry[], now: Date): Promise<Game> {
  const state: GameState = { ...emptyGameState() };
  for (const e of entries) state.entries[e.day] = e;
  state.lastDrawDay = entries.map((e) => e.day).sort()[entries.length - 1] ?? null;
  const game = createGame({
    repository: createMemoryRepository(state),
    pool: drawPool,
    events: [],
    lookup: stateLookup,
    now: () => now,
  });
  await game.start();
  return game;
}

function mount(game: Game, lang: 'fr' | 'en' = 'fr', today = '2026-05-20') {
  const i18n = createI18n(lang);
  const root = createHistoryView({ i18n, game, today: () => today })({ scope: new Scope() });
  document.body.replaceChildren(root);
  return { root, i18n };
}
const NOW = new Date(2026, 4, 20, 10);

describe('historique', () => {
  beforeEach(() => document.body.replaceChildren());

  it('sans Pokémon : message vide, pas de calendrier', async () => {
    const game = await makeGame([], new Date(2026, 4, 20));
    // aucun état prêt : la partie dessine quand même un message
    const { root } = mount(game);
    expect(root.querySelector('.history-empty')).not.toBeNull();
  });

  it('montre le mois le plus récent, avec les bonnes cases', async () => {
    const game = await makeGame(
      [entry('2026-05-01', 25), entry('2026-05-20', 6), entry('2026-04-10', 1)],
      NOW,
    );
    const { root } = mount(game);
    expect(root.querySelector('.cal-month-label')?.textContent).toBe('Mai 2026');
    // 1ᵉʳ mai 2026 = vendredi → 4 cases vides, 31 jours
    expect(root.querySelectorAll('.cal-empty')).toHaveLength(4);
    expect(root.querySelectorAll('.cal-cell:not(.cal-empty)')).toHaveLength(31);
    expect(root.querySelectorAll('.cal-cell.has-entry')).toHaveLength(2);
    expect([...root.querySelectorAll('.cal-weekday')].map((n) => n.textContent)).toEqual([
      'Lun',
      'Mar',
      'Mer',
      'Jeu',
      'Ven',
      'Sam',
      'Dim',
    ]);
    expect(root.querySelector('.is-today')?.getAttribute('data-day')).toBe('2026-05-20');
  });

  it('navigue entre les mois, avec des flèches désactivées aux extrémités', async () => {
    const game = await makeGame([entry('2026-05-20', 6), entry('2026-04-10', 1)], NOW);
    const { root } = mount(game);
    const [prev, next] = root.querySelectorAll<HTMLButtonElement>('.cal-arrow') as unknown as [
      HTMLButtonElement,
      HTMLButtonElement,
    ];
    expect(next.disabled).toBe(true);
    expect(prev.disabled).toBe(false);
    prev.click();
    expect(root.querySelector('.cal-month-label')?.textContent).toBe('Avril 2026');
    expect(prev.disabled).toBe(true);
    expect(next.disabled).toBe(false);
    next.click();
    expect(root.querySelector('.cal-month-label')?.textContent).toBe('Mai 2026');
    // les points permettent de sauter directement
    root.querySelectorAll<HTMLButtonElement>('.month-dot')[1]!.click();
    expect(root.querySelector('.cal-month-label')?.textContent).toBe('Avril 2026');
  });

  it('le détail du jour affiche surnom, nom, niveau, nature, types et shiny', async () => {
    const game = await makeGame(
      [entry('2026-05-20', 25, { rename: 'Sparky', isShiny: true, level: 77 })],
      NOW,
    );
    const { root } = mount(game);
    expect(root.querySelector('.detail-card')).toBeNull();
    root.querySelector<HTMLButtonElement>('.cal-cell[data-day="2026-05-20"]')!.click();
    const card = root.querySelector('.detail-card')!;
    expect(card.querySelector('.detail-name')?.textContent).toBe('Sparky');
    expect(card.querySelector('.detail-original')?.textContent).toBe('Pikachu');
    expect(card.querySelector('.detail-date')?.textContent).toBe('Mercredi 20 mai 2026');
    expect(card.textContent).toContain('Niv. 77');
    expect(card.textContent).toContain('Jovial');
    expect(card.querySelector('.shiny-pill')).not.toBeNull();
    expect(card.querySelector('.type-electric')).not.toBeNull();
    // un 2ᵉ clic referme le détail
    root.querySelector<HTMLButtonElement>('.cal-cell[data-day="2026-05-20"]')!.click();
    expect(root.querySelector('.detail-card')).toBeNull();
  });

  it('un surnom hostile reste du texte', async () => {
    const game = await makeGame(
      [entry('2026-05-20', 25, { rename: '<img src=x onerror=alert(1)>' })],
      NOW,
    );
    const { root } = mount(game);
    root.querySelector<HTMLButtonElement>('.cal-cell[data-day="2026-05-20"]')!.click();
    expect(root.querySelector('.detail-name')?.children).toHaveLength(0);
  });

  it('signale les événements (Noël) dans la grille et dans le détail', async () => {
    const game = await makeGame([entry('2025-12-25', 25)], new Date(2025, 11, 25));
    const { root } = mount(game, 'fr', '2025-12-25');
    expect(root.querySelector('.cal-cell[data-day="2025-12-25"] .event-dot')).not.toBeNull();
    root.querySelector<HTMLButtonElement>('.cal-cell[data-day="2025-12-25"]')!.click();
    expect(root.querySelector('.event-pill')).not.toBeNull();
  });

  it('change de langue sans perdre le mois ni la sélection', async () => {
    const game = await makeGame([entry('2026-05-20', 25), entry('2026-04-10', 1)], NOW);
    const { root, i18n } = mount(game);
    root.querySelectorAll<HTMLButtonElement>('.cal-arrow')[0]!.click(); // avril
    root.querySelector<HTMLButtonElement>('.cal-cell[data-day="2026-04-10"]')!.click();
    i18n.setLang('en');
    expect(root.querySelector('.cal-month-label')?.textContent).toBe('April 2026');
    expect(root.querySelector('.cal-weekday')?.textContent).toBe('Mon');
    expect(root.querySelector('.detail-date')?.textContent).toBe('Friday, April 10, 2026');
    expect(root.querySelector('.cal-cell.is-selected')?.getAttribute('data-day')).toBe(
      '2026-04-10',
    );
  });

  it('se met à jour quand un nouveau jour est tiré', async () => {
    const game = await makeGame([entry('2026-05-20', 25)], NOW);
    const { root } = mount(game);
    expect(root.querySelectorAll('.cal-cell.has-entry')).toHaveLength(1);
    await game.rename('2026-05-20', 'Zap');
    expect(root.querySelector('.cal-cell[data-day="2026-05-20"]')?.getAttribute('title')).toContain(
      'Zap',
    );
  });
});
