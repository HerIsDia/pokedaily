/// <reference lib="webworker" />
import { cleanupOutdatedCaches, precacheAndRoute } from 'workbox-precaching';

declare const self: ServiceWorkerGlobalScope;

// Phase 1 : uniquement le « shell » de l'app (liste injectée par vite-plugin-pwa).
// Les images, les événements et la mise à jour avec confirmation arrivent en phases 2 à 6.
cleanupOutdatedCaches();
precacheAndRoute(self.__WB_MANIFEST);
