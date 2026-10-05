import { IDBFactory } from 'fake-indexeddb';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { emptyGameState, todayEntry } from '../../src/core/game-state';
import { seededRng } from '../../src/core/rng';
import { createGame, type Game, type GameSync } from '../../src/state/game';
import { buildBackup } from '../../src/storage/backup';
import { openGameDb } from '../../src/storage/db';
import { createIndexedDbRepository } from '../../src/storage/indexeddb';
import { createMemoryRepository } from '../../src/storage/memory';
import { UnsupportedSchemaError, type Repository } from '../../src/storage/repository';
import type { StateLookup } from '../../src/storage/validate';
import { testPool } from '../core/helpers';

const known = new Set([...testPool.species, ...testPool.forms]);
const lookup: StateLookup = {
  hasId: (id) => known.has(id),
  hasNature: (key) => testPool.natures.includes(key),
};

let factory: IDBFactory;
let clock: Date;
const games: Game[] = [];

const openRepo = async () => createIndexedDbRepository(await openGameDb(factory), lookup);

function make(repository: Repository, seed = 1, sync?: GameSync): Game {
  const game = createGame({
    repository,
    pool: testPool,
    events: [],
    lookup,
    rng: seededRng(seed),
    now: () => clock,
    sync,
  });
  games.push(game);
  return game;
}

/** Un faux « BroadcastChannel » : tous les onglets s'entendent. */
function bus() {
  const listeners = new Set<() => void>();
  return (): GameSync => {
    let mine: (() => void) | null = null;
    return {
      post: () => listeners.forEach((l) => l !== mine && l()),
      listen(listener) {
        mine = listener;
        listeners.add(listener);
        return () => listeners.delete(listener);
      },
    };
  };
}

beforeEach(() => {
  factory = new IDBFactory();
  clock = new Date(2026, 4, 1, 10, 0);
});
afterEach(() => {
  while (games.length) games.pop()?.close();
});

describe('démarrage et tirage du jour', () => {
  it('passe de « loading » à « ready » avec un Pokémon du jour sauvegardé', async () => {
    const game = make(await openRepo());
    expect(game.status.get()).toBe('loading');
    await game.start();
    expect(game.status.get()).toBe('ready');
    expect(game.today.get()?.day).toBe('2026-05-01');
    expect(game.saveFailed.get()).toBe(false);
  });

  it('un 2ᵉ lancement le même jour garde le MÊME Pokémon (même avec un autre hasard)', async () => {
    const first = make(await openRepo(), 1);
    await first.start();
    const pokemon = first.today.get();
    first.close();

    const second = make(await openRepo(), 999);
    await second.start();
    expect(second.today.get()).toEqual(pokemon);
    expect(Object.keys(second.state.get().entries)).toHaveLength(1);
  });

  it('tire un nouveau Pokémon le lendemain, et garde celui de la veille en historique', async () => {
    const game = make(await openRepo());
    await game.start();
    const yesterday = game.today.get();
    clock = new Date(2026, 4, 2, 0, 0, 1);
    await game.ensureToday();
    expect(game.today.get()?.day).toBe('2026-05-02');
    expect(game.state.get().entries['2026-05-01']).toEqual(yesterday);
  });

  it("ne retire pas si l'horloge recule", async () => {
    const game = make(await openRepo());
    await game.start();
    clock = new Date(2026, 3, 20, 10, 0);
    await game.ensureToday();
    expect(game.today.get()?.day).toBe('2026-05-01');
    expect(Object.keys(game.state.get().entries)).toHaveLength(1);
  });

  it("ne notifie pas ceux qui n'écoutent que le Pokémon du jour quand autre chose change", async () => {
    const game = make(await openRepo());
    await game.start();
    const listener = vi.fn();
    game.today.subscribe(listener, { immediate: false });
    clock = new Date(2026, 4, 1, 23, 0);
    await game.ensureToday(); // même jour : rien ne change
    expect(listener).not.toHaveBeenCalled();
    await game.rename('2026-05-01', 'Gros');
    expect(listener).toHaveBeenCalledTimes(1);
  });
});

describe('surnom', () => {
  it('est enregistré et relu', async () => {
    const game = make(await openRepo());
    await game.start();
    await game.rename('2026-05-01', '  Pikachu le brave  ');
    expect(game.today.get()?.rename).toBe('Pikachu le brave');
    game.close();

    const again = make(await openRepo());
    await again.start();
    expect(again.today.get()?.rename).toBe('Pikachu le brave');
  });
});

describe('démarrage impossible', () => {
  it('signale une sauvegarde trop récente', async () => {
    const repo = createMemoryRepository();
    repo.load = () => Promise.reject(new UnsupportedSchemaError(9));
    const game = make(repo);
    await game.start();
    expect(game.status.get()).toBe('error');
    expect(game.error.get()).toBe('too_new');
  });

  it('signale une lecture impossible', async () => {
    const repo = createMemoryRepository();
    repo.load = () => Promise.reject(new Error('disque plein'));
    const game = make(repo);
    await game.start();
    expect(game.error.get()).toBe('load_failed');
  });
});

