# AGENTS.md — Consignes pour les agents IA (et les humains pressés)

> Ce fichier décrit la **v4** (branche `v4`, en construction). L'ancienne v3.1 (Svelte) vit sur l'ancienne branche ; ses constats sont dans `docs/AUDIT.md` et `docs/ARCHITECTURE.md`, utiles comme **cahier des charges**, pas comme modèle technique.
> Plan et avancement : `docs/REBUILD_PLAN.md`. Mets ce fichier à jour **dans le même changement** que ce qui le rend faux.

## Le projet en 3 lignes

**Pokédaily** — PWA « Quel Pokémon es-tu aujourd'hui ? » : un Pokémon par jour (espèces 1–1025 **et formes alternatives**), avec nature, niveau et 1/69 de shiny. Tout est **local** (IndexedDB), aucun serveur à nous, aucun compte. Interface FR/EN, thème sombre Écarlate/Violet.
**État** : phase 1 faite (outillage + essai « carte du jour »). Les données sont encore un jeu temporaire (`src/features/card/spike-data.ts`) ; vrai tirage, stockage et images arrivent en phases 2 à 4.

## Décisions de direction (Diamant) — à respecter

1. **TypeScript/JavaScript pur, sans moteur de rendu** : **ni Svelte, ni React, ni Vue, ni équivalent (lit, etc.)**. On garde **Vite** et la **PWA**.
2. **Jour local** : le Pokémon change à **minuit heure locale** du joueur (clé `AAAA-MM-JJ` locale), jamais UTC.
3. **Pas de migration** : base neuve ; l'**ancienne base de la v3.1 est supprimée** au premier lancement de la v4 (seulement après ouverture réussie de la nouvelle base, jamais sur les prévisualisations). **Export/import** de la collection : phase 4.
4. **Langues : français + anglais uniquement.**
5. **Mode développeur conservé** pour tout le monde (partie intégrante du système).
6. **Jamais de monétisation** : ni publicité, ni achat, ni analytics/suivi, ni service tiers qui voit les joueurs. Projet fun entre amis, non commercial. Refuse toute proposition contraire, même « discrète ».
7. **Images** : script automatisé (source `PokeAPI/sprites`, rendus Home 512 px), **générées au build, non commitées** (`public/sprites/` est ignoré par git) — `docs/REBUILD_PLAN.md` §4. Taille finale (256/512 px) tranchée après essai visuel. Propriété de The Pokémon Company.
   - **Pokémon DB** : renfort **ponctuel** pour combler les trous (jamais source de masse). Règles : téléchargement unique, **2 s entre requêtes**, `User-Agent` qui nous identifie, pas de `wget`, fichiers auto-hébergés (pas de lien direct), provenance notée, lien retour dans « À propos ».
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
| `src/app/` | Coquille (`app.ts` : en-tête, langue, routeur) + page « À propos » |
| `src/ui/dom.ts` | `h()`, `svg()`, `bindText`, `bindAttr`, `bindChildren`, `effect` — **seule** façon de construire le DOM |
| `src/ui/store.ts` · `scope.ts` | État réactif (`createStore`) · nettoyage des abonnements (`Scope`) |
| `src/ui/router.ts` | Routage par hash **avec** `hashchange` |
| `src/ui/tokens.css` · `types.css` | Variables de thème · couleurs de types (**source unique**) |
| `src/i18n/` | `fr.ts` (référence), `en.ts` (mêmes clés, imposé par TypeScript), `index.ts` (`createI18n`, `detectLang`) |
| `src/core/` | Logique **pure** (sans navigateur), testable : pour l'instant `pokemon-types.ts` |
| `src/features/card/` | Écran « carte du jour » (essai) + `spike-data.ts` (**temporaire**) |
| `src/pwa/sw.ts` | Service worker (shell seulement pour l'instant) |
| `tests/` | Miroir de `src/` |

## Conventions à respecter

- **Pas de HTML brut** : jamais `innerHTML`, `outerHTML`, `insertAdjacentHTML` (ESLint les refuse). Tout passe par `h()` ; le texte est ajouté comme **nœud texte**. `h()` refuse aussi les URLs `javascript:`/`data:`.
- **Construis la structure une fois, lie les textes/attributs** : une vue est une fonction `({ scope }) => HTMLElement` ; les `bind*`/`effect` s'abonnent via le `scope`, qui les libère quand la vue disparaît. Ne recrée pas un champ de saisie à chaque mise à jour (perte du focus).
- **Traductions** : ajoute la clé dans `fr.ts` **puis** `en.ts` ; TypeScript refuse sinon. Aucun texte visible en dur dans les vues. `<html lang>` suit la langue.
- **Attributs** : `bindAttr(..., 'hidden', ...)` attend un booléen ; pour un attribut « présent/absent » (`data-shiny`), renvoie `''`/`true` ou `undefined`/`false`, **pas** la chaîne `'true'`.
- **CSS** : un fichier par fonctionnalité, classes préfixées ; couleurs de types **uniquement** dans `types.css` (`[data-type]` → `--type-color`). Utilise `var(--type-color, var(--accent))` : une valeur par défaut posée sur `.card` écraserait celle de `types.css` (déjà arrivé).
- **Logique dans `src/core/`** : fonctions pures, aléa **injectable** (jamais `Math.random()` direct dans la logique), tests obligatoires.
- **Dates** : jour local `AAAA-MM-JJ` (`localDay()`), jamais de millisecondes UTC arrondies.
- **Style** : Prettier (`pnpm format:write`), 2 espaces, guillemets simples, commentaires de code en français clair (la propriétaire lit le code), messages d'interface FR/EN.
- **Commits** : `feat:`, `fix:`, `docs:`, `chore:` ; un sujet par commit.

## Pièges connus

1. **Un clic retire le focus d'un champ** : cliquer sur un bouton valide (`blur`) un champ en cours de saisie. C'est normal ; les tests qui changent l'état « par code » ne reproduisent pas ça.
2. **Les tests happy-dom ne voient ni CSS ni mise en page** : vérifie les écrans dans Chromium.
3. **Images** : `public/sprites/` n'est pas dans git. Tant que le script de la phase 2 n'existe pas, l'app affiche un repère « ? » (comportement voulu quand une image manque).
4. **Service worker** : après un changement de `src/pwa/sw.ts`, désenregistre-le/vide les caches dans le navigateur avant de déboguer.
5. **Avertissement du build** `inlineDynamicImports option is deprecated` : vient de `vite-plugin-pwa` 2 avec Vite 8, sans effet.
6. **`docs/CHANGELOG_GUIDE.md`** décrit encore l'ancien `Changelog.svelte` : à réécrire en phase 5. Ses **règles éditoriales** (tutoiement, zéro jargon, « Note de Diamant » = sa voix, ne jamais l'inventer) restent valables.
7. **Branche par défaut de l'ancien dépôt** : `🏡master` (emoji) — cite-la entre guillemets dans un script shell.

## Ne pas faire

- Ne pas ajouter de framework de rendu, ni de dépendance non justifiée (poids du bundle), ni de service tiers qui voit les joueurs (pub, analytics, polices distantes).
- Ne pas commiter `dist/`, `node_modules/`, `public/sprites/`, clés ou secrets.
- Ne pas modifier/supprimer des données joueur sans garde-fou ni message clair.
- Ne pas présenter le projet comme affilié à Nintendo/Game Freak/The Pokémon Company : projet de fans **non commercial**.
- Ne pas créer de Pull Request sans qu'on te le demande.

## Git

Branche de travail : `v4` (sauf indication contraire). Jamais de push direct sur l'ancienne branche par défaut. Aucun nom de modèle d'IA dans les messages de commit, titres de PR ou code.
