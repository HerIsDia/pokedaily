import { addDays, type Day } from '../../core/dates';
import { activeEvents } from '../../core/events/engine';
import type { GameEvent } from '../../core/events/types';
import type { GameState } from '../../core/game-state';
import { POKEMON_TYPES } from '../../core/pokemon-types';
import { VICTINI_ID } from '../../core/constants';

/**
 * Les succès. Ils sont CALCULÉS à partir de la collection (comme les badges de série) : rien de
 * plus n'est sauvegardé, un succès ne peut donc pas se désynchroniser, et il se retrouve tout
 * seul après un import. Pur : testé sans navigateur.
 *
 * Les textes sont dans `fr.ts`/`en.ts` sous `ach.<id>.name` et `ach.<id>.desc`.
 */

/** Ce que le calcul a besoin de savoir sur les Pokémon (fourni par `data/`). */
export interface AchievementLookup {
  typesOf(id: number): readonly string[];
  isForm(id: number): boolean;
  /** Numéro d'espèce (une forme renvoie celui de son espèce). */
  speciesOf(id: number): number;
}

export interface AchievementProgress {
  current: number;
  total: number;
}

export interface AchievementStatus {
  id: AchievementId;
  /** Secret : son nom et sa description restent cachés tant qu'il n'est pas obtenu. */
  secret: boolean;
  done: boolean;
  /** Pour les succès « à compter » (100 espèces…) ; `null` sinon. */
  progress: AchievementProgress | null;
}

export const ACHIEVEMENT_IDS = [
  'firstDay',
  'spark',
  'shinyHunt',
  'otherFace',
  'forms10',
  'dex100',
  'dex500',
  'dex1025',
  'allTypes',
  'summit',
  'partyDay',
  'nickname',
  'victini',
  // secrets
  'nice',
  'goldenCarp',
  'backToBack',
  'diamantDay',
  'tiny',
] as const;
export type AchievementId = (typeof ACHIEVEMENT_IDS)[number];

const SECRET: ReadonlySet<AchievementId> = new Set([
  'nice',
  'goldenCarp',
  'backToBack',
  'diamantDay',
  'tiny',
]);

const MAGIKARP_ID = 129;
const DIAMANT_DAY_EVENT = 'diamant_day';

/** Paliers « à compter » : [succès, nombre à atteindre]. */
export const SHINY_HUNT_TARGET = 5;
export const FORMS_TARGET = 10;

export function computeAchievements(
  state: GameState,
  events: readonly GameEvent[],
  lookup: AchievementLookup,
): AchievementStatus[] {
  const entries = Object.values(state.entries);
  const species = new Set(state.caught.map((id) => lookup.speciesOf(id)));
  const forms = new Set(state.caught.filter((id) => lookup.isForm(id)));
  const types = new Set(state.caught.flatMap((id) => lookup.typesOf(id)));
  const shinyDays = new Set<Day>(entries.filter((e) => e.isShiny).map((e) => e.day));
  const onEventDay = (id?: string) =>
    entries.some((e) =>
      activeEvents(events, e.day).some((event) => id === undefined || event.id === id),
    );

  const counted = (current: number, total: number) => ({
    done: current >= total,
    progress: { current: Math.min(current, total), total },
  });
  const simple = (done: boolean) => ({ done, progress: null });

  const results: Record<AchievementId, { done: boolean; progress: AchievementProgress | null }> = {
    firstDay: simple(entries.length >= 1),
    spark: simple(shinyDays.size >= 1),
    shinyHunt: counted(shinyDays.size, SHINY_HUNT_TARGET),
    otherFace: simple(forms.size >= 1),
    forms10: counted(forms.size, FORMS_TARGET),
    dex100: counted(species.size, 100),
    dex500: counted(species.size, 500),
    dex1025: counted(species.size, 1025),
    allTypes: counted(types.size, POKEMON_TYPES.length),
    summit: simple(entries.some((e) => e.level === 100)),
    partyDay: simple(onEventDay()),
    nickname: simple(entries.some((e) => e.rename.trim() !== '')),
    victini: simple(state.caught.includes(VICTINI_ID)),
    nice: simple(entries.some((e) => e.level === 69)),
    goldenCarp: simple(state.caughtShiny.includes(MAGIKARP_ID)),
    backToBack: simple([...shinyDays].some((day) => shinyDays.has(addDays(day, 1)))),
    diamantDay: simple(onEventDay(DIAMANT_DAY_EVENT)),
    tiny: simple(entries.some((e) => e.level === 1)),
  };

  return ACHIEVEMENT_IDS.map((id) => ({
    id,
    secret: SECRET.has(id),
    ...results[id],
  }));
}

/** « 7 / 18 » : combien de succès obtenus, parmi tous (les secrets comptent dans le total). */
export function achievementTotals(list: readonly AchievementStatus[]): {
  done: number;
  total: number;
} {
  return { done: list.filter((a) => a.done).length, total: list.length };
}
