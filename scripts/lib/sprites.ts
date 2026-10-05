/** Où vont chercher les images, et comment on les nomme. */

export const SOURCE = {
  repo: 'PokeAPI/sprites',
  /** Version figée de la source : le résultat est reproductible (changer = relire les licences/images). */
  commit: 'a3a1432e688ea028f12c51371d5253037cb9f17b',
  path: 'sprites/pokemon/other/home',
} as const;

export const DEFAULT_SIZES = [128, 256, 512] as const;

/** Rendus « Home » 512×512 (normal et shiny) d'un Pokémon ou d'une forme. */
export function sourceUrl(id: number, shiny: boolean): string {
  const { repo, commit, path } = SOURCE;
  return `https://raw.githubusercontent.com/${repo}/${commit}/${path}/${shiny ? 'shiny/' : ''}${id}.png`;
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

export interface SpriteAvailability {
  /** Images qu'AUCUNE source ne fournit (même après `assets/extra/`). */
  missing: { normal: number[]; shiny: number[] };
  /** Images fournies par `assets/extra/` faute de mieux chez la source principale. */
  extras: { normal: number[]; shiny: number[] };
}

const sortedUnique = (ids: number[]): number[] => [...new Set(ids)].sort((a, b) => a - b);

export function normalizeAvailability(a: SpriteAvailability): SpriteAvailability {
  return {
    missing: { normal: sortedUnique(a.missing.normal), shiny: sortedUnique(a.missing.shiny) },
    extras: { normal: sortedUnique(a.extras.normal), shiny: sortedUnique(a.extras.shiny) },
  };
}

export function stringifyAvailability(a: SpriteAvailability): string {
  const n = normalizeAvailability(a);
  const list = (ids: number[]) => `[${ids.join(',')}]`;
  return `{
  "schemaVersion": 1,
  "note": "Fichier généré par \`pnpm sprites\` — ne pas modifier à la main.",
  "source": ${JSON.stringify(SOURCE)},
  "missing": { "normal": ${list(n.missing.normal)}, "shiny": ${list(n.missing.shiny)} },
  "extras": { "normal": ${list(n.extras.normal)}, "shiny": ${list(n.extras.shiny)} }
}
`;
}
