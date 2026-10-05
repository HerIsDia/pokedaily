import type { Scope } from './scope';
import { bindText, h, svg } from './dom';
import type { ReadStore } from './store';

export interface ModalOptions {
  scope: Scope;
  /** Titre (relu quand ces états changent, ex. la langue). */
  title: () => string;
  titleDeps: readonly ReadStore<unknown>[];
  /** Texte du bouton de fermeture (lecteur d'écran). */
  closeLabel: () => string;
  body: HTMLElement;
  /** Appelée à chaque ouverture (ex. rafraîchir le contenu). */
  onOpen?: () => void;
}

export interface Modal {
  element: HTMLDialogElement;
  /** Pendant qu'une action est en cours, Échap et le bouton Fermer sont sans effet. */
  setBusy(busy: boolean): void;
  open(): void;
  close(): void;
}

let counter = 0;

/**
 * Une fenêtre modale accessible, basée sur l'élément natif `<dialog>` :
 * le navigateur s'occupe du piège à focus, de la touche Échap, du reste de la page rendu
 * inactif et du retour du focus sur le bouton qui l'a ouverte. On ajoute la fermeture au clic sur
 * le fond. (Navigateur sans `showModal` : repli sur l'attribut `open`.)
 */
export function createModal({
  scope,
  title,
  titleDeps,
  closeLabel,
  body,
  onOpen,
}: ModalOptions): Modal {
  const titleId = `modal-title-${++counter}`;
  const close = h(
    'button',
    { class: 'modal-close', type: 'button', onclick: () => api.close() },
    svg(
      'svg',
      {
        viewBox: '0 0 24 24',
        fill: 'none',
        stroke: 'currentColor',
        'stroke-width': 2.5,
        'stroke-linecap': 'round',
        'aria-hidden': 'true',
      },
      svg('line', { x1: 18, y1: 6, x2: 6, y2: 18 }),
      svg('line', { x1: 6, y1: 6, x2: 18, y2: 18 }),
    ),
  );
  const element = h(
    'dialog',
    {
      class: 'modal',
      'aria-labelledby': titleId,
      // Un clic sur le fond (= sur le <dialog> lui-même, pas sur son contenu) ferme la fenêtre.
      onclick: (event) => {
        if (event.target === element) api.close();
      },
    },
    h(
      'div',
      { class: 'modal-panel' },
      h(
        'div',
        { class: 'modal-header' },
        h('h2', { class: 'modal-title', id: titleId }, bindText(scope, titleDeps, title)),
        close,
      ),
      h('div', { class: 'modal-body' }, body),
    ),
  );
  close.setAttribute('aria-label', closeLabel());
  scope.add(() => {
    busy = false;
    if (element.open) api.close();
  });

  let busy = false;
  // Échap (événement `cancel`) : refusé tant que la fenêtre est occupée.
  element.addEventListener('cancel', (event) => {
    if (busy) event.preventDefault();
  });

  const api: Modal = {
    element,
    setBusy(value) {
      busy = value;
      close.disabled = value;
      element.toggleAttribute('data-busy', value);
    },
    open() {
      if (element.open) return;
      onOpen?.();
      close.setAttribute('aria-label', closeLabel());
      if (typeof element.showModal === 'function') element.showModal();
      else element.setAttribute('open', '');
      close.focus();
    },
    close() {
      if (busy) return;
      if (typeof element.close === 'function') element.close();
      else element.removeAttribute('open');
    },
  };
  return api;
}
