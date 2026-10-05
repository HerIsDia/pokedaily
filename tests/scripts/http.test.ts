import { mkdtemp, readdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  USER_AGENT,
  HttpError,
  cachePathFor,
  createFetcher,
  createLimiter,
} from '../../scripts/lib/http.ts';

const reply = (status: number, body = '', headers: Record<string, string> = {}) =>
  new Response(status === 404 ? null : body, { status, headers });

let dir: string;
beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), 'pokedaily-http-'));
});
afterEach(async () => {
  await rm(dir, { recursive: true, force: true });
});

const noSleep = () => Promise.resolve();

describe('createFetcher', () => {
  it("s'identifie avec un User-Agent (PokéAPI renvoie 403 sinon)", async () => {
    const fetchImpl = vi.fn(async () => reply(200, '{"a":1}'));
    const f = createFetcher({ cacheDir: dir, fetchImpl, sleep: noSleep });
    await f.json('https://pokeapi.co/api/v2/x');
    const init = (fetchImpl.mock.calls[0] as unknown as [string, RequestInit])[1];
    expect((init.headers as Record<string, string>)['User-Agent']).toBe(USER_AGENT);
    expect(USER_AGENT).toContain('github.com/HerIsDia/pokedaily');
  });

  it('met en cache sur disque : la 2e demande ne touche pas le réseau', async () => {
    const fetchImpl = vi.fn(async () => reply(200, '{"n":42}'));
    const f = createFetcher({ cacheDir: dir, fetchImpl, sleep: noSleep });
    expect(await f.json('https://pokeapi.co/api/v2/n')).toEqual({ n: 42 });
    expect(await f.json('https://pokeapi.co/api/v2/n')).toEqual({ n: 42 });
    // et même avec un nouveau client (autre exécution du script) :
    const f2 = createFetcher({ cacheDir: dir, fetchImpl, sleep: noSleep });
    await f2.json('https://pokeapi.co/api/v2/n');
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    expect(f2.stats.cached).toBe(1);
  });

  it('mémorise les 404 (on ne redemande pas) et renvoie null pour bytes()', async () => {
    const fetchImpl = vi.fn(async () => reply(404));
    const f = createFetcher({ cacheDir: dir, fetchImpl, sleep: noSleep });
    expect(await f.bytes('https://x.test/absent.png')).toBeNull();
    expect(await f.bytes('https://x.test/absent.png')).toBeNull();
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    await expect(f.json('https://x.test/absent.png')).rejects.toBeInstanceOf(HttpError);
  });

  it('réessaie après une erreur serveur puis réussit', async () => {
    const responses = [reply(503), reply(429), reply(200, '{"ok":true}')];
    const fetchImpl = vi.fn(async () => responses.shift()!);
    const sleeps: number[] = [];
    const f = createFetcher({
      cacheDir: dir,
      fetchImpl,
      sleep: async (ms) => void sleeps.push(ms),
    });
    expect(await f.json('https://pokeapi.co/api/v2/r')).toEqual({ ok: true });
    expect(f.stats.retried).toBe(2);
    expect(sleeps).toEqual([500, 1000]); // attente croissante
  });

  it('respecte Retry-After', async () => {
    const responses = [reply(429, '', { 'retry-after': '3' }), reply(200, '1')];
    const sleeps: number[] = [];
    const f = createFetcher({
      cacheDir: dir,
      fetchImpl: async () => responses.shift()!,
      sleep: async (ms) => void sleeps.push(ms),
    });
    await f.bytes('https://x.test/a');
    expect(sleeps).toEqual([3000]);
  });

  it('abandonne après le nombre de tentatives, sans polluer le cache', async () => {
    const fetchImpl = vi.fn(async () => reply(500));
    const f = createFetcher({ cacheDir: dir, fetchImpl, sleep: noSleep, retries: 2 });
    await expect(f.bytes('https://x.test/boom')).rejects.toMatchObject({ status: 500 });
    expect(fetchImpl).toHaveBeenCalledTimes(3);
    expect(await readdir(dir)).toEqual([]); // rien d'écrit
  });

  it('ne réessaie pas une erreur « définitive » (403)', async () => {
    const fetchImpl = vi.fn(async () => reply(403));
    const f = createFetcher({ cacheDir: dir, fetchImpl, sleep: noSleep });
    await expect(f.bytes('https://x.test/forbidden')).rejects.toMatchObject({ status: 403 });
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it('réessaie après une erreur réseau', async () => {
    let calls = 0;
    const fetchImpl = vi.fn(async () => {
      if (++calls === 1) throw new TypeError('fetch failed');
      return reply(200, 'ok');
    });
    const f = createFetcher({ cacheDir: dir, fetchImpl, sleep: noSleep });
    expect(new TextDecoder().decode((await f.bytes('https://x.test/n'))!)).toBe('ok');
    expect(f.stats.retried).toBe(1);
  });

  it('impose un délai minimal entre deux requêtes (ex. 2 s pour Pokémon DB)', async () => {
    let clock = 1_000;
    const starts: number[] = [];
    const f = createFetcher({
      cacheDir: dir,
      concurrency: 1,
      minDelayMs: 2000,
      now: () => clock,
      sleep: async (ms) => void (clock += ms),
      fetchImpl: async () => {
        starts.push(clock);
        return reply(200, 'x');
      },
    });
    await f.bytes('https://pokemondb.net/a');
    await f.bytes('https://pokemondb.net/b');
    await f.bytes('https://pokemondb.net/c');
    expect(starts[1]! - starts[0]!).toBeGreaterThanOrEqual(2000);
    expect(starts[2]! - starts[1]!).toBeGreaterThanOrEqual(2000);
  });
});

describe('createLimiter', () => {
  it('ne dépasse jamais le nombre de tâches simultanées', async () => {
    const limit = createLimiter(3);
    let running = 0;
    let peak = 0;
    const task = async () => {
      running++;
      peak = Math.max(peak, running);
      await new Promise((r) => setTimeout(r, 5));
      running--;
    };
    await Promise.all(Array.from({ length: 20 }, () => limit(task)));
    expect(peak).toBe(3);
  });

  it('renvoie le résultat et propage les erreurs sans bloquer la file', async () => {
    const limit = createLimiter(1);
    await expect(limit(async () => Promise.reject(new Error('x')))).rejects.toThrow('x');
    expect(await limit(async () => 7)).toBe(7);
  });
});

describe('cachePathFor', () => {
  it('donne des chemins stables, distincts et sûrs', () => {
    const a = cachePathFor('/c', 'https://pokeapi.co/api/v2/pokemon/25/');
    const b = cachePathFor('/c', 'https://pokeapi.co/api/v2/pokemon/26/');
    expect(a).not.toBe(b);
    expect(a).toBe(cachePathFor('/c', 'https://pokeapi.co/api/v2/pokemon/25/'));
    expect(a.startsWith('/c/pokeapi.co/')).toBe(true);
    expect(a).not.toMatch(/\.\./);
  });
});
