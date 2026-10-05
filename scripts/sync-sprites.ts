/**
 * pnpm sprites — télécharge les images depuis PokeAPI/sprites (version épinglée), les
 * convertit en WebP et écrit `public/sprites/<taille>/<id>.webp` (+ `<id>s.webp` pour le shiny).
 *
 *   pnpm sprites                       # tout, toutes les tailles
 *   pnpm sprites --sizes=128,512       # seulement ces tailles
 *   pnpm sprites --only=25,10034       # seulement ces identifiants (essais rapides)
 *   pnpm sprites --force               # reconvertit même ce qui existe déjà
 *
 * Les images ne sont PAS commitées (`public/sprites/` est ignoré par git) : elles sont
 * régénérées à la demande. Les téléchargements sont mis en cache dans `.cache/`.
 *
 * Pour chaque image on prend la première source disponible (voir `SPRITE_SOURCES`) puis, à
 * défaut, un fichier déposé à la main dans `assets/extra/` (`<id>.png`, `<id>s.png` = shiny).
 */
import { access, mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { availableParallelism } from 'node:os';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';
import sharp from 'sharp';
import { createFetcher, createLimiter } from './lib/http.ts';
import {
  SOURCE,
  SPRITE_SOURCES,
  emptyAvailability,
  parseIds,
  parseSizes,
  sourceUrl,
  spriteFile,
  stringifyAvailability,
  type SpriteSource,
} from './lib/sprites.ts';

const { values } = parseArgs({
  options: {
    sizes: { type: 'string' },
    only: { type: 'string' },
    force: { type: 'boolean', default: false },
  },
});
const sizes = parseSizes(values.sizes);
const only = parseIds(values.only);

const root = new URL('../', import.meta.url);
const path = (relative: string) => fileURLToPath(new URL(relative, root));
const log = (message: string) => process.stderr.write(`${message}\n`);

const exists = (file: string) =>
  access(file).then(
    () => true,
    () => false,
  );

interface DexFile {
  entries: { id: number; fr: string; form?: { slug: string } }[];
}
const dex = JSON.parse(await readFile(path('src/data/dex.json'), 'utf-8')) as DexFile;
const entries = dex.entries.filter((e) => !only || only.includes(e.id));
if (entries.length === 0) throw new Error('Aucun identifiant à traiter.');

// Images de remplacement déposées à la main (assets/extra/25.png, 25s.png…)
const extraDir = path('assets/extra');
const extraFiles = new Map<string, string>();
if (await exists(extraDir)) {
  for (const name of await readdir(extraDir)) {
    const match = /^(\d+s?)\.(png|webp|jpg)$/.exec(name);
    if (match) extraFiles.set(match[1]!, `${extraDir}/${name}`);
  }
}

const fetcher = createFetcher({ cacheDir: path('.cache'), concurrency: 12 });
const convert = createLimiter(Math.max(2, availableParallelism()));
const availability = emptyAvailability();
const outBytes = new Map<number, number>(sizes.map((s) => [s, 0]));
let written = 0;
let skipped = 0;
const expected = new Set<string>();

interface Picked {
  bytes: Uint8Array;
  /** `null` = image fournie par assets/extra. */
  source: SpriteSource | null;
}

/**
 * Première image disponible parmi `sources` (dans l'ordre de repli), puis assets/extra.
 * Un shiny n'est cherché QUE dans la source de son normal : on ne mélange jamais deux styles
 * (3D « Home » et illustration 2D) pour un même Pokémon.
 */
async function pick(
  id: number,
  shiny: boolean,
  sources: readonly SpriteSource[] = SPRITE_SOURCES,
): Promise<Picked | null> {
  for (const source of sources) {
    const bytes = await fetcher.bytes(sourceUrl(id, shiny, source));
    if (bytes) return { bytes, source };
  }
  const extra = extraFiles.get(`${id}${shiny ? 's' : ''}`);
  return extra ? { bytes: await readFile(extra), source: null } : null;
}

const sameBytes = (a: Uint8Array, b: Uint8Array) => Buffer.compare(a, b) === 0;

async function writeSizes(id: number, shiny: boolean, bytes: Uint8Array): Promise<void> {
  for (const size of sizes) {
    const file = path(`public/sprites/${size}/${spriteFile(id, shiny)}`);
    expected.add(file);
    if (!values.force && (await exists(file))) {
      skipped++;
      continue;
    }
    await mkdir(dirname(file), { recursive: true });
    const info = await convert(() =>
      sharp(bytes)
        .resize(size, size, { fit: 'inside', withoutEnlargement: true })
        .webp({ quality: 80, effort: 5 })
        .toFile(file),
    );
    outBytes.set(size, (outBytes.get(size) ?? 0) + info.size);
    written++;
  }
}

function record(kind: 'normal' | 'shiny', id: number, picked: Picked | null): void {
  if (!picked) availability.missing[kind].push(id);
  else if (picked.source === null) availability.extras[kind].push(id);
  else if (picked.source !== 'home') (availability.fallbacks[kind][picked.source] ??= []).push(id);
}

async function processId(id: number): Promise<void> {
  const normal = await pick(id, false);
  let shiny = normal ? await pick(id, true, normal.source ? [normal.source] : []) : null;
  // Un « shiny » identique octet pour octet au normal n'en est pas un (ex. casquettes de Pikachu).
  if (normal && shiny && sameBytes(normal.bytes, shiny.bytes)) {
    availability.identicalShiny.push(id);
    shiny = null;
  }
  record('normal', id, normal);
  record('shiny', id, shiny);
  if (normal) await writeSizes(id, false, normal.bytes);
  if (shiny) await writeSizes(id, true, shiny.bytes);
}

log(
  `Source : ${SOURCE.repo} @ ${SOURCE.commit.slice(0, 7)} (repli : ${SPRITE_SOURCES.join(' → ')}) — ${entries.length} Pokémon × normal/shiny`,
);
log(`Tailles : ${sizes.join(', ')} px${only ? `  (seulement : ${only.join(', ')})` : ''}`);

let done = 0;
await Promise.all(
  entries.map(async ({ id }) => {
    await processId(id);
    if (++done % 200 === 0 || done === entries.length) log(`  ${done}/${entries.length}`);
  }),
);

// Passage COMPLET uniquement : disponibilité à jour + suppression des fichiers périmés.
let pruned = 0;
if (!only) {
  await writeFile(path('src/data/sprites.json'), stringifyAvailability(availability));
  for (const size of sizes) {
    const dir = path(`public/sprites/${size}`);
    if (!(await exists(dir))) continue;
    for (const name of await readdir(dir)) {
      if (!expected.has(`${dir}/${name}`)) {
        await rm(`${dir}/${name}`);
        pruned++;
      }
    }
  }
}

const name = new Map(dex.entries.map((e) => [e.id, e.form?.slug ?? e.fr]));
const describe = (ids: number[]) =>
  [...ids]
    .sort((a, b) => a - b)
    .map((id) => `#${id} ${name.get(id)}`)
    .join(', ');
const mb = (bytes: number) => `${(bytes / 1e6).toFixed(1)} Mo`;

log('');
log(
  `✔ ${written} fichiers écrits, ${skipped} déjà présents${pruned ? `, ${pruned} périmés supprimés` : ''}`,
);
for (const [size, bytes] of outBytes) {
  if (bytes > 0) log(`  ${String(size).padStart(3)} px : ${mb(bytes)} écrits ce passage`);
}
log(
  `  réseau : ${fetcher.stats.network} requêtes, cache : ${fetcher.stats.cached}, nouvelles tentatives : ${fetcher.stats.retried}`,
);

const { missing, extras, fallbacks, identicalShiny } = availability;
log(`  manquants : ${missing.normal.length} normaux, ${missing.shiny.length} shiny`);
if (missing.normal.length) log(`    sans image normale : ${describe(missing.normal)}`);
if (missing.shiny.length) log(`    sans image shiny   : ${describe(missing.shiny)}`);
for (const kind of ['normal', 'shiny'] as const) {
  for (const [source, ids] of Object.entries(fallbacks[kind])) {
    log(`  ${kind} pris dans « ${source} » (repli) : ${ids.length} — ${describe(ids)}`);
  }
}
if (identicalShiny.length) {
  log(
    `  « shiny » identiques au normal (écartés) : ${identicalShiny.length} — ${describe(identicalShiny)}`,
  );
}
if (extras.normal.length + extras.shiny.length) {
  log(`  fournis par assets/extra : ${extras.normal.length} normaux, ${extras.shiny.length} shiny`);
}
