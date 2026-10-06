import { POKEMON_TYPES, type PokemonType } from '../../src/core/pokemon-types.ts';

/** Catégories de formes (pour l'affichage, les statistiques et les filtres). */
export const FORM_CATEGORIES = [
  'mega',
  'gmax',
  'alola',
  'galar',
  'hisui',
  'paldea',
  'primal',
  'totem',
  'costume', // Pikachu : casquettes et costumes
  'partner', // Pikachu / Évoli « partenaires »
  'other', // formes de combat, genres, tailles, couleurs, modes…
] as const;
export type FormCategory = (typeof FORM_CATEGORIES)[number];

/**
 * Classe une forme d'après son identifiant PokéAPI (ex. `charizard-mega-x`).
 * L'ordre des règles compte : une forme n'a qu'UNE catégorie (`raticate-totem-alola` → totem).
 */
export function classifyForm(slug: string): FormCategory {
  if (/^pikachu-(starter)$/.test(slug) || slug === 'eevee-starter') return 'partner';
  if (/^pikachu-.*-cap$/.test(slug)) return 'costume';
  if (/^pikachu-(cosplay|rock-star|belle|pop-star|phd|libre)$/.test(slug)) return 'costume';
  if (/-gmax$/.test(slug)) return 'gmax';
  if (/-mega(-[xyz])?$/.test(slug)) return 'mega';
  if (/-primal$/.test(slug)) return 'primal';
  if (/-totem(-|$)/.test(slug)) return 'totem';
  for (const region of ['alola', 'galar', 'hisui', 'paldea'] as const) {
    if (new RegExp(`-${region}(-|$)`).test(slug)) return region;
  }
  return 'other';
}

export interface DexEntry {
  /** Identifiant PokéAPI : 1–1025 pour les espèces, 10001+ pour les formes. */
  id: number;
  /** Espèce à laquelle l'entrée appartient (= `id` pour une espèce). */
  speciesId: number;
  fr: string;
  en: string;
  types: PokemonType[];
  /** Présent uniquement pour une forme alternative. */
  form?: { slug: string; category: FormCategory };
}

/** Les 5 statistiques qu'une nature peut monter ou baisser (noms de PokéAPI). */
export type NatureStat = 'attack' | 'defense' | 'special-attack' | 'special-defense' | 'speed';

export interface Nature {
  id: number;
  key: string;
  fr: string;
  en: string;
  /** Statistique augmentée de 10 % (`null` pour les 5 natures neutres). */
  up: NatureStat | null;
  /** Statistique baissée de 10 % (`null` pour les 5 natures neutres). */
  down: NatureStat | null;
}

interface LocalizedName {
  language: { name: string };
  name: string;
}

/** Le nom dans une langue, ou `undefined` si PokéAPI ne l'a pas. */
export function pickName(names: readonly LocalizedName[] | undefined, lang: 'fr' | 'en') {
  const found = names?.find((n) => n.language.name === lang)?.name?.trim();
  return found || undefined;
}

/** `https://pokeapi.co/api/v2/pokemon-species/25/` → 25 */
export function idFromUrl(url: string): number {
  const match = /\/(\d+)\/?$/.exec(url);
  if (!match) throw new Error(`Impossible de lire un identifiant dans « ${url} ».`);
  return Number(match[1]);
}

export function isPokemonType(value: string): value is PokemonType {
  return (POKEMON_TYPES as readonly string[]).includes(value);
}

export interface NameOverrides {
  /** Par identifiant PokéAPI. `source` explique POURQUOI on corrige (obligatoire : traçabilité). */
  names: Record<string, { fr?: string; en?: string; source: string }>;
}

/** Corrections faites à la main (`scripts/dex-overrides.json`), appliquées en dernier. */
export function applyOverrides(entries: DexEntry[], overrides: NameOverrides): DexEntry[] {
  return entries.map((entry) => {
    const patch = overrides.names[String(entry.id)];
    if (!patch) return entry;
    return {
      ...entry,
      ...(patch.fr ? { fr: patch.fr } : {}),
      ...(patch.en ? { en: patch.en } : {}),
    };
  });
}

/** Noms identiques entre plusieurs entrées (dans une même langue) : à signaler. */
export function findDuplicateNames(entries: readonly DexEntry[], lang: 'fr' | 'en') {
  const byName = new Map<string, number[]>();
  for (const entry of entries) {
    byName.set(entry[lang], [...(byName.get(entry[lang]) ?? []), entry.id]);
  }
  return [...byName.entries()].filter(([, ids]) => ids.length > 1);
}

/** Un JSON lisible : une entrée par ligne (diffs git clairs), sans date (sortie reproductible). */
export function stringifyRows(header: Record<string, unknown>, key: string, rows: unknown[]) {
  const head = Object.entries(header)
    .map(([k, v]) => `  ${JSON.stringify(k)}: ${JSON.stringify(v)},`)
    .join('\n');
  const body = rows.map((row) => `    ${JSON.stringify(row)}`).join(',\n');
  return `{\n${head}\n  ${JSON.stringify(key)}: [\n${body}\n  ]\n}\n`;
}
