import { beforeEach, describe, expect, it } from 'vitest';
import { clampName, createCardView, spritePath } from '../../src/features/card/card';
import { createSampleEntry } from '../../src/features/card/spike-data';
import { createI18n } from '../../src/i18n';
import { Scope } from '../../src/ui/scope';
import { createStore } from '../../src/ui/store';

function mount(lang: 'fr' | 'en' = 'fr') {
  const i18n = createI18n(lang);
  const entry = createStore(createSampleEntry());
  const scope = new Scope();
  const root = createCardView({ i18n, entry })({ scope });
  document.body.replaceChildren(root);
  const q = <T extends Element>(selector: string) => root.querySelector<T>(selector)!;
  return { i18n, entry, scope, root, q };
}

const press = (el: Element, key: string) =>
  el.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true }));

describe('carte du jour', () => {
  beforeEach(() => document.body.replaceChildren());

  it("affiche le numéro, le nom, le niveau, la nature, le type et l'image", () => {
    const { q } = mount('fr');
    expect(q('.card-number').textContent).toBe('N°0025');
    expect(q('.card-name').textContent).toBe('Pikachu');
    expect(q('.stats-row').textContent).toContain('42');
    expect(q('.stats-row').textContent).toContain('Jovial');
    expect(q('.type-electric').textContent).toBe('Électrik');
    expect(q<HTMLImageElement>('.card-portrait img').getAttribute('src')).toBe(
      spritePath(25, false),
    );
    expect(q('.card').getAttribute('data-type')).toBe('electric');
  });

  it('change de langue SANS recréer la carte ni le champ de surnom', () => {
    const { i18n, q, root } = mount('fr');
    const card = q('.card');
    const input = q<HTMLInputElement>('.name-input');
    i18n.setLang('en');
    expect(q('.type-electric').textContent).toBe('Electric');
    expect(q('.stats-row').textContent).toContain('Jolly');
    expect(q('.stats-row').textContent).toContain('Lv.');
    expect(root.querySelector('.card')).toBe(card);
    expect(root.querySelector('.name-input')).toBe(input);
  });

  describe('renommage', () => {
    it('ouvre le champ avec le focus, valide avec Entrée', () => {
      const { entry, q } = mount();
      const input = q<HTMLInputElement>('.name-input');
      expect(input.hidden).toBe(true);
      q<HTMLButtonElement>('.rename-btn').click();
      expect(input.hidden).toBe(false);
      expect(document.activeElement).toBe(input);

      input.value = '  Sparky  ';
      press(input, 'Enter');
      expect(entry.get().rename).toBe('Sparky');
      expect(q('.card-name').textContent).toBe('Sparky');
      expect(q('.card-original').textContent).toBe('Pikachu'); // nom d'espèce rappelé
      expect(q<HTMLElement>('.card-original').hidden).toBe(false);
      expect(input.hidden).toBe(true);
    });

    it('Échap annule ; le blur qui suit ne valide pas', () => {
      const { entry, q } = mount();
      const input = q<HTMLInputElement>('.name-input');
      q<HTMLButtonElement>('.rename-btn').click();
      input.value = 'Brouillon';
      press(input, 'Escape');
      input.dispatchEvent(new Event('blur'));
      expect(entry.get().rename).toBe('');
    });

    it('valide au blur', () => {
      const { entry, q } = mount();
      const input = q<HTMLInputElement>('.name-input');
      q<HTMLButtonElement>('.rename-btn').click();
      input.value = 'Pika';
      input.dispatchEvent(new Event('blur'));
      expect(entry.get().rename).toBe('Pika');
    });

    it("un nom vide ou égal au nom de l'espèce remet le nom d'origine", () => {
      const { entry, q } = mount();
      entry.update((e) => ({ ...e, rename: 'Sparky' }));
      const input = q<HTMLInputElement>('.name-input');
      q<HTMLButtonElement>('.rename-btn').click();
      expect(input.value).toBe('Sparky'); // le surnom actuel est pré-rempli
      input.value = 'Pikachu';
      press(input, 'Enter');
      expect(entry.get().rename).toBe('');
      expect(q<HTMLElement>('.card-original').hidden).toBe(true);
    });

    it('CONSERVE le champ et son focus si la langue change pendant la saisie', () => {
      const { i18n, q, root } = mount('fr');
      const input = q<HTMLInputElement>('.name-input');
      q<HTMLButtonElement>('.rename-btn').click();
      input.value = 'Écl';
      i18n.setLang('en');
      expect(root.querySelector('.name-input')).toBe(input); // même nœud
      expect(document.activeElement).toBe(input); // focus conservé
      expect(input.value).toBe('Écl'); // saisie conservée
      expect(input.getAttribute('aria-label')).toBe('Rename');
    });

    it("n'exécute jamais un surnom hostile (anti-XSS)", () => {
      const { q } = mount();
      const input = q<HTMLInputElement>('.name-input');
      q<HTMLButtonElement>('.rename-btn').click();
      input.value = '<img src=x onerror=alert(1)>';
      press(input, 'Enter');
      const title = q('.card-name');
      expect(title.children).toHaveLength(0);
      expect(title.textContent).toBe('<img src=x onerr'); // coupé à 16 caractères, affiché en texte
    });
  });

  it("remplace l'image par un repère si elle est introuvable", () => {
    const { q } = mount();
    q<HTMLImageElement>('.card-portrait img').dispatchEvent(new Event('error'));
    expect(q('.sprite-fallback')).not.toBeNull();
    expect(q('.sprite-fallback').getAttribute('aria-label')).toBe('Image indisponible');
  });

  it('affiche le badge shiny et le liseré doré', () => {
    const { entry, q } = mount();
    expect(document.querySelector('.badge-shiny')).toBeNull();
    entry.update((e) => ({ ...e, isShiny: true }));
    expect(q('.badge-shiny').textContent).toBe('✦ Shiny');
    expect(q('.card').hasAttribute('data-shiny')).toBe(true);
    expect(q<HTMLImageElement>('.card-portrait img').getAttribute('src')).toBe(
      spritePath(25, true),
    );
  });

  it('gère une forme (identifiant ≥ 10001) comme une espèce', () => {
    const { entry, q } = mount();
    entry.update((e) => ({ ...e, id: 10034 }));
    expect(q('.card-name').textContent).toBe('Méga-Dracaufeu X');
    expect(q('.card-number').textContent).toBe('N°10034');
  });

  it('libère ses abonnements quand la vue est détruite', () => {
    const { entry, q, scope } = mount();
    scope.dispose();
    entry.update((e) => ({ ...e, level: 99 }));
    expect(q('.stats-row').textContent).toContain('42'); // plus mis à jour
  });
});

describe('clampName', () => {
  it('coupe à 16 caractères réels sans casser un emoji', () => {
    expect(clampName('a'.repeat(30))).toHaveLength(16);
    const emojis = '🔥'.repeat(20);
    expect(Array.from(clampName(emojis))).toHaveLength(16);
    expect(clampName(emojis)).toBe('🔥'.repeat(16));
  });
  it('retire les espaces autour', () => {
    expect(clampName('  Pika  ')).toBe('Pika');
  });
});
