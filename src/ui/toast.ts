import { h } from './dom';

/**
 * Un petit message qui s'affiche en bas de l'écran puis disparaît tout seul (annoncé aux lecteurs
 * d'écran grâce à `role="status"`). Un seul à la fois : un nouveau remplace l'ancien.
 */
export function showToast(text: string, durationMs = 4000): () => void {
  document.querySelector('.toast')?.remove();
  const toast = h('p', { class: 'toast', role: 'status' }, text);
  document.body.append(toast);
  const timer = setTimeout(() => toast.remove(), durationMs);
  return () => {
    clearTimeout(timer);
    toast.remove();
  };
}
