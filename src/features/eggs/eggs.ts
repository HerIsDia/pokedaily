import type { I18n } from '../../i18n';
import type { Scope } from '../../ui/scope';
import { showToast } from '../../ui/toast';

/** Le code Konami : ↑ ↑ ↓ ↓ ← → ← → B A. */
export const KONAMI = [
  'ArrowUp',
  'ArrowUp',
  'ArrowDown',
  'ArrowDown',
  'ArrowLeft',
  'ArrowRight',
  'ArrowLeft',
  'ArrowRight',
  'b',
  'a',
] as const;

/**
 * Reconnaît une suite de touches. Chaque appel reçoit une touche et dit si la suite vient d'être
 * complétée. On garde les dernières touches tapées et on cherche la plus longue FIN qui est aussi
 * un DÉBUT du code : ainsi un ↑ en trop (↑ ↑ ↑ ↓ ↓…) ne fait pas perdre le fil.
 */
export function createSequenceMatcher(sequence: readonly string[]): (key: string) => boolean {
  let typed: string[] = [];
  const same = (a: string, b: string | undefined) => a.toLowerCase() === b?.toLowerCase();
  return (key) => {
    typed = [...typed, key].slice(-sequence.length);
    if (typed.length === sequence.length && typed.every((k, i) => same(k, sequence[i]))) {
      typed = [];
      return true;
    }
    for (let length = typed.length; length > 0; length--) {
      const tail = typed.slice(-length);
      if (tail.every((k, i) => same(k, sequence[i]))) {
        typed = tail;
        return false;
      }
    }
    typed = [];
    return false;
  };
}

/**
 * Compte des appuis rapprochés : renvoie `true` à l'appui qui atteint `count` en moins de
 * `windowMs` depuis le premier. `now` est injectable pour les tests.
 */
export function createTapCounter(
  count: number,
  windowMs: number,
  now: () => number = Date.now,
): () => boolean {
  let taps: number[] = [];
  return () => {
    const time = now();
    taps = [...taps.filter((tap) => time - tap <= windowMs), time];
    if (taps.length >= count) {
      taps = [];
      return true;
    }
    return false;
  };
}

export interface EggsDeps {
  i18n: I18n;
  scope: Scope;
  /** Le logo de l'en-tête : 7 appuis rapides y cachent un petit message. */
  logo: HTMLElement;
}

/**
 * Les petits œufs de Pâques de l'application : un code secret au clavier, et le logo qui
 * chatouille. Aucun effet sur le jeu ni sur la sauvegarde : uniquement un sourire.
 */
export function installEggs({ i18n, scope, logo }: EggsDeps): void {
  const { t } = i18n;

  const konami = createSequenceMatcher(KONAMI);
  const onKey = (event: KeyboardEvent) => {
    // Ne pas réagir quand on tape dans un champ (le surnom contient des « a » et des « b »).
    const target = event.target as HTMLElement | null;
    if (target && /^(input|textarea|select)$/i.test(target.tagName)) return;
    if (konami(event.key)) showToast(t('egg.konami'), 5000);
  };
  window.addEventListener('keydown', onKey);
  scope.add(() => window.removeEventListener('keydown', onKey));

  const tickled = createTapCounter(7, 3000);
  const onTap = () => {
    if (tickled()) showToast(t('egg.tickle'));
  };
  logo.addEventListener('click', onTap);
  scope.add(() => logo.removeEventListener('click', onTap));

  // Pour les curieux qui ouvrent la console du navigateur.
  console.info(t('egg.console'));
}
