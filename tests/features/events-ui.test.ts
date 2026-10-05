import { beforeEach, describe, expect, it } from 'vitest';
import type { GameEvent } from '../../src/core/events/types';
import { events as realEvents } from '../../src/data/events';
import { describeModifiers } from '../../src/features/events/modifiers';
import { createEventsUi } from '../../src/features/events/events-ui';
import { createI18n } from '../../src/i18n';
import { Scope } from '../../src/ui/scope';
import { createStore } from '../../src/ui/store';

const i18n = createI18n('fr');
const find = (id: string): GameEvent => realEvents.find((e) => e.id === id)!;

describe('étiquettes des effets d’un événement', () => {
  it('Poisson d’avril : Pokémon garanti, 1/100, ticket, boîte', () => {
    expect(describeModifiers(find('april_fools').modifiers, i18n)).toEqual([
      '🎯 Pokémon spécial garanti',
      '✦ Taux de shiny : 1/100',
      '🎟️ Tickets Victini : 1',
      "🎁 Boîte spéciale « Poisson d'avril » offerte",
    ]);
  });

  it('Lucky Day : 1/13, 1–3 tickets, boîte', () => {
    expect(describeModifiers(find('lucky_day').modifiers, i18n)).toEqual([
      '✦ Taux de shiny : 1/13',
      '🎟️ Tickets Victini : 1–3',
      '🎁 Boîte spéciale « Lucky Day » offerte',
    ]);
  });

  it('chance partielle, shiny garanti, niveau imposé', () => {
    expect(describeModifiers(find('pokemon_day').modifiers, i18n)).toEqual([
      "🎯 10 % de chances d'un Pokémon spécial",
      '✦ Shiny garanti',
    ]);
    expect(describeModifiers(find('diamant_day').modifiers, i18n)).toEqual([
      '✦ Shiny garanti',
      '⭐ Niveau 69',
    ]);
  });

  it('en anglais', () => {
    expect(describeModifiers(find('new_year').modifiers, createI18n('en'))).toEqual([
      '✦ Shiny rate: 1/50',
      '⭐ Level 100',
    ]);
  });

  it('un événement sans effet visible ne produit rien', () => {
    expect(describeModifiers({}, i18n)).toEqual([]);
  });
});

function mount(day: string, lang: 'fr' | 'en' = 'fr') {
  const today = createStore(day);
  const local = createI18n(lang);
  const { badge, modal } = createEventsUi({
    i18n: local,
    scope: new Scope(),
    events: realEvents,
    today,
  });
  document.body.replaceChildren(badge, modal.element);
  return { badge, modal, today, i18n: local };
}

describe('bandeau et fenêtre des événements', () => {
  beforeEach(() => document.body.replaceChildren());

  it('un jour de fête : le nom de l’événement en cours', () => {
    const { badge } = mount('2026-12-25');
    expect(badge.hidden).toBe(false);
    expect(badge.hasAttribute('data-active')).toBe(true);
    expect(badge.textContent).toContain('Joyeux Noël');
    // Le nom accessible COMMENCE par le texte visible (règle « label in name »).
    expect(badge.getAttribute('aria-label')).toBe('Joyeux Noël ! — ouvrir la liste des événements');
  });

  it('plusieurs événements le même jour : « +N »', () => {
    // Le 25 mars 2026 est un vendredi : il peut y en avoir plusieurs ; on cherche un jour à 2+.
    const { badge, today } = mount('2026-03-01');
    const days = Array.from({ length: 366 }, (_, i) => {
      const d = new Date(Date.UTC(2026, 0, 1 + i));
      return d.toISOString().slice(0, 10);
    });
    const many = days.find((d) => {
      today.set(d);
      return badge.querySelector('.event-extra') !== null;
    });
    expect(many).toBeDefined();
  });

  it('sans événement en cours : le prochain, avec son compte à rebours', () => {
    const { badge } = mount('2026-12-23');
    expect(badge.hasAttribute('data-active')).toBe(false);
    expect(badge.textContent).toMatch(/dans 2 j|demain/);
  });

  it('la veille : « demain »', () => {
    const { badge } = mount('2026-12-24');
    expect(badge.textContent).toContain('demain');
  });

  it('un événement ponctuel terminé n’a plus de compte à rebours (Pokopia, mars 2026)', () => {
    const { modal } = mount('2026-10-05');
    modal.open();
    const names = [...modal.element.querySelectorAll('.event-card-name')].map((n) => n.textContent);
    expect(names).not.toContain('Sortie de Pokopia');
  });

  it('s’ouvre au clic, liste en cours puis à venir, et se ferme au bouton', () => {
    const { badge, modal } = mount('2026-12-25');
    expect(modal.element.open).toBe(false);
    badge.click();
    expect(modal.element.open).toBe(true);
    const sections = [...modal.element.querySelectorAll('.events-section')].map(
      (n) => n.textContent,
    );
    expect(sections).toEqual(['En cours', 'À venir']);
    expect(modal.element.querySelector('.event-card.active .event-chips')?.textContent).toContain(
      'Taux de shiny',
    );
    expect(modal.element.getAttribute('aria-labelledby')).toBe(
      modal.element.querySelector('.modal-title')?.id,
    );
    modal.element.querySelector<HTMLButtonElement>('.modal-close')!.click();
    expect(modal.element.open).toBe(false);
  });

  it('un clic sur le fond ferme, un clic dans le contenu non', () => {
    const { badge, modal } = mount('2026-12-25');
    badge.click();
    modal.element.querySelector<HTMLElement>('.modal-panel')!.click();
    expect(modal.element.open).toBe(true);
    modal.element.click(); // la cible est le <dialog> lui-même = le fond
    expect(modal.element.open).toBe(false);
  });

  it('suit la langue et le changement de jour en direct', () => {
    const { badge, modal, today, i18n: local } = mount('2026-12-25');
    badge.click();
    local.setLang('en');
    expect(badge.textContent).toContain('Merry Christmas');
    expect(modal.element.querySelector('.modal-title')?.textContent).toBe('Events');
    expect(modal.element.querySelector('.modal-close')).not.toBeNull();
    today.set('2026-12-26');
    expect(badge.hasAttribute('data-active')).toBe(false);
  });
});
