import { FORM_CHANCE_MAX_PERCENT } from '../../core/constants';
import { formChancePercent } from '../../core/form-pity';
import type { GameState } from '../../core/game-state';
import { todayEntry } from '../../core/game-state';
import { getEntry } from '../../data';
import type { I18n } from '../../i18n';
import { bindAttr, bindText, h } from '../../ui/dom';
import type { Scope } from '../../ui/scope';
import type { ReadStore } from '../../ui/store';

/** Ce que la jauge affiche, calculé à partir de l'état du jeu (pur, testé). */
export interface FormGaugeInfo {
  /** Chance (en %) que le tirage de DEMAIN soit une forme alternative. */
  percent: number;
  /** Dans combien de jours une forme est certaine si aucune ne sort avant. */
  guaranteedInDays: number;
  /** Le Pokémon d'aujourd'hui est-il une forme ? (la jauge vient de repartir à 1 %) */
  gotFormToday: boolean;
}

export function formGaugeInfo(
  state: Pick<GameState, 'pity' | 'entries' | 'lastDrawDay'>,
): FormGaugeInfo {
  const percent = formChancePercent(state.pity);
  const today = todayEntry(state as GameState);
  return {
    percent,
    // Demain a `percent` % ; la chance monte de 1 point par jour sans forme jusqu'à 100 %.
    guaranteedInDays: FORM_CHANCE_MAX_PERCENT - percent + 1,
    gotFormToday: today !== null && getEntry(today.id)?.form !== undefined,
  };
}

export interface FormGaugeDeps {
  i18n: I18n;
  scope: Scope;
  state: ReadStore<GameState>;
}

/** La jauge « chance de forme » : rend visible le pourcentage progressif (+1 % par jour sans forme). */
export function createFormGauge({ i18n, scope, state }: FormGaugeDeps): HTMLElement {
  const { t, lang } = i18n;
  const info = () => formGaugeInfo(state.get());

  const fill = h('div', { class: 'gauge-fill' });
  const track = h(
    'div',
    { class: 'gauge-track', role: 'progressbar', 'aria-valuemin': 0, 'aria-valuemax': 100 },
    fill,
  );
  bindAttr(scope, track, 'aria-valuenow', [state], () => String(info().percent));
  bindAttr(scope, track, 'aria-label', [lang], () => t('gauge.title'));
  const sync = () => {
    fill.style.width = `${info().percent}%`;
  };
  sync();
  scope.add(state.subscribe(sync, { immediate: false }));

  const title = h('p', { class: 'gauge-title' });
  title.append(
    bindText(scope, [state, lang], () => t('gauge.tomorrow', { percent: info().percent })),
  );
  const detail = h('p', { class: 'gauge-detail' });
  detail.append(
    bindText(scope, [state, lang], () => {
      const { gotFormToday, guaranteedInDays } = info();
      const days = t('gauge.guaranteed', { days: guaranteedInDays });
      return gotFormToday ? `${t('gauge.gotForm')} ${days}` : `${t('gauge.hint')} ${days}`;
    }),
  );

  return h('section', { class: 'form-gauge', 'aria-live': 'off' }, title, track, detail);
}
