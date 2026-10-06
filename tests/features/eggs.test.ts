import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  createSequenceMatcher,
  createTapCounter,
  installEggs,
  KONAMI,
} from '../../src/features/eggs/eggs';
import { createI18n } from '../../src/i18n';
import { Scope } from '../../src/ui/scope';

describe('suite de touches (code Konami)', () => {
  const feedAll = (keys: readonly string[]) => {
    const match = createSequenceMatcher(KONAMI);
    return keys.map((key) => match(key));
  };

  it('se déclenche à la dernière touche, pas avant', () => {
    const results = feedAll(KONAMI);
    expect(results.slice(0, -1).every((r) => !r)).toBe(true);
    expect(results.at(-1)).toBe(true);
  });

  it('B et A sont reconnus en majuscules aussi', () => {
    expect(feedAll([...KONAMI.slice(0, 8), 'B', 'A']).at(-1)).toBe(true);
  });

  it('une erreur au milieu fait recommencer', () => {
    expect(feedAll([...KONAMI.slice(0, 5), 'x', ...KONAMI.slice(5)]).at(-1)).toBe(false);
  });

  it('une erreur qui est la 1ʳᵉ touche de la suite compte comme un nouveau début', () => {
    // ↑ ↑ ↑ ↑ ↓ … : le 3ᵉ ↑ ne doit pas tout casser
    expect(feedAll(['ArrowUp', ...KONAMI]).at(-1)).toBe(true);
  });

  it('peut se refaire plusieurs fois', () => {
    const match = createSequenceMatcher(KONAMI);
    const run = () => KONAMI.map((key) => match(key)).at(-1);
    expect([run(), run()]).toEqual([true, true]);
  });
});

describe('appuis rapprochés (le logo qui chatouille)', () => {
  it('se déclenche au 7ᵉ appui dans la fenêtre', () => {
    let now = 0;
    const tap = createTapCounter(7, 3000, () => now);
    const results = Array.from({ length: 7 }, () => {
      now += 200;
      return tap();
    });
    expect(results).toEqual([false, false, false, false, false, false, true]);
  });

  it('trop lent : rien', () => {
    let now = 0;
    const tap = createTapCounter(7, 3000, () => now);
    const results = Array.from({ length: 10 }, () => {
      now += 1000;
      return tap();
    });
    expect(results.some(Boolean)).toBe(false);
  });

  it('repart de zéro après le déclenchement', () => {
    let now = 0;
    const tap = createTapCounter(3, 3000, () => now);
    const results = Array.from({ length: 4 }, () => {
      now += 100;
      return tap();
    });
    expect(results).toEqual([false, false, true, false]);
  });
});

describe('installation dans la page', () => {
  beforeEach(() => {
    document.body.replaceChildren();
    vi.spyOn(console, 'info').mockImplementation(() => undefined);
  });

  const key = (k: string, target: EventTarget = window) =>
    target.dispatchEvent(new KeyboardEvent('keydown', { key: k, bubbles: true }));

  it('le code Konami affiche un message, qui se retire tout seul', () => {
    vi.useFakeTimers();
    const scope = new Scope();
    installEggs({ i18n: createI18n('fr'), scope, logo: document.createElement('span') });
    KONAMI.forEach((k) => key(k));
    const toast = document.querySelector('.toast');
    expect(toast?.getAttribute('role')).toBe('status');
    expect(toast?.textContent).toContain('+30 vies');
    vi.advanceTimersByTime(5100);
    expect(document.querySelector('.toast')).toBeNull();
    scope.dispose();
    vi.useRealTimers();
  });

  it('ne réagit pas quand on tape dans un champ', () => {
    const scope = new Scope();
    installEggs({ i18n: createI18n('fr'), scope, logo: document.createElement('span') });
    const input = document.createElement('input');
    document.body.append(input);
    KONAMI.forEach((k) => key(k, input));
    expect(document.querySelector('.toast')).toBeNull();
    scope.dispose();
  });

  it('7 clics sur le logo : un petit message (en anglais si besoin)', () => {
    const scope = new Scope();
    const logo = document.createElement('span');
    installEggs({ i18n: createI18n('en'), scope, logo });
    for (let i = 0; i < 7; i++) logo.click();
    expect(document.querySelector('.toast')?.textContent).toContain('tickles');
    scope.dispose();
  });

  it('une fois l’écran fermé, plus rien ne réagit', () => {
    const scope = new Scope();
    const logo = document.createElement('span');
    installEggs({ i18n: createI18n('fr'), scope, logo });
    scope.dispose();
    for (let i = 0; i < 7; i++) logo.click();
    KONAMI.forEach((k) => key(k));
    expect(document.querySelector('.toast')).toBeNull();
  });
});
