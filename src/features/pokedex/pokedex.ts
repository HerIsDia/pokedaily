import { forms, species, type DexEntry, type FormCategory } from '../../data';
import { hasSprite } from '../../data/sprites';
import type { I18n, MessageKey } from '../../i18n';
import type { Game } from '../../state/game';
import { bindAttr, bindChildren, bindText, effect, h } from '../../ui/dom';
import type { View } from '../../ui/router';
import { createStore } from '../../ui/store';
import { createFormGauge } from '../forms/form-gauge';
import { createSprite } from '../shared/sprite';
import { dexProgress, formCategories } from './progress';

export interface PokedexDeps {
  i18n: I18n;
  game: Game;
}

type Tab = 'pokedex' | 'shinydex' | 'forms';
const TABS: readonly Tab[] = ['pokedex', 'shinydex', 'forms'];
const categories = formCategories(forms);

/** Pokédex (1 025 espèces), Shinydex, et l'onglet « Formes » (326 formes alternatives). */
export function createPokedexView({ i18n, game }: PokedexDeps): View {
  return ({ scope }) => {
    const { t, lang } = i18n;
    const tab = createStore<Tab>('pokedex');
    const filter = createStore<FormCategory | 'all'>('all');
    const progress = () => dexProgress(game.state.get());
    const nameOf = (entry: DexEntry) => entry[lang.get()];

    // ── Onglets ─────────────────────────────────────────────────────────
    const tabButton = (id: Tab) => {
      const button = h(
        'button',
        { class: `tab-btn tab-${id}`, type: 'button', role: 'tab', onclick: () => tab.set(id) },
        bindText(scope, [lang], () => t(`pokedex.tab.${id}` as MessageKey)),
      );
      bindAttr(scope, button, 'aria-selected', [tab], () => String(tab.get() === id));
      return button;
    };
    const tabs = h('div', { class: 'tab-row', role: 'tablist' }, ...TABS.map(tabButton));

    // ── Compteur + barre de progression ─────────────────────────────────
    const totals = (): { count: number; total: number; key: MessageKey } => {
      const p = progress();
      switch (tab.get()) {
        case 'shinydex':
          return {
            count: p.speciesShiny.size,
            total: species.length,
            key: 'pokedex.counter.shiny',
          };
        case 'forms':
          return { count: p.forms.size, total: forms.length, key: 'pokedex.counter.forms' };
        default:
          return { count: p.species.size, total: species.length, key: 'pokedex.counter.species' };
      }
    };
    const counter = h('span', { class: 'counter-badge' });
    counter.append(
      bindText(scope, [game.state, tab, lang], () => t(totals().key, { count: totals().count })),
    );
    const fill = h('div', { class: 'progress-fill' });
    const bar = h('div', { class: 'progress-bar', role: 'progressbar', 'aria-valuemin': 0 }, fill);
    const label = h('p', { class: 'progress-label' });
    label.append(bindText(scope, [game.state, tab], () => `${totals().count} / ${totals().total}`));
    effect(scope, [game.state, tab], () => {
      const { count, total } = totals();
      fill.style.width = `${(count / total) * 100}%`;
      bar.setAttribute('aria-valuenow', String(count));
      bar.setAttribute('aria-valuemax', String(total));
    });

    // ── Filtre des formes (Méga, Alola…) ────────────────────────────────
    const chips = h('div', { class: 'form-filter', role: 'group' });
    bindChildren(scope, chips, [lang, filter], () =>
      [{ category: 'all' as const, count: forms.length }, ...categories].map(
        ({ category, count }) =>
          h(
            'button',
            {
              class: filter.get() === category ? 'chip active' : 'chip',
              type: 'button',
              'aria-pressed': String(filter.get() === category),
              onclick: () => filter.set(category),
            },
            `${category === 'all' ? t('pokedex.allForms') : t(`form.${category}` as MessageKey)} ${count}`,
          ),
      ),
    );
    effect(scope, [tab], () => {
      chips.hidden = tab.get() !== 'forms';
    });

    // ── Grille ──────────────────────────────────────────────────────────
    const cell = (entry: DexEntry, caught: boolean, shiny: boolean) => {
      const number = String(entry.speciesId).padStart(4, '0');
      const name = caught ? nameOf(entry) : `N°${number}`;
      const classes = ['grid-cell'];
      if (caught) classes.push('caught');
      if (caught && shiny) classes.push('is-shiny');
      return h(
        'div',
        { class: classes.join(' '), title: shiny && caught ? `${name} ✦` : name, role: 'listitem' },
        // Une image qui n'existe pas n'est même pas demandée : repère « ? » direct.
        hasSprite(entry.id)
          ? createSprite({ id: entry.id, shiny: caught && shiny, size: 128, alt: name })
          : h('span', { class: 'sprite-missing', role: 'img', 'aria-label': name }, '?'),
        caught && shiny ? h('span', { class: 'shiny-dot', 'aria-hidden': 'true' }, '✦') : null,
        caught && !shiny ? h('span', { class: 'caught-dot', 'aria-hidden': 'true' }) : null,
      );
    };

    const grid = h('div', { class: 'pokemon-grid', role: 'list' });
    bindChildren(scope, grid, [game.state, tab, filter, lang], () => {
      const p = progress();
      switch (tab.get()) {
        case 'shinydex':
          return species.map((e) => cell(e, p.speciesShiny.has(e.id), true));
        case 'forms':
          return forms
            .filter((e) => filter.get() === 'all' || e.form?.category === filter.get())
            .map((e) => cell(e, p.forms.has(e.id), p.formsShiny.has(e.id)));
        default:
          return species.map((e) => cell(e, p.species.has(e.id), p.speciesShiny.has(e.id)));
      }
    });

    // Onglet « Formes » : on y explique le pourcentage progressif.
    const gauge = createFormGauge({ i18n, scope, state: game.state });
    effect(scope, [tab], () => {
      gauge.hidden = tab.get() !== 'forms';
    });

    const empty = h('p', { class: 'dex-empty', role: 'status' });
    empty.append(bindText(scope, [lang], () => t('pokedex.shinyEmpty')));
    effect(scope, [game.state, tab], () => {
      empty.hidden = !(tab.get() === 'shinydex' && progress().speciesShiny.size === 0);
    });

    return h(
      'section',
      { class: 'pokedex-page' },
      tabs,
      h('div', { class: 'pokedex-header' }, counter),
      bar,
      label,
      gauge,
      chips,
      empty,
      grid,
    );
  };
}
