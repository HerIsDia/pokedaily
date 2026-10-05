import type { GameState } from '../../core/game-state';
import type { I18n, MessageKey } from '../../i18n';
import type { Game } from '../../state/game';
import { MAX_BACKUP_BYTES } from '../../storage/backup';
import { bindText, h } from '../../ui/dom';
import type { Scope } from '../../ui/scope';
import { downloadBlob } from '../../ui/download';
import { createStore } from '../../ui/store';

export interface BackupPanelDeps {
  i18n: I18n;
  game: Game;
  scope: Scope;
  /** Pour les tests : par défaut, les fonctions du navigateur. */
  confirmAction?: (message: string) => boolean;
  download?: (filename: string, content: string) => void;
}

/** Télécharge un texte comme fichier JSON. */
export function downloadTextFile(filename: string, content: string): void {
  downloadBlob(filename, new Blob([content], { type: 'application/json' }));
}

const countDays = (state: GameState) => Object.keys(state.entries).length;

/** Le bloc « Ma collection » : exporter / importer, avec confirmation avant d'écraser. */
export function createBackupPanel({
  i18n,
  game,
  scope,
  confirmAction = (message) => window.confirm(message),
  download = downloadTextFile,
}: BackupPanelDeps): HTMLElement {
  const { t, lang } = i18n;
  /** Le dernier message (réussite ou échec), recalculé quand la langue change. */
  const feedback = createStore<(() => string) | null>(null);
  const isError = createStore(false);

  const say = (read: () => string, error: boolean) => {
    isError.set(error);
    feedback.set(read);
  };

  const input = h('input', {
    class: 'backup-file',
    type: 'file',
    accept: 'application/json,.json',
    hidden: true,
    tabindex: -1,
    onchange: () => void onFileChosen(),
  });

  async function onFileChosen(): Promise<void> {
    const file = input.files?.[0];
    input.value = ''; // permet de re-choisir le même fichier
    if (!file) return;
    if (file.size > MAX_BACKUP_BYTES) {
      say(() => t('backup.failure.too_big'), true);
      return;
    }
    let text: string;
    try {
      text = await file.text();
    } catch {
      say(() => t('backup.failure.read_failed'), true);
      return;
    }
    const result = game.readBackup(text);
    if (!result.ok) {
      const first = result.details[0] ?? '';
      say(() => t(`backup.failure.${result.reason}` as MessageKey, { first }), true);
      return;
    }
    const incoming = {
      incoming: countDays(result.state),
      caught: result.state.caught.length,
    };
    const current = countDays(game.state.get());
    if (!confirmAction(t('backup.confirm', { current, ...incoming }))) {
      say(() => t('backup.cancelled'), false);
      return;
    }
    const outcome = await game.importState(result.state);
    if (outcome.ok) say(() => t('backup.imported', incoming), false);
    else say(() => t('backup.failure.save_failed'), true);
  }

  const status = h('p', { class: 'backup-feedback', role: 'status' });
  status.append(bindText(scope, [feedback, lang], () => feedback.get()?.() ?? ''));
  scope.add(isError.subscribe((error) => status.classList.toggle('is-error', error)));

  return h(
    'section',
    { class: 'backup-panel' },
    h(
      'h2',
      null,
      bindText(scope, [lang], () => t('backup.title')),
    ),
    h(
      'p',
      null,
      bindText(scope, [lang], () => t('backup.intro')),
    ),
    h(
      'div',
      { class: 'backup-actions' },
      h(
        'button',
        {
          class: 'btn',
          type: 'button',
          onclick: () => {
            const { filename, json } = game.exportBackup();
            download(filename, json);
            say(() => t('backup.exported', { filename }), false);
          },
        },
        bindText(scope, [lang], () => t('backup.export')),
      ),
      h(
        'button',
        { class: 'btn', type: 'button', onclick: () => input.click() },
        bindText(scope, [lang], () => t('backup.import')),
      ),
      input,
    ),
    status,
  );
}
