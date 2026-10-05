# AGENTS.md — Consignes pour les agents IA (et les humains pressés)

> Ce fichier décrit la **v4** (branche `v4`, en construction). L'ancienne v3.1 (Svelte) vit sur l'ancienne branche ; ses constats sont dans `docs/AUDIT.md` et `docs/ARCHITECTURE.md`, utiles comme **cahier des charges**, pas comme modèle technique.
> Plan et avancement : `docs/REBUILD_PLAN.md`. Mets ce fichier à jour **dans le même changement** que ce qui le rend faux.

## Le projet en 3 lignes

**Pokédaily** — PWA « Quel Pokémon es-tu aujourd'hui ? » : un Pokémon par jour (espèces 1–1025 **et formes alternatives**), avec nature, niveau et 1/69 de shiny. Tout est **local** (IndexedDB), aucun serveur à nous, aucun compte. Interface FR/EN, thème sombre Écarlate/Violet.
**État** : phases 1 à 4 faites (outillage, données Pokémon FR/EN, images, **noyau de jeu testé**, **sauvegarde IndexedDB + état partagé + export/import**). L'écran affiche le **vrai Pokémon du jour**, tiré et sauvegardé, qui change à minuit sans recharger. Écrans : carte du jour (avec **partage en image** et bandeau d'événements), historique, Pokédex/Shinydex/Formes, statistiques, Pokékit (V-Roulette, team du mois), À propos (export/import). Phase 5 en cours, écran par écran (`docs/REBUILD_PLAN.md` §6.3) : reste changelog, mode dev.

## Décisions de direction (Diamant) — à respecter

1. **TypeScript/JavaScript pur, sans moteur de rendu** : **ni Svelte, ni React, ni Vue, ni équivalent (lit, etc.)**. On garde **Vite** et la **PWA**.
2. **Jour local** : le Pokémon change à **minuit heure locale** du joueur (clé `AAAA-MM-JJ` locale), jamais UTC.
3. **Pas de migration** : base neuve ; l'**ancienne base de la v3.1 est supprimée** au premier lancement de la v4 (seulement après ouverture réussie de la nouvelle base, jamais sur les prévisualisations). **Export/import** de la collection : fait (phase 4, page « À propos »).
4. **Langues : français + anglais uniquement.**
5. **Mode développeur conservé** pour tout le monde (partie intégrante du système).
6. **Jamais de monétisation** : ni publicité, ni achat, ni analytics/suivi, ni service tiers qui voit les joueurs. Projet fun entre amis, non commercial. Refuse toute proposition contraire, même « discrète ».
7. **Images** : script automatisé (source `PokeAPI/sprites`, rendus Home 512 px), **générées au build, non commitées** (`public/sprites/` est ignoré par git) — `docs/REBUILD_PLAN.md` §4. **Tailles : 512 px (carte, partage) + 128 px (grilles)**, pas de 256 px. Les **images 2D de repli sont gardées**. Propriété de The Pokémon Company.
   - **Chaîne de repli** : Home 3D 512 px → official-artwork 2D → sprites Écarlate/Violet. Un shiny vient **toujours de la même source que son normal** ; un shiny identique au normal est écarté. Une forme **sans image normale n'est jamais tirée** (`isDrawable`) et un Pokémon **sans image shiny ne sort jamais en shiny** (`canBeShiny`) — `src/data/sprites.ts`.
   - **Pokémon DB** : essayé en phase 2, **ne comble aucun trou valable** (aucun fichier utilisé). Si on y retourne : renfort **ponctuel**, jamais source de masse ; **2 s entre requêtes**, `User-Agent` qui nous identifie, pas de `wget`, fichiers auto-hébergés (pas de lien direct), provenance notée, lien retour dans « À propos ».
   - **Formes alternatives : TOUTES, sans exception** (326). Noms FR/EN depuis **PokéAPI** (`pokemon-form`, 326/326 vérifiés), pas depuis Pokémon DB. Modèle : `id` PokéAPI **et** `speciesId`. Pokédex séparé : 1 025 espèces + onglet « Formes ».
   - **Tirage des formes progressif** : 1 % le premier jour, +1 % par jour sans forme, retour à 1 % quand une forme sort (garanti au bout de 100 jours) — `docs/REBUILD_PLAN.md` §4.5.
8. **Dépôt propre** : la branche `v4` est vide d'historique ; la bascule (suppression de l'ancien historique et de `🏡master`) est **destructive** → **jamais** sans nouvelle confirmation explicite de Diamant. Copie de sauvegarde de la v3.1 : déjà faite par Diamant. Toute autre nouvelle branche demande son accord.

## Pour la propriétaire du projet

