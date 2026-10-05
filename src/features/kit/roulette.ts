import { validBoxes, type SpecialBox } from '../../core/boxes';
import { daysBetween, localDay } from '../../core/dates';
import { boostFor } from '../../core/game-state';
import type { PokemonEntry } from '../../core/model';
import { mathRng } from '../../core/rng';
import { monthlyBoxes } from '../../core/roulette';
import { getEntry, getNature } from '../../data';
import { drawPool } from '../../data/pool';
import type { I18n, MessageKey } from '../../i18n';
import type { Game } from '../../state/game';
import { bindAttr, bindChildren, bindText, effect, h } from '../../ui/dom';
import { createModal } from '../../ui/dialog';
import type { View } from '../../ui/router';
import { createStore } from '../../ui/store';
import { monthLabel } from '../history/history';
import { createSprite } from '../shared/sprite';
import { buildSpinSchedule } from './spin-schedule';

export interface RouletteDeps {
  i18n: I18n;
  game: Game;
  /** Pour les tests : `true` = animation sautée ; défaut : la préférence du système. */
  reducedMotion?: () => boolean;
  /** Pour les tests : remplace `setTimeout`. */
  wait?: (ms: number) => Promise<void>;
}

type BoxChoice = { kind: 'month'; index: number } | { kind: 'special'; box: SpecialBox['kind'] };

const wantsReducedMotion = () =>
  typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

