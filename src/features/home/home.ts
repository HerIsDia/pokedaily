import type { PokemonEntry } from '../../core/model';
import type { I18n, MessageKey } from '../../i18n';
import type { Game } from '../../state/game';
import { bindAttr, bindChildren, bindText, effect, h } from '../../ui/dom';
import type { View } from '../../ui/router';
import { createStore, type Store } from '../../ui/store';
import { createCardView } from '../card/card';

export interface HomeDeps {
  i18n: I18n;
  game: Game;
}

/**
 * L'écran d'accueil : le Pokémon du jour, ou l'état du démarrage (chargement / erreur), avec les
 * bandeaux d'information (sauvegarde en échec, mode sans sauvegarde, données réparées).
 */
export function createHomeView({ i18n, game }: HomeDeps): View {
  return ({ scope }) => {
    const { t, lang } = i18n;

    // ── Bandeaux ────────────────────────────────────────────────────────
    const notice = (kind: string, text: () => string, deps = [lang] as const) => {
      const el = h('p', { class: `notice notice-${kind}`, role: 'status' });
      el.append(bindText(scope, deps, text));
      return el;
    };

    const volatile = notice('volatile', () => t('notice.volatile'));
    volatile.hidden = game.persistent;

    const failed = notice('failed', () => t('notice.saveFailed'));
    bindAttr(scope, failed, 'hidden', [game.saveFailed], () => !game.saveFailed.get());

    const dismissed = createStore(false);
    const warnings = h('div', { class: 'notice notice-warnings', role: 'status' });
    bindAttr(scope, warnings, 'hidden', [game.warnings, dismissed], () => {
      return dismissed.get() || game.warnings.get().length === 0;
    });
    bindChildren(scope, warnings, [game.warnings, lang], () => [
      h('p', null, t('notice.warnings')),
      h(
        'details',
        null,
        h('summary', null, t('notice.warningsDetails')),
        h(
          'ul',
          null,
          ...game.warnings
            .get()
            .slice(0, 20)
            .map((w) => h('li', null, w)),
        ),
      ),
      h(
        'button',
        { class: 'notice-close', type: 'button', onclick: () => dismissed.set(true) },
        t('notice.dismiss'),
      ),
    ]);

    // ── Contenu principal ───────────────────────────────────────────────
    const message = h('p', { class: 'home-message', role: 'status' });
    message.append(
      bindText(scope, [game.status, game.error, lang], () => {
        if (game.status.get() === 'loading') return t('home.loading');
        const error = game.error.get();
        return error ? t(`home.error.${error}` as MessageKey) : '';
      }),
    );

    const root = h('section', { class: 'home' }, volatile, failed, warnings, message);

    // La carte est construite UNE fois (à la première apparition du Pokémon du jour) puis mise à
    // jour : changer de jour ou de surnom ne recrée pas l'écran.
    let shown: Store<PokemonEntry> | null = null;
    effect(scope, [game.status, game.today], () => {
      const today = game.today.get();
      message.hidden = game.status.get() === 'ready' && today !== null;
      if (game.status.get() !== 'ready' || !today) return;
      if (shown) {
        shown.set(today);
        return;
      }
      shown = createStore(today);
      root.append(
        createCardView({
          i18n,
          entry: shown,
          onRename: (name) => {
            const day = game.today.get()?.day;
            if (day) void game.rename(day, name);
          },
        })({ scope }),
      );
    });

    return root;
  };
}
