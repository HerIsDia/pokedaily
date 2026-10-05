import type { PokemonEntry } from '../../core/model';
import type { I18n, MessageKey } from '../../i18n';
import { bindAttr, bindText, h } from '../../ui/dom';
import { downloadBlob } from '../../ui/download';
import type { Scope } from '../../ui/scope';
import { createStore, type ReadStore } from '../../ui/store';
import { buildCardImageSpec, readTypeColor, renderCardImage } from './share-image';
import { getEntry } from '../../data';

export type ShareOutcome = 'shared' | 'cancelled' | 'downloaded' | 'copied' | 'failed';

/** Ce dont le partage a besoin du navigateur (remplaçable dans les tests). */
export interface ShareEnv {
  /** Le navigateur sait-il ouvrir un menu de partage ? (sinon on cache le bouton) */
  supportsShare(): boolean;
  canShareFiles(file: File): boolean;
  share(data: ShareData): Promise<void>;
  canCopyImage(): boolean;
  copyImage(blob: Blob): Promise<void>;
  download(filename: string, blob: Blob): void;
}

export function browserShareEnv(): ShareEnv {
  return {
    supportsShare: () => typeof navigator.share === 'function',
    canShareFiles: (file) =>
      typeof navigator.share === 'function' &&
      typeof navigator.canShare === 'function' &&
      navigator.canShare({ files: [file] }),
    share: (data) => navigator.share(data),
    canCopyImage: () =>
      typeof ClipboardItem !== 'undefined' && typeof navigator.clipboard?.write === 'function',
    copyImage: (blob) => navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]),
    download: downloadBlob,
  };
}

const isAbort = (error: unknown) => error instanceof DOMException && error.name === 'AbortError';

export const imageFilename = (entry: PokemonEntry) => `pokedaily-${entry.day}.png`;

/** Ouvre le menu de partage du téléphone ; sinon télécharge. Annuler n'est pas une erreur. */
export async function shareImage(
  blob: Blob,
  filename: string,
  text: { title: string; text: string },
  env: ShareEnv,
): Promise<ShareOutcome> {
  const file = new File([blob], filename, { type: 'image/png' });
  try {
    if (env.canShareFiles(file)) {
      await env.share({ files: [file], ...text });
      return 'shared';
    }
    env.download(filename, blob);
    return 'downloaded';
  } catch (error) {
    return isAbort(error) ? 'cancelled' : 'failed';
  }
}

/** Copie l'image dans le presse-papiers ; sinon la télécharge. */
export async function copyImage(
  blob: Blob,
  filename: string,
  env: ShareEnv,
): Promise<ShareOutcome> {
  try {
    if (env.canCopyImage()) {
      await env.copyImage(blob);
      return 'copied';
    }
    env.download(filename, blob);
    return 'downloaded';
  } catch {
    return 'failed';
  }
}

export interface ShareActionsDeps {
  i18n: I18n;
  entry: ReadStore<PokemonEntry>;
  scope: Scope;
  env?: ShareEnv;
  /** Pour les tests : fabrique l'image sans canvas. */
  render?: (entry: PokemonEntry) => Promise<Blob>;
}

const OUTCOME_MESSAGE: Partial<Record<ShareOutcome, MessageKey>> = {
  copied: 'card.copied',
  downloaded: 'card.downloaded',
  failed: 'card.shareFailed',
};

/** Les trois boutons sous la carte : Partager · Copier · Télécharger. */
export function createShareActions({
  i18n,
  entry,
  scope,
  env = browserShareEnv(),
  render = (current) => {
    const type = getEntry(current.id)?.types[0];
    return renderCardImage(buildCardImageSpec(current, i18n, readTypeColor(type)));
  },
}: ShareActionsDeps): HTMLElement {
  const { t, lang } = i18n;
  const busy = createStore(false);
  const message = createStore<MessageKey | null>(null);
  let timer: ReturnType<typeof setTimeout> | undefined;
  scope.add(() => clearTimeout(timer));

  async function run(action: (blob: Blob, current: PokemonEntry) => Promise<ShareOutcome>) {
    if (busy.get()) return;
    busy.set(true);
    message.set(null);
    clearTimeout(timer);
    let outcome: ShareOutcome;
    try {
      const current = entry.get();
      outcome = await action(await render(current), current);
    } catch {
      outcome = 'failed';
    }
    busy.set(false);
    message.set(OUTCOME_MESSAGE[outcome] ?? null);
    if (message.get()) timer = setTimeout(() => message.set(null), 3000);
  }

  const button = (labelKey: MessageKey, onClick: () => void) => {
    const el = h(
      'button',
      { class: 'action-btn', type: 'button', onclick: onClick },
      bindText(scope, [lang], () => t(labelKey)),
    );
    bindAttr(scope, el, 'disabled', [busy], () => busy.get());
    return el;
  };

  const shareText = () => {
    const current = entry.get();
    const name = current.rename || getEntry(current.id)?.[lang.get()] || '';
    return { title: t('card.shareTitle', { name }), text: t('card.shareText') };
  };

  // Partager et Copier n'apparaissent que si le navigateur sait le faire (sinon ils ne feraient
  // que télécharger, comme le 3ᵉ bouton).
  const buttons = [
    env.supportsShare() &&
      button(
        'card.share',
        () =>
          void run((blob, current) => shareImage(blob, imageFilename(current), shareText(), env)),
      ),
    env.canCopyImage() &&
      button(
        'card.copy',
        () => void run((blob, current) => copyImage(blob, imageFilename(current), env)),
      ),
    button(
      'card.download',
      () =>
        void run((blob, current) => {
          env.download(imageFilename(current), blob);
          return Promise.resolve('downloaded');
        }),
    ),
  ];

  const status = h('p', { class: 'share-status', role: 'status' });
  status.append(
    bindText(scope, [message, lang], () => {
      const key = message.get();
      return key ? t(key) : '';
    }),
  );

  return h(
    'div',
    { class: 'card-actions' },
    h('div', { class: 'card-actions-row' }, ...buttons),
    status,
  );
}
