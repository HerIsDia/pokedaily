import { eventStatuses, type EventStatus } from '../../core/events/engine';
import type { GameEvent } from '../../core/events/types';
import type { I18n } from '../../i18n';
import type { Lang } from '../../i18n';
import { bindAttr, bindChildren, h } from '../../ui/dom';
import { createModal, type Modal } from '../../ui/dialog';
import type { Scope } from '../../ui/scope';
import type { ReadStore } from '../../ui/store';
import { describeModifiers } from './modifiers';

export interface EventsUiDeps {
  i18n: I18n;
  scope: Scope;
  events: readonly GameEvent[];
  /** Le jour local d'aujourd'hui (l'état qui change à minuit). */
  today: ReadStore<string>;
}

export const eventName = (event: GameEvent, lang: Lang) =>
  lang === 'fr' ? event.nameFr : event.nameEn;
export const eventDescription = (event: GameEvent, lang: Lang) =>
  lang === 'fr' ? event.descriptionFr : event.descriptionEn;

/**
 * Le bandeau d'événement (bouton sous l'en-tête de l'accueil) et la fenêtre qui liste les
 * événements en cours et à venir. Renvoie les deux éléments à poser dans la page.
 */
export function createEventsUi({ i18n, scope, events, today }: EventsUiDeps): {
  badge: HTMLButtonElement;
  modal: Modal;
} {
  const { t, lang } = i18n;
  const statuses = (): EventStatus[] => eventStatuses(events, today.get());
  const countdown = (days: number) =>
    days === 1 ? t('event.tomorrow') : t('event.inDays', { days });

  // ── Bandeau ─────────────────────────────────────────────────────────
  const badge = h('button', { class: 'event-badge', type: 'button', 'aria-haspopup': 'dialog' });
  bindChildren(scope, badge, [today, lang], () => {
    const all = statuses();
    const active = all.filter((s) => s.isActive);
    const next = all.find((s) => !s.isActive);
    if (active.length > 0) {
      return [
        h('span', { class: 'event-dot', 'aria-hidden': 'true' }),
        h('span', { class: 'event-label' }, eventName(active[0]!.event, lang.get())),
        active.length > 1 ? h('span', { class: 'event-extra' }, `+${active.length - 1}`) : null,
      ];
    }
    if (next) {
      return [
        h(
          'span',
          { class: 'event-label muted' },
          `⏱ ${eventName(next.event, lang.get())} · ${countdown(next.daysUntil)}`,
        ),
      ];
    }
    return [];
  });
  bindAttr(scope, badge, 'hidden', [today], () => statuses().length === 0);
  bindAttr(scope, badge, 'data-active', [today], () => statuses().some((s) => s.isActive));

  // ── Fenêtre ─────────────────────────────────────────────────────────
  const body = h('div', { class: 'events-list' });
  const card = (status: EventStatus) =>
    h(
      'article',
      { class: status.isActive ? 'event-card active' : 'event-card' },
      h(
        'div',
        { class: 'event-card-head' },
        h('h3', { class: 'event-card-name' }, eventName(status.event, lang.get())),
        h(
          'span',
          { class: status.isActive ? 'event-state active' : 'event-state' },
          status.isActive ? t('event.active') : countdown(status.daysUntil),
        ),
      ),
      h('p', { class: 'event-card-desc' }, eventDescription(status.event, lang.get())),
      h(
        'div',
        { class: 'event-chips' },
        ...describeModifiers(status.event.modifiers, i18n).map((chip) =>
          h('span', { class: 'modifier-chip' }, chip),
        ),
      ),
    );
  bindChildren(scope, body, [today, lang], () => {
    const all = statuses();
    const active = all.filter((s) => s.isActive);
    const upcoming = all.filter((s) => !s.isActive);
    return [
      active.length ? h('h3', { class: 'events-section' }, t('event.sectionActive')) : null,
      ...active.map(card),
      upcoming.length ? h('h3', { class: 'events-section' }, t('event.sectionUpcoming')) : null,
      ...upcoming.map(card),
    ];
  });

  const modal = createModal({
    scope,
    title: () => t('event.title'),
    titleDeps: [lang],
    closeLabel: () => t('modal.close'),
    body,
  });
  badge.addEventListener('click', () => modal.open());
  // Texte accessible du bandeau : annonce clairement ce qu'il ouvre.
  bindAttr(scope, badge, 'aria-label', [today, lang], () => {
    const all = statuses();
    const active = all.filter((s) => s.isActive).length;
    return active > 0 ? t('event.ariaActive', { count: active }) : t('event.ariaUpcoming');
  });
  return { badge, modal };
}
