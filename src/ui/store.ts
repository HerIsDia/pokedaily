import type { Unsubscribe } from './scope';

export interface SubscribeOptions {
  /** Appelle tout de suite l'écouteur avec la valeur courante (défaut : oui). */
  immediate?: boolean;
}

export interface ReadStore<T> {
  get(): T;
  subscribe(listener: (value: T) => void, options?: SubscribeOptions): Unsubscribe;
}

export interface Store<T> extends ReadStore<T> {
  set(next: T): void;
  update(change: (current: T) => T): void;
}

/**
 * Petit état réactif : une valeur + des abonnés.
 * Remplace le « instantané + rechargement de la page » de la v3.
 */
export function createStore<T>(initial: T, equals: (a: T, b: T) => boolean = Object.is): Store<T> {
  let value = initial;
  const listeners = new Set<(value: T) => void>();

  function notify(): void {
    // Copie : un écouteur peut se désabonner pendant la notification.
    for (const listener of [...listeners]) {
      try {
        listener(value);
      } catch (error) {
        // Un abonné en panne ne doit pas empêcher les autres de se mettre à jour.
        console.error('[store] écouteur en erreur', error);
      }
    }
  }

  return {
    get: () => value,
    set(next) {
      if (equals(value, next)) return;
      value = next;
      notify();
    },
    update(change) {
      this.set(change(value));
    },
    subscribe(listener, options) {
      listeners.add(listener);
      if (options?.immediate ?? true) listener(value);
      return () => {
        listeners.delete(listener);
      };
    },
  };
}

/**
 * Une valeur CALCULÉE à partir d'un autre état (ex. « le Pokémon du jour » depuis tout l'état du
 * jeu). Les abonnés ne sont prévenus que si le résultat change vraiment : un écran qui n'affiche
 * que le Pokémon du jour ne se redessine pas quand les tickets bougent.
 */
export function derived<T, U>(
  source: ReadStore<T>,
  map: (value: T) => U,
  equals: (a: U, b: U) => boolean = Object.is,
): ReadStore<U> {
  return {
    get: () => map(source.get()),
    subscribe(listener, options) {
      let previous = map(source.get());
      if (options?.immediate ?? true) listener(previous);
      return source.subscribe(
        (value) => {
          const next = map(value);
          if (equals(previous, next)) return;
          previous = next;
          listener(next);
        },
        { immediate: false },
      );
    },
  };
}
