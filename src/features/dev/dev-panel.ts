import { addTickets } from '../../core/game-state';
import {
  MAX_FILL_DAYS,
  devClearHistory,
  devDeleteEntry,
  devFillHistory,
  devForceToday,
  devRedrawToday,
  devResetAll,
  devSetToday,
} from '../../core/dev-tools';
import { allEntries } from '../../core/game-state';
import { addDays, isValidDay, localDay } from '../../core/dates';
import { daysUntilNextActive, isEventActive } from '../../core/events/engine';
import { events } from '../../data/events';
import { simulationUrl } from '../../app/simulate';
import { getEntry } from '../../data';
import { stateLookup } from '../../data/lookup';
import type { I18n, MessageKey } from '../../i18n';
import type { Game } from '../../state/game';
import { bindAttr, bindChildren, bindText, h } from '../../ui/dom';
import { createModal, type Modal } from '../../ui/dialog';
import type { Scope } from '../../ui/scope';
import { createStore } from '../../ui/store';

export interface DevPanelDeps {
  i18n: I18n;
  game: Game;
  scope: Scope;
  /** Pour les tests : par défaut `window.confirm`. */
  confirmAction?: (message: string) => boolean;
  /** Simulation en cours (le cas échéant) et ouverture d'une adresse. */
  simulation?: { day: string; exit: () => void };
  navigate?: (url: string) => void;
}

const asNumber = (input: HTMLInputElement): number => Number.parseInt(input.value, 10);

/**
 * Le MODE DÉVELOPPEUR (gardé pour tout le monde, décision de Diamant) : modifier le Pokémon du
 * jour, en forcer un, ajouter des tickets, remplir ou vider l'historique, tout remettre à zéro.
 * Chaque action passe par `game.devApply` (sauvegardée comme le reste) et par des fonctions
 * testées de `core/dev-tools`. Les actions qui effacent demandent confirmation.
 */
