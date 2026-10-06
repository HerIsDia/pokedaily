import { createStore, type Store } from '../../ui/store';

const KEY = 'pokedaily.typeTheme';

/** Le réglage « thème selon le type du jour » (activé par défaut), mémorisé sur l'appareil. */
export interface TypeTheme {
  enabled: Store<boolean>;
}

export function createTypeTheme(
  storage: Pick<Storage, 'getItem' | 'setItem'> | null = safeLocalStorage(),
): TypeTheme {
  let initial = true;
  try {
    initial = storage?.getItem(KEY) !== 'off';
  } catch {
    // stockage bloqué : on garde le réglage par défaut
  }
  const enabled = createStore(initial);
  enabled.subscribe(
    (value) => {
      try {
        storage?.setItem(KEY, value ? 'on' : 'off');
      } catch {
        // pas grave : le réglage ne sera simplement pas retenu
      }
    },
    { immediate: false },
  );
  return { enabled };
}

function safeLocalStorage(): Storage | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}
