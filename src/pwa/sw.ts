/// <reference lib="webworker" />
import { clientsClaim } from 'workbox-core';
import { ExpirationPlugin } from 'workbox-expiration';
import { CacheableResponsePlugin } from 'workbox-cacheable-response';
import {
  cleanupOutdatedCaches,
  createHandlerBoundToURL,
  precacheAndRoute,
} from 'workbox-precaching';
import { NavigationRoute, registerRoute } from 'workbox-routing';
import { CacheFirst } from 'workbox-strategies';
import { SPRITE_CACHE, SPRITE_CACHE_MAX_ENTRIES } from './constants';

declare const self: ServiceWorkerGlobalScope;

/**
 * Le service worker de Pokédaily (un seul).
 *
 *  1. SHELL : l'application elle-même (HTML, JS, CSS, police, icônes) est mise en cache à
 *     l'installation (liste injectée par vite-plugin-pwa). Les événements et les données des
 *     Pokémon sont DANS le JS : tout fonctionne hors-ligne dès la première visite.
 *  2. NAVIGATION : n'importe quelle adresse de l'application (`/?lang=en`, `/?preview=25`…)
 *     renvoie la page d'accueil en cache quand on est hors-ligne.
 *  3. IMAGES : « cache d'abord » — une image vue une fois reste disponible hors-ligne. Le
 *     téléchargement de toutes les images est une action volontaire (page « À propos »).
 *  4. MISE À JOUR AVEC CONFIRMATION : une nouvelle version s'installe en arrière-plan puis
 *     ATTEND ; elle ne prend la main que si le joueur le demande (message `SKIP_WAITING`).
 *     En v3.1 la mise à jour pouvait remplacer l'app sous les doigts du joueur.
 */

cleanupOutdatedCaches();
precacheAndRoute(self.__WB_MANIFEST);
registerRoute(new NavigationRoute(createHandlerBoundToURL('/index.html')));

registerRoute(
  ({ url }) => url.origin === self.location.origin && url.pathname.startsWith('/sprites/'),
  new CacheFirst({
    cacheName: SPRITE_CACHE,
    plugins: [
      // Seulement les vraies réponses : une image absente (404) n'est jamais mémorisée.
      new CacheableResponsePlugin({ statuses: [200] }),
      new ExpirationPlugin({ maxEntries: SPRITE_CACHE_MAX_ENTRIES, purgeOnQuotaError: true }),
    ],
  }),
);

self.addEventListener('message', (event) => {
  if ((event.data as { type?: string } | null)?.type === 'SKIP_WAITING') void self.skipWaiting();
});

// Une fois activée (sur demande), la nouvelle version prend le contrôle des pages ouvertes.
clientsClaim();
