/**
 * pnpm dex — fabrique `src/data/dex.json` et `src/data/natures.json` depuis PokéAPI.
 *
 * Se lance à la main, de temps en temps (nouveaux Pokémon, correction d'un nom) :
 * l'application, elle, ne parle JAMAIS à PokéAPI. Tout est mis en cache dans `.cache/`.
 */
import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { POKEMON_TYPES } from '../src/core/pokemon-types.ts';
import { fr as frMessages } from '../src/i18n/fr.ts';
import { createFetcher } from './lib/http.ts';
import {
  applyOverrides,
  classifyForm,
  findDuplicateNames,
  idFromUrl,
  isPokemonType,
  pickName,
  stringifyRows,
  type DexEntry,
  type Nature,
  type NameOverrides,
} from './lib/dex.ts';

const API = 'https://pokeapi.co/api/v2';
const root = new URL('../', import.meta.url);
const path = (relative: string) => fileURLToPath(new URL(relative, root));

const fetcher = createFetcher({ cacheDir: path('.cache'), concurrency: 6 });
const log = (message: string) => process.stderr.write(`${message}\n`);
const problems: string[] = [];
const warnings: string[] = [];

interface NamedList {
  results: { name: string; url: string }[];
}
interface PokemonResource {
  id: number;
  name: string;
  species: { url: string };
  types: { slot: number; type: { name: string } }[];
  forms: { url: string }[];
}
interface Localized {
  names: { language: { name: string }; name: string }[];
}
interface FormResource extends Localized {
  form_names: { language: { name: string }; name: string }[];
}

async function inBatches<T, R>(items: T[], label: string, work: (item: T) => Promise<R>) {
  let done = 0;
  const results = await Promise.all(
    items.map(async (item) => {
      const result = await work(item);
      if (++done % 200 === 0 || done === items.length) log(`  ${label}: ${done}/${items.length}`);
      return result;
    }),
  );
  return results;
}

// ── 1. Liste de tous les « pokémon » (espèces + formes) ────────────────────
log('1/4 Liste des Pokémon…');
const list = await fetcher.json<NamedList>(`${API}/pokemon?limit=5000`);
const ids = list.results.map((r) => idFromUrl(r.url)).sort((a, b) => a - b);
log(`  ${ids.length} entrées (dont ${ids.filter((id) => id >= 10000).length} formes)`);

// ── 2. Détail de chacune : espèce, types, noms ──────────────────────────────
log('2/4 Détails (types, noms FR/EN)…');
const entries: DexEntry[] = await inBatches(ids, 'entrées', async (id) => {
  const pokemon = await fetcher.json<PokemonResource>(`${API}/pokemon/${id}/`);
  const speciesId = idFromUrl(pokemon.species.url);
  const types = [...pokemon.types]
    .sort((a, b) => a.slot - b.slot)
    .map((t) => t.type.name)
    .filter((name) => {
      const ok = isPokemonType(name);
      if (!ok) problems.push(`#${id} ${pokemon.name} : type inconnu « ${name} »`);
      return ok;
    });

  const isForm = id >= 10000;
  const source = isForm
    ? await fetcher.json<FormResource>(pokemon.forms[0]!.url)
    : await fetcher.json<Localized>(`${API}/pokemon-species/${speciesId}/`);

  let fr = pickName(source.names, 'fr');
  let en = pickName(source.names, 'en');
  if (!fr) warnings.push(`#${id} ${pokemon.name} : pas de nom français → anglais utilisé`);
  // Nom anglais absent : repli provisoire sur l'identifiant ; le contrôle plus bas exige un
  // `dex-overrides.json` qui le remplace (sinon le script échoue).
  en ??= pokemon.name;
  fr ??= en;

  const entry: DexEntry = { id, speciesId, fr, en, types: types as DexEntry['types'] };
  if (isForm) entry.form = { slug: pokemon.name, category: classifyForm(pokemon.name) };
  return entry;
});

const overrides = JSON.parse(
  await readFile(path('scripts/dex-overrides.json'), 'utf-8'),
) as NameOverrides;
const dex = applyOverrides(entries, overrides);
const unnamed = dex.filter((e) => e.form && e.en === e.form.slug);
for (const e of unnamed)
  problems.push(
    `#${e.id} ${e.form?.slug} : toujours pas de vrai nom anglais (ajoute-le dans scripts/dex-overrides.json)`,
  );

