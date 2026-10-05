import { EVENT_TYPES } from './types';
import { LEVEL_CAP, LEVEL_MIN } from '../constants';
import { isValidDay } from '../dates';

/**
 * Vérifie un fichier d'événements ÉCRIT À LA MAIN (donc sujet aux fautes de frappe) et renvoie
 * la liste des problèmes en français clair. Liste vide = tout va bien.
 * `isDrawable(id)` dit si un Pokémon existe ET a une image (jamais d'image cassée).
 */
export function validateEvents(events: unknown, isDrawable: (id: number) => boolean): string[] {
  const problems: string[] = [];
  if (!Array.isArray(events)) return ['Le fichier doit contenir une liste « events ».'];

  const seen = new Set<string>();
  const isInt = (v: unknown): v is number => typeof v === 'number' && Number.isInteger(v);
  const isText = (v: unknown): v is string => typeof v === 'string' && v.trim() !== '';
  const monthDayOk = (m: unknown, d: unknown) =>
    isInt(m) &&
    isInt(d) &&
    isValidDay(`2000-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`);

  events.forEach((raw, index) => {
    const e = raw as Record<string, unknown>;
    const label = isText(e?.id) ? `« ${e.id} »` : `n°${index + 1}`;
    const bad = (message: string) => problems.push(`Événement ${label} : ${message}`);

    if (!isText(e?.id)) bad('identifiant (`id`) manquant');
    else if (seen.has(e.id)) bad('identifiant en double');
    else seen.add(e.id);

    for (const field of ['nameFr', 'nameEn', 'descriptionFr', 'descriptionEn']) {
      if (!isText(e?.[field])) bad(`texte « ${field} » manquant ou vide`);
    }

    // ── Quand ? ───────────────────────────────────────────────────────────
    const type = e?.type as string;
    if (!(EVENT_TYPES as readonly string[]).includes(type)) {
      bad(`type inconnu « ${String(type)} »`);
    } else {
      if (type === 'date_range' || type === 'date_range_weekday') {
        const { startDate, endDate, repeats } = e;
        if (!isText(startDate) || !isValidDay(startDate))
          bad('`startDate` doit être un vrai jour AAAA-MM-JJ');
        if (!isText(endDate) || !isValidDay(endDate))
          bad('`endDate` doit être un vrai jour AAAA-MM-JJ');
        if (isText(startDate) && isText(endDate) && startDate > endDate && repeats === 'once') {
          bad('`startDate` est après `endDate`');
        }
        if (repeats !== 'once' && repeats !== 'yearly') {
          bad('`repeats` doit valoir "once" (une seule fois) ou "yearly" (chaque année)');
        }
      }
      if (type === 'recurring_date' && !monthDayOk(e.month, e.day))
        bad('`month`/`day` ne forment pas un jour valide');
      if (type === 'recurring_dates') {
        const dates = e.dates;
        if (!Array.isArray(dates) || dates.length === 0)
          bad('`dates` doit être une liste non vide');
        else
          dates.forEach(
            (d, i) => !monthDayOk(d?.month, d?.day) && bad(`dates[${i}] n'est pas un jour valide`),
          );
      }
      if (type === 'recurring_weekday_date' || type === 'date_range_weekday') {
        if (!isInt(e.weekday) || e.weekday < 0 || e.weekday > 6)
          bad('`weekday` doit être entre 0 (dimanche) et 6 (samedi)');
      }
      if (type === 'recurring_weekday_date' && (!isInt(e.day) || e.day < 1 || e.day > 31)) {
        bad('`day` doit être entre 1 et 31');
      }
    }

    // ── Quoi ? ────────────────────────────────────────────────────────────
    const m = (e?.modifiers ?? {}) as Record<string, unknown>;
    if (typeof e?.modifiers !== 'object' || e.modifiers === null) bad('`modifiers` manquant');

    const single = m.forcedPokemonId;
    const list = m.forcedPokemonIds;
    if (single !== undefined && list !== undefined)
      bad('`forcedPokemonId` et `forcedPokemonIds` sont exclusifs');
    if (single !== undefined && (!isInt(single) || !isDrawable(single))) {
      bad(`Pokémon forcé #${String(single)} inconnu ou sans image`);
    }
    if (list !== undefined) {
      if (!Array.isArray(list) || list.length === 0)
        bad('`forcedPokemonIds` doit être une liste non vide');
      else {
        if (new Set(list).size !== list.length) bad('`forcedPokemonIds` contient des doublons');
        for (const id of list)
          if (!isInt(id) || !isDrawable(id))
            bad(`Pokémon forcé #${String(id)} inconnu ou sans image`);
      }
    }
    const chanceValue = m.forcedPokemonChance;
    if ((single !== undefined || list !== undefined) && chanceValue === undefined) {
      bad('`forcedPokemonChance` est obligatoire quand un Pokémon est forcé');
    }
    if (chanceValue !== undefined) {
      if (typeof chanceValue !== 'number' || !(chanceValue > 0 && chanceValue <= 1)) {
        bad('`forcedPokemonChance` doit être entre 0 (exclu) et 1');
      }
      if (single === undefined && list === undefined)
        bad('`forcedPokemonChance` sans Pokémon à forcer');
    }
    if (m.shinyRate !== undefined && (!isInt(m.shinyRate) || m.shinyRate < 1))
      bad('`shinyRate` doit être un entier ≥ 1');
    if (
      m.forcedLevel !== undefined &&
      (!isInt(m.forcedLevel) || m.forcedLevel < LEVEL_MIN || m.forcedLevel > LEVEL_CAP)
    ) {
      bad(`\`forcedLevel\` doit être entre ${LEVEL_MIN} et ${LEVEL_CAP}`);
    }
    const [min, max] = [m.victiniTicketsMin, m.victiniTicketsMax];
    if ((min === undefined) !== (max === undefined))
      bad('`victiniTicketsMin` et `victiniTicketsMax` vont ensemble');
    if (min !== undefined && max !== undefined) {
      if (!isInt(min) || !isInt(max) || min < 0 || max < min)
        bad('tickets Victini : il faut 0 ≤ min ≤ max (entiers)');
    }
    for (const flag of ['forcedShiny', 'luckyDayBox', 'aprilFoolsBox']) {
      if (m[flag] !== undefined && typeof m[flag] !== 'boolean')
        bad(`\`${flag}\` doit être true ou false`);
    }
    const known = new Set([
      'forcedPokemonId',
      'forcedPokemonIds',
      'forcedPokemonChance',
      'forcedShiny',
      'shinyRate',
      'forcedLevel',
      'victiniTicketsMin',
      'victiniTicketsMax',
      'luckyDayBox',
      'aprilFoolsBox',
    ]);
    for (const key of Object.keys(m))
      if (!known.has(key)) bad(`modificateur inconnu « ${key} » (faute de frappe ?)`);
  });

  return problems;
}