describe('sauvegarde qui échoue', () => {
  it("l'écran garde le Pokémon, prévient, et la sauvegarde suivante rattrape tout", async () => {
    const repo = await openRepo();
    const realSave = repo.save.bind(repo);
    let fail = true;
    repo.save = (a, b) => (fail ? Promise.reject(new Error('quota')) : realSave(a, b));

    const game = make(repo);
    await game.start();
    expect(game.status.get()).toBe('ready');
    expect(game.today.get()).not.toBeNull();
    expect(game.saveFailed.get()).toBe(true);

    fail = false;
    await game.rename('2026-05-01', 'Rattrapé');
    expect(game.saveFailed.get()).toBe(false);
    game.close();

    const again = make(await openRepo());
    await again.start();
    expect(again.today.get()?.rename).toBe('Rattrapé');
    expect(Object.keys(again.state.get().entries)).toEqual(['2026-05-01']);
  });
});

describe('deux onglets', () => {
  it('démarrés en même temps : un seul tirage, le même Pokémon partout', async () => {
    const a = make(await openRepo(), 1);
    const b = make(await openRepo(), 2);
    await Promise.all([a.start(), b.start()]);
    expect(a.today.get()).toEqual(b.today.get());
    expect(Object.keys(a.state.get().entries)).toHaveLength(1);
    expect(a.saveFailed.get() || b.saveFailed.get()).toBe(false);
  });

  it('un surnom donné dans un onglet n’écrase pas le travail de l’autre', async () => {
    const a = make(await openRepo(), 1);
    const b = make(await openRepo(), 2);
    await a.start();
    await b.start();
    await a.rename('2026-05-01', 'Alpha');
    clock = new Date(2026, 4, 2, 9, 0);
    await b.ensureToday(); // B est resté sur l'ancienne révision : conflit, relecture, refait
    expect(b.state.get().entries['2026-05-01']?.rename).toBe('Alpha');
    expect(b.today.get()?.day).toBe('2026-05-02');
    expect(b.saveFailed.get()).toBe(false);
  });

  it('prévient les autres onglets, qui se rafraîchissent seuls', async () => {
    const make1 = bus();
    const a = make(await openRepo(), 1, make1());
    const b = make(await openRepo(), 2, make1());
    await a.start();
    await b.start();
    const stop = b.watch();
    await a.rename('2026-05-01', 'Vu en direct');
    await vi.waitFor(() => expect(b.today.get()?.rename).toBe('Vu en direct'));
    stop();
  });
});

describe('import', () => {
  it('remplace la collection puis tire le Pokémon du jour si le fichier est ancien', async () => {
    const source = make(createMemoryRepository());
    await source.start();
    const { json } = source.exportBackup();

    clock = new Date(2026, 5, 10, 12, 0);
    const game = make(await openRepo(), 3);
    await game.start();
    const read = game.readBackup(json);
    expect(read.ok).toBe(true);
    if (!read.ok) return;
    expect(await game.importState(read.state)).toEqual({ ok: true });
    const entries = Object.keys(game.state.get().entries).sort();
    expect(entries).toEqual(['2026-05-01', '2026-06-10']);
    expect(game.today.get()?.day).toBe('2026-06-10');
  });

  it("si l'enregistrement échoue, rien ne change", async () => {
    const repo = await openRepo();
    const game = make(repo);
    await game.start();
    const before = game.state.get();
    repo.replaceAll = () => Promise.reject(new Error('quota'));
    const outcome = await game.importState({ ...emptyGameState(), tickets: 77 });
    expect(outcome).toEqual({ ok: false });
    expect(game.state.get()).toBe(before);
  });

  it('refuse un fichier abîmé sans rien toucher', async () => {
    const game = make(await openRepo());
    await game.start();
    expect(game.readBackup('{"oups"')).toMatchObject({ ok: false, reason: 'not_json' });
  });

  it("l'export reflète l'état courant", async () => {
    const game = make(await openRepo());
    await game.start();
    expect(game.exportBackup()).toEqual(buildBackup(game.state.get(), clock));
    expect(todayEntry(game.state.get())).not.toBeNull();
  });
});