// ── 3. Natures ───────────────────────────────────────────────────────────────
log('3/4 Natures…');
const natureList = await fetcher.json<NamedList>(`${API}/nature?limit=100`);
const natures: Nature[] = await inBatches(natureList.results, 'natures', async (r) => {
  const nature = await fetcher.json<Localized & { id: number; name: string }>(r.url);
  const fr = pickName(nature.names, 'fr');
  const en = pickName(nature.names, 'en');
  if (!fr || !en) problems.push(`nature ${nature.name} : nom FR/EN manquant`);
  return { id: nature.id, key: nature.name, fr: fr ?? nature.name, en: en ?? nature.name };
});
natures.sort((a, b) => a.id - b.id);

// ── 4. Contrôles ─────────────────────────────────────────────────────────────
log('4/4 Contrôles…');
const species = dex.filter((e) => !e.form);
const forms = dex.filter((e) => e.form);
if (species.length !== 1025) {
  warnings.push(
    `${species.length} espèces (attendu : 1025 — nouvelle génération ? mets à jour DEX_SIZE)`,
  );
}
const maxSpecies = Math.max(...species.map((e) => e.id));
for (let id = 1; id <= maxSpecies; id++) {
  if (!species.some((e) => e.id === id)) problems.push(`espèce #${id} absente`);
}
for (const form of forms) {
  if (!species.some((e) => e.id === form.speciesId)) {
    problems.push(`forme #${form.id} (${form.form?.slug}) : espèce #${form.speciesId} introuvable`);
  }
}
if (natures.length !== 25) warnings.push(`${natures.length} natures (attendu : 25)`);

// Les noms de types de l'interface (fr.ts/en.ts) doivent être ceux de PokéAPI.
const { en: enMessages } = await import('../src/i18n/en.ts');
for (const type of POKEMON_TYPES) {
  const resource = await fetcher.json<Localized>(`${API}/type/${type}/`);
  const apiFr = pickName(resource.names, 'fr');
  const apiEn = pickName(resource.names, 'en');
  if (apiFr !== frMessages[`type.${type}`]) {
    warnings.push(
      `type ${type} : FR « ${frMessages[`type.${type}`]} » dans l'app, « ${apiFr} » dans PokéAPI`,
    );
  }
  if (apiEn !== enMessages[`type.${type}`]) {
    warnings.push(
      `type ${type} : EN « ${enMessages[`type.${type}`]} » dans l'app, « ${apiEn} » dans PokéAPI`,
    );
  }
}

for (const lang of ['fr', 'en'] as const) {
  const duplicates = findDuplicateNames(forms, lang);
  for (const [name, dupIds] of duplicates) {
    warnings.push(
      `${lang.toUpperCase()} : le nom « ${name} » est porté par plusieurs formes (#${dupIds.join(', #')})`,
    );
  }
}

const byCategory = new Map<string, number>();
for (const form of forms)
  byCategory.set(form.form!.category, (byCategory.get(form.form!.category) ?? 0) + 1);

// ── Écriture ─────────────────────────────────────────────────────────────────
const header = {
  schemaVersion: 1,
  source: 'PokéAPI (https://pokeapi.co)',
  note: 'Fichier généré par `pnpm dex` — ne pas modifier à la main (voir scripts/dex-overrides.json).',
  species: species.length,
  forms: forms.length,
};
await writeFile(path('src/data/dex.json'), stringifyRows(header, 'entries', dex));
await writeFile(
  path('src/data/natures.json'),
  stringifyRows({ schemaVersion: 1, source: 'PokéAPI (https://pokeapi.co)' }, 'natures', natures),
);

log('');
log(`✔ ${species.length} espèces + ${forms.length} formes, ${natures.length} natures`);
log(`  formes par catégorie : ${[...byCategory].map(([k, v]) => `${k} ${v}`).join(' · ')}`);
log(
  `  réseau : ${fetcher.stats.network} requêtes, cache : ${fetcher.stats.cached}, nouvelles tentatives : ${fetcher.stats.retried}`,
);
if (warnings.length)
  log(`\n⚠ ${warnings.length} avertissement(s) :\n  - ${warnings.join('\n  - ')}`);
if (problems.length) {
  log(`\n✖ ${problems.length} problème(s) :\n  - ${problems.join('\n  - ')}`);
  process.exit(1);
}
