import { createStore, type ReadStore } from '../ui/store';

/**
 * Installer Pokédaily sur l'écran d'accueil.
 *  - Android / ordinateur (Chrome, Edge) : le navigateur propose l'installation par un événement ;
 *    on le garde et on le déclenche quand la joueuse appuie sur « Installer ».
 *  - iPhone / iPad : AUCUN bouton d'installation n'existe : il faut passer par le menu Partager
 *    de Safari. On affiche donc une aide pas à pas.
 */
export type InstallState = 'installed' | 'prompt' | 'ios' | 'none';

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export interface InstallEnv {
  /** Événements de la fenêtre (`beforeinstallprompt`, `appinstalled`). */
  window: Pick<Window, 'addEventListener' | 'removeEventListener'>;
  isStandalone(): boolean;
  isIos(): boolean;
}

export function browserInstallEnv(): InstallEnv {
  return {
    window,
    isStandalone: () =>
      (typeof matchMedia === 'function' && matchMedia('(display-mode: standalone)').matches) ||
      (navigator as Navigator & { standalone?: boolean }).standalone === true,
    isIos: () =>
      /iphone|ipad|ipod/i.test(navigator.userAgent) ||
      // iPadOS se fait passer pour un Mac, mais il a un écran tactile.
      (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1),
  };
}

export interface Installer {
  state: ReadStore<InstallState>;
  /** Déclenche la fenêtre d'installation du navigateur (état « prompt »). */
  prompt(): Promise<'accepted' | 'dismissed' | 'unavailable'>;
  stop(): void;
}

export function createInstaller(env: InstallEnv = browserInstallEnv()): Installer {
  let deferred: BeforeInstallPromptEvent | null = null;
  const initial = (): InstallState =>
    env.isStandalone() ? 'installed' : env.isIos() ? 'ios' : 'none';
  const state = createStore<InstallState>(initial());

  const onPrompt = (event: Event) => {
    event.preventDefault(); // on choisit nous-mêmes quand proposer
    deferred = event as BeforeInstallPromptEvent;
    if (state.get() !== 'installed') state.set('prompt');
  };
  const onInstalled = () => {
    deferred = null;
    state.set('installed');
  };
  env.window.addEventListener('beforeinstallprompt', onPrompt);
  env.window.addEventListener('appinstalled', onInstalled);

  return {
    state,
    async prompt() {
      const event = deferred;
      if (!event) return 'unavailable';
      deferred = null; // un événement ne sert qu'une fois
      await event.prompt();
      const { outcome } = await event.userChoice;
      state.set(outcome === 'accepted' ? 'installed' : initial());
      return outcome;
    },
    stop() {
      env.window.removeEventListener('beforeinstallprompt', onPrompt);
      env.window.removeEventListener('appinstalled', onInstalled);
    },
  };
}