describe('changement de jour en cours de route', () => {
  beforeEach(() => vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval'] }));
  afterEach(() => vi.useRealTimers());

  it('tire le nouveau Pokémon après minuit, sans recharger', async () => {
    const game = make(await openRepo());
    await game.start();
    const stop = game.watch();
    clock = new Date(2026, 4, 2, 0, 0, 5);
    await vi.advanceTimersByTimeAsync(31_000);
    await vi.waitFor(() => expect(game.today.get()?.day).toBe('2026-05-02'));
    stop();
  });

  it('une fois arrêtée, la surveillance ne fait plus rien', async () => {
    const game = make(await openRepo());
    await game.start();
    const stop = game.watch();
    stop();
    clock = new Date(2026, 4, 2, 0, 0, 5);
    await vi.advanceTimersByTimeAsync(120_000);
    expect(game.today.get()?.day).toBe('2026-05-01');
  });
});

describe('mode sans sauvegarde', () => {
  it('fonctionne en mémoire et le dit', async () => {
    const game = make(createMemoryRepository());
    expect(game.persistent).toBe(false);
    await game.start();
    expect(game.today.get()).not.toBeNull();
  });
});

describe('V-Roulette et team du mois', () => {
  const box = Array.from({ length: 16 }, (_, i) => i + 1);
  const request = { ids: box, shinySlots: [], boostedId: null };

  /** Un jeu démarré, avec `tickets` tickets dans la sauvegarde. */
  async function started(tickets: number, seed = 1) {
    const repo = await openRepo();
    const game = make(repo, seed);
    await game.start();
    // Nombre de tickets exact (tirer Victini le jour même en offre un) : on le fixe.
    await game.importState({ ...game.state.get(), tickets });
    return { repo, game };
  }

  it('le premier passage offre UN ticket, jamais deux', async () => {
    const { game } = await started(0);
    expect(await game.claimRouletteBonus()).toBe(true);
    expect(game.state.get().tickets).toBe(1);
    expect(await game.claimRouletteBonus()).toBe(false);
    expect(game.state.get().tickets).toBe(1);
  });

  it('un tour remplace le Pokémon du jour, coûte un ticket, et survit au rechargement', async () => {
    const { game } = await started(2);
    const outcome = await game.spin(request);
    expect(outcome.ok).toBe(true);
    if (!outcome.ok) return;
    expect(box[outcome.index]).toBe(outcome.prize.id);
    expect(game.today.get()).toEqual(outcome.prize);
    expect(game.state.get().tickets).toBe(1);
    game.close();

    const again = make(await openRepo(), 5);
    await again.start();
    expect(again.today.get()).toEqual(outcome.prize);
    expect(again.state.get().tickets).toBe(1);
  });

  it('sans ticket : refus, et RIEN ne change (ni Pokémon ni ticket)', async () => {
    const { game } = await started(0);
    const before = game.state.get();
    expect(await game.spin(request)).toEqual({ ok: false, reason: 'no_tickets' });
    expect(game.state.get()).toBe(before);
  });

  it('un tour dont la sauvegarde échoue ne perd pas le ticket : il reste affiché avec son Pokémon', async () => {
    const { repo, game } = await started(1);
    repo.save = () => Promise.reject(new Error('quota'));
    const outcome = await game.spin(request);
    expect(outcome.ok).toBe(true);
    // Ticket et Pokémon vont ENSEMBLE : si l'un est visible, l'autre aussi.
    expect(game.state.get().tickets).toBe(0);
    expect(game.today.get()).toEqual(outcome.ok ? outcome.prize : null);
    expect(game.saveFailed.get()).toBe(true);
  });

  it('deux onglets : le 2ᵉ tour repart des données fraîches (pas de ticket dépensé deux fois)', async () => {
    const a = await started(1);
    const b = make(await openRepo(), 9);
    await b.start();
    expect(b.state.get().tickets).toBe(1);
    expect((await a.game.spin(request)).ok).toBe(true); // A utilise l'unique ticket
    // B croit encore avoir 1 ticket : conflit → relecture → plus aucun ticket
    expect(await b.spin(request)).toEqual({ ok: false, reason: 'no_tickets' });
    expect(b.state.get().tickets).toBe(0);
  });

  it('le Pokémon boosté est enregistré pour le mois', async () => {
    const { game } = await started(0);
    await game.setBoost('2026-05', 7);
    game.close();
    const again = make(await openRepo());
    await again.start();
    expect(again.state.get().rouletteBoost).toEqual({ month: '2026-05', id: 7 });
    await again.setBoost('2026-05', null);
    expect(again.state.get().rouletteBoost).toBeNull();
  });

  it('la team du mois est créée une seule fois par mois, puis relue', async () => {
    const { game } = await started(0);
    expect(game.currentMonth()).toBe('2026-05');
    await game.ensureMonthlyTeam('2026-05');
    const team = game.state.get().monthlyTeam;
    expect(team?.month).toBe('2026-05');
    expect(team?.pokemon).toHaveLength(6);
    expect(new Set(team?.pokemon.map((p) => p.id)).size).toBe(6);
    await game.ensureMonthlyTeam('2026-05');
    expect(game.state.get().monthlyTeam).toBe(team); // inchangée
    game.close();

    const again = make(await openRepo(), 77);
    await again.start();
    expect(again.state.get().monthlyTeam).toEqual(team);
    await again.ensureMonthlyTeam('2026-06'); // nouveau mois : nouvelle team
    expect(again.state.get().monthlyTeam?.month).toBe('2026-06');
    // les Pokémon de la team comptent pour la collection
    for (const p of again.state.get().monthlyTeam!.pokemon) {
      expect(again.state.get().caught).toContain(p.id);
    }
  });
});
