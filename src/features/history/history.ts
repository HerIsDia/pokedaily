import { activeEvents } from '../../core/events/engine';
import { localDay } from '../../core/dates';
import type { PokemonEntry } from '../../core/model';
import { getEntry, getNature } from '../../data';
import { events } from '../../data/events';
import type { I18n, Lang, MessageKey } from '../../i18n';
import type { Game } from '../../state/game';
import { bindAttr, bindChildren, bindText, effect, h, svg } from '../../ui/dom';
import type { View } from '../../ui/router';
import { createStore } from '../../ui/store';
import { localeOf } from '../card/share-image';
import { createSprite } from '../shared/sprite';
import { buildMonths, dayOf, type MonthView } from './calendar';

export interface HistoryDeps {
  i18n: I18n;
  game: Game;
  /** Pour les tests : le jour d'aujourd'hui. */
  today?: () => string;
}

const capitalize = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);

export function monthLabel(month: Pick<MonthView, 'year' | 'month'>, lang: Lang): string {
  return capitalize(
    new Intl.DateTimeFormat(localeOf(lang), {
      month: 'long',
      year: 'numeric',
      timeZone: 'UTC',
    }).format(new Date(Date.UTC(month.year, month.month - 1, 1))),
  );
}

/** Lun… Dim (ou Mon… Sun) : la semaine de référence est celle du lundi 1ᵉʳ janvier 2024. */
function weekdayLabels(lang: Lang): string[] {
  const format = new Intl.DateTimeFormat(localeOf(lang), { weekday: 'short', timeZone: 'UTC' });
  return Array.from({ length: 7 }, (_, i) =>
    capitalize(format.format(new Date(Date.UTC(2024, 0, 1 + i)))).replace(/\.$/, ''),
  );
}

function longDate(day: string, lang: Lang): string {
  const [year = 0, month = 1, date = 1] = day.split('-').map(Number);
  return capitalize(
    new Intl.DateTimeFormat(localeOf(lang), {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      timeZone: 'UTC',
    }).format(new Date(Date.UTC(year, month - 1, date))),
  );
}

const chevron = (points: string) =>
  svg(
    'svg',
    {
      viewBox: '0 0 24 24',
      fill: 'none',
      stroke: 'currentColor',
      'stroke-width': 2.5,
      'stroke-linecap': 'round',
      'stroke-linejoin': 'round',
      'aria-hidden': 'true',
    },
    svg('polyline', { points }),
  );

