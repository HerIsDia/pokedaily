/// <reference lib="webworker" />
import { cleanupOutdatedCaches, precacheAndRoute } from 'workbox-precaching';
import { registerRoute } from 'workbox-routing';
import { CacheFirst } from 'workbox-strategies';
import { CacheableResponsePlugin } from 'workbox-cacheable-response';

declare const self: ServiceWorkerGlobalScope;

// Clean up old caches on activation
cleanupOutdatedCaches();

// Pre-cache the app shell (injected by vite-plugin-pwa — excludes /images/)
precacheAndRoute(self.__WB_MANIFEST);

// Runtime caching for Pokemon images: serve from cache, fetch on miss
registerRoute(
  ({ url }) => url.pathname.startsWith('/images/'),
  new CacheFirst({
    cacheName: 'pokemon-images-v1',
    plugins: [
      new CacheableResponsePlugin({ statuses: [0, 200] }),
    ],
  })
);

// --- Message handlers ---
self.addEventListener('message', (event: ExtendableMessageEvent) => {
  if (!event.data) return;

  // Client requests immediate activation of a new SW
  if (event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
    return;
  }

  // Client requests bulk pre-caching of all Pokemon images (only on unlimited connections)
  if (event.data.type === 'PRECACHE_IMAGES') {
    event.waitUntil(precacheAllImages());
  }
});

async function precacheAllImages(): Promise<void> {
  const cache = await caches.open('pokemon-images-v1');
  const total = 1025;
  const batchSize = 15;

  for (let i = 1; i <= total; i += batchSize) {
    const end = Math.min(i + batchSize - 1, total);
    const batch: Promise<void>[] = [];

    for (let id = i; id <= end; id++) {
      const padded = id.toString().padStart(3, '0');
      // Cache normal and shiny variants; ignore failures (image may already be cached)
      batch.push(
        cache.add(`/images/${padded}.png`).catch(() => undefined)
      );
      batch.push(
        cache.add(`/images/${padded}S.png`).catch(() => undefined)
      );
    }

    await Promise.all(batch);

    // Report progress to all connected clients
    const clients = await self.clients.matchAll({ type: 'window' });
    for (const client of clients) {
      client.postMessage({
        type: 'PRECACHE_PROGRESS',
        current: end,
        total,
      });
    }
  }

  // Done
  const clients = await self.clients.matchAll({ type: 'window' });
  for (const client of clients) {
    client.postMessage({ type: 'PRECACHE_COMPLETE' });
  }
}
