import { dex } from '../data';
import { hasSprite, spriteUrl, type SpriteSize } from '../data/sprites';
import { SPRITE_CACHE } from './constants';

/**
 * Télécharger les images POUR LE HORS-LIGNE : une action volontaire (page « À propos »), jamais
 * automatique (≈ 13 Mo en miniatures, ≈ 47 Mo en grandes images : ça compte sur données mobiles).
 * Les images vont dans le même cache que celui du service worker (`SPRITE_CACHE`).
 */

/** Poids mesurés des dossiers générés par `pnpm sprites` (en Mo), pour l'affichage. */
export const SPRITE_SIZE_MB: Record<SpriteSize, number> = { 128: 13, 512: 47 };

/** Toutes les images qui existent pour cette taille (normales et shiny), sans doublon. */
export function allSpriteUrls(size: SpriteSize): string[] {
  const urls = new Set<string>();
  for (const entry of dex) {
    if (hasSprite(entry.id, false)) urls.add(spriteUrl(entry.id, false, size));
    // `spriteUrl` retombe sur l'image normale quand le shiny n'existe pas : le Set dédouble.
    if (hasSprite(entry.id, true)) urls.add(spriteUrl(entry.id, true, size));
  }
  return [...urls];
}

export interface DownloadDeps {
  caches?: Pick<CacheStorage, 'open'>;
  fetchImpl?: typeof fetch;
  /** Téléchargements simultanés (défaut 6 : poli avec le serveur). */
  concurrency?: number;
}

export interface DownloadResult {
  /** Images mises en cache pendant cet appel (hors celles déjà présentes). */
  downloaded: number;
  /** Images déjà en cache (ignorées). */
  skipped: number;
  failed: number;
  cancelled: boolean;
}

export async function downloadSprites(
  size: SpriteSize,
  options: DownloadDeps & {
    onProgress?: (done: number, total: number) => void;
    signal?: AbortSignal;
  } = {},
): Promise<DownloadResult> {
  const cacheStorage = options.caches ?? caches;
  const fetchImpl = options.fetchImpl ?? fetch.bind(globalThis);
  const cache = await cacheStorage.open(SPRITE_CACHE);
  const urls = allSpriteUrls(size);
  const result: DownloadResult = { downloaded: 0, skipped: 0, failed: 0, cancelled: false };
  let next = 0;
  let done = 0;

  async function worker(): Promise<void> {
    while (next < urls.length) {
      if (options.signal?.aborted) {
        result.cancelled = true;
        return;
      }
      const url = urls[next++] as string;
      try {
        if (await cache.match(url)) {
          result.skipped++;
        } else {
          const response = await fetchImpl(url, { signal: options.signal });
          if (response.ok) {
            await cache.put(url, response);
            result.downloaded++;
          } else {
            result.failed++;
          }
        }
      } catch {
        if (options.signal?.aborted) result.cancelled = true;
        else result.failed++;
      }
      options.onProgress?.(++done, urls.length);
    }
  }

  await Promise.all(Array.from({ length: options.concurrency ?? 6 }, worker));
  return result;
}

/** Combien d'images sont en cache (toutes tailles). */
export async function countCachedSprites(
  cacheStorage: Pick<CacheStorage, 'open'> = caches,
): Promise<number> {
  return (await (await cacheStorage.open(SPRITE_CACHE)).keys()).length;
}

/** Libère l'espace : supprime toutes les images mises en cache. */
export async function clearCachedSprites(
  cacheStorage: Pick<CacheStorage, 'delete'> = caches,
): Promise<void> {
  await cacheStorage.delete(SPRITE_CACHE);
}
