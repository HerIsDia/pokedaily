import type { EventModifiers } from '../../core/events/types';
import type { I18n, MessageKey } from '../../i18n';

/** Ce qu'un événement change, en petites étiquettes lisibles (« ✦ Taux shiny : 1/30 »). */
export function describeModifiers(modifiers: EventModifiers, { t }: Pick<I18n, 't'>): string[] {
  const chips: string[] = [];
  const add = (key: MessageKey, params?: Record<string, string | number>) =>
    chips.push(t(key, params));

  const chance = modifiers.forcedPokemonChance;
  const hasForced =
    modifiers.forcedPokemonId !== undefined || (modifiers.forcedPokemonIds?.length ?? 0) > 0;
  if (hasForced && chance !== undefined) {
    add(chance >= 1 ? 'event.mod.forcedAlways' : 'event.mod.forcedChance', {
      percent: Math.round(chance * 100),
    });
  }
  if (modifiers.shinyRate !== undefined) add('event.mod.shinyRate', { rate: modifiers.shinyRate });
  if (modifiers.forcedShiny) add('event.mod.forcedShiny');
  if (modifiers.forcedLevel !== undefined) add('event.mod.level', { level: modifiers.forcedLevel });
  const min = modifiers.victiniTicketsMin;
  const max = modifiers.victiniTicketsMax;
  if (min !== undefined && max !== undefined) {
    add('event.mod.tickets', { range: min === max ? String(min) : `${min}–${max}` });
  }
  if (modifiers.luckyDayBox) add('event.mod.luckyBox');
  if (modifiers.aprilFoolsBox) add('event.mod.aprilBox');
  return chips;
}
