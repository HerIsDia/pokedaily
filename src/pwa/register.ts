import { createStore, type ReadStore } from '../ui/store';

/** Ce dont on a besoin de `workbox-window` (remplaçable dans les tests). */
export interface WorkboxLike {
  addEventListener(type: 'waiting' | 'controlling', listener: () => void): void;
  register(): Promise<unknown>;
  messageSkipWaiting(): void;
  update(): Promise<void>;
}

export interface Updater {
  /** Vrai quand une nouvelle version est installée et attend l'accord du joueur. */
  available: ReadStore<boolean>;
  /** Le joueur accepte : la nouvelle version prend la main et la page se recharge. */
  apply(): void;
  /** Le joueur dit « plus tard » (la proposition revient à la prochaine visite). */
  dismiss(): void;
  /** Demande au navigateur de chercher une nouvelle version (appelé de temps en temps). */
  check(): void;
  /** Arrête la vérification périodique. */
  stop(): void;
}

/** Vérification d'une nouvelle version : toutes les heures, et quand on revient sur l'application. */
const CHECK_EVERY_MS = 60 * 60 * 1000;

/**
 * Enregistre le service worker et gère la mise à jour AVEC CONFIRMATION : jamais de
 * rechargement surprise.
 */
export function createUpdater(
  load: () => Promise<WorkboxLike>,
  reload: () => void = () => window.location.reload(),
): Updater {
  const available = createStore(false);
  let workbox: WorkboxLike | null = null;
  let applying = false;
  let timer: ReturnType<typeof setInterval> | undefined;

  const check = () => {
    void workbox?.update().catch(() => undefined); // hors-ligne : sans importance
  };
  const onVisible = () => {
    if (document.visibilityState === 'visible') check();
  };

  void load()
    .then((wb) => {
      workbox = wb;
      wb.addEventListener('waiting', () => available.set(true));
      // Le nouveau worker a pris la main (après « Mettre à jour ») : on recharge UNE fois.
      wb.addEventListener('controlling', () => {
        if (applying) reload();
      });
      timer = setInterval(check, CHECK_EVERY_MS);
      document.addEventListener('visibilitychange', onVisible);
      return wb.register();
    })
    .catch((error: unknown) => {
      console.warn('[pokedaily] service worker indisponible', error);
    });

  return {
    available,
    apply() {
      if (!workbox) return;
      applying = true;
      workbox.messageSkipWaiting();
    },
    dismiss: () => available.set(false),
    check,
    stop() {
      clearInterval(timer);
      document.removeEventListener('visibilitychange', onVisible);
    },
  };
}

/**
 * Le vrai : `workbox-window`, chargé à la demande (il n'alourdit pas le premier affichage).
 * `null` en développement ou si le navigateur n'a pas de service worker.
 */
export function createBrowserUpdater(): Updater | null {
  if (!('serviceWorker' in navigator) || !import.meta.env.PROD) return null;
  return createUpdater(async () => {
    const { Workbox } = await import('workbox-window');
    return new Workbox('/sw.js') as unknown as WorkboxLike;
  });
}
