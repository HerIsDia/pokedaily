import { describe, expect, it, vi } from 'vitest';
import { Scope } from '../../src/ui/scope';
import { createStore } from '../../src/ui/store';

describe('createStore', () => {
  it('get / set / update', () => {
    const s = createStore(1);
    s.set(2);
    s.update((n) => n + 1);
    expect(s.get()).toBe(3);
  });

  it("appelle l'abonné tout de suite (par défaut) puis à chaque changement", () => {
    const s = createStore('a');
    const listener = vi.fn();
    s.subscribe(listener);
    s.set('b');
    expect(listener.mock.calls).toEqual([['a'], ['b']]);
  });

  it('immediate: false ne rappelle pas tout de suite', () => {
    const s = createStore(0);
    const listener = vi.fn();
    s.subscribe(listener, { immediate: false });
    expect(listener).not.toHaveBeenCalled();
  });

  it('ne notifie pas si la valeur est identique', () => {
    const s = createStore(5);
    const listener = vi.fn();
    s.subscribe(listener, { immediate: false });
    s.set(5);
    expect(listener).not.toHaveBeenCalled();
  });

  it('se désabonne, et un abonné en panne ne bloque pas les autres', () => {
    const errors = vi.spyOn(console, 'error').mockImplementation(() => {});
    const s = createStore(0);
    const ok = vi.fn();
    s.subscribe(
      () => {
        throw new Error('boom');
      },
      { immediate: false },
    );
    const off = s.subscribe(ok, { immediate: false });
    s.set(1);
    expect(ok).toHaveBeenCalledWith(1);
    off();
    s.set(2);
    expect(ok).toHaveBeenCalledTimes(1);
    expect(errors).toHaveBeenCalled();
    errors.mockRestore();
  });
});

describe('Scope', () => {
  it('exécute les nettoyages une seule fois, en ordre inverse', () => {
    const order: number[] = [];
    const scope = new Scope();
    scope.add(() => order.push(1));
    scope.add(() => order.push(2));
    scope.dispose();
    scope.dispose();
    expect(order).toEqual([2, 1]);
  });

  it('nettoie tout de suite si le scope est déjà détruit', () => {
    const scope = new Scope();
    scope.dispose();
    const cleanup = vi.fn();
    scope.add(cleanup);
    expect(cleanup).toHaveBeenCalledOnce();
  });
});
