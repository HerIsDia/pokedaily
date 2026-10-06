import { events } from '../../data/events';
import { forms, getEntry, species, type DexEntry } from '../../data';
import type { I18n, MessageKey } from '../../i18n';
import type { Game } from '../../state/game';
import { bindChildren, bindText, h } from '../../ui/dom';
import type { View } from '../../ui/router';
import { localeOf } from '../card/share-image';
import { achievementTotals, computeAchievements } from '../achievements/achievements';
import { dexProgress } from '../pokedex/progress';
import { createSprite } from '../shared/sprite';
import { BADGE_NAME_KEY, streakBadges } from './badges';
import { computeStats, type StatsLookup } from './stats';

export interface StatsDeps {
  i18n: I18n;
  game: Game;
}

const lookup: StatsLookup = {
  typesOf: (id) => getEntry(id)?.types ?? [],
  isForm: (id) => getEntry(id)?.form !== undefined,
};

const achievementLookup = {
  ...lookup,
  speciesOf: (id: number) => getEntry(id)?.speciesId ?? id,
};

/** Une barre remplie à `percent` %. (Largeur posée par le code, pas par un attribut `style` : la
 * politique de sécurité du site interdit les styles « en ligne ».) */
function barFill(className: string, percent: number): HTMLElement {
  const fill = h('div', { class: className });
  fill.style.width = `${percent}%`;
  return fill;
}

