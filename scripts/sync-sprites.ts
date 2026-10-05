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
 * Les images manquantes chez la source peuvent être fournies dans `assets/extra/`
 * (`<id>.png`, `<id>s.png` pour le shiny) ; voir `pnpm sprites:gaps`.
 */
import { access, mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import { availableParallelism } from 'node:os';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';
import sharp from 'sharp';
import { createFetcher, createLimiter } from './lib/http.ts';
import {
  SOURCE,
  parseIds,
  parseSizes,
  sourceUrl,
  spriteFile,
  stringifyAvailability,
  type SpriteAvailability,
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
const availability: SpriteAvailability = {
  missing: { normal: [], shiny: [] },
  extras: { normal: [], shiny: [] },
};
const outBytes = new Map<number, number>(sizes.map((s) => [s, 0]));
let written = 0;
let skipped = 0;

async function processOne(id: number, shiny: boolean): Promise<void> {
  const key = `${id}${shiny ? 's' : ''}`;
  const list = shiny ? 'shiny' : 'normal';
  const targets = sizes.map((size) => ({
    size,
    file: path(`public/sprites/${size}/${spriteFile(id, shiny)}`),
  }));

  // 1. Image de la source principale…
  let input: Uint8Array | null = await fetcher.bytes(sourceUrl(id, shiny));
  // 2. …sinon image de remplacement (assets/extra), sinon « manquante ».
  if (!input) {
    const extra = extraFiles.get(key);
    if (extra) {
      input = await readFile(extra);
      availability.extras[list].push(id);
    } else {
      availability.missing[list].push(id);
      return;
    }
  }

  for (const { size, file } of targets) {
    if (!values.force && (await exists(file))) {
      skipped++;
      continue;
    }
    await mkdir(dirname(file), { recursive: true });
    const info = await convert(() =>
      sharp(input!)
        .resize(size, size, { fit: 'inside', withoutEnlargement: true })
        .webp({ quality: 80, effort: 5 })
        .toFile(file),
    );
    outBytes.set(size, (outBytes.get(size) ?? 0) + info.size);
    written++;
  }
}

log(
  `Source : ${SOURCE.repo} @ ${SOURCE.commit.slice(0, 7)} — ${entries.length} Pokémon × normal/shiny`,
);
log(`Tailles : ${sizes.join(', ')} px${only ? `  (seulement : ${only.join(', ')})` : ''}`);

let done = 0;
const total = entries.length * 2;
await Promise.all(
  entries.flatMap(({ id }) =>
    [false, true].map(async (shiny) => {
      await processOne(id, shiny);
      if (++done % 400 === 0 || done === total) log(`  ${done}/${total}`);
    }),
  ),
);

// Le fichier de disponibilité n'est mis à jour que pour un passage COMPLET.
if (!only) {
  await writeFile(path('src/data/sprites.json'), stringifyAvailability(availability));
}

const name = new Map(dex.entries.map((e) => [e.id, e.form?.slug ?? e.fr]));
const describe = (ids: number[]) =>
  ids
    .sort((a, b) => a - b)
    .map((id) => `#${id} ${name.get(id)}`)
    .join(', ');
const mb = (bytes: number) => `${(bytes / 1e6).toFixed(1)} Mo`;

log('');
log(`✔ ${written} fichiers écrits, ${skipped} déjà présents`);
for (const [size, bytes] of outBytes) {
  if (bytes > 0) log(`  ${String(size).padStart(3)} px : ${mb(bytes)} écrits ce passage`);
}
log(
  `  réseau : ${fetcher.stats.network} requêtes, cache : ${fetcher.stats.cached}, nouvelles tentatives : ${fetcher.stats.retried}`,
);
const { missing, extras } = availability;
log(`  manquants : ${missing.normal.length} normaux, ${missing.shiny.length} shiny`);
if (missing.normal.length) log(`    sans image normale : ${describe(missing.normal)}`);
if (missing.shiny.length) log(`    sans image shiny   : ${describe(missing.shiny)}`);
if (extras.normal.length + extras.shiny.length) {
  log(`  comblés par assets/extra : ${extras.normal.length} normaux, ${extras.shiny.length} shiny`);
}
