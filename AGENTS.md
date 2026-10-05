# AGENTS.md — Consignes pour les agents IA (et les humains pressés)

> Ce fichier décrit **l'état actuel** (v3.1) du dépôt. Une reconstruction est prévue (voir `docs/REBUILD_PLAN.md`) : quand elle avancera, mets ce fichier à jour **dans la même PR** que le changement.
> Lis aussi : `docs/AUDIT.md` (problèmes connus) · `docs/ARCHITECTURE.md` (comment ça marche).

## Le projet en 3 lignes

**Pokédaily** — PWA « Quel Pokémon es-tu aujourd'hui ? » : un Pokémon (1–1025) avec nature, niveau et 1/69 de shiny, tiré une fois par jour. Tout est **local** (IndexedDB), aucun serveur à nous, aucun compte. Interface FR/EN, thème sombre Écarlate/Violet. Déployé sur Vercel (`pokedaily.vercel.app`).

## Pour la propriétaire du projet

La propriétaire (elle, **Diamant**) est écrivaine, **pas développeuse** : elle pilote le produit, l'IA écrit le code. Donc :
- Explique en **français clair**, sans jargon non défini ; montre l'impact visible plutôt que le détail technique.
- Fais des **changements petits et relisibles** (un sujet par commit). Annonce ce qui change et comment le vérifier.
- Ne présente jamais comme « vérifié » ce que tu n'as pas exécuté. Dis ce que tu n'as pas pu tester.
- Pas de grosse décision destructive (supprimer des données, réécrire l'historique git, changer de techno) sans accord explicite.

## Commandes (pnpm uniquement)

```bash
pnpm install --frozen-lockfile   # installer (ignore package-lock.json : voir « Pièges »)
pnpm dev                         # serveur de dev (--host), le service worker tourne aussi en dev
pnpm check                       # svelte-check : doit rester à 0 erreur (11 avertissements connus)
pnpm build                       # build de prod -> dist/ (ne pas commiter dist/)
pnpm preview                     # sert dist/
```

Pas de tests, pas de linter pour l'instant. **Définition de « terminé »** : `pnpm check` sans nouvelle erreur **et** `pnpm build` vert **et**, pour tout changement visible, une description de ce qui a été vérifié dans le navigateur.
Node ≥ 24 est demandé (`.nvmrc`) ; le projet build aussi sous Node 22.

## Stack

Svelte **5** (runes : `$state`, `$derived`, `$props` — pas de syntaxe Svelte 4) · TypeScript `strict` · Vite 5 · `vite-plugin-pwa` (stratégie `injectManifest`) + Workbox · `pokenode-ts` (client PokéAPI). Pas de routeur : routage par `location.hash`. Pas de bibliothèque UI : CSS scopé par composant + tokens dans `src/app.css`.

## Carte du code

| Chemin | Rôle |
|---|---|
| `src/App.svelte` | Coquille : vues par hash, chargement, enregistrement PWA, barre du bas, raccourci dev |
| `src/lib/scripts/script.ts` | ⭐ Tirage du jour, migration v2→v3, tickets, boîtes spéciales |
| `src/lib/scripts/db.ts` | IndexedDB (`pokedaily` v1 : stores `state`, `today`, `history`) |
| `src/lib/scripts/events.ts` | Moteur d'événements (dates, prochains, modificateurs) — fonctions pures |
| `public/events.json` | Les 12 événements (**données**, éditables sans toucher au code) |
| `src/lib/components/` | 13 composants (carte, historique, stats, pokédex, Pokékit, V-Roulette, Team du mois, popups…) |
| `src/sw.ts` | Service worker (précache shell, cache images, pré-cache total sur message) |
| `public/images/` | 2 050 PNG 512×512 : `025.png` (normal), `025S.png` (shiny), `000.png` |

## Conventions à respecter

- **Dates = jour UTC** : le « jour » commence à minuit UTC (`Date.now() - Date.now() % 86400000`). Reste cohérent ; ne mélange pas avec l'heure locale (c'est déjà le cas à deux endroits, c'est un bug connu, A7).
- **Pokédex = 1025** (constante dispersée) ; si tu touches à cette valeur, cherche *tous* les `1025` : `grep -rn 1025 src`.
- **Images** : `/images/{id sur 3 chiffres}{S si shiny}.png` via `getPokemonImagePath()` — n'écris jamais le chemin à la main.
- **Langue** : `getUserLang()` → `'fr' | 'en'` ; les textes sont écrits avec `lang === 'fr' ? … : …`. **Toute nouvelle chaîne visible doit exister en FR et en EN.**
- **Types Pokémon** : clés anglaises minuscules (`fire`, `water`…) ; classes CSS `.type-<clé>` dans `app.css`.
- **Nouvel événement** : ajouter dans `public/events.json` (voir types et modificateurs dans `docs/ARCHITECTURE.md` §4) — pas de code si les modificateurs existants suffisent. Dates avec année pour `date_range` ; **attention** : le compte à rebours les traite comme annuels (B-4).
- **Stockage** : ne pas ajouter de store IndexedDB sans monter `DB_VERSION` et écrire la migration. Les données du joueur sont précieuses : **jamais** de suppression/écrasement silencieux.
- **Style de code** : suis le fichier que tu modifies (2 espaces, guillemets simples, commentaires en anglais dans le code, textes utilisateur en FR/EN). Ne reformate pas des fichiers entiers dans un commit fonctionnel.

## Changelog et versions (important)

Règles complètes : `docs/CHANGELOG_GUIDE.md` (tutoiement, **zéro jargon technique**, jamais de mention du mode dev/bibliothèques/IndexedDB). Une nouvelle version se déclare à **trois endroits** qui ont déjà divergé : l'entrée dans `src/lib/components/Changelog.svelte` (tableau `entries`, plus récent en haut), `CHANGELOG.md`, et le badge de version **en dur** dans `App.svelte` (« 3.1 ») ; `package.json` est encore à `3.0.2`. Mets les quatre en cohérence quand tu publies. La « Note de Diamant » est **sa voix** : ne l'invente ni ne la réécris sans qu'elle te le demande.

## Pièges connus (lis `docs/AUDIT.md` §6 pour le détail)

1. **Deux lockfiles** (`pnpm-lock.yaml` + `package-lock.json`) : utilise **pnpm** ; ne régénère pas `package-lock.json`.
2. **Le constructeur de Pokémon est copié 5 fois** (`script.ts`, `VRoulette`, `TeamOfMonth`, `DevPanel`, + migration). Si tu changes le modèle `PokemonEntry`, tu dois les modifier **tous** — ou, mieux, les factoriser d'abord.
3. **`data` (AppData) est un instantané** : après une écriture IndexedDB faite par un composant, rien ne se met à jour tout seul. Le code actuel appelle `window.location.reload()` (props `onreload`). Ne « corrige » pas ça au détour d'une autre tâche.
4. **PokéAPI est appelée à l'exécution** (noms/types/natures) : le code doit tolérer l'échec réseau (`try/catch`), et ne **jamais consommer un ticket avant le succès** (bug B-2).
5. **Boîtes spéciales** (`luckyDayBox`) : une seule clé de stockage, aucune date vérifiée à la lecture (B-3).
6. **Service worker** : testé en `pnpm dev` aussi ; après un changement de `sw.ts`, vide les caches/désenregistre le SW dans le navigateur pour éviter de déboguer l'ancienne version. `events.json` n'est pas précaché (A10).
7. **Image manquante** : `774S.png` (Minior shiny) n'existe pas.
8. **Branche par défaut `🏡master`** (emoji) : cite-la entre guillemets dans les scripts shell.
9. **Mode dev** (`Ctrl/Cmd+Shift+C`) : outil de test à conserver ; son contenu ne se mentionne jamais dans le changelog.

## Ne pas faire

- Ne pas modifier/supprimer/recompresser `public/images/*` en masse sans demande explicite (95 Mo ; l'historique git pèse déjà 294 Mo : chaque version binaire l'alourdit).
- Ne pas committer `dist/`, `node_modules/`, clés ou secrets (il n'y en a pas : n'en introduis pas).
- Ne pas ajouter de dépendance sans la justifier (poids du bundle : 218 Ko aujourd'hui) ni de service tiers qui voit les utilisateurs (pub, analytics, polices distantes supplémentaires).
- Ne pas présenter ce projet comme affilié à Nintendo/Game Freak. Les images Pokémon appartiennent à leurs ayants droit : projet **non commercial** uniquement.
- Ne pas créer de Pull Request sans qu'on te le demande.

## Git

Branche de travail indiquée par la tâche (ex. `claude/<nom>`), jamais de push direct sur `🏡master`. Messages de commit clairs (`feat:`, `fix:`, `docs:`, `chore:` apparaissent dans l'historique récent). Un commit = un sujet. Aucun nom de modèle d'IA dans les messages, titres de PR ou code.