/** L'historique : un calendrier mensuel où chaque jour montre le Pokémon obtenu. */
export function createHistoryView({ i18n, game, today = () => localDay() }: HistoryDeps): View {
  return ({ scope }) => {
    const { t, lang } = i18n;

    const months = () => buildMonths(Object.values(game.state.get().entries));
    /** `null` = le mois le plus récent. */
    const chosenMonth = createStore<string | null>(null);
    const selectedDay = createStore<string | null>(null);

    const currentMonth = (): MonthView | undefined => {
      const all = months();
      return all.find((m) => m.key === chosenMonth.get()) ?? all[0];
    };
    const entryName = (entry: PokemonEntry) =>
      entry.rename || getEntry(entry.id)?.[lang.get()] || `#${entry.id}`;
    const eventName = (e: (typeof events)[number]) => (lang.get() === 'fr' ? e.nameFr : e.nameEn);

    // ── Navigation entre les mois ───────────────────────────────────────
    const move = (step: 1 | -1) => {
      const all = months();
      const index = all.findIndex((m) => m.key === currentMonth()?.key);
      const target = all[index + step];
      if (target) {
        chosenMonth.set(target.key);
        selectedDay.set(null);
      }
    };
    const prev = h(
      'button',
      { class: 'cal-arrow', type: 'button', onclick: () => move(1) },
      chevron('15 18 9 12 15 6'),
    );
    const next = h(
      'button',
      { class: 'cal-arrow', type: 'button', onclick: () => move(-1) },
      chevron('9 18 15 12 9 6'),
    );
    bindAttr(scope, prev, 'aria-label', [lang], () => t('history.prev'));
    bindAttr(scope, next, 'aria-label', [lang], () => t('history.next'));
    const label = h('span', { class: 'cal-month-label', 'aria-live': 'polite' });
    label.append(
      bindText(scope, [game.state, chosenMonth, lang], () => {
        const month = currentMonth();
        return month ? monthLabel(month, lang.get()) : '';
      }),
    );
    effect(scope, [game.state, chosenMonth], () => {
      const all = months();
      const index = all.findIndex((m) => m.key === currentMonth()?.key);
      prev.disabled = index < 0 || index >= all.length - 1; // pas de mois plus ancien
      next.disabled = index <= 0; // pas de mois plus récent
    });

    // ── Grille ──────────────────────────────────────────────────────────
    const grid = h('div', { class: 'cal-grid', role: 'grid' });
    bindChildren(scope, grid, [game.state, chosenMonth, lang], () => {
      const month = currentMonth();
      if (!month) return [];
      const now = today();
      const cells: HTMLElement[] = [
        ...weekdayLabels(lang.get()).map((name) => h('div', { class: 'cal-weekday' }, name)),
        ...Array.from({ length: month.startOffset }, () =>
          h('div', { class: 'cal-cell cal-empty' }),
        ),
      ];
      for (let day = 1; day <= month.daysInMonth; day++) {
        const full = dayOf(month, day);
        const entry = month.entries.get(day);
        const dayEvents = activeEvents(events, full);
        const classes = ['cal-cell'];
        if (entry) classes.push('has-entry');
        if (full === now) classes.push('is-today');
        if (dayEvents.length) classes.push('has-event');
        const children = [
          entry
            ? createSprite({ id: entry.id, shiny: entry.isShiny, size: 128, alt: '' })
            : h('span', { class: 'day-number' }, day),
          entry?.isShiny ? h('span', { class: 'shiny-dot', 'aria-hidden': 'true' }, '✦') : null,
          dayEvents.length ? h('span', { class: 'event-dot', 'aria-hidden': 'true' }) : null,
        ];
        const title = [entry ? entryName(entry) : null, ...dayEvents.map(eventName)]
          .filter(Boolean)
          .join(' — ');
        cells.push(
          entry
            ? h(
                'button',
                {
                  class: classes.join(' '),
                  type: 'button',
                  'data-day': full,
                  title,
                  'aria-label': `${day}, ${entryName(entry)}`,
                  onclick: () => selectedDay.set(selectedDay.get() === full ? null : full),
                },
                ...children,
              )
            : h('div', { class: classes.join(' '), title: title || undefined }, ...children),
        );
      }
      return cells;
    });
    // La sélection ne reconstruit pas la grille (le focus du clavier reste en place).
    effect(scope, [selectedDay, game.state, chosenMonth, lang], () => {
      for (const cell of grid.querySelectorAll<HTMLElement>('.cal-cell[data-day]')) {
        const selected = cell.dataset.day === selectedDay.get();
        cell.classList.toggle('is-selected', selected);
        cell.setAttribute('aria-pressed', String(selected));
      }
    });

    // ── Points de navigation (un par mois) ──────────────────────────────
    const dots = h('div', { class: 'month-dots' });
    bindChildren(scope, dots, [game.state, chosenMonth, lang], () => {
      const all = months();
      if (all.length < 2) return [];
      return all.map((month) =>
        h('button', {
          class: month.key === currentMonth()?.key ? 'month-dot active' : 'month-dot',
          type: 'button',
          'aria-label': monthLabel(month, lang.get()),
          onclick: () => {
            chosenMonth.set(month.key);
            selectedDay.set(null);
          },
        }),
      );
    });

    // ── Détail du jour choisi ───────────────────────────────────────────
    const detail = h('div', { class: 'detail-slot', 'aria-live': 'polite' });
    bindChildren(scope, detail, [selectedDay, game.state, lang], () => {
      const day = selectedDay.get();
      const entry = day ? game.state.get().entries[day] : undefined;
      if (!day || !entry) return [];
      const dex = getEntry(entry.id);
      const species = dex?.[lang.get()] ?? `#${entry.id}`;
      const dayEvents = activeEvents(events, day);
      return [
        h(
          'article',
          {
            class: 'detail-card',
            'data-type': dex?.types[0],
            'data-shiny': entry.isShiny || undefined,
          },
          createSprite({
            id: entry.id,
            shiny: entry.isShiny,
            size: 128,
            alt: species,
            class: 'detail-img',
          }),
          h(
            'div',
            { class: 'detail-info' },
            h('span', { class: 'detail-name' }, entryName(entry)),
            entry.rename ? h('span', { class: 'detail-original' }, species) : null,
            h('span', { class: 'detail-date' }, longDate(day, lang.get())),
            h(
              'div',
              { class: 'detail-meta' },
              h('span', { class: 'stat-pill' }, `${t('card.level')} ${entry.level}`),
              h(
                'span',
                { class: 'stat-pill' },
                getNature(entry.natureKey)?.[lang.get()] ?? entry.natureKey,
              ),
              entry.isShiny ? h('span', { class: 'shiny-pill' }, t('card.shiny')) : null,
              ...(dex?.types ?? []).map((type) =>
                h('span', { class: `type-badge type-${type}` }, t(`type.${type}` as MessageKey)),
              ),
              ...dayEvents.map((e) => h('span', { class: 'event-pill' }, `🎉 ${eventName(e)}`)),
            ),
          ),
        ),
      ];
    });

    // ── Page ────────────────────────────────────────────────────────────
    const empty = h('p', { class: 'history-empty', role: 'status' });
    empty.append(
      bindText(scope, [game.state, game.status, lang], () =>
        game.status.get() === 'loading' ? t('home.loading') : t('history.empty'),
      ),
    );
    const calendar = h(
      'div',
      { class: 'cal-wrap' },
      h('div', { class: 'cal-nav' }, prev, label, next),
      grid,
      dots,
      detail,
    );
    effect(scope, [game.state], () => {
      const has = months().length > 0;
      calendar.hidden = !has;
      empty.hidden = has;
    });

    return h(
      'section',
      { class: 'history-page' },
      h(
        'h1',
        { class: 'history-title' },
        bindText(scope, [lang], () => t('history.title')),
      ),
      empty,
      calendar,
    );
  };
}
