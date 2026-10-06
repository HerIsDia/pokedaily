import { IDBFactory } from 'fake-indexeddb';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { boot } from '../../src/app/boot';
import {
  exitSimulationUrl,
  noonOf,
  parseSimulateParam,
  simulationUrl,
} from '../../src/app/simulate';
import { prepareSimulation } from '../../src/core/dev-tools';
import { emptyGameState, type GameState } from '../../src/core/game-state';
import type { PokemonEntry } from '../../src/core/model';
import { stateLookup } from '../../src/data/lookup';
import { createDevPanel } from '../../src/features/dev/dev-panel';
import { createI18n } from '../../src/i18n';
import { createGame } from '../../src/state/game';
import { openGameDb } from '../../src/storage/db';
import { createIndexedDbRepository } from '../../src/storage/indexeddb';
import { createMemoryRepository } from '../../src/storage/memory';
import { drawPool } from '../../src/data/pool';
import { Scope } from '../../src/ui/scope';

const entry = (day: string, id = 25): PokemonEntry => ({
  id,
  natureKey: 'jolly',
  level: 12,
  isShiny: false,
  day,
  rename: '',
});

describe('adresse de simulation', () => {
  it('lit un jour valide, refuse le reste', () => {
    expect(parseSimulateParam('?simulate=2026-10-31')).toBe('2026-10-31');
    expect(parseSimulateParam('?lang=en&simulate=2024-02-29')).toBe('2024-02-29');
    for (const bad of [
      '',
      '?simulate=',
      '?simulate=demain',
      '?simulate=2026-02-30',
      '?simulate=1999-12-31',
      '?simulate=2101-01-01',
      '?simulate=2026-1-1',
    ]) {
      expect(parseSimulateParam(bad), bad).toBeNull();
    }
  });

  it('construit les adresses (garde la langue, retire l’aperçu, revient à l’accueil)', () => {
    expect(simulationUrl('https://x.test/?lang=en&preview=25#/stats', '2026-10-31')).toBe(
      'https://x.test/?lang=en&simulate=2026-10-31',
    );
    expect(exitSimulationUrl('https://x.test/?lang=en&simulate=2026-10-31#/about')).toBe(
      'https://x.test/?lang=en',
    );
  });

  it('midi du jour demandé, heure locale', () => {
    const noon = noonOf('2026-10-31');
    expect([noon.getFullYear(), noon.getMonth(), noon.getDate(), noon.getHours()]).toEqual([
      2026, 9, 31, 12,
    ]);
  });
});

describe('copie de simulation', () => {
  const state = (): GameState => ({
    ...emptyGameState(),
    entries: {
      '2026-10-01': entry('2026-10-01'),
      '2026-10-05': entry('2026-10-05'),
      '2026-10-30': entry('2026-10-30'),
    },
    lastDrawDay: '2026-10-30',
    tickets: 3,
    caught: [25],
  });

  it('retire le jour simulé et les suivants, garde le passé et le reste', () => {
    const sim = prepareSimulation(state(), '2026-10-05');
    expect(Object.keys(sim.entries)).toEqual(['2026-10-01']);
    expect(sim.lastDrawDay).toBe('2026-10-01');
    expect(sim.tickets).toBe(3);
  });

  it('un jour futur garde tout l’historique ; un jour très ancien repart de zéro', () => {
    expect(Object.keys(prepareSimulation(state(), '2026-12-25').entries)).toHaveLength(3);
    const old = prepareSimulation(state(), '2000-01-01');
    expect(old.entries).toEqual({});
    expect(old.lastDrawDay).toBeNull();
  });

  it('ne modifie pas l’original', () => {
    const original = state();
    prepareSimulation(original, '2026-10-05');
    expect(Object.keys(original.entries)).toHaveLength(3);
  });
});

