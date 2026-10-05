import type { PokemonEntry } from '../../core/model';
import type { I18n, MessageKey } from '../../i18n';
import { appendChildren, bindAttr, bindChildren, bindText, effect, h, svg } from '../../ui/dom';
import type { View } from '../../ui/router';
import { createStore, type ReadStore } from '../../ui/store';
import { NAME_MAX_LENGTH } from '../../core/constants';
import { clampName } from '../../core/names';
import { getEntry, getNature } from '../../data';
import { spriteUrl, type SpriteSize } from '../../data/sprites';
import { createShareActions } from './share-actions';
import { formatDay, localeOf } from './share-image';

export interface CardDeps {
  i18n: I18n;
  /** Le Pokémon affiché (lecture seule : la carte ne modifie rien elle-même). */
  entry: ReadStore<PokemonEntry>;
  /** Appelée avec le nouveau surnom (déjà borné ; vide = revenir au nom de l'espèce). */
  onRename: (name: string) => void;
}

/** Taille de l'image de la carte : 512 px reste net sur les écrans denses ; à confirmer à l'œil. */
export const CARD_SPRITE_SIZE: SpriteSize = 512;

/** Chemin de l'image de la carte (un seul endroit à changer). */
export function spritePath(id: number, shiny: boolean): string {
  return spriteUrl(id, shiny, CARD_SPRITE_SIZE);
}

/**
 * L'écran « carte du jour ».
 *
 * Principe : la structure est construite UNE fois ; seuls les textes et attributs sont
 * « liés » aux états. Ainsi un changement de langue ne recrée pas le champ de surnom
 * (le focus, la sélection et le défilement sont conservés).
 */
export function createCardView({ i18n, entry, onRename }: CardDeps): View {
  return ({ scope }) => {
    const { t, lang } = i18n;
    const editing = createStore(false);

    const dexEntry = () => getEntry(entry.get().id);
    const speciesName = () => dexEntry()?.[lang.get()] ?? `#${entry.get().id}`;
    const displayName = () => entry.get().rename || speciesName();

    // ── En-tête : numéro + types + shiny ────────────────────────────────
    const badges = h('div', { class: 'card-badges' });
    bindChildren(scope, badges, [entry, lang], () => [
      ...(dexEntry()?.types ?? []).map((type) =>
        h('span', { class: `type-badge type-${type}` }, t(`type.${type}` as MessageKey)),
      ),
      dexEntry()?.form
        ? h('span', { class: 'badge-form' }, t(`form.${dexEntry()!.form!.category}` as MessageKey))
        : null,
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
      onRename(name === speciesName() ? '' : name);
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
    const natureName = () =>
      getNature(entry.get().natureKey)?.[lang.get()] ?? entry.get().natureKey;
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
    bindAttr(scope, card, 'data-type', [entry], () => dexEntry()?.types[0]);
    bindAttr(scope, card, 'data-shiny', [entry], () => entry.get().isShiny);

    appendChildren(card, [
      h(
        'div',
        { class: 'card-header' },
        h(
          'span',
          { class: 'card-number' },
          bindText(
            scope,
            [entry],
            // Une forme porte le numéro de son espèce (N°0006 pour Méga-Dracaufeu X).
            () => `N°${String(dexEntry()?.speciesId ?? entry.get().id).padStart(4, '0')}`,
          ),
        ),
        badges,
      ),
      portrait,
      h('div', { class: 'card-body' }, nameRow, original, stats),
      h(
        'div',
        { class: 'card-footer' },
        bindText(scope, [entry, lang], () => formatDay(entry.get().day, localeOf(lang.get()))),
      ),
    ]);

    return h('section', { class: 'card-page' }, card, createShareActions({ i18n, entry, scope }));
  };
}
