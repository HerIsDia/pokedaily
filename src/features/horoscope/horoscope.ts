import type { PokemonEntry } from '../../core/model';
import { getEntry, getNature, type NatureStat } from '../../data';
import { natureLines, typeLines } from '../../data/horoscope';
import type { I18n, MessageKey } from '../../i18n';
import { bindText, h } from '../../ui/dom';
import type { Scope } from '../../ui/scope';
import type { ReadStore } from '../../ui/store';

export const STAT_KEYS: Record<NatureStat, MessageKey> = {
  attack: 'stat.attack',
  defense: 'stat.defense',
  'special-attack': 'stat.specialAttack',
  'special-defense': 'stat.specialDefense',
  speed: 'stat.speed',
};

export interface HoroscopeDeps {
  i18n: I18n;
  scope: Scope;
  entry: ReadStore<PokemonEntry>;
}

/**
 * L'« horoscope du jour » : une phrase selon la nature du Pokémon, une ou deux selon son type, et
 * ce que la nature change vraiment aux statistiques (+10 % / −10 %). Pour sourire, pas pour y croire.
 */
export function createHoroscope({ i18n, scope, entry }: HoroscopeDeps): HTMLElement {
  const { t, lang } = i18n;

  const title = h('h2', { class: 'horoscope-title' });
  title.append(bindText(scope, [lang], () => t('horoscope.title')));

  const body = h('div', { class: 'horoscope-body' });
  const render = () => {
    const current = entry.get();
    const code = lang.get();
    const nature = getNature(current.natureKey);
    const types = getEntry(current.id)?.types ?? [];
    const lines = [
      natureLines[current.natureKey]?.[code],
      ...types.map((type) => typeLines[type]?.[code]),
    ].filter((line): line is string => Boolean(line));

    const effect = nature
      ? nature.up && nature.down
        ? t('horoscope.effect', {
            nature: nature[code],
            up: t(STAT_KEYS[nature.up]),
            down: t(STAT_KEYS[nature.down]),
          })
        : t('horoscope.neutral', { nature: nature[code] })
      : '';

    body.replaceChildren(
      ...lines.map((line) => h('p', { class: 'horoscope-line' }, line)),
      h('p', { class: 'horoscope-effect' }, effect),
    );
  };
  render();
  scope.add(entry.subscribe(render, { immediate: false }));
  scope.add(lang.subscribe(render, { immediate: false }));

  return h('section', { class: 'horoscope', 'aria-live': 'off' }, title, body);
}