/** La V-Roulette : choisir une boîte, (éventuellement) un Pokémon boosté, puis tourner. */
export function createRouletteView({
  i18n,
  game,
  reducedMotion = wantsReducedMotion,
  wait = sleep,
}: RouletteDeps): View {
  return ({ scope }) => {
    const { t, lang } = i18n;
    const choice = createStore<BoxChoice>({ kind: 'month', index: 0 });
    const notice = createStore<{ key: MessageKey; params?: Record<string, number> } | null>(null);
    const spinning = createStore(false);

    const today = () => game.today.get()?.day ?? localDay();
    const month = () => game.currentMonth();
    const specials = () => validBoxes(game.state.get().boxes, today());
    const nameOf = (id: number) => getEntry(id)?.[lang.get()] ?? `#${id}`;

    /** La boîte actuellement choisie (si une boîte spéciale a expiré : retour à la boîte 1). */
    const current = (): { ids: readonly number[]; shinySlots: readonly number[] } => {
      const c = choice.get();
      if (c.kind === 'special') {
        const box = specials().find((b) => b.kind === c.box);
        if (box) return { ids: box.ids, shinySlots: box.shinySlots };
      }
      const index = c.kind === 'month' ? c.index : 0;
      return { ids: monthlyBoxes(month(), drawPool)[index] ?? [], shinySlots: [] };
    };

    // Ticket offert au tout premier passage (une seule fois).
    effect(scope, [game.status], () => {
      if (game.status.get() !== 'ready') return;
      void game.claimRouletteBonus().then((granted) => {
        if (granted && !scope.isDisposed) notice.set({ key: 'roulette.bonus' });
      });
    });

    // ── Compteur de tickets ─────────────────────────────────────────────
    const tickets = h('p', { class: 'roulette-tickets' });
    tickets.append(
      bindText(scope, [game.state, lang], () =>
        t('roulette.tickets', { count: game.state.get().tickets }),
      ),
    );
    const message = h('p', { class: 'roulette-notice', role: 'status' });
    message.append(
      bindText(scope, [notice, lang], () => {
        const n = notice.get();
        return n ? t(n.key, n.params) : '';
      }),
    );

    // ── Choix de la boîte ───────────────────────────────────────────────
    const tabs = h('div', { class: 'box-tabs', role: 'group' });
    bindChildren(scope, tabs, [game.state, choice, lang], () => {
      const c = choice.get();
      const button = (label: string, selected: boolean, onclick: () => void) =>
        h(
          'button',
          {
            class: selected ? 'box-tab active' : 'box-tab',
            type: 'button',
            'aria-pressed': String(selected),
            onclick,
          },
          label,
        );
      return [
        ...[0, 1, 2].map((index) =>
          button(
            t('roulette.boxMonth', { n: index + 1 }),
            c.kind === 'month' && c.index === index,
            () => choice.set({ kind: 'month', index }),
          ),
        ),
        ...specials().map((box) => {
          const left = daysBetween(today(), box.validUntil) + 1;
          const key: MessageKey =
            box.kind === 'lucky_day' ? 'roulette.boxLucky' : 'roulette.boxApril';
          return button(
            `🎁 ${t(key)} · ${t('roulette.daysLeft', { days: left })}`,
            c.kind === 'special' && c.box === box.kind,
            () => choice.set({ kind: 'special', box: box.kind }),
          );
        }),
      ];
    });

    // ── Grille de la boîte (touche = booster) ───────────────────────────
    const boostedNow = () => boostFor(game.state.get(), month());
    const grid = h('div', { class: 'box-grid', role: 'group' });
    bindChildren(scope, grid, [game.state, choice, lang], () => {
      const { ids, shinySlots } = current();
      return ids.map((id, slot) => {
        const boosted = boostedNow() === id;
        return h(
          'button',
          {
            class: boosted ? 'box-cell boosted' : 'box-cell',
            type: 'button',
            'aria-pressed': String(boosted),
            'aria-label': `${nameOf(id)}${shinySlots.includes(slot) ? ' ✦' : ''}`,
            title: nameOf(id),
            disabled: spinning.get(),
            onclick: () => void game.setBoost(month(), boosted ? null : id),
          },
          createSprite({ id, shiny: shinySlots.includes(slot), size: 128, alt: '' }),
          boosted ? h('span', { class: 'boost-star', 'aria-hidden': 'true' }, '⭐') : null,
          shinySlots.includes(slot)
            ? h('span', { class: 'shiny-dot', 'aria-hidden': 'true' }, '✦')
            : null,
        );
      });
    });
    const boostHint = h('p', { class: 'boost-hint' });
    boostHint.append(
      bindText(scope, [game.state, lang], () => {
        const id = boostedNow();
        return id === null ? t('roulette.hintBoost') : t('roulette.boosted', { name: nameOf(id) });
      }),
    );

    // ── Fenêtre du tour ─────────────────────────────────────────────────
    const modalGrid = h('div', { class: 'spin-grid', 'aria-hidden': 'true' });
    const status = h('p', { class: 'spin-status', role: 'status' });
    const result = h('div', { class: 'spin-result' });
    const modalBody = h('div', { class: 'spin-body' }, modalGrid, status, result);
    const modal = createModal({
      scope,
      title: () => t('roulette.title'),
      titleDeps: [lang],
      closeLabel: () => t('modal.close'),
      body: modalBody,
    });

    function showResult(prize: PokemonEntry): void {
      const dex = getEntry(prize.id);
      const name = dex?.[lang.get()] ?? `#${prize.id}`;
      status.textContent = t('roulette.result', { name });
      result.replaceChildren(
        createSprite({
          id: prize.id,
          shiny: prize.isShiny,
          size: 512,
          alt: name,
          class: 'spin-result-img',
        }),
        h(
          'p',
          { class: 'spin-result-meta' },
          `${t('card.level')} ${prize.level} · ${getNature(prize.natureKey)?.[lang.get()] ?? prize.natureKey}${prize.isShiny ? ` · ${t('card.shiny')}` : ''}`,
        ),
        h(
          'div',
          { class: 'spin-actions' },
          h(
            'a',
            { class: 'action-btn', href: '#/', onclick: () => modal.close() },
            t('roulette.seeCard'),
          ),
          h(
            'button',
            { class: 'action-btn', type: 'button', onclick: () => modal.close() },
            t('roulette.again'),
          ),
        ),
      );
    }

    async function spin(): Promise<void> {
      if (spinning.get()) return;
      notice.set(null);
      const { ids, shinySlots } = current();
      spinning.set(true);
      // 1. Le tour est décidé ET sauvegardé (ticket + Pokémon ensemble) avant tout spectacle.
      const outcome = await game.spin({ ids, shinySlots, boostedId: boostedNow() });
      if (!outcome.ok) {
        spinning.set(false);
        notice.set({
          key: outcome.reason === 'no_tickets' ? 'roulette.noTickets' : 'roulette.noPokemon',
        });
        return;
      }
      // 2. Le spectacle : la case lumineuse ralentit et s'arrête sur le résultat.
      modalGrid.replaceChildren(
        ...ids.map((id, slot) =>
          h(
            'div',
            { class: 'spin-cell' },
            createSprite({ id, shiny: shinySlots.includes(slot), size: 128, alt: '' }),
          ),
        ),
      );
      result.replaceChildren();
      modalBody.classList.remove('done');
      status.textContent = t('roulette.spinning');
      modal.setBusy(true);
      modal.open();
      const cells = [...modalGrid.children] as HTMLElement[];
      for (const step of buildSpinSchedule(ids.length, outcome.index, mathRng, reducedMotion())) {
        if (step.delay > 0) await wait(step.delay);
        if (scope.isDisposed) return;
        cells.forEach((cell, i) => cell.classList.toggle('lit', i === step.index));
      }
      cells[outcome.index]?.classList.add('winner');
      await wait(reducedMotion() ? 0 : 500);
      if (scope.isDisposed) return;
      modal.setBusy(false);
      modalBody.classList.add('done');
      showResult(outcome.prize);
      spinning.set(false);
    }

    const spinButton = h(
      'button',
      { class: 'spin-btn', type: 'button', onclick: () => void spin() },
      bindText(scope, [lang], () => t('roulette.spin')),
    );
    bindAttr(scope, spinButton, 'disabled', [game.state, spinning], () => {
      return spinning.get() || game.state.get().tickets < 1;
    });
    const noTickets = h('p', { class: 'roulette-hint' });
    noTickets.append(bindText(scope, [lang], () => t('roulette.noTickets')));
    bindAttr(scope, noTickets, 'hidden', [game.state], () => game.state.get().tickets > 0);

    const [year = 0, mon = 1] = month().split('-').map(Number);
    return h(
      'section',
      { class: 'roulette-page' },
      h(
        'a',
        { class: 'back-link', href: '#/kit' },
        bindText(scope, [lang], () => `← ${t('kit.title')}`),
      ),
      h(
        'h1',
        { class: 'kit-title' },
        bindText(scope, [lang], () => t('roulette.title')),
      ),
      h(
        'p',
        { class: 'kit-subtitle' },
        bindText(scope, [lang], () =>
          t('roulette.intro', { month: monthLabel({ year, month: mon }, lang.get()) }),
        ),
      ),
      tickets,
      message,
      tabs,
      grid,
      boostHint,
      spinButton,
      noTickets,
      modal.element,
    );
  };
}
