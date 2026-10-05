import type { I18n, MessageKey } from '../../i18n';
import { appendChildren, bindAttr, bindChildren, bindText, effect, h, svg } from '../../ui/dom';
import type { View } from '../../ui/router';
import { createStore, type Store } from '../../ui/store';
import { NATURES, SPECIES, type CardEntry } from './spike-data';

const NAME_MAX_LENGTH = 16;

export interface CardDeps {
  i18n: I18n;
  entry: Store<CardEntry>;
}

/** Chemin d'une image : un seul endroit à changer si le nommage évolue (phase 2). */
export function spritePath(id: number, shiny: boolean): string {
  return `/sprites/${id}${shiny ? 's' : ''}.webp`;
}

/** Limite en caractères réels (et non en unités UTF-16 : on ne coupe pas un emoji en deux). */
export function clampName(raw: string): string {
  return Array.from(raw.trim()).slice(0, NAME_MAX_LENGTH).join('');
}

function formatDay(day: string, locale: string): string {
  const [year = 0, month = 1, date = 1] = day.split('-').map(Number);
  const label = new Intl.DateTimeFormat(locale, {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  }).format(new Date(year, month - 1, date));
  return label.charAt(0).toUpperCase() + label.slice(1);
}

/**
 * L'écran « carte du jour ».
 *
 * Principe : la structure est construite UNE fois ; seuls les textes et attributs sont
 * « liés » aux états. Ainsi un changement de langue ne recrée pas le champ de surnom
 * (le focus, la sélection et le défilement sont conservés).
 */
export function createCardView({ i18n, entry }: CardDeps): View {
  return ({ scope }) => {
    const { t, lang } = i18n;
    const editing = createStore(false);

    const species = () => SPECIES[entry.get().id];
    const speciesName = () => species()?.names[lang.get()] ?? `#${entry.get().id}`;
    const displayName = () => entry.get().rename || speciesName();

    // ── En-tête : numéro + types + shiny ────────────────────────────────
    const badges = h('div', { class: 'card-badges' });
    bindChildren(scope, badges, [entry, lang], () => [
      ...(species()?.types ?? []).map((type) =>
        h('span', { class: `type-badge type-${type}` }, t(`type.${type}` as MessageKey)),
      ),
      entry.get().isShiny ? h('span', { class: 'badge-shiny' }, t('card.shiny')) : null,
    ]);

    // ── Portrait ────────────────────────────────────────────────────────
    const portrait = h('div', { class: 'card-portrait' });
    bindChildren(scope, portrait, [entry, lang], () => {
      const { id, isShiny } = entry.get();
      const img = h('img', {
        src: spritePath(id, isShiny),
        alt: speciesName(),
        width: 200,
        height: 200,
        onerror: () => {
          portrait.replaceChildren(
            h(
              'div',
              { class: 'sprite-fallback', role: 'img', 'aria-label': t('card.imageMissing') },
              '?',
            ),
          );
        },
      });
      return [img];
    });

    // ── Nom + renommage ─────────────────────────────────────────────────
    const title = h('h1', { class: 'card-name' }, bindText(scope, [entry, lang], displayName));
    const original = h(
      'p',
      { class: 'card-original' },
      bindText(scope, [entry, lang], speciesName),
    );
    bindAttr(scope, original, 'hidden', [entry, lang], () => displayName() === speciesName());

    const input = h('input', {
      class: 'name-input',
      type: 'text',
      maxlength: NAME_MAX_LENGTH,
      autocomplete: 'off',
      onkeydown: (event) => {
        if (event.key === 'Enter') confirm();
        else if (event.key === 'Escape') editing.set(false);
      },
      onblur: () => confirm(),
    });
    bindAttr(scope, input, 'placeholder', [lang], () => speciesName());
    bindAttr(scope, input, 'aria-label', [lang], () => t('card.rename'));

    function confirm(): void {
      if (!editing.get()) return; // déjà validé ou annulé (évite le double envoi via blur)
      const name = clampName(input.value);
      editing.set(false);
      entry.update((current) => ({ ...current, rename: name === speciesName() ? '' : name }));
    }

    const editButton = h(
      'button',
      {
        class: 'rename-btn',
        type: 'button',
        onclick: () => {
          input.value = entry.get().rename;
          editing.set(true);
        },
      },
      svg(
        'svg',
        {
          viewBox: '0 0 24 24',
          fill: 'none',
          stroke: 'currentColor',
          'stroke-width': 2,
          'aria-hidden': 'true',
        },
        svg('path', { d: 'M12 20h9' }),
        svg('path', { d: 'M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z' }),
      ),
    );
    bindAttr(scope, editButton, 'aria-label', [lang], () => t('card.rename'));

    // Un seul code gère « on édite / on n'édite pas », sans jamais recréer l'<input>.
    effect(scope, [editing], () => {
      const isEditing = editing.get();
      title.hidden = isEditing;
      editButton.hidden = isEditing;
      input.hidden = !isEditing;
      if (isEditing) {
        input.focus();
        input.select();
      }
    });

    const nameRow = h('div', { class: 'name-row' }, title, input, editButton);

    // ── Niveau + nature ─────────────────────────────────────────────────
    const natureName = () => NATURES[entry.get().natureKey]?.[lang.get()] ?? entry.get().natureKey;
    const stats = h(
      'div',
      { class: 'stats-row' },
      h(
        'div',
        { class: 'stat-chip' },
        h(
          'span',
          { class: 'stat-label' },
          bindText(scope, [lang], () => t('card.level')),
        ),
        h(
          'span',
          { class: 'stat-value' },
          bindText(scope, [entry], () => String(entry.get().level)),
        ),
      ),
      h('div', { class: 'stat-divider' }),
      h(
        'div',
        { class: 'stat-chip' },
        h(
          'span',
          { class: 'stat-label' },
          bindText(scope, [lang], () => t('card.nature')),
        ),
        h('span', { class: 'stat-value' }, bindText(scope, [entry, lang], natureName)),
      ),
    );

    // ── Carte complète ──────────────────────────────────────────────────
    const card = h('article', { class: 'card' });
    bindAttr(scope, card, 'data-type', [entry], () => species()?.types[0]);
    bindAttr(scope, card, 'data-shiny', [entry], () => entry.get().isShiny);

    appendChildren(card, [
      h(
        'div',
        { class: 'card-header' },
        h(
          'span',
          { class: 'card-number' },
          bindText(scope, [entry], () => `N°${String(entry.get().id).padStart(4, '0')}`),
        ),
        badges,
      ),
      portrait,
      h('div', { class: 'card-body' }, nameRow, original, stats),
      h(
        'div',
        { class: 'card-footer' },
        bindText(scope, [entry, lang], () =>
          formatDay(entry.get().day, lang.get() === 'fr' ? 'fr-FR' : 'en-US'),
        ),
      ),
    ]);

    return h('section', { class: 'card-page' }, card);
  };
}
