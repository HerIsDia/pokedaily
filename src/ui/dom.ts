import type { Scope } from './scope';
import type { ReadStore } from './store';

/**
 * Construction du DOM SANS moteur de rendu.
 *
 * Règle de sécurité : tout texte passe par des nœuds texte (jamais du HTML brut).
 * Un surnom comme `<img src=x onerror=...>` s'affiche donc tel quel, sans rien exécuter.
 */

export type Child = Node | string | number | null | undefined | false | readonly Child[];

type EventHandlers = {
  [K in keyof HTMLElementEventMap as `on${K}`]?: (event: HTMLElementEventMap[K]) => void;
};

export type Props = EventHandlers & { class?: string; [name: string]: unknown };

const SVG_NS = 'http://www.w3.org/2000/svg';
const FORBIDDEN_PROPS = new Set(['innerHTML', 'outerHTML']);
const URL_PROPS = new Set(['href', 'src', 'action', 'formaction']);
const BOOLEAN_PROPS = new Set(['checked', 'disabled', 'hidden', 'selected', 'readOnly']);
const LIVE_PROPS = new Set(['value', ...BOOLEAN_PROPS]);

function applyProp(el: Element, name: string, value: unknown): void {
  if (value === undefined || value === null) return;
  if (FORBIDDEN_PROPS.has(name)) {
    throw new Error(`h(): la propriété « ${name} » est interdite (passe le texte en enfant).`);
  }
  if (name === 'class') {
    el.setAttribute('class', String(value));
    return;
  }
  if (name.startsWith('on') && typeof value === 'function') {
    el.addEventListener(name.slice(2).toLowerCase(), value as EventListener);
    return;
  }
  if (URL_PROPS.has(name) && /^\s*(javascript|data|vbscript):/i.test(String(value))) {
    throw new Error(`h(): URL non autorisée pour « ${name} ».`);
  }
  if (LIVE_PROPS.has(name) && name in el) {
    (el as unknown as Record<string, unknown>)[name] = value;
    return;
  }
  if (value === false) return;
  el.setAttribute(name, value === true ? '' : String(value));
}

export function appendChildren(parent: Node, children: readonly Child[]): void {
  for (const child of children) {
    if (child === null || child === undefined || child === false) continue;
    if (Array.isArray(child)) appendChildren(parent, child as readonly Child[]);
    else if (child instanceof Node) parent.appendChild(child);
    else parent.appendChild(document.createTextNode(String(child)));
  }
}

export function h<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  props?: Props | null,
  ...children: Child[]
): HTMLElementTagNameMap[K] {
  const el = document.createElement(tag);
  for (const [name, value] of Object.entries(props ?? {})) applyProp(el, name, value);
  appendChildren(el, children);
  return el;
}

/** Même chose pour les icônes SVG (espace de noms différent). */
export function svg(tag: string, props?: Props | null, ...children: Child[]): SVGElement {
  const el = document.createElementNS(SVG_NS, tag);
  for (const [name, value] of Object.entries(props ?? {})) applyProp(el, name, value);
  appendChildren(el, children);
  return el;
}

// ── Liaisons réactives ─────────────────────────────────────────────────────

/** Exécute `run` maintenant puis à chaque changement d'un des états `deps`. */
export function effect(scope: Scope, deps: readonly ReadStore<unknown>[], run: () => void): void {
  run();
  for (const dep of deps) scope.add(dep.subscribe(run, { immediate: false }));
}

/** Un nœud texte qui se met à jour tout seul. */
export function bindText(
  scope: Scope,
  deps: readonly ReadStore<unknown>[],
  read: () => string,
): Text {
  const node = document.createTextNode('');
  effect(scope, deps, () => {
    const next = read();
    if (node.data !== next) node.data = next;
  });
  return node;
}

/** Un attribut qui se met à jour tout seul (`undefined`/`false` = on le retire). */
export function bindAttr(
  scope: Scope,
  el: Element,
  name: string,
  deps: readonly ReadStore<unknown>[],
  read: () => string | boolean | undefined,
): void {
  effect(scope, deps, () => {
    const value = read();
    if (BOOLEAN_PROPS.has(name) && name in el) {
      (el as unknown as Record<string, unknown>)[name] = value === true || value === '';
    } else if (value === undefined || value === false) el.removeAttribute(name);
    else el.setAttribute(name, value === true ? '' : value);
  });
}

/** Remplace les enfants d'un conteneur quand l'un des états change. */
export function bindChildren(
  scope: Scope,
  container: Element,
  deps: readonly ReadStore<unknown>[],
  build: () => Child[],
): void {
  effect(scope, deps, () => {
    const fragment = document.createDocumentFragment();
    appendChildren(fragment, build());
    container.replaceChildren(fragment);
  });
}
