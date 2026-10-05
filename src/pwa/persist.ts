/**
 * Demande au navigateur de ne pas effacer les données de Pokédaily « pour faire de la place »
 * (la collection n'existe qu'ici : aucun serveur n'en garde de copie). Seulement quand
 * l'application est INSTALLÉE : c'est là que les navigateurs accordent la demande sans question
 * (Firefox, lui, demanderait une autorisation à la joueuse dans un simple onglet).
 */
export interface PersistEnv {
  isInstalled(): boolean;
  storage?: Pick<StorageManager, 'persist' | 'persisted'>;
}

export function browserPersistEnv(): PersistEnv {
  return {
    isInstalled: () =>
      (typeof matchMedia === 'function' && matchMedia('(display-mode: standalone)').matches) ||
      (navigator as Navigator & { standalone?: boolean }).standalone === true,
    storage: typeof navigator !== 'undefined' ? navigator.storage : undefined,
  };
}

/** `true` si les données sont (désormais) protégées, `false` sinon, `null` si on n'a rien tenté. */
export async function requestPersistence(
  env: PersistEnv = browserPersistEnv(),
): Promise<boolean | null> {
  if (!env.isInstalled() || !env.storage?.persist) return null;
  try {
    if (await env.storage.persisted?.()) return true;
    return await env.storage.persist();
  } catch {
    return false;
  }
}
