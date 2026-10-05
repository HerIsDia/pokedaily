import { createHash } from 'node:crypto';
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

/**
 * Client HTTP « poli » pour les scripts qui interrogent PokéAPI, GitHub ou Pokémon DB.
 *
 * - envoie un User-Agent qui nous identifie (PokéAPI refuse sinon : 403) ;
 * - met TOUT en cache sur disque (`.cache/`) : on ne retélécharge jamais ce qu'on a déjà
 *   (c'est la règle n°1 de la politique d'usage de PokéAPI) ;
 * - limite le nombre de requêtes en parallèle et peut imposer un délai entre deux requêtes
 *   (2 s pour Pokémon DB, comme le demande leur robots.txt) ;
 * - réessaie avec un temps d'attente croissant en cas d'erreur réseau, 429 ou 5xx.
 */

export const USER_AGENT = 'pokedaily-build/1.0 (+https://github.com/HerIsDia/pokedaily)';

export class HttpError extends Error {
  readonly url: string;
  readonly status: number;

  constructor(url: string, status: number) {
    super(`HTTP ${status} pour ${url}`);
    this.name = 'HttpError';
    this.url = url;
    this.status = status;
  }
}

/** Exécute au plus `max` tâches en même temps. */
export function createLimiter(max: number): <T>(task: () => Promise<T>) => Promise<T> {
  let running = 0;
  const waiting: (() => void)[] = [];
  const next = (): void => {
    if (running >= max) return;
    waiting.shift()?.();
  };
  return async <T>(task: () => Promise<T>): Promise<T> => {
    if (running >= max) await new Promise<void>((resolve) => waiting.push(resolve));
    running++;
    try {
      return await task();
    } finally {
      running--;
      next();
    }
  };
}

export interface FetcherOptions {
  cacheDir: string;
  /** Requêtes simultanées (défaut 4). */
  concurrency?: number;
  /** Délai minimal entre le DÉBUT de deux requêtes, en ms (défaut 0). */
  minDelayMs?: number;
  /** Nombre de nouvelles tentatives après un échec (défaut 3). */
  retries?: number;
  userAgent?: string;
  /** Pour les tests. */
  fetchImpl?: typeof fetch;
  sleep?: (ms: number) => Promise<void>;
  now?: () => number;
}

export interface FetcherStats {
  network: number;
  cached: number;
  retried: number;
}

export interface Fetcher {
  json<T>(url: string): Promise<T>;
  /** `null` si le serveur répond 404 (et on s'en souvient : on ne redemande pas). */
  bytes(url: string): Promise<Uint8Array | null>;
  stats: FetcherStats;
}

const defaultSleep = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms));

export function cachePathFor(cacheDir: string, url: string): string {
  const { hostname, pathname } = new URL(url);
  const tail = pathname.replace(/[^a-zA-Z0-9._-]+/g, '_').slice(-60);
  const hash = createHash('sha1').update(url).digest('hex').slice(0, 12);
  return join(cacheDir, hostname, `${hash}_${tail}`);
}

async function readIfExists(path: string): Promise<Uint8Array | null> {
  try {
    return await readFile(path);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return null;
    throw error;
  }
}

export function createFetcher(options: FetcherOptions): Fetcher {
  const {
    cacheDir,
    concurrency = 4,
    minDelayMs = 0,
    retries = 3,
    userAgent = USER_AGENT,
    fetchImpl = fetch,
    sleep = defaultSleep,
    now = Date.now,
  } = options;

  const limit = createLimiter(concurrency);
  const stats: FetcherStats = { network: 0, cached: 0, retried: 0 };
  let nextStart = 0;

  /** Réserve un créneau de départ pour respecter `minDelayMs`. */
  async function waitForSlot(): Promise<void> {
    if (minDelayMs <= 0) return;
    const start = Math.max(now(), nextStart);
    nextStart = start + minDelayMs;
    const wait = start - now();
    if (wait > 0) await sleep(wait);
  }

  async function download(url: string): Promise<Uint8Array | null> {
    for (let attempt = 0; ; attempt++) {
      await waitForSlot();
      try {
        stats.network++;
        const response = await fetchImpl(url, { headers: { 'User-Agent': userAgent } });
        if (response.status === 404) return null;
        if (response.ok) return new Uint8Array(await response.arrayBuffer());
        const retryable = response.status === 429 || response.status >= 500;
        if (!retryable || attempt >= retries) throw new HttpError(url, response.status);
        const retryAfter = Number(response.headers.get('retry-after'));
        stats.retried++;
        await sleep(retryAfter > 0 ? retryAfter * 1000 : 500 * 2 ** attempt);
      } catch (error) {
        if (error instanceof HttpError || attempt >= retries) throw error;
        stats.retried++; // erreur réseau : on réessaie
        await sleep(500 * 2 ** attempt);
      }
    }
  }

  async function bytes(url: string): Promise<Uint8Array | null> {
    const path = cachePathFor(cacheDir, url);
    const hit = await readIfExists(path);
    if (hit) {
      stats.cached++;
      return hit;
    }
    if ((await readIfExists(`${path}.404`)) !== null) {
      stats.cached++;
      return null;
    }
    const data = await limit(() => download(url));
    await mkdir(join(path, '..'), { recursive: true });
    const target = data ? path : `${path}.404`;
    const temp = `${target}.tmp-${process.pid}`;
    await writeFile(temp, data ?? '');
    await rename(temp, target); // écriture atomique : jamais de fichier à moitié écrit dans le cache
    return data;
  }

  return {
    stats,
    bytes,
    async json<T>(url: string): Promise<T> {
      const data = await bytes(url);
      if (!data) throw new HttpError(url, 404);
      return JSON.parse(new TextDecoder().decode(data)) as T;
    },
  };
}