export function createDevPanel({
  i18n,
  game,
  scope,
  confirmAction = (message) => window.confirm(message),
  simulation,
  navigate = (url) => window.location.assign(url),
}: DevPanelDeps): Modal {
  const { t, lang } = i18n;
  const text = (key: MessageKey) => bindText(scope, [lang], () => t(key));
  const saved = createStore<MessageKey | null>(null);
  let savedTimer: ReturnType<typeof setTimeout> | undefined;
  scope.add(() => clearTimeout(savedTimer));
  const flash = (key: MessageKey) => {
    saved.set(key);
    clearTimeout(savedTimer);
    savedTimer = setTimeout(() => saved.set(null), 2000);
  };
  const run = (tool: Parameters<Game['devApply']>[0], message: MessageKey = 'dev.done') =>
    game.devApply(tool).then(() => flash(message));

  // ── Pokémon du jour ───────────────────────────────────────────────────
  const level = h('input', { class: 'dev-input', type: 'number', min: 1, max: 100 });
  const rename = h('input', { class: 'dev-input', type: 'text', maxlength: 16 });
  const shiny = createStore(false);
  const shinyButton = h('button', {
    class: 'dev-btn',
    type: 'button',
    onclick: () => shiny.set(!shiny.get()),
  });
  shinyButton.append(
    bindText(scope, [shiny, lang], () => (shiny.get() ? '✦ ' + t('dev.yes') : t('dev.no'))),
  );
  bindAttr(scope, shinyButton, 'aria-pressed', [shiny], () => String(shiny.get()));

  const currentLabel = h('span', { class: 'dev-value' });
  currentLabel.append(
    bindText(scope, [game.today, lang], () => {
      const today = game.today.get();
      return today ? `#${today.id} ${getEntry(today.id)?.[lang.get()] ?? ''}` : '—';
    }),
  );

  /** Remplit les champs avec le Pokémon du jour (à l'ouverture, et après chaque action). */
  const syncFields = () => {
    const today = game.today.get();
    if (!today) return;
    level.value = String(today.level);
    rename.value = today.rename;
    shiny.set(today.isShiny);
  };

  const apply = h(
    'button',
    {
      class: 'dev-btn primary',
      type: 'button',
      onclick: () =>
        void run(
          (state, { pool }) =>
            devSetToday(
              state,
              { level: asNumber(level), isShiny: shiny.get(), rename: rename.value },
              pool,
            ),
          'dev.saved',
        ).then(syncFields),
    },
    text('dev.apply'),
  );

  // ── Forcer un Pokémon ────────────────────────────────────────────────
  const forceId = h('input', { class: 'dev-input', type: 'number', min: 1, placeholder: 'ID' });
  const forceError = createStore(false);
  const force = h(
    'button',
    {
      class: 'dev-btn',
      type: 'button',
      onclick: () => {
        const id = asNumber(forceId);
        forceError.set(!stateLookup.hasId(id));
        if (forceError.get()) return;
        void run((state, { rng, pool }) => devForceToday(state, id, rng, pool)).then(syncFields);
      },
    },
    text('dev.force'),
  );
  const forceHint = h('p', { class: 'dev-hint', role: 'alert' });
  forceHint.append(
    bindText(scope, [forceError, lang], () => (forceError.get() ? t('dev.badId') : '')),
  );
  const redraw = h(
    'button',
    {
      class: 'dev-btn',
      type: 'button',
      onclick: () => void run((state, ctx) => devRedrawToday(state, ctx)).then(syncFields),
    },
    text('dev.redraw'),
  );

  // ── Tickets ─────────────────────────────────────────────────────────
  const ticketAmount = h('input', { class: 'dev-input', type: 'number', value: '1' });
  const ticketsLabel = h('span', { class: 'dev-value' });
  ticketsLabel.append(bindText(scope, [game.state], () => String(game.state.get().tickets)));
  const addTicketsBtn = h(
    'button',
    {
      class: 'dev-btn',
      type: 'button',
      onclick: () => {
        const amount = asNumber(ticketAmount) || 0;
        void run((state) => addTickets(state, amount));
      },
    },
    text('dev.add'),
  );

  // ── Historique ──────────────────────────────────────────────────────
  const fillDays = h('input', {
    class: 'dev-input',
    type: 'number',
    min: 1,
    max: MAX_FILL_DAYS,
    value: '7',
  });
  const fill = h(
    'button',
    {
      class: 'dev-btn',
      type: 'button',
      onclick: () =>
        void run((state, { today, rng, pool }) =>
          devFillHistory(state, { days: asNumber(fillDays), today, rng, pool }),
        ),
    },
    text('dev.fill'),
  );
  const historyTitle = h(
    'h3',
    null,
    bindText(scope, [game.state, lang], () =>
      t('dev.history', { count: Object.keys(game.state.get().entries).length }),
    ),
  );
  const historyList = h('ul', { class: 'dev-history' });
  bindChildren(scope, historyList, [game.state, lang], () =>
    allEntries(game.state.get())
      .filter((e) => e.day !== game.state.get().lastDrawDay)
      .map((e) =>
        h(
          'li',
          { class: 'dev-history-row' },
          h('span', { class: 'dev-history-id' }, `#${e.id}`),
          h('span', { class: 'dev-history-name' }, getEntry(e.id)?.[lang.get()] ?? ''),
          h('span', { class: 'dev-history-day' }, e.day),
          h(
            'button',
            {
              class: 'dev-remove',
              type: 'button',
              'aria-label': `${t('dev.delete')} ${e.day}`,
              onclick: () => void run((state) => devDeleteEntry(state, e.day)),
            },
            '✕',
          ),
        ),
      ),
  );
  const clearHistory = h(
    'button',
    {
      class: 'dev-btn danger',
      type: 'button',
      onclick: () => {
        if (confirmAction(t('dev.confirmClear'))) void run((state) => devClearHistory(state));
      },
    },
    text('dev.clear'),
  );

  // ── Tout remettre à zéro ────────────────────────────────────────────
  const reset = h(
    'button',
    {
      class: 'dev-btn danger',
      type: 'button',
      onclick: () => {
        if (confirmAction(t('dev.confirmReset'))) void run(() => devResetAll()).then(syncFields);
      },
    },
    text('dev.reset'),
  );

  // ── Simulation d'une date / d'un événement ──────────────────────────
  const simDate = h('input', {
    class: 'dev-input',
    type: 'date',
    min: '2000-01-01',
    max: '2100-12-31',
  });
  const simError = createStore<MessageKey | null>(null);
  const goTo = (day: string) => navigate(simulationUrl(window.location.href, day));
  const simGo = h(
    'button',
    {
      class: 'dev-btn',
      type: 'button',
      onclick: () => {
        const day = simDate.value;
        const valid =
          /^\d{4}-\d{2}-\d{2}$/.test(day) &&
          isValidDay(day) &&
          day >= '2000-01-01' &&
          day <= '2100-12-31';
        simError.set(valid ? null : 'dev.simBadDate');
        if (valid) goTo(day);
      },
    },
    text('dev.simGo'),
  );
  const simEvent = h(
    'select',
    { class: 'dev-input' },
    ...events.map((e) => h('option', { value: e.id }, '')),
  );
  const fillEventNames = () => {
    [...simEvent.options].forEach((option, i) => {
      const e = events[i];
      if (e) option.textContent = lang.get() === 'fr' ? e.nameFr : e.nameEn;
    });
  };
  fillEventNames();
  scope.add(lang.subscribe(fillEventNames, { immediate: false }));
  const simEventGo = h(
    'button',
    {
      class: 'dev-btn',
      type: 'button',
      onclick: () => {
        const event = events.find((e) => e.id === simEvent.value);
        if (!event) return;
        const today = localDay();
        // Actif aujourd'hui : on simule aujourd'hui ; sinon la prochaine fois qu'il a lieu.
        const days = isEventActive(event, today) ? 0 : daysUntilNextActive(event, today);
        simError.set(days === null ? 'dev.simNone' : null);
        if (days !== null) goTo(addDays(today, days));
      },
    },
    text('dev.simEventGo'),
  );
  const simHint = h('p', { class: 'dev-hint', role: 'alert' });
  simHint.append(
    bindText(scope, [simError, lang], () => (simError.get() ? t(simError.get()!) : '')),
  );
  const simExit = h(
    'button',
    { class: 'dev-btn danger', type: 'button', onclick: () => simulation?.exit() },
    text('dev.simExit'),
  );
  simExit.hidden = !simulation;

  const status = h('p', { class: 'dev-status', role: 'status' });
  status.append(bindText(scope, [saved, lang], () => (saved.get() ? t(saved.get()!) : '')));

  const row = (label: MessageKey, ...controls: (HTMLElement | string)[]) =>
    h('div', { class: 'dev-row' }, h('label', { class: 'dev-label' }, text(label)), ...controls);
  const section = (title: MessageKey, ...children: (HTMLElement | null)[]) =>
    h('section', { class: 'dev-section' }, h('h3', null, text(title)), ...children);

  const body = h(
    'div',
    { class: 'dev-panel' },
    h('p', { class: 'dev-warning' }, text('dev.warning')),
    section(
      'dev.today',
      row('dev.current', currentLabel),
      row('dev.level', level),
      row('dev.shiny', shinyButton),
      row('dev.nickname', rename),
      apply,
    ),
    section('dev.forceTitle', row('dev.id', forceId, force), forceHint, redraw),
    section(
      'dev.tickets',
      row('dev.current', ticketsLabel),
      row('dev.amount', ticketAmount, addTicketsBtn),
    ),
    h(
      'section',
      { class: 'dev-section' },
      historyTitle,
      row('dev.days', fillDays, fill),
      historyList,
      clearHistory,
    ),
    section(
      'dev.simTitle',
      h('p', { class: 'dev-note' }, text('dev.simHint')),
      row('dev.simDate', simDate, simGo),
      row('dev.simEvent', simEvent),
      simEventGo,
      simHint,
      simExit,
    ),
    section('dev.danger', reset),
    status,
  );

  return createModal({
    scope,
    title: () => `DEV · ${t('dev.title')}`,
    titleDeps: [lang],
    closeLabel: () => t('modal.close'),
    body,
    onOpen: syncFields,
  });
}
