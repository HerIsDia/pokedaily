import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createBackupPanel } from '../../src/features/backup/backup-panel';
import { createI18n } from '../../src/i18n';
import { createGame, type Game } from '../../src/state/game';
import { createMemoryRepository } from '../../src/storage/memory';
import { drawPool } from '../../src/data/pool';
import { stateLookup } from '../../src/data/lookup';
import { events } from '../../src/data/events';
import { seededRng } from '../../src/core/rng';
import { Scope } from '../../src/ui/scope';

async function makeGame(seed: number, now: Date): Promise<Game> {
  const game = createGame({
    repository: createMemoryRepository(),
    pool: drawPool,
    events,
    lookup: stateLookup,
    rng: seededRng(seed),
    now: () => now,
  });
  await game.start();
  return game;
}

function mountPanel(game: Game, over: { confirmAction?: (m: string) => boolean } = {}) {
  const download = vi.fn();
  const confirmAction = over.confirmAction ?? vi.fn(() => true);
  const root = createBackupPanel({
    i18n: createI18n('fr'),
    game,
    scope: new Scope(),
    confirmAction,
    download,
  });
  document.body.replaceChildren(root);
  return { root, download, confirmAction };
}

async function chooseFile(root: HTMLElement, content: string) {
  const input = root.querySelector<HTMLInputElement>('.backup-file')!;
  const file = new File([content], 'sauvegarde.json', { type: 'application/json' });
  Object.defineProperty(input, 'files', { value: [file], configurable: true });
  input.dispatchEvent(new Event('change'));
  // laisser lire le fichier puis importer
  await vi.waitFor(() => expect(root.querySelector('.backup-feedback')?.textContent).not.toBe(''));
}

describe('panneau « Ma collection »', () => {
  beforeEach(() => document.body.replaceChildren());

  it('exporte un fichier nommé avec le jour', async () => {
    const game = await makeGame(1, new Date(2026, 4, 9, 10, 0));
    const { root, download } = mountPanel(game);
    root.querySelectorAll<HTMLButtonElement>('button')[0]!.click();
    expect(download).toHaveBeenCalledTimes(1);
    const [filename, content] = download.mock.calls[0] as [string, string];
    expect(filename).toBe('pokedaily-2026-05-09.json');
    expect(JSON.parse(content)).toMatchObject({ app: 'pokedaily', schemaVersion: 1 });
    expect(root.querySelector('.backup-feedback')?.textContent).toContain('pokedaily-2026-05-09');
  });

  it('importe après confirmation (en montrant ce qui sera remplacé)', async () => {
    const source = await makeGame(1, new Date(2026, 4, 9, 10, 0));
    const json = source.exportBackup().json;
    const game = await makeGame(2, new Date(2026, 4, 9, 11, 0));
    const before = game.today.get();
    const confirmAction = vi.fn<(message: string) => boolean>(() => true);
    const { root } = mountPanel(game, { confirmAction });

    await chooseFile(root, json);

    expect(confirmAction).toHaveBeenCalledTimes(1);
    expect(confirmAction.mock.calls[0]?.[0]).toContain('jours enregistrés : 1');
    expect(game.today.get()).toEqual(source.today.get());
    expect(game.today.get()).not.toEqual(before);
    expect(root.querySelector('.backup-feedback')?.textContent).toContain('Collection importée');
    expect(root.querySelector('.backup-feedback')?.classList.contains('is-error')).toBe(false);
  });

  it('ne change RIEN si on refuse la confirmation', async () => {
    const source = await makeGame(1, new Date(2026, 4, 9, 10, 0));
    const game = await makeGame(2, new Date(2026, 4, 9, 11, 0));
    const before = game.state.get();
    const { root } = mountPanel(game, { confirmAction: () => false });
    await chooseFile(root, source.exportBackup().json);
    expect(game.state.get()).toBe(before);
    expect(root.querySelector('.backup-feedback')?.textContent).toContain('annulé');
  });

  it.each([
    ['pas du JSON', 'abc', 'pas lisible'],
    ['autre application', '{"app":"x","schemaVersion":1,"data":{}}', 'pas une sauvegarde'],
  ])('refuse un fichier invalide (%s) avec un message clair', async (_label, content, message) => {
    const game = await makeGame(2, new Date(2026, 4, 9, 11, 0));
    const before = game.state.get();
    const confirmAction = vi.fn(() => true);
    const { root } = mountPanel(game, { confirmAction });
    await chooseFile(root, content);
    expect(confirmAction).not.toHaveBeenCalled();
    expect(game.state.get()).toBe(before);
    const feedback = root.querySelector('.backup-feedback')!;
    expect(feedback.textContent).toContain(message);
    expect(feedback.classList.contains('is-error')).toBe(true);
  });

  it('un fichier abîmé est refusé en entier, avec le premier problème', async () => {
    const source = await makeGame(1, new Date(2026, 4, 9, 10, 0));
    const file = JSON.parse(source.exportBackup().json) as { data: { tickets: number } };
    file.data.tickets = -5;
    const game = await makeGame(2, new Date(2026, 4, 9, 11, 0));
    const { root } = mountPanel(game);
    await chooseFile(root, JSON.stringify(file));
    expect(root.querySelector('.backup-feedback')?.textContent).toContain('tickets');
    expect(game.state.get().tickets).toBe(0);
  });
});
