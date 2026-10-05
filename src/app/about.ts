import { createBackupPanel } from '../features/backup/backup-panel';
import type { I18n } from '../i18n';
import type { Game } from '../state/game';
import { bindText, h } from '../ui/dom';
import type { View } from '../ui/router';

export function createAboutView({ i18n, game }: { i18n: I18n; game: Game }): View {
  return ({ scope }) => {
    const { t, lang } = i18n;
    const text = (read: () => string) => bindText(scope, [lang], read);
    return h(
      'section',
      { class: 'about-page' },
      h(
        'h1',
        null,
        text(() => t('about.title')),
      ),
      h(
        'p',
        null,
        text(() => t('about.principles')),
      ),
      h(
        'p',
        null,
        text(() => t('about.disclaimer')),
      ),
      h(
        'p',
        { class: 'about-version' },
        text(() => t('about.version', { version: __APP_VERSION__ })),
      ),
      createBackupPanel({ i18n, game, scope }),
    );
  };
}