La propriétaire (elle, **Diamant**) est écrivaine, **pas développeuse** : elle pilote le produit, l'IA écrit le code. Donc :
- Explique en **français clair**, sans jargon non défini ; montre l'impact visible plutôt que le détail technique.
- Fais des **changements petits et relisibles** (un sujet par commit). Annonce ce qui change et comment le vérifier.
- Ne présente jamais comme « vérifié » ce que tu n'as pas exécuté. Dis ce que tu n'as pas pu tester.
- Pas de grosse décision destructive (supprimer des données, réécrire l'historique git, changer de techno) sans accord explicite.

## Commandes (pnpm uniquement, Node ≥ 22.12)

```bash
pnpm install --frozen-lockfile
pnpm dev            # serveur de développement (--host)
pnpm dex            # (re)génère src/data/dex.json + natures.json depuis PokéAPI (cache .cache/)
pnpm sprites        # télécharge/convertit les images -> public/sprites/ (ignoré par git) + src/data/sprites.json
pnpm sprites --verify  # (déploiement) comme ci-dessus mais ÉCHOUE si la disponibilité diffère de sprites.json versionné
pnpm test           # Vitest (happy-dom) — tests/**/*.test.ts
pnpm lint           # ESLint (dont la règle anti-innerHTML)
pnpm format         # Prettier --check ; `pnpm format:write` pour corriger
pnpm check          # tsc --noEmit (TypeScript strict)
pnpm build          # tsc + vite build -> dist/
pnpm preview        # sert dist/
```

**Définition de « terminé »** : `lint`, `format`, `check`, `test` et `build` **verts** (c'est ce que fait la CI, `.github/workflows/ci.yml`) **et**, pour tout changement visible, une vérification dans un vrai navigateur (ex. Playwright + Chromium) avec capture d'écran à l'appui : les tests de DOM ne voient ni le CSS ni la mise en page (ils ont déjà laissé passer 2 défauts visuels).

## Stack

TypeScript 5.9 `strict` (+ `noUncheckedIndexedAccess`) · Vite 8 · `vite-plugin-pwa` 2 (stratégie `injectManifest`, `src/pwa/sw.ts`) + Workbox · Vitest 5 · ESLint 10 + typescript-eslint · Prettier · police `@fontsource/roboto-condensed` (auto-hébergée). **Aucune bibliothèque d'interface.** TypeScript est volontairement bloqué en 5.x : `typescript-eslint` ne gère pas encore ≥ 6.1.

## Carte du code

| Chemin | Rôle |
|---|---|
| `src/main.ts` | Point d'entrée : polices, CSS, monte l'app |
| `src/app/` | Coquille (`app.ts` : en-tête avec ⓘ « À propos » + langue, **menu du bas**, routeur), `icons.ts` (icônes du menu), page « À propos » |
| `src/ui/download.ts` | `downloadBlob` (télécharger un fichier construit dans le navigateur) |
| `src/ui/dom.ts` | `h()`, `svg()`, `bindText`, `bindAttr`, `bindChildren`, `effect` — **seule** façon de construire le DOM |
| `src/ui/store.ts` · `scope.ts` | État réactif (`createStore`) · nettoyage des abonnements (`Scope`) |
| `src/ui/router.ts` | Routage par hash **avec** `hashchange` |
| `src/ui/tokens.css` · `types.css` | Variables de thème · couleurs de types (**source unique**) |
| `src/i18n/` | `fr.ts` (référence), `en.ts` (mêmes clés, imposé par TypeScript), `index.ts` (`createI18n`, `detectLang`) |
| `src/core/` | Logique **pure** du jeu (sans navigateur ni fichier), testée : `constants`, `rng` (aléa injectable), `dates` (jour local), `model` (`PokemonEntry`, `DrawPool`), `pokemon` (**seule** fabrique), `form-pity`, `draw` (tirage du jour), `boxes`, `roulette`, `team`, `events/` (moteur, effets, validation), `names` (surnoms), **`game-state`** (l'état complet du joueur + transitions pures : tirage du jour, surnom, tour de roulette gagné, tickets) |
| `src/storage/` | Sauvegarde : `repository.ts` (interface + erreurs), `indexeddb.ts` (base `pokedaily4`, **une transaction par sauvegarde**, garde-fou de révision entre onglets), `memory.ts` (secours/tests), `db.ts`, `validate.ts` (lecture **indulgente**), `backup.ts` (export/import **strict**), `legacy.ts` (nettoyage de la v3.1) |
| `src/state/game.ts` | **Source de vérité** que les écrans lisent : `createGame` (file d'attente, sauvegarde d'abord puis écran, conflits entre onglets, surveillance du changement de jour). **Toute modification du jeu passe par là**, jamais par IndexedDB directement |
| `src/data/` | `dex.json` (1 025 espèces + 326 formes, FR/EN) et `natures.json` : **générés par `pnpm dex`, ne pas modifier à la main** ; `sprites.json` : généré par `pnpm sprites` ; `events.json` : **écrit à la main** (validé par `tests/core/events-validate.test.ts`) ; `index.ts`/`sprites.ts`/`events.ts` : accès typé ; `pool.ts` : la « réserve de tirage » (seul pont entre `core/` et les données) |
| `scripts/` | Scripts Node en TypeScript (`build-dex.ts`, `sync-sprites.ts`), `lib/` (client HTTP poli, logique testée), `dex-overrides.json` (corrections de noms **avec leur source**) |
| `assets/extra/` | (optionnel, absent pour l'instant) images déposées à la main : `<id>.png`, `<id>s.png` pour le shiny ; à créditer |
| `src/app/boot.ts` | Démarrage : ouvre la sauvegarde (ou le mode mémoire), monte l'écran, tire le Pokémon du jour, nettoie la v3.1 |
| `src/features/card/` | Carte du jour (reçoit un état en lecture + `onRename`) ; `share-image.ts` (image PNG de la carte : contenu / dessin / assemblage séparés) et `share-actions.ts` (Partager / Copier / Télécharger) ; `preview.ts` : **aperçu de dev** `/?preview=10034&shiny=1&level=88&nature=timid` (en mémoire, **rien n'est sauvegardé**) |
| `src/features/kit/` | Pokékit : `kit.ts` (menu), `roulette.ts` (V-Roulette), `team.ts` (team du mois), `spin-schedule.ts` (le « film » de l'animation, pur) |
| `src/features/events/` | Bandeau + liste des événements (`events-ui.ts`), étiquettes des effets (`modifiers.ts`) |
| `src/ui/dialog.ts` | `createModal` : fenêtre modale accessible (élément natif `<dialog>` : focus, Échap, retour du focus). **À utiliser pour toute fenêtre** |
| `src/features/stats/` | Statistiques (`stats.ts` pur : séries en jours locaux, totaux, classements + `stats-view.ts`) |
| `src/features/pokedex/` | Pokédex / Shinydex / Formes (`progress.ts` pur : une forme compte pour son espèce, + `pokedex.ts`) |
| `src/features/history/` · `shared/` | Calendrier mensuel (`calendar.ts` pur + `history.ts`) · `shared/sprite.ts` (`createSprite` : image avec repère « ? » si absente, à réutiliser partout) |
| `src/features/home/` · `backup/` | Accueil (chargement/erreur, bandeaux, carte) · panneau « Ma collection » (export/import avec confirmation) |
| `src/pwa/sw.ts` | Service worker (shell seulement pour l'instant) |
| `tests/` | Miroir de `src/` |

## Conventions à respecter

- **Pas de HTML brut** : jamais `innerHTML`, `outerHTML`, `insertAdjacentHTML` (ESLint les refuse). Tout passe par `h()` ; le texte est ajouté comme **nœud texte**. `h()` refuse aussi les URLs `javascript:`/`data:`.
- **Construis la structure une fois, lie les textes/attributs** : une vue est une fonction `({ scope }) => HTMLElement` ; les `bind*`/`effect` s'abonnent via le `scope`, qui les libère quand la vue disparaît. Ne recrée pas un champ de saisie à chaque mise à jour (perte du focus).
- **Traductions** : ajoute la clé dans `fr.ts` **puis** `en.ts` ; TypeScript refuse sinon. Aucun texte visible en dur dans les vues. `<html lang>` suit la langue.
- **Attributs** : `bindAttr(..., 'hidden', ...)` attend un booléen ; pour un attribut « présent/absent » (`data-shiny`), renvoie `''`/`true` ou `undefined`/`false`, **pas** la chaîne `'true'`.
- **CSS** : un fichier par fonctionnalité, classes préfixées ; couleurs de types **uniquement** dans `types.css` (`[data-type]` → `--type-color`). Utilise `var(--type-color, var(--accent))` : une valeur par défaut posée sur `.card` écraserait celle de `types.css` (déjà arrivé).
- **Données générées** : ne modifie jamais `src/data/*.json` à la main (relance `pnpm dex` / `pnpm sprites`) ; une correction de nom va dans `scripts/dex-overrides.json` avec sa `source`.
- **Scripts** : Node exécute le TypeScript en « effaçant les types » : pas d'`enum`, de `namespace` ni de raccourci de constructeur (`tsc` le signale grâce à `erasableSyntaxOnly`), imports relatifs **avec l'extension `.ts`**.
- **Logique dans `src/core/`** : fonctions pures, aléa **injectable** (reçois un `Rng`, ne tire jamais `Math.random()` toi-même), aucune lecture de fichier ni de `window` (reçois un `DrawPool`) ; tests obligatoires, avec un hasard à graine (`seededRng`). L'ordre des jets de hasard est **figé** (le changer change tous les résultats d'une même graine) : documente tout changement.
- **Dates** : jour local `AAAA-MM-JJ` (`localDay()` de `core/dates`), **jamais** de millisecondes UTC. On compare les jours comme des textes. Si l'horloge recule, on ne retire pas (`needsNewDraw`).
- **Style** : Prettier (`pnpm format:write`), 2 espaces, guillemets simples, commentaires de code en français clair (la propriétaire lit le code), messages d'interface FR/EN.
- **Commits** : `feat:`, `fix:`, `docs:`, `chore:` ; un sujet par commit.

## Pièges connus

0. **Vérifie les VRAIS codes de sortie** : `pnpm lint | tail` masque l'échec (le code de `tail` l'emporte). Lance `pnpm lint; echo $?` ou chaque commande seule.

1. **Un clic retire le focus d'un champ** : cliquer sur un bouton valide (`blur`) un champ en cours de saisie. C'est normal ; les tests qui changent l'état « par code » ne reproduisent pas ça.
2. **Les tests happy-dom ne voient ni CSS ni mise en page** : vérifie les écrans dans Chromium.
3. **Images** : `public/sprites/` n'est pas dans git. Pour voir l'app avec ses images en local : `pnpm sprites` (≈ 75 s la 1ʳᵉ fois, 2,5 s ensuite). Sans image, l'app affiche un repère « ? » (voulu). `pnpm build` copie `public/` dans `dist/` (≈ 69 Mo, 5 358 fichiers) ; la CI n'a pas les images, c'est normal. **Vercel** les génère au déploiement via `vercel.json` (`pnpm sprites --verify && pnpm build`, ≈ 75 s) ; sans ça, une prévisualisation n'affiche aucune image.
4. **Service worker** : après un changement de `src/pwa/sw.ts`, désenregistre-le/vide les caches dans le navigateur avant de déboguer.
5. **Avertissement du build** `inlineDynamicImports option is deprecated` : vient de `vite-plugin-pwa` 2 avec Vite 8, sans effet.
6. **`docs/CHANGELOG_GUIDE.md`** décrit encore l'ancien `Changelog.svelte` : à réécrire en phase 5. Ses **règles éditoriales** (tutoiement, zéro jargon, « Note de Diamant » = sa voix, ne jamais l'inventer) restent valables.
7. **PokéAPI refuse (403) les requêtes sans `User-Agent` propre** (constaté avec l'agent par défaut de Python ; `curl` passe). Tout script qui l'interroge doit envoyer un `User-Agent` qui nous identifie, mettre les réponses en cache local (`.cache/`) et rester poli (peu de requêtes en parallèle).
8. **Branche par défaut de l'ancien dépôt** : `🏡master` (emoji) — cite-la entre guillemets dans un script shell.

9. **`window.indexedDB` peut LEVER une erreur rien qu'à sa lecture** (stockage bloqué) : passe par `browserIndexedDb()` (`storage/db.ts`), jamais `globalThis.indexedDB` directement. Cas couvert par un test unitaire **et** vérifié dans Chromium (un `getter` qui lève).
10. **Transactions IndexedDB** : ne fais **aucun** `await` d'autre chose qu'une requête IndexedDB au milieu d'une transaction (elle se terminerait toute seule). Les tests d'atomicité utilisent `fake-indexeddb` (une valeur non clonable fait échouer la sauvegarde ; il ne doit rien rester).
11. **Format de sauvegarde** : `STATE_SCHEMA_VERSION` reste à **1** tant que l'app n'est pas lancée ; on y a AJOUTÉ des champs facultatifs (ex. `rouletteBoost`), lus avec une valeur par défaut. Après le lancement, tout changement incompatible exige un numéro de version + une migration testée.
12. **Import** : il remplace TOUT, y compris le Pokémon d'aujourd'hui (un fichier ancien redonne un nouveau tirage pour aujourd'hui). C'est voulu et dit dans la confirmation.

## Ne pas faire

- Ne pas ajouter de framework de rendu, ni de dépendance non justifiée (poids du bundle), ni de service tiers qui voit les joueurs (pub, analytics, polices distantes).
- Ne pas commiter `dist/`, `node_modules/`, `public/sprites/`, clés ou secrets.
- Ne pas modifier/supprimer des données joueur sans garde-fou ni message clair. N'écris jamais dans IndexedDB hors de `src/storage/`, ni ne modifie l'état hors de `src/state/game.ts`.
- Ne pas présenter le projet comme affilié à Nintendo/Game Freak/The Pokémon Company : projet de fans **non commercial**.
- Ne pas créer de Pull Request sans qu'on te le demande.

## Git

Branche de travail : `v4` (sauf indication contraire). Jamais de push direct sur l'ancienne branche par défaut. Aucun nom de modèle d'IA dans les messages de commit, titres de PR ou code.
