import type { I18n, MessageKey } from '../../i18n';
import type { Game } from '../../state/game';
import { bindText, h } from '../../ui/dom';
import type { View } from '../../ui/router';
import { icon } from '../../app/icons';

export interface KitDeps {
  i18n: I18n;
  game: Game;
}

/** Le menu du Pokékit : les modes secondaires (V-Roulette, team du mois). */
export function createKitView({ i18n, game }: KitDeps): View {
  return ({ scope }) => {
    const { t, lang } = i18n;
    const text = (read: () => string) => bindText(scope, [lang], read);

    const tile = (path: string, name: 'team' | 'roulette', title: MessageKey, desc: MessageKey) =>
      h(
        'a',
        { class: 'kit-tile', href: `#/${path}` },
        h('span', { class: 'kit-tile-icon' }, icon(name)),
        h(
          'h2',
          null,
          text(() => t(title)),
        ),
        h(
          'p',
          null,
          text(() => t(desc)),
        ),
      );

    const tickets = h('span', { class: 'ticket-badge' });
    tickets.append(
      bindText(scope, [game.state, lang], () =>
        t('kit.tickets', { count: game.state.get().tickets }),
      ),
    );

    const roulette = tile('kit/roulette', 'roulette', 'kit.roulette.title', 'kit.roulette.desc');
    roulette.append(tickets);

    return h(
      'section',
      { class: 'kit-page' },
      h(
        'h1',
        { class: 'kit-title' },
        text(() => t('kit.title')),
      ),
      h(
        'p',
        { class: 'kit-subtitle' },
        text(() => t('kit.subtitle')),
      ),
      h(
        'div',
        { class: 'kit-grid' },
        tile('kit/team', 'team', 'kit.team.title', 'kit.team.desc'),
        roulette,
      ),
    );
  };
}
