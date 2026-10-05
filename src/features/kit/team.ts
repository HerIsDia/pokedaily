import { getEntry, getNature } from '../../data';
import type { I18n, MessageKey } from '../../i18n';
import type { Game } from '../../state/game';
import { bindChildren, bindText, effect, h } from '../../ui/dom';
import type { View } from '../../ui/router';
import { monthLabel } from '../history/history';
import { createSprite } from '../shared/sprite';

export interface TeamDeps {
  i18n: I18n;
  game: Game;
}

/** « La team du mois » : 6 Pokémon différents, une nouvelle équipe chaque mois. */
export function createTeamView({ i18n, game }: TeamDeps): View {
  return ({ scope }) => {
    const { t, lang } = i18n;

    // Crée la team du mois si elle n'existe pas (dès que le jeu est prêt).
    effect(scope, [game.status], () => {
      if (game.status.get() === 'ready') void game.ensureMonthlyTeam(game.currentMonth());
    });

    const month = () => game.currentMonth();
    const [year = 0, mon = 1] = month().split('-').map(Number);

    const list = h('ul', { class: 'team-list' });
    bindChildren(scope, list, [game.state, lang], () => {
      const team = game.state.get().monthlyTeam;
      if (!team || team.month !== month())
        return [h('li', { class: 'team-loading' }, t('home.loading'))];
      return team.pokemon.map((p) => {
        const dex = getEntry(p.id);
        const name = dex?.[lang.get()] ?? `#${p.id}`;
        return h(
          'li',
          { class: 'team-card', 'data-type': dex?.types[0], 'data-shiny': p.isShiny || undefined },
          createSprite({ id: p.id, shiny: p.isShiny, size: 128, alt: name, class: 'team-img' }),
          h(
            'div',
            { class: 'team-info' },
            h('span', { class: 'team-name' }, name),
            h(
              'span',
              { class: 'team-meta' },
              `${t('card.level')} ${p.level} · ${getNature(p.natureKey)?.[lang.get()] ?? p.natureKey}`,
            ),
            h(
              'div',
              { class: 'team-badges' },
              ...(dex?.types ?? []).map((type) =>
                h('span', { class: `type-badge type-${type}` }, t(`type.${type}` as MessageKey)),
              ),
              p.isShiny ? h('span', { class: 'shiny-pill' }, t('card.shiny')) : null,
            ),
          ),
        );
      });
    });

    return h(
      'section',
      { class: 'team-page' },
      h(
        'a',
        { class: 'back-link', href: '#/kit' },
        bindText(scope, [lang], () => `← ${t('kit.title')}`),
      ),
      h(
        'h1',
        { class: 'kit-title' },
        bindText(scope, [lang], () => t('team.title')),
      ),
      h(
        'p',
        { class: 'kit-subtitle' },
        bindText(scope, [lang], () =>
          t('team.intro', { month: monthLabel({ year, month: mon }, lang.get()) }),
        ),
      ),
      list,
      h(
        'p',
        { class: 'team-note' },
        bindText(scope, [lang], () => t('team.note')),
      ),
    );
  };
}