/** L'écran « Statistiques » : chiffres clés, complétion, types fréquents, Pokémon favoris. */
export function createStatsView({ i18n, game }: StatsDeps): View {
  return ({ scope }) => {
    const { t, lang } = i18n;
    const content = h('div', { class: 'stats-content' });

    bindChildren(scope, content, [game.state, lang], () => {
      const state = game.state.get();
      const stats = computeStats(Object.values(state.entries), lookup);
      const progress = dexProgress(state);
      const percent = new Intl.NumberFormat(localeOf(lang.get()), {
        maximumFractionDigits: 1,
        minimumFractionDigits: 1,
      });

      const card = (key: MessageKey, value: string, shiny = false) =>
        h(
          'div',
          { class: shiny ? 'stat-card shiny-card' : 'stat-card' },
          h('span', { class: 'stat-card-value' }, value),
          h('span', { class: 'stat-card-label' }, t(key)),
        );

      const completion = (label: string, count: number, total: number, shiny = false) =>
        h(
          'div',
          { class: 'completion-row' },
          h('span', { class: 'completion-label' }, label),
          h(
            'div',
            {
              class: 'progress-bar',
              role: 'progressbar',
              'aria-label': label,
              'aria-valuemin': 0,
              'aria-valuemax': total,
              'aria-valuenow': count,
            },
            barFill(shiny ? 'progress-fill shiny-fill' : 'progress-fill', (count / total) * 100),
          ),
          h('span', { class: 'completion-value' }, `${count} / ${total}`),
        );

      const achievementsSection = () => {
        const list = computeAchievements(state, events, achievementLookup);
        const totals = achievementTotals(list);
        return h(
          'section',
          { class: 'stats-section' },
          h('h2', null, t('ach.title')),
          h('p', { class: 'ach-count' }, t('ach.count', { ...totals })),
          h(
            'ul',
            { class: 'ach-list' },
            ...list.map((a) => {
              const hidden = a.secret && !a.done;
              return h(
                'li',
                {
                  class: a.done ? 'ach-item earned' : 'ach-item',
                  'data-secret': a.secret ? '' : undefined,
                },
                h(
                  'span',
                  { class: 'ach-mark', 'aria-hidden': 'true' },
                  a.done ? '✓' : hidden ? '?' : '·',
                ),
                h(
                  'span',
                  { class: 'ach-text' },
                  h(
                    'span',
                    { class: 'ach-name' },
                    hidden ? t('ach.secret') : t(`ach.${a.id}.name` as MessageKey),
                  ),
                  h(
                    'span',
                    { class: 'ach-desc' },
                    hidden ? t('ach.secretHint') : t(`ach.${a.id}.desc` as MessageKey),
                  ),
                ),
                a.progress && !a.done
                  ? h(
                      'span',
                      { class: 'ach-progress' },
                      `${a.progress.current} / ${a.progress.total}`,
                    )
                  : null,
              );
            }),
          ),
          h('p', { class: 'badge-hint' }, t('ach.hint')),
        );
      };

      const maxType = stats.types[0]?.count ?? 1;
      const name = (entry: DexEntry | undefined, id: number) => entry?.[lang.get()] ?? `#${id}`;

      return [
        h(
          'div',
          { class: 'stats-grid' },
          card('stats.total', String(stats.total)),
          card('stats.shiny', `✦ ${stats.shiny}`, true),
          card('stats.shinyRate', `${percent.format(stats.shinyPercent)} %`),
          card('stats.avgLevel', String(stats.averageLevel)),
          card('stats.streak', String(stats.streak)),
          card('stats.bestStreak', String(stats.bestStreak)),
          card('stats.forms', String(stats.forms)),
          card('stats.tickets', String(state.tickets)),
        ),
        h(
          'section',
          { class: 'stats-section' },
          h('h2', null, t('badges.title')),
          h(
            'ul',
            { class: 'badge-list' },
            ...streakBadges(stats.streak, stats.bestStreak).map((badge) =>
              h(
                'li',
                { class: badge.earned ? 'badge-item earned' : 'badge-item' },
                h('span', { class: 'badge-days' }, String(badge.days)),
                h('span', { class: 'badge-name' }, t(BADGE_NAME_KEY[badge.days])),
                h(
                  'span',
                  { class: 'badge-state' },
                  badge.earned
                    ? t('badges.earned')
                    : t('badges.remaining', { days: badge.remaining ?? 0 }),
                ),
              ),
            ),
          ),
          h('p', { class: 'badge-hint' }, t('badges.hint')),
        ),
        achievementsSection(),
        h(
          'section',
          { class: 'stats-section' },
          h('h2', null, t('stats.completion')),
          completion('Pokédex', progress.species.size, species.length),
          completion('Shinydex', progress.speciesShiny.size, species.length, true),
          completion(t('pokedex.tab.forms'), progress.forms.size, forms.length),
        ),
        h(
          'section',
          { class: 'stats-section' },
          h('h2', null, t('stats.types')),
          stats.types.length === 0
            ? h('p', { class: 'stats-empty' }, t('stats.noData'))
            : h(
                'div',
                { class: 'type-bars' },
                ...stats.types.map(({ type, count }) =>
                  h(
                    'div',
                    { class: 'type-bar-row', 'data-type': type },
                    h(
                      'span',
                      { class: `type-badge type-${type}` },
                      t(`type.${type}` as MessageKey),
                    ),
                    h(
                      'div',
                      { class: 'type-bar-track' },
                      barFill('type-bar-fill', (count / maxType) * 100),
                    ),
                    h('span', { class: 'type-bar-count' }, count),
                  ),
                ),
              ),
        ),
        h(
          'section',
          { class: 'stats-section' },
          h('h2', null, t('stats.top')),
          stats.top.length === 0
            ? h('p', { class: 'stats-empty' }, t('stats.noData'))
            : h(
                'ol',
                { class: 'top-list' },
                ...stats.top.map(({ id, count }, index) => {
                  const entry = getEntry(id);
                  return h(
                    'li',
                    { class: 'top-row' },
                    h('span', { class: 'top-rank' }, `#${index + 1}`),
                    createSprite({ id, size: 128, alt: '', class: 'top-img' }),
                    h('span', { class: 'top-name' }, name(entry, id)),
                    h('span', { class: 'top-count' }, `×${count}`),
                  );
                }),
              ),
        ),
      ];
    });

    return h(
      'section',
      { class: 'stats-page' },
      h(
        'h1',
        { class: 'stats-title' },
        bindText(scope, [lang], () => t('stats.title')),
      ),
      content,
    );
  };
}
