import type { I18n } from '../../i18n';
import type { Installer } from '../../pwa/install';
import { createModal, type Modal } from '../../ui/dialog';
import { bindAttr, bindText, h } from '../../ui/dom';
import type { Scope } from '../../ui/scope';

const DISMISS_KEY = 'pokedaily.installDismissed';

function readDismissed(): boolean {
  try {
    return window.localStorage.getItem(DISMISS_KEY) === '1';
  } catch {
    return false; // stockage bloqué : on propose quand même
  }
}

export interface InstallUiDeps {
  i18n: I18n;
  scope: Scope;
  installer: Installer;
}

/**
 * Bandeau « Installer » (en haut, qu'on peut fermer pour de bon) et fenêtre d'aide pour iPhone.
 * `action` sert aussi de bouton permanent dans la page « À propos ».
 */
export function createInstallUi({ i18n, scope, installer }: InstallUiDeps): {
  banner: HTMLElement;
  modal: Modal;
  /** Un bouton « Installer » / « Comment installer ? » qui suit l'état. */
  actionButton(className: string): HTMLButtonElement;
} {
  const { t, lang } = i18n;
  const { state } = installer;
  let dismissed = readDismissed();

  const steps = h(
    'ol',
    { class: 'install-steps' },
    ...(['install.step1', 'install.step2', 'install.step3'] as const).map((key) =>
      h(
        'li',
        null,
        bindText(scope, [lang], () => t(key)),
      ),
    ),
  );
  const modal = createModal({
    scope,
    title: () => t('install.helpTitle'),
    titleDeps: [lang],
    closeLabel: () => t('modal.close'),
    body: h(
      'div',
      { class: 'install-help' },
      steps,
      h(
        'p',
        null,
        bindText(scope, [lang], () => t('install.helpNote')),
      ),
    ),
  });

  const act = async () => {
    if (state.get() === 'prompt') await installer.prompt();
    else modal.open();
  };
  const actionLabel = () => (state.get() === 'prompt' ? t('install.button') : t('install.how'));

  const actionButton = (className: string) => {
    const button = h('button', { class: className, type: 'button', onclick: () => void act() });
    button.append(bindText(scope, [state, lang], actionLabel));
    bindAttr(
      scope,
      button,
      'hidden',
      [state],
      () => state.get() !== 'prompt' && state.get() !== 'ios',
    );
    return button;
  };

  const close = h(
    'button',
    {
      class: 'install-close',
      type: 'button',
      onclick: () => {
        dismissed = true;
        try {
          window.localStorage.setItem(DISMISS_KEY, '1');
        } catch {
          // stockage bloqué : le bandeau reviendra, ce n'est pas grave
        }
        banner.hidden = true;
      },
    },
    '✕',
  );
  bindAttr(scope, close, 'aria-label', [lang], () => t('modal.close'));

  const banner = h(
    'div',
    { class: 'install-banner' },
    h(
      'span',
      { class: 'install-text' },
      bindText(scope, [lang], () => t('install.text')),
    ),
    actionButton('install-btn'),
    close,
  );
  const refresh = () => {
    banner.hidden = dismissed || (state.get() !== 'prompt' && state.get() !== 'ios');
  };
  scope.add(state.subscribe(refresh));
  return { banner, modal, actionButton };
}