describe('démarrage en simulation', () => {
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

  async function seededFactory() {
    const factory = new IDBFactory();
    const repo = createIndexedDbRepository(await openGameDb(factory), stateLookup);
    const empty = (await repo.load()).state;
    const real: GameState = {
      ...empty,
      entries: { '2026-10-04': entry('2026-10-04', 4) },
      lastDrawDay: '2026-10-04',
      caught: [4],
      tickets: 2,
    };
    await repo.save(empty, real);
    repo.close();
    return { factory, real };
  }

  it('Noël simulé : le Pokémon de l’événement sort, la VRAIE sauvegarde ne change pas', async () => {
    const { factory, real } = await seededFactory();
    const cleanup = vi.fn(() => Promise.resolve());
    const navigate = vi.fn();
    const booted = await boot(root, {
      i18n: createI18n('fr'),
      indexedDB: factory,
      preview: null,
      simulate: '2026-12-25',
      cleanup,
      navigate,
    });
    stop = booted.stop;
    // Noël : Cadoizo (#225) avec 100 % de chances
    expect(booted.game.today.get()).toMatchObject({ id: 225, day: '2026-12-25' });
    expect(root.querySelector('.sim-banner')?.hasAttribute('hidden')).toBe(false);
    expect(root.querySelector('.sim-banner')?.textContent).toContain('SIMULATION');
    expect(root.querySelector('.sim-banner')?.textContent).toContain('25 décembre 2026');
    expect(root.querySelector('.notice-volatile')?.hasAttribute('hidden')).toBe(true);
    expect(cleanup).not.toHaveBeenCalled(); // la v3.1 n'est pas nettoyée depuis un bac à sable
    booted.stop();
    stop = undefined;

    // La vraie base est exactement comme avant.
    const check = createIndexedDbRepository(await openGameDb(factory), stateLookup);
    expect((await check.load()).state).toEqual(real);
    check.close();
  });

  it('« Quitter » ramène à l’adresse normale', async () => {
    const { factory } = await seededFactory();
    const navigate = vi.fn();
    const booted = await boot(root, {
      i18n: createI18n('fr'),
      indexedDB: factory,
      preview: null,
      simulate: '2026-12-25',
      navigate,
    });
    stop = booted.stop;
    root.querySelector<HTMLButtonElement>('.sim-exit')!.click();
    expect(navigate).toHaveBeenCalledTimes(1);
    expect(String(navigate.mock.calls[0]?.[0])).not.toContain('simulate');
  });

  it('sans simulation : pas de bandeau', async () => {
    const { factory } = await seededFactory();
    const booted = await boot(root, {
      i18n: createI18n('fr'),
      indexedDB: factory,
      preview: null,
      simulate: null,
    });
    stop = booted.stop;
    expect(root.querySelector('.sim-banner')?.hasAttribute('hidden')).toBe(true);
  });
});

describe('panneau développeur : simulation', () => {
  beforeEach(() => document.body.replaceChildren());

  async function setup(simulation?: { day: string; exit: () => void }) {
    const game = createGame({
      repository: createMemoryRepository(emptyGameState()),
      pool: drawPool,
      events: [],
      lookup: stateLookup,
      now: () => new Date(2026, 9, 6, 10),
    });
    await game.start();
    const navigate = vi.fn();
    const modal = createDevPanel({
      i18n: createI18n('fr'),
      game,
      scope: new Scope(),
      navigate,
      simulation,
    });
    document.body.append(modal.element);
    modal.open();
    const button = (label: string) =>
      [...modal.element.querySelectorAll<HTMLButtonElement>('button')].find((b) =>
        b.textContent?.includes(label),
      )!;
    return { modal, navigate, button };
  }

  it('une date valide ouvre la simulation', async () => {
    const { modal, navigate, button } = await setup();
    const date = modal.element.querySelector<HTMLInputElement>('input[type=date]')!;
    date.value = '2026-10-31';
    button('Simuler').click();
    expect(navigate).toHaveBeenCalledTimes(1);
    expect(String(navigate.mock.calls[0]?.[0])).toContain('simulate=2026-10-31');
  });

  it('une date vide ou hors limites est refusée, avec un message', async () => {
    const { modal, navigate, button } = await setup();
    const date = modal.element.querySelector<HTMLInputElement>('input[type=date]')!;
    date.value = '';
    button('Simuler').click();
    date.value = '2150-01-01';
    button('Simuler').click();
    expect(navigate).not.toHaveBeenCalled();
    expect(modal.element.textContent).toContain('Date invalide');
  });

  it('un événement : on simule le prochain jour où il a lieu', async () => {
    const { modal, navigate, button } = await setup();
    const select = modal.element.querySelector<HTMLSelectElement>('select')!;
    const options = [...select.options].map((o) => o.textContent);
    expect(options).toContain('Joyeux Noël !');
    select.value = [...select.options].find((o) => o.textContent === 'Joyeux Noël !')!.value;
    button('Simuler cet événement').click();
    expect(String(navigate.mock.calls[0]?.[0])).toContain('simulate=2026-12-25');
  });

  it('un événement unique déjà terminé n’a plus de date', async () => {
    const { modal, navigate, button } = await setup();
    const select = modal.element.querySelector<HTMLSelectElement>('select')!;
    select.value = [...select.options].find((o) => o.textContent === 'Sortie de Pokopia')!.value;
    button('Simuler cet événement').click();
    expect(navigate).not.toHaveBeenCalled();
    expect(modal.element.textContent).toContain('plus de prochaine date');
  });

  it('en simulation : le bouton « Quitter la simulation » apparaît', async () => {
    const exit = vi.fn();
    const { button, modal } = await setup({ day: '2026-12-25', exit });
    const quit = button('Quitter la simulation');
    expect(quit.hidden).toBe(false);
    quit.click();
    expect(exit).toHaveBeenCalled();
    const normal = await setup();
    expect(normal.button('Quitter la simulation').hidden).toBe(true);
    expect(modal.element.open).toBe(true);
  });
});
