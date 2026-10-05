export type Unsubscribe = () => void;

/**
 * Regroupe les « nettoyages » d'une vue (abonnements, écouteurs…).
 * Quand la vue disparaît, `dispose()` les exécute tous, une seule fois.
 */
export class Scope {
  private cleanups: Unsubscribe[] = [];
  private disposed = false;

  add(cleanup: Unsubscribe): void {
    if (this.disposed) {
      cleanup();
      return;
    }
    this.cleanups.push(cleanup);
  }

  get isDisposed(): boolean {
    return this.disposed;
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    for (const cleanup of this.cleanups.splice(0).reverse()) cleanup();
  }
}
