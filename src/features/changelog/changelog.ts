import { changelog, type ChangelogEntry } from '../../data/changelog';
import type { I18n } from '../../i18n';
import { bindAttr, bindChildren, h } from '../../ui/dom';
import { createModal, type Modal } from '../../ui/dialog';
import type { Scope } from '../../ui/scope';

/** « 4.0.0-dev.1 » → « 4.0 » : ce que les joueurs voient. */
export function shortVersion(version: string): string {
  return version.split('.').slice(0, 2).join('.');
}

export interface ChangelogUiDeps {
  i18n: I18n;
  scope: Scope;
  /** Pour les tests : par défaut, le fichier de notes de l'application. */
  entries?: readonly ChangelogEntry[];
  version?: string;
}

/**
 * Le numéro de version (bouton dans l'en-tête) et la fenêtre « Dernières mises à jour » qu'il
 * ouvre. La « Note de Diamant » n'apparaît que si elle existe dans les données.
 */
export function createChangelogUi({
  i18n,
  scope,
  entries = changelog,
  version = __APP_VERSION__,
}: ChangelogUiDeps): { badge: HTMLButtonElement; modal: Modal } {
  const { t, lang } = i18n;

  const body = h('div', { class: 'changelog' });
  bindChildren(scope, body, [lang], () =>
    entries.map((entry) =>
      h(
        'article',
        { class: 'cl-entry' },
        h(
          'header',
          { class: 'cl-entry-head' },
          h('span', { class: 'cl-version' }, entry.version),
          h('span', { class: 'cl-date' }, entry.date[lang.get()]),
        ),
        entry.note
          ? h(
              'blockquote',
              { class: 'cl-note' },
              h('p', { class: 'cl-note-label' }, t('changelog.noteLabel')),
              h('p', null, entry.note[lang.get()]),
              h('p', { class: 'cl-note-sign' }, '— Diamant'),
            )
          : null,
        ...entry.sections.map((section) =>
          h(
            'section',
            { class: 'cl-section' },
            h('h3', null, section.title[lang.get()]),
            h('ul', null, ...section.items[lang.get()].map((item) => h('li', null, item))),
          ),
        ),
      ),
    ),
  );

  const modal = createModal({
    scope,
    title: () => t('changelog.title'),
    titleDeps: [lang],
    closeLabel: () => t('modal.close'),
    body,
  });

  const badge = h(
    'button',
    { class: 'version-badge', type: 'button', 'aria-haspopup': 'dialog' },
    shortVersion(version),
  );
  bindAttr(scope, badge, 'aria-label', [lang], () =>
    t('changelog.open', { version: shortVersion(version) }),
  );
  badge.addEventListener('click', () => modal.open());
  return { badge, modal };
}
