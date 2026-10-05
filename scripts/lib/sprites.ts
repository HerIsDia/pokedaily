/** Où vont chercher les images, et comment on les nomme. */

export const SOURCE = {
  repo: 'PokeAPI/sprites',
  /** Version figée de la source : le résultat est reproductible (changer = relire les licences/images). */
  commit: 'a3a1432e688ea028f12c51371d5253037cb9f17b',
  path: 'sprites/pokemon/other/home',
} as const;

/**
 * Chaîne de repli pour une image : on prend la première qui existe.
 *  1. `home`             rendus 3D « Home » 512×512 (style de référence)
 *  2. `official-artwork` illustrations officielles 2D, 475×475 (style différent)
 *  3. `scarlet-violet`   sprites du jeu Écarlate/Violet, 256×256 (plus petits)
 */
export const SPRITE_SOURCES = ['home', 'official-artwork', 'scarlet-violet'] as const;
export type SpriteSource = (typeof SPRITE_SOURCES)[number];

const SOURCE_PATHS: Record<SpriteSource, string> = {
  home: 'sprites/pokemon/other/home',
  'official-artwork': 'sprites/pokemon/other/official-artwork',
  'scarlet-violet': 'sprites/pokemon/versions/generation-ix/scarlet-violet',
};

/** 512 px : carte et image de partage ; 128 px : vignettes des grilles (décision de Diamant). */
export const DEFAULT_SIZES = [128, 512] as const;

/** Adresse d'une image dans l'une des sources (normal ou shiny). */
export function sourceUrl(id: number, shiny: boolean, source: SpriteSource = 'home'): string {
  const { repo, commit } = SOURCE;
  return `https://raw.githubusercontent.com/${repo}/${commit}/${SOURCE_PATHS[source]}/${shiny ? 'shiny/' : ''}${id}.png`;
}

/** `25` → `25.webp` ; `25` shiny → `25s.webp`. */
export function spriteFile(id: number, shiny: boolean): string {
  return `${id}${shiny ? 's' : ''}.webp`;
}

/** `--sizes=128,512` → `[128, 512]` (entiers entre 32 et 1024, sans doublon, triés). */
export function parseSizes(raw: string | undefined): number[] {
  if (!raw) return [...DEFAULT_SIZES];
  const sizes = raw.split(',').map((part) => Number(part.trim()));
  for (const size of sizes) {
    if (!Number.isInteger(size) || size < 32 || size > 1024) {
      throw new Error(`Taille d'image invalide : « ${raw} » (entiers entre 32 et 1024).`);
    }
  }
  return [...new Set(sizes)].sort((a, b) => a - b);
}

/** `--only=25,10034` → `[25, 10034]` ; `undefined` = tout. */
export function parseIds(raw: string | undefined): number[] | undefined {
  if (!raw) return undefined;
  return raw.split(',').map((part) => {
    const id = Number(part.trim());
    if (!Number.isInteger(id) || id < 1) throw new Error(`Identifiant invalide : « ${part} ».`);
    return id;
  });
}

type IdLists = { normal: number[]; shiny: number[] };

export interface SpriteAvailability {
  /** Images qu'AUCUNE source ne fournit (même après repli et `assets/extra/`). */
  missing: IdLists;
  /** Images fournies par `assets/extra/` (fichiers déposés à la main). */
  extras: IdLists;
  /** Images prises dans une source de REPLI (pas `home`), par source. */
  fallbacks: Record<'normal' | 'shiny', Partial<Record<SpriteSource, number[]>>>;
  /** « Shiny » strictement identiques au normal : ce ne sont pas de vrais shiny, écartés. */
  identicalShiny: number[];
}

const sortedUnique = (ids: number[]): number[] => [...new Set(ids)].sort((a, b) => a - b);

export function emptyAvailability(): SpriteAvailability {
  return {
    missing: { normal: [], shiny: [] },
    extras: { normal: [], shiny: [] },
    fallbacks: { normal: {}, shiny: {} },
    identicalShiny: [],
  };
}

export function normalizeAvailability(a: SpriteAvailability): SpriteAvailability {
  const fallbacks: SpriteAvailability['fallbacks'] = { normal: {}, shiny: {} };
  for (const kind of ['normal', 'shiny'] as const) {
    for (const source of SPRITE_SOURCES) {
      const ids = a.fallbacks[kind][source];
      if (ids && ids.length) fallbacks[kind][source] = sortedUnique(ids);
    }
  }
  return {
    missing: { normal: sortedUnique(a.missing.normal), shiny: sortedUnique(a.missing.shiny) },
    extras: { normal: sortedUnique(a.extras.normal), shiny: sortedUnique(a.extras.shiny) },
    fallbacks,
    identicalShiny: sortedUnique(a.identicalShiny),
  };
}

export function stringifyAvailability(a: SpriteAvailability): string {
  const n = normalizeAvailability(a);
  const list = (ids: number[]) => `[${ids.join(',')}]`;
  const fallback = (kind: 'normal' | 'shiny') =>
    `{${Object.entries(n.fallbacks[kind])
      .map(([source, ids]) => `${JSON.stringify(source)}: ${list(ids)}`)
      .join(', ')}}`;
  return `{
  "schemaVersion": 2,
  "note": "Fichier généré par \`pnpm sprites\` — ne pas modifier à la main.",
  "source": ${JSON.stringify(SOURCE)},
  "missing": { "normal": ${list(n.missing.normal)}, "shiny": ${list(n.missing.shiny)} },
  "extras": { "normal": ${list(n.extras.normal)}, "shiny": ${list(n.extras.shiny)} },
  "fallbacks": { "normal": ${fallback('normal')}, "shiny": ${fallback('shiny')} },
  "identicalShiny": ${list(n.identicalShiny)}
}
`;
}
