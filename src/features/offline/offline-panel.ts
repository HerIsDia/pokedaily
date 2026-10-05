import type { SpriteSize } from '../../data/sprites';
import type { I18n, MessageKey } from '../../i18n';
import {
  SPRITE_SIZE_MB,
  clearCachedSprites,
  countCachedSprites,
  downloadSprites,
  type DownloadResult,
} from '../../pwa/offline-images';
import { bindAttr, bindText, h } from '../../ui/dom';
import type { Scope } from '../../ui/scope';
import { createStore } from '../../ui/store';

export interface OfflinePanelDeps {
  i18n: I18n;
  scope: Scope;
  /** Pour les tests. */
  api?: {
    available(): boolean;
    count(): Promise<number>;
    download(
      size: SpriteSize,
      onProgress: (done: number, total: number) => void,
      signal: AbortSignal,
    ): Promise<DownloadResult>;
    clear(): Promise<void>;
  };
  confirmAction?: (message: string) => boolean;
}

const browserApi: NonNullable<OfflinePanelDeps['api']> = {
  available: () => typeof caches !== 'undefined',
  count: () => countCachedSprites(),
  download: (size, onProgress, signal) => downloadSprites(size, { onProgress, signal }),
  clear: () => clearCachedSprites(),
};

/** Le bloc « Hors-ligne » : images à télécharger à la demande, et libération de l'espace. */
export function createOfflinePanel({
  i18n,
  scope,
  api = browserApi,
  confirmAction = (message) => window.confirm(message),
}: OfflinePanelDeps): HTMLElement {
  const { t, lang } = i18n;
  const cached = createStore<number | null>(null);
  const progress = createStore<{ done: number; total: number } | null>(null);
  const message = createStore<{ key: MessageKey; params?: Record<string, number> } | null>(null);
  let controller: AbortController | null = null;
  let messageTimer: ReturnType<typeof setTimeout> | undefined;
  scope.add(() => {
    controller?.abort();
    clearTimeout(messageTimer);
  });
  // Le message (« terminé », « annulé »…) s'efface au bout de quelques secondes : le compteur revient.
  scope.add(
    message.subscribe((m) => {
      clearTimeout(messageTimer);
      if (m) messageTimer = setTimeout(() => message.set(null), 6000);
    }),
  );

  const refresh = () =>
    void api
      .count()
      .then((n) => cached.set(n))
      .catch(() => cached.set(null));
  if (api.available()) refresh();

  async function start(size: SpriteSize): Promise<void> {
    if (progress.get()) return;
    controller = new AbortController();
    message.set(null);
    progress.set({ done: 0, total: 1 });
    try {
      const result = await api.download(
        size,
        (done, total) => progress.set({ done, total }),
        controller.signal,
      );
      if (result.cancelled) message.set({ key: 'offline.cancelled' });
      else if (result.failed > 0)
        message.set({ key: 'offline.someFailed', params: { count: result.failed } });
      else message.set({ key: 'offline.done' });
    } catch {
      message.set({ key: 'offline.failed' });
    }
    controller = null;
    progress.set(null);
    refresh();
  }

  const downloadButton = (size: SpriteSize, key: MessageKey) => {
    const button = h(
      'button',
      { class: 'btn', type: 'button', onclick: () => void start(size) },
      bindText(scope, [lang], () => t(key, { mb: SPRITE_SIZE_MB[size] })),
    );
    bindAttr(scope, button, 'disabled', [progress], () => progress.get() !== null);
    return button;
  };

  const cancel = h(
    'button',
    { class: 'btn', type: 'button', onclick: () => controller?.abort() },
    bindText(scope, [lang], () => t('offline.cancel')),
  );
  bindAttr(scope, cancel, 'hidden', [progress], () => progress.get() === null);

  const bar = h('progress', { class: 'offline-progress', max: 1, value: 0 });
  bindAttr(scope, bar, 'hidden', [progress], () => progress.get() === null);
  scope.add(
    progress.subscribe((p) => {
      if (!p) return;
      bar.max = p.total;
      bar.value = p.done;
    }),
  );

  const clear = h(
    'button',
    {
      class: 'btn',
      type: 'button',
      onclick: () => {
        if (!confirmAction(t('offline.confirmClear'))) return;
        void api
          .clear()
          .then(() => message.set({ key: 'offline.cleared' }))
          .finally(refresh);
      },
    },
    bindText(scope, [lang], () => t('offline.clear')),
  );
  bindAttr(scope, clear, 'disabled', [progress], () => progress.get() !== null);

  const status = h('p', { class: 'offline-status', role: 'status' });
  status.append(
    bindText(scope, [cached, progress, message, lang], () => {
      const p = progress.get();
      if (p) return t('offline.progress', { done: p.done, total: p.total });
      const m = message.get();
      if (m) return t(m.key, m.params);
      const n = cached.get();
      return n === null ? '' : t('offline.cached', { count: n });
    }),
  );

  const unsupported = !api.available();
  return h(
    'section',
    { class: 'offline-panel' },
    h(
      'h2',
      null,
      bindText(scope, [lang], () => t('offline.title')),
    ),
    h(
      'p',
      null,
      bindText(scope, [lang], () => t(unsupported ? 'offline.unsupported' : 'offline.intro')),
    ),
    unsupported
      ? null
      : h(
          'div',
          { class: 'backup-actions' },
          downloadButton(128, 'offline.small'),
          downloadButton(512, 'offline.large'),
          cancel,
          clear,
        ),
    unsupported ? null : bar,
    status,
  );
}
