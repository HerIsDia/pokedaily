import { describe, expect, it, vi } from 'vitest';
import { bindAttr, bindChildren, bindText, h, svg } from '../../src/ui/dom';
import { Scope } from '../../src/ui/scope';
import { createStore } from '../../src/ui/store';

describe('h()', () => {
  it('construit un élément avec classe, attributs et enfants', () => {
    const el = h(
      'div',
      { class: 'a b', 'data-x': 1, 'aria-label': 'ok' },
      'texte',
      h('span', null, 'x'),
    );
    expect(el.className).toBe('a b');
    expect(el.dataset.x).toBe('1');
    expect(el.getAttribute('aria-label')).toBe('ok');
    expect(el.textContent).toBe('textex');
  });

  it("n'interprète JAMAIS le HTML d'un texte (anti-XSS)", () => {
    const hostile =
      '<img src=x onerror="window.__pwned = true"><script>window.__pwned = true</script>';
    const el = h('p', null, hostile);
    expect(el.children).toHaveLength(0); // aucun élément créé
    expect(el.textContent).toBe(hostile); // affiché tel quel
    expect((window as unknown as { __pwned?: boolean }).__pwned).toBeUndefined();
  });

  it('refuse innerHTML / outerHTML', () => {
    expect(() => h('div', { innerHTML: '<b>x</b>' })).toThrow(/interdite/);
    expect(() => h('div', { outerHTML: '<b>x</b>' })).toThrow(/interdite/);
  });

  it('refuse les URLs javascript:', () => {
    expect(() => h('a', { href: 'javascript:alert(1)' })).toThrow(/URL non autorisée/);
    expect(() => h('img', { src: ' data:text/html,x' })).toThrow(/URL non autorisée/);
    expect(h('a', { href: 'https://example.org' }).getAttribute('href')).toBe(
      'https://example.org',
    );
  });

  it('ignore null / undefined / false et aplatit les tableaux', () => {
    const el = h('div', null, null, undefined, false, ['a', ['b', 3]]);
    expect(el.textContent).toBe('ab3');
  });

  it('branche les écouteurs onclick, etc.', () => {
    const onclick = vi.fn();
    const el = h('button', { onclick }, 'ok');
    el.click();
    expect(onclick).toHaveBeenCalledOnce();
  });

  it('gère les attributs booléens', () => {
    expect(h('button', { disabled: true }).disabled).toBe(true);
    expect(h('button', { disabled: false }).disabled).toBe(false);
    expect(h('input', { value: 'abc' }).value).toBe('abc');
  });
});

describe('svg()', () => {
  it('crée des éléments dans le bon espace de noms', () => {
    const el = svg('svg', { viewBox: '0 0 1 1' }, svg('path', { d: 'M0 0' }));
    expect(el.namespaceURI).toBe('http://www.w3.org/2000/svg');
    expect(el.firstElementChild?.namespaceURI).toBe('http://www.w3.org/2000/svg');
  });
});

describe('liaisons réactives', () => {
  it('bindText suit les changements puis se désabonne avec le scope', () => {
    const scope = new Scope();
    const name = createStore('Pikachu');
    const node = bindText(scope, [name], () => `Je suis ${name.get()}`);
    expect(node.data).toBe('Je suis Pikachu');
    name.set('Dracaufeu');
    expect(node.data).toBe('Je suis Dracaufeu');
    scope.dispose();
    name.set('Mew');
    expect(node.data).toBe('Je suis Dracaufeu'); // plus rien ne bouge
  });

  it('bindAttr ajoute/retire un attribut et gère hidden', () => {
    const scope = new Scope();
    const flag = createStore(true);
    const el = h('div');
    bindAttr(scope, el, 'data-on', [flag], () => (flag.get() ? 'oui' : undefined));
    bindAttr(scope, el, 'hidden', [flag], () => !flag.get());
    expect(el.getAttribute('data-on')).toBe('oui');
    expect(el.hidden).toBe(false);
    flag.set(false);
    expect(el.hasAttribute('data-on')).toBe(false);
    expect(el.hidden).toBe(true);
  });

  it('bindChildren remplace le contenu à chaque changement', () => {
    const scope = new Scope();
    const items = createStore(['a', 'b']);
    const ul = h('ul');
    bindChildren(scope, ul, [items], () => items.get().map((x) => h('li', null, x)));
    expect(ul.children).toHaveLength(2);
    items.set(['a', 'b', 'c']);
    expect(ul.children).toHaveLength(3);
  });
});
