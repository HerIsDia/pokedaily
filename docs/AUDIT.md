# Audit complet — Pokédaily (état au 5 octobre 2026)

> Audit réalisé sur la branche `claude/ecstatic-edison-vsuq66`, à partir du commit `b4ba73c` (v3.1).
> Tout ce qui est marqué ✅ a été **vérifié** (code lu, commande exécutée ou expérience lancée).
> Tout ce qui est marqué ❓ est une **hypothèse non vérifiée** : à confirmer avant d'agir.

> **Mise à jour du 5 octobre 2026 :** Diamant a répondu aux questions de l'audit. Ses décisions (reconstruction de zéro en TS/JS pur, jour local, pas de migration, FR+EN, mode dev conservé, **jamais de monétisation**…) sont au **§8**. Les constats ci-dessous décrivent la v3.1 et restent valables comme cahier des charges de non-régression.

Documents liés : [`ARCHITECTURE.md`](ARCHITECTURE.md) (comment ça marche aujourd'hui) · [`REBUILD_PLAN.md`](REBUILD_PLAN.md) (comment reconstruire + idées fun) · [`../AGENTS.md`](../AGENTS.md) (consignes pour les agents IA).

---

## 1. Résumé en 2 minutes

**Verdict :** l'application **fonctionne** (build propre, 0 erreur de typage) et son idée est solide. Mais son code est le produit de trois « couches » successives (v1 2021 → v2 → v3 refonte par Claude Code en mars 2026) et la v3.1 a été construite **vite, par accumulation**. Le problème n'est pas la techno (Svelte 5 + Vite + PWA est un très bon choix), c'est la **structure** : pas de source de vérité unique, du code copié-collé 5 fois, aucun test, aucune CI.

**Les 6 chiffres à retenir**

| Mesure | Valeur | Verdict |
|---|---|---|
| Code applicatif | 6 749 lignes dans `src/` (dont ~52 % de CSS dans les composants), 0 test | 🟠 |
| Poids des images dans le dépôt | **95 Mo** (2 050 PNG 512×512) ; dossier `.git` : **294 Mo** | 🔴 |
| Images après conversion WebP (mesuré sur 30 échantillons) | ~31 Mo en 512 px (−65 %) · ~23 Mo en 256 px (−75 %) | 🟢 gain facile |
| Vulnérabilités `pnpm audit` | 95 au total, dont **36 en production** (presque toutes via `axios`, tiré par `pokenode-ts`) | 🟠 |
| Endroits qui construisent un « Pokémon du jour » | **5** copies quasi identiques | 🔴 dette n°1 |
| Occurrences du nombre magique `1025` | 15, dans 7 fichiers | 🟠 |

**Top 5 des priorités** (détail en §6)

1. Supprimer la dépendance à PokéAPI à l'exécution (et, par décision de Diamant, à tout moteur de rendu) : embarquer un petit fichier de données (noms FR/EN, types, natures) → app 100 % hors-ligne, −1 dépendance, −36 vulnérabilités prod, bundle plus léger.
2. Créer **une seule** fonction qui fabrique un Pokémon (au lieu de 5 copies) + **une seule** source de vérité pour l'état (au lieu de « chaque composant lit/écrit IndexedDB puis on recharge la page »).
3. Corriger les 6 bugs confirmés (§6.1), dont : ticket Victini perdu si l'API échoue, Boîte Lucky Day jamais expirée, compte à rebours faux pour les événements ponctuels.
4. Remplacer les 95 Mo d'images du dépôt par un **script automatique** qui les récupère (espèces **et** formes) depuis une source publique et les convertit en WebP (voir §8.2 et `REBUILD_PLAN.md` §4), et repartir d'un dépôt léger.
5. Poser le filet de sécurité : tests sur la logique pure (événements, tirage), CI GitHub Actions, lint/format.

---

## 2. Identité et historique

| | |
|---|---|
| Nom | Pokédaily (⚠️ « Pokédex Daily » dans `index.html` et le manifeste PWA — voir D-9) |
| Concept | « Quel Pokémon es-tu aujourd'hui ? » — un Pokémon (1–1025) avec nature, niveau et 1/69 de chance d'être shiny, tiré **une fois par jour** |
| Déploiement | https://pokedaily.vercel.app (indiqué dans le README ; ❓ aucune config Vercel dans le dépôt, donc déploiement via l'intégration Git par défaut) |
| Dépôt | `HerIsDia/pokedaily` — branche par défaut **`🏡master`** (un emoji dans le nom de branche, ça peut gêner certains outils) |
| Licence | MIT, « Copyright (c) 2021 DiamantDev » |
| Commits | 63, du 29/08/2021 au 13/03/2026 |

**Les 3 époques du projet** (d'après `git log`) :

1. **v1 — août/septembre 2021** : création, ajout des 898 images, `PokeAPI.ts`, PWA, historique, Pokédex, mode nuit. Svelte + Vite.
2. **v2 — 2021 → février 2025** : peu d'activité (« Final commit » ×3), ajout de la Gen 9 (nov. 2023 / fév. 2025 : images 899 → 1025).
3. **v3 — 11 → 13 mars 2026** : refonte complète via **Claude Code** (commits `ae55377` puis PR #16, #17, #18). Passage à Svelte 5 (runes), thème Écarlate/Violet, IndexedDB, événements, Shinydex, Stats, Pokékit (V-Roulette, Team du mois). **~7 000 lignes ajoutées en 3 jours** (`git diff --shortstat 07430f5 HEAD` sur `src/`, `docs/`, `events.json`, changelog : +7 006 / −627).

> Conséquence : le code actuel est « jeune » (3 jours de v3) mais s'est empilé très vite, sans phase de nettoyage. C'est typique : ça marche, mais ça n'a jamais été relu en entier.

---

## 3. Inventaire

### 3.1 Stack (versions réellement installées, `pnpm install --frozen-lockfile`)

| Rôle | Paquet | Installé | Dernière dispo (`pnpm outdated`) |
|---|---|---|---|
| UI | svelte | 5.53.10 | 5.57.1 |
| Build | vite | 5.4.21 | 8.3.2 (⚠️ 3 majeures de retard) |
| Plugin Svelte | @sveltejs/vite-plugin-svelte | 4.0.4 | 7.3.1 |
| PWA | vite-plugin-pwa | 0.21.2 | 2.0.0 |
| Service worker | workbox-* | 7.4.0 | 7.4.1 |
| Types | typescript | 5.9.3 | 7.0.2 |
| Check | svelte-check | 4.4.5 | 4.7.6 |
| Client API | **pokenode-ts** (seule dépendance de prod) | 1.20.0 | 3.0.0 |

Node requis : `>=24` (`package.json` + `.nvmrc`). ✅ Testé sous Node 22.22 : l'install, le check et le build passent quand même (simple avertissement) → la contrainte `>=24` est plus stricte que nécessaire.

### 3.2 Arborescence commentée

```
pokedaily/
├── index.html                  Page unique (titre « Pokédex Daily », police Google Fonts)
├── vite.config.ts              Svelte + PWA (stratégie injectManifest) + manifeste
├── package.json / pnpm-lock.yaml / package-lock.json   ⚠️ DEUX lockfiles (voir D-6)
├── CHANGELOG.md                Notes de version « archives » (⚠️ s'arrête à 3.0_b2)
├── docs/CHANGELOG_GUIDE.md     Guide de rédaction des notes de version (bon document)
├── public/
│   ├── events.json             12 événements (données, pas du code — très bonne idée)
│   ├── images/                 2 050 PNG : 001.png … 1025.png + 001S.png … (shiny) + 000.png
│   ├── robot.txt               ⚠️ mal nommé (doit être robots.txt) → inopérant
│   └── icônes PWA, favicon
└── src/
    ├── main.ts                 Monte <App/>
    ├── App.svelte (509 l.)     Coquille : routage par hash, chargement, PWA, barre du bas
    ├── sw.ts (80 l.)           Service worker (précache shell + cache images à la demande)
    ├── app.css (138 l.)        Design tokens + couleurs de types
    └── lib/
        ├── scripts/
        │   ├── script.ts       ⭐ Logique métier : tirage du jour, migration, tickets, boîtes
        │   ├── db.ts           IndexedDB (stores, types, helpers)
        │   ├── events.ts       Moteur d'événements (dates, modificateurs)
        │   ├── pokeAPI.ts      Wrapper pokenode-ts
        │   └── connection.ts   Détection réseau « non limité »
        └── components/         13 composants (voir §4)
```

### 3.3 Taille des composants (lignes, CSS inclus)

VRoulette 971 · PokemonCard 705 · History 627 · DevPanel 597 · App 509 · Changelog 403 · EventBanner 399 · Stats 371 · Pokedex 304 · TeamOfMonth 270 · Pokekit 213 · EventsCalendar 194 · InstallBanner 136.
Mesuré : **52 %** des lignes des composants sont du CSS scopé (2 944 / 5 699). Les scripts + service worker ne font que **900 lignes** : la logique métier est petite, c'est l'habillage qui est volumineux.

---

## 4. Fonctionnalités (ce que fait vraiment l'app)

| Fonction | Où | État |
|---|---|---|
| Pokémon du jour (tirage 1×/jour UTC, nature, niveau 1–99, shiny 1/69) | `script.ts` | ✅ fonctionne |
| Surnom (16 car. max) | `PokemonCard` + `setRename` | ✅ |
| Carte partageable (canvas 400×560) : partager / copier / télécharger | `PokemonCard` | ✅ (fallback téléchargement) |
| Historique en calendrier mensuel + point doré « événement » | `History` | ✅ |
| Pokédex (1025) + Shinydex | `Pokedex` | ✅ — ⚠️ shiny Minior sans image |
| Stats (total, shiny, taux, niveau moyen, série, types, top 5) | `Stats` | ✅ — ⚠️ « série » mal calculée |
| Événements (12, via `events.json`) + bandeau + calendrier | `events.ts`, `EventBanner`, `EventsCalendar` | ✅ — ⚠️ compte à rebours faux |
| Pokékit → V-Roulette (tickets Victini, 3 boîtes, boost, grille 4×4) | `VRoulette` | ⚠️ plusieurs bugs |
| Pokékit → Team du mois (6 Pokémon/mois) | `TeamOfMonth` | ✅ |
| PWA : installation, hors-ligne, pré-cache des 2 050 images | `sw.ts`, `App` | ⚠️ voir §6 |
| Changelog intégré (tap sur « 3.1 ») | `Changelog` | ✅ — texte en dur dans le composant |
| Mode développeur (`Ctrl/Cmd+Shift+C`) | `DevPanel` | ✅ — pensé pour le dev, accessible à tous |
| Bilingue FR/EN (`?lang=` ou langue du navigateur) | partout | ⚠️ partiel, voir D-5 |
| Migration automatique v2 (localStorage) → v3 (IndexedDB) | `script.ts` | ✅ — ❓ non testée sur de vraies données v2 |

---

## 5. Santé technique mesurée

| Contrôle | Commande | Résultat |
|---|---|---|
| Installation | `pnpm install --frozen-lockfile` | ✅ OK (avertissement Node 22 vs ≥24) |
| Typage | `pnpm check` | ✅ **0 erreur, 11 avertissements** (5 fichiers) |
| Build prod | `pnpm build` | ✅ OK en ~3 s |
| Bundle | — | JS **218,7 Ko** (71,5 Ko gzip) · CSS 55,5 Ko (9,6 Ko gzip) · SW 17,7 Ko |
| Précache SW | — | 8 fichiers, 284 Ko (shell uniquement ; images exclues, voulu) |
| Audit sécu | `pnpm audit` | 95 alertes (3 low / 45 moderate / **47 high**) ; **prod seule : 36** (1 low / 22 moderate / 13 high), presque toutes `axios` via `pokenode-ts` |
| Tests | — | ❌ aucun (pas de Vitest/Playwright) |
| Lint / format | — | ❌ aucun (des commentaires `eslint-disable` existent… mais ESLint n'est pas installé) |
| CI | — | ❌ aucune (`.github/` absent ; un workflow existait en v2, supprimé) |

Les 11 avertissements `svelte-check` : 7× « `data` capturé à l'initialisation » (symptôme du §6.2-A), 2× `dialog` sans `tabindex`, 1× `autofocus`, 1× `tabindex` sur élément non interactif.

> ⚠️ Honnêteté sur le chiffre « 95 vulnérabilités » : les 59 hors-prod concernent l'outillage de build (Vite, Workbox, Babel…), jamais livré aux utilisateurs. Le risque réel est faible ; le chiffre est surtout un signal de **dépendances vieillissantes**. Les 36 de prod viennent d'`axios` embarqué dans le navigateur par `pokenode-ts` : en supprimant l'appel à PokéAPI à l'exécution (priorité 1), elles disparaissent d'un coup.

---

## 6. Constats détaillés

Légende : 🔴 bug confirmé · 🟠 risque / fragilité · 🟡 dette · 🔵 amélioration.

### 6.1 Bugs confirmés (✅ chacun vérifié par lecture du code et, quand c'était possible, par exécution)

**B-1 🔴 Shiny de Minior sans image.** `public/images/774S.png` n'existe pas (1 024 shiny pour 1 025 Pokémon). Si Minior (#774) sort en shiny, ou apparaît dans le Shinydex/historique, l'image est cassée. *Vérifié par script sur le dossier.*

**B-2 🔴 Ticket Victini perdu si l'API échoue.** `VRoulette.svelte` (`spin`) décrémente le ticket **et le sauvegarde** *avant* d'appeler PokéAPI ; le `catch` est vide (« Silent fail »). Hors-ligne ou API en panne : ticket consommé, Pokémon inchangé, aucun message.

**B-3 🔴 La Boîte Lucky Day / Poisson d'avril n'expire jamais.** `getLuckyDayBox` ne regarde pas le champ `date` stocké. Une fois générée, la boîte reste disponible indéfiniment (jusqu'à ce qu'un autre événement l'écrase) et peut être rejouée à volonté tant qu'il y a des tickets. De plus, les deux événements partagent **la même clé de stockage** (`luckyDayBox`) : si un Vendredi 13 tombe un 1ᵉʳ avril, l'une écrase l'autre.

**B-4 🔴 Compte à rebours faux pour les événements ponctuels.** `daysUntilNextOccurrence` traite tout `date_range` comme annuel. *Expérience :* depuis le 5 oct. 2026, « Sortie de Pokopia » (1–31 mars **2026** uniquement) s'affiche « dans 147 j », alors que l'événement ne se reproduira pas (le 1ᵉʳ mars 2027 il n'est pas actif — testé). Même problème pour le « Lancement V-Roulette » côté logique (retourne `null`, donc au moins silencieux).

**B-5 🔴 Le « boost 1/4 » est en réalité ~29,7 %.** Le code fait : 25 % de forcer le Pokémon boosté, **sinon** tirage uniforme parmi 16 (qui peut retomber dessus) → 0,25 + 0,75/16 ≈ 29,7 % (*simulé sur 200 000 tirages*). L'interface annonce « 1/4 de chance ». Soit on corrige le texte, soit la formule.

**B-6 🟠→🔴 Navigation : le bouton « Retour » du navigateur ne change pas de vue.** `App.svelte` écrit `window.location.hash` mais n'écoute jamais `hashchange` (aucune occurrence dans `src/`). Sur Android, le geste « retour » change l'URL sans changer l'écran. *Vérifié par recherche dans le code.*

**B-7 🟠 Pokédex et tickets désynchronisés entre onglets.** Les composants lisent `data` (instantané pris au démarrage). Après la V-Roulette, il faut **recharger la page** (bouton « Rafraîchir la page ») pour que Stats/Pokékit reflètent les tickets et le nouveau Pokémon. C'est le symptôme visible du §6.2-A.

**B-8 🟡 « Jours consécutifs » n'est pas la série en cours.** `Stats.svelte` compte la série qui finit à l'entrée **la plus récente**, même si elle date de 10 jours. De plus, un jour où l'app n'est pas ouverte n'a pas d'entrée (le tirage n'a lieu qu'à l'ouverture) : la « série » mesure donc les jours d'ouverture, pas les jours calendaires.

**B-9 🟡 Incohérence Stats / Shinydex.** « Chromatiques » compte les shiny de l'historique + du jour, mais le Shinydex inclut aussi ceux de la Team du mois et de la V-Roulette. Deux chiffres différents pour la même notion.

**B-10 🟡 Niveau 100 impossible à éditer / niveau max.** Tirage normal : 1–99. L'événement Bonne Année force le niveau 100. Le DevPanel limite à 99. Pas grave, mais incohérent (à décider : max 100 ?).

### 6.2 Architecture (🟠/🟡)

**A — Pas de source de vérité (le plus gros problème).** Chaque composant ouvre IndexedDB et lit/écrit directement (`VRoulette`, `TeamOfMonth`, `DevPanel`, `script.ts`). `AppData` est un instantané immuable passé en props, d'où les 7 avertissements `state_referenced_locally` et les `window.location.reload()` pour resynchroniser (App → Pokékit/DevPanel). *Conséquence : toute nouvelle fonctionnalité qui modifie l'état devra choisir entre « recharger la page » et « bricoler »*.

**A2 — Le « constructeur de Pokémon » est copié 5 fois** : `script.ts` (tirage + `mapOldEntry`), `VRoulette.svelte`, `TeamOfMonth.svelte`, `DevPanel.svelte` (`fillHistory`). ~20 lignes identiques (`nameFr`, `natureFr`, `typeNamesFr`…). Tout changement de modèle doit être fait 5 fois. *Vérifié : `grep typeNamesFr:` → 5 fichiers.*

**A3 — Dépendance runtime à PokéAPI pour des données statiques.** Chaque tirage = 4 à 5 requêtes (pokémon + espèce + nature + 1–2 types) pour récupérer des **noms**. Or ces données ne changent pas. Conséquences : app inutilisable au 1ᵉʳ lancement hors-ligne, `axios` dans le bundle (36 alertes prod), non-respect probable de la politique d'usage ([PokéAPI demande de mettre en cache localement](https://pokeapi.co/docs/v2) — notre app met en cache le résultat du jour mais re-télécharge à chaque tirage, nature et types inclus), et une panne de leur service = panne du tirage.

**A4 — Modèle de données « dénormalisé ».** Chaque entrée stocke `nameFr/nameEn/natureFr/natureEn/typeNamesFr/typeNamesEn`. Ajouter une langue = migrer toute la base. Le bon modèle : stocker `id`, `natureId`, `level`, `isShiny`, `date`, `rename` et **résoudre les noms à l'affichage** depuis un dictionnaire embarqué.

**A5 — Écritures IndexedDB non atomiques.** `saveState` lance 3 `put` en parallèle dans 3 transactions séparées ; le tirage enchaîne `saveTodayEntry` → `saveState` → tickets → boîtes sans transaction commune. Un plantage au milieu laisse un état incohérent (ex. Pokémon du jour sauvé, tickets non crédités). Pas de gestion `onversionchange`/`onblocked`, `DB_VERSION` figé à 1 (les nouvelles données sont rangées dans le store générique `state` clé/valeur plutôt que dans de vrais stores).

**A6 — Aléatoire non injectable.** `Math.random()` est appelé partout, directement. Impossible à tester de façon déterministe (le seul code déterministe est la génération des boîtes mensuelles, via `mulberry32` — qui existe mais seulement dans `VRoulette.svelte`).

**A7 — Plusieurs conventions de date.** Tirage et historique en **UTC** (`getUTC*`), mais `TeamOfMonth` et `VRoulette` utilisent le mois **local** (`getMonth`), et `PokemonCard` affiche la date locale. Risque d'incohérence autour de minuit/fin de mois. Et côté produit : en France, le « nouveau jour » commence à **1 h/2 h du matin**, pas minuit (le README dit « minuit UTC »). ❓ Voulu ?

**A8 — Boîtes mensuelles identiques pour tout le monde et calculables.** Elles dépendent uniquement du mois (graine = texte `2026-10`). Pas un bug, un choix de design : mais « aperçu limité à 3 Pokémon » n'empêche pas de calculer les 16. Et elles peuvent contenir des doublons (tirage avec remise).

**A9 — Service worker enregistré deux fois.** `vite-plugin-pwa` injecte `registerSW.js` dans `index.html` **et** `App.svelte` appelle `serviceWorker.register('/sw.js')` à la main (✅ vu dans `dist/`). Inoffensif mais redondant. La mise à jour auto fait `postMessage(SKIP_WAITING)` puis `location.reload()` **sans prévenir** : un rechargement en pleine roulette est possible.

**A10 — `events.json` n'est pas dans le précache.** Le motif `globPatterns` n'inclut pas `json` (✅ `dist/sw.js` : 8 entrées, pas `events.json`) et aucune route runtime ne le met en cache. Hors-ligne, `loadEvents()` échoue silencieusement et retourne `[]` : plus de bandeau ni de points dorés au calendrier. La police Google Fonts n'est pas non plus mise en cache (repli sur la police système hors-ligne).

**A11 — Pré-cache des images : uniquement sur l'événement `appinstalled`.** Safari/iOS n'émet pas `beforeinstallprompt` ([MDN](https://developer.mozilla.org/en-US/docs/Web/API/BeforeInstallPromptEvent) : fonctionnalité « non standard » et non disponible dans plusieurs navigateurs majeurs, dont Safari) donc les utilisateurs iPhone n'ont ni bannière d'installation ni pré-cache des 2 050 images (~91 Mo). ❓ Les quotas de stockage Safari pour 91 Mo sont à vérifier. Voir aussi §6.4.

### 6.3 Qualité du code (🟡)

- **D-1 Nombre magique `1025`** (15 occurrences / 7 fichiers) et `69`, `25`, `16`, `99`, `494` (Victini), `86400000`… à centraliser (`constants.ts`). Quand la Gen 10 arrivera, il faudra tout retrouver à la main.
- **D-2 Textes dispersés** : chaque composant porte ses `lang === 'fr' ? … : …`. Environ **la moitié** de l'interface n'est pas traduite (nav, « Chargement… », « Hors ligne », « Installer », DevPanel, `Niv.`/`Shiny` dans History, `alt` des images…). `<html lang="fr">` est figé même en anglais.
- **D-3 Couleurs de types définies 3 fois** : `app.css` (`.type-fire…`), `PokemonCard.svelte` (`typeColors`), et les styles par composant (`.card-fire`, `.detail-img-fire`, `.type-bar-fire`…). Source de dérive visuelle.
- **D-4 Changelog en dur** dans `Changelog.svelte` (≈ 100 lignes de texte FR/EN dans un composant) **et** dans `CHANGELOG.md` : les deux ont déjà divergé (CHANGELOG.md s'arrête à 3.0_b2 alors que l'app affiche 3.1).
- **D-5 i18n artisanale** : `getUserLang()` relit l'URL/navigateur à chaque composant, pas de sélecteur de langue, pas de persistance du choix.
- **D-6 Deux lockfiles** (`pnpm-lock.yaml` + `package-lock.json`, ce dernier ré-ajouté par `28b5840` alors que `885c2b1` l'avait supprimé « car le projet utilise pnpm »). Le README impose pnpm. Risque de versions différentes selon l'outil. → garder **un seul**.
- **D-7 Versionnage incohérent** : `package.json` = `3.0.2`, l'interface affiche `3.1` en dur (`App.svelte`), le guide demande `3.1_b1`, le changelog interne utilise `3.1`. Aucune source unique.
- **D-8 Écouteurs jamais retirés** (`keydown`, `online/offline`, `beforeinstallprompt`… ajoutés dans `onMount` sans nettoyage) ; acceptable pour une app mono-page, mais à éviter dans une base propre.
- **D-9 Noms incohérents** : « Pokédaily » (README, logo) vs « Pokédex Daily » (`<title>`, manifeste PWA) vs « Pokédex » (nom court de l'icône d'écran d'accueil).
- **D-10 CSS lourd (55 Ko)** : beaucoup de styles quasi dupliqués (popups `.event-popup`, `.roulette-popup`, `.cl-panel`, `.dev-panel` ont la même structure : backdrop + panneau + header + close).
- **D-11 `robot.txt`** : le fichier doit s'appeler `robots.txt` pour être pris en compte. Aujourd'hui il est ignoré (et il « autorise tout », c'est le comportement par défaut : aucun impact réel).
- **D-12 Branche par défaut `🏡master`** : emoji dans le nom de branche, et nom hérité de l'époque pré-`main`.
- **D-13 Manifeste PWA** : la même icône 512 est déclarée deux fois dont une avec `purpose: 'any maskable'` ; la bonne pratique est de séparer `any` et `maskable` (et la maskable demande une marge de sécurité dans l'image) ❓ à vérifier avec un outil type Lighthouse.

### 6.4 Poids, performance, hors-ligne

- **Images : 94,5 Mo** (2 050 fichiers, moyenne 46 Ko, max 192 Ko), toutes en **512×512 PNG**. Les plus grandes affichées font **200 px** (carte) ; la grille Pokédex 56 px. **Mesuré** (Pillow, échantillon de 30) : WebP q80 → −65 % (≈ 31 Mo) ; WebP 256 px → −75 % (≈ 23 Mo). Le pré-cache hors-ligne passerait de ~91 Mo à ~23–31 Mo.
- **Dépôt git : 294 Mo** (`size-pack`). Cause : 3 846 versions de PNG dans l'historique (les images ont été ajoutées, **recompressées** (`3656c70`), puis ré-ajoutées en gen 9). Cloner le projet est donc lent. Option : repartir d'un dépôt neuf (ou réécrire l'historique) lors de la reconstruction — **décision à prendre ensemble**, car c'est destructif.
- **JS 218 Ko (71 Ko gzip)** pour une app de cette taille : une partie vient d'`axios`/`pokenode-ts` (✅ `axios` présent dans le bundle). Sans PokéAPI, on peut raisonnablement viser nettement moins ❓ (à mesurer après).
- **Pas de découpage de code** : tout (DevPanel, Changelog, VRoulette…) est chargé au démarrage.
- **Pokédex : 1 025 `<img>` dans le DOM** (avec `loading="lazy"`, ce qui limite le coût réseau, pas le coût DOM). Virtualisation ou sprite-sheet possibles.
- **Police Google Fonts** : requête externe au chargement (vie privée, hors-ligne, performance) → l'auto-héberger.

### 6.5 Sécurité et vie privée

- ✅ **Pas de HTML injecté** : aucun `{@html}`, `innerHTML`, `eval` dans `src/`. Le surnom (saisie utilisateur) est affiché par interpolation Svelte (échappée) et dessiné en canvas. **Pas de faille XSS identifiée.**
- ✅ **Aucun secret** dans le dépôt (pas de `.env`, pas de clé d'API ; PokéAPI est publique). Aucun compte utilisateur, tout est local.
- 🟡 **Données perso** : seulement le Pokémon du jour/historique, sur l'appareil. Requêtes externes : `pokeapi.co` et Google Fonts (l'IP de l'utilisateur est vue par Google → point RGPD classique, évitable en auto-hébergeant la police).
- 🟡 **Mode développeur accessible à tous** (`Ctrl/Cmd+Shift+C`). Pas de danger (tout est local), mais n'importe qui peut s'offrir des tickets/shiny : OK pour un jeu sans classement. **Décision de Diamant : il fait partie intégrante du système, on le garde pour tout le monde.** ❓ Le raccourci `Ctrl+Shift+C` est aussi celui de l'inspecteur des navigateurs : conflit possible, à tester.
- 🟡 **Pas de sauvegarde/export** : si l'utilisateur vide les données de son navigateur, il perd tout (historique, shinydex). Pour une app dont la valeur est la collection, c'est le plus gros « risque produit » (voir idées dans `REBUILD_PLAN.md`).
- 🟡 Dépendances non à jour (§3.1) et aucun mécanisme de veille (pas de Dependabot/Renovate).

### 6.6 Accessibilité (🟡, ❓ non testée avec lecteur d'écran)

Points relevés par `svelte-check` et la lecture : popups `role="dialog"` sans `tabindex` ni piège de focus ; `autofocus` sur le champ de renommage ; cases du calendrier cliquables sur des `div` (avec `role`/`tabindex` conditionnels, bien) ; `lang` du document figé ; contrastes des textes `--text-muted` (#5a5a7a sur #0f0f1a) à mesurer ❓. Les boutons de navigation ont un `aria-label` : bon point.

### 6.7 Juridique / propriété intellectuelle (⚠️ à traiter sérieusement)

- Le dépôt contient **2 050 images de Pokémon** (**Diamant les a récupérées sur un dépôt GitHub** ; la source la plus probable est [`PokeAPI/sprites`](https://github.com/PokeAPI/sprites), rendus « Home » 512×512 — même taille que tes fichiers, mais ❓ non prouvé ; **rien n'est documenté dans le dépôt**) sous une licence **MIT** : or la MIT ne peut pas relicencier des images qui appartiennent à Nintendo / Creatures / Game Freak / The Pokémon Company.
- La page « Media Usage Guidelines » de The Pokémon Company International précise que l'usage de leurs contenus est limité à des usages **informatifs/éditoriaux et non commerciaux**, sans modification ni suggestion de partenariat ([source](https://pokemon.gamespress.com/Media-Usage-Guidelines)) ; ❓ ce texte vise surtout la presse : la situation d'un projet de fan reste une zone grise, **je ne suis pas juriste**.
- Le `LICENCE.txt` de `PokeAPI/sprites` précise : *« All image contents within are Copyright The Pokémon Company. This repository is distributed under CC0 »* : le CC0 couvre la structure du dépôt source, **pas les images**.
- Le disclaimer « non affilié à Nintendo… » est présent (README + bas de la carte). Bon réflexe.
- **Conséquences pratiques à décider** : (a) rester non commercial (pas de pub, pas d'achat in-app) — **décision de Diamant : jamais de monétisation**, à écrire explicitement dans le README ; (b) documenter la provenance des images ; (c) séparer la licence du **code** (MIT) des **assets** (droits réservés à leurs propriétaires) dans le README ; (d) envisager de ne plus héberger les images soi-même (charger depuis une source publique) — mais cela se paie en hors-ligne et en dépendance.

---

## 7. Ce qui est bien (à conserver)

1. **Concept clair, UX mobile-first soignée** (thème Écarlate/Violet, animations sobres, barre du bas).
2. **Événements pilotés par un fichier de données** (`events.json`) : on ajoute une fête sans toucher au code. Excellent principe, juste à fiabiliser (§6.1 B-3/B-4, validation du schéma).
3. **Moteur d'événements isolé** dans `events.ts` (fonctions pures, sans dépendance UI, déjà quasiment testables).
4. **Stockage local fiable** (IndexedDB) et **migration automatique** depuis la v2.
5. **Carte de partage en canvas** : fonction « virale » discrète et bien finie (partage natif → copie → téléchargement).
6. **Fail-safe partout** : `loadEvents` ne casse jamais le tirage, l'archivage est idempotent.
7. **`docs/CHANGELOG_GUIDE.md`** : ton éditorial défini (tutoiement, zéro jargon, « Note de Diamant »). À garder tel quel : c'est l'âme du projet.
8. **TypeScript `strict`** activé, 0 erreur de typage ; Svelte 5 runes utilisées correctement dans l'ensemble.
9. **Stratégie de cache images bien pensée** (images hors précache, `CacheFirst` à la demande, pré-cache seulement en connexion non limitée).
10. **Documentation existante honnête** (README clair, disclaimer, remerciement à Claude Code).

---

## 8. Décisions de Diamant (5 octobre 2026) et questions restantes

### 8.1 Réponses aux 8 questions de l'audit

| # | Question | Réponse | Conséquence |
|---|---|---|---|
| 1 | Garder Svelte 5 + Vite + PWA ? | **Non** : reconstruction **de zéro en TypeScript/JavaScript pur**, sans moteur de rendu. On garde **Vite et la PWA**. | Plus de Svelte. On écrit nous-mêmes quelques briques (DOM, store, routeur, i18n). → `REBUILD_PLAN.md` §2 |
| 2 | Origine des images ? | Prises sur un GitHub ; beaucoup de formes et de Pokémon manquants ; **pas la volonté de tout re-récupérer à la main** | Solution automatisée (script). → §8.2 et `REBUILD_PLAN.md` §4 |
| 3 | Repartir d'un dépôt propre ? | **Oui** | Fait en dernier, avec confirmation (destructif). → `REBUILD_PLAN.md` §8 |
| 4 | Jour local ? | **Oui**, minuit heure locale | Corrige A7 ; clé de jour `YYYY-MM-DD` locale |
| 5 | Données existantes ? | « 3 à 5 utilisateurs » : **on peut tout écraser** | **Aucune migration** (code plus simple) ; prévenir via la Note de Diamant |
| 6 | Langues ? | **Français + anglais** | i18n à deux langues, clés typées |
| 7 | Mode développeur ? | **Gardé** : « partie intégrante du système » | Reste dans la v4, pour tout le monde |
| 8 | Monétisation ? | **Jamais** : projet fun entre amis | Principe non négociable (aussi dans `AGENTS.md`) : ni pub, ni achat, ni suivi |

### 8.2 Ce que l'audit a mesuré sur les images (réponse à « formes et Pokémon manquants »)

- **Ton dossier actuel** : 1025/1025 images normales ✅ et 1024/1025 shiny ✅ (il manque seulement `774S.png`). Pour les *espèces*, il ne manque donc presque rien. Ce qui manque massivement, ce sont les **formes** (Alola, Galar, Méga…) : le dossier n'en contient **aucune** (seuls les ids ≤ 1025 existent).
- **PokéAPI** compte **1 351** entrées « pokémon » : **1 025 espèces + 326 formes** (ids `10001`–`10326`) ✅ ([API](https://pokeapi.co/api/v2/pokemon?limit=1)).
- **Source `PokeAPI/sprites`, rendus Home 512×512** : sur 1 351 × 2 (normal + shiny) = **2 700 fichiers testés** ✅ (requêtes HEAD), **2 661 existent** ; les **39 absents sont tous des formes**. **Aucune image d'espèce 1–1025 ne manque** (le shiny de Minior existe chez eux).
- **Pokémon DB** (suggéré par Diamant) : grande collection, mais sprites Home en 128 px (256 px au maximum), noms au lieu d'identifiants, `Crawl-delay: 2` et hotlinking déconseillé ✅ → pas adapté comme source automatique ; voir `REBUILD_PLAN.md` §4.2 bis.
- **Conclusion** : un **script automatique** peut reconstituer l'ensemble complet sans aucune manipulation manuelle. Détail et options : `REBUILD_PLAN.md` §4.

### 8.3 Deuxième série de réponses (5 octobre 2026)

| # | Question | Réponse | Conséquence |
|---|---|---|---|
| 9 | Formes dans le tirage et le Pokédex ? | **Oui, on veut des formes alternatives** | 326 formes à trier par catégorie ; `forms.json`. → `REBUILD_PLAN.md` §4.4 |
| 10 | Dépôt propre : nouveau dépôt ou branche vide ? | **Branche vide** | Branche orpheline, bascule en dernier. → `REBUILD_PLAN.md` §8 |
| 11 | Images générées au build, 256 ou 512 px ? | « Pourquoi pas, à voir comment ça rend » | Option B retenue ; taille tranchée **après un essai visuel** en phase 2 |
| 12 | Essai « sans framework » ? | **Oui** | Démarrage par l'écran « carte du jour » |
| 13 | Ancienne base de données ? | **On la supprime** | Routine de nettoyage au 1ᵉʳ lancement v4 (avec garde-fous). → `REBUILD_PLAN.md` §5 |
| 14 | Export/import de la collection ? | **Tôt** | Phase 4 |

### 8.4 Ce que l'audit a mesuré sur les formes

- PokéAPI : **326 formes**, soit 97 Méga, 34 Gigamax, 60 régionales (Alola 20, Galar 20, Hisui 16, Paldea 4), 2 Primo, 11 Totem, 14 Pikachu à casquettes/costumes et **108 « autres »** (états de combat, genres, tailles, couleurs…) ✅ (comptage sur les noms).
- Les **39 images absentes** de la source concernent : costumes et casquettes de Pikachu, Pikachu et Évoli « partenaires », modes de Koraidon/Miraidon ✅.
- Restent ouvertes : **quelles** formes activer, comment les compter, à quelle fréquence → `REBUILD_PLAN.md` §10.

---

## 9. Méthode et limites de cet audit

**Ce que j'ai fait** : lecture intégrale des 5 scripts, du service worker, du `App.svelte` et des 13 composants (code + markup) ; lecture de toute la config et de la doc ; analyse de l'historique git (63 commits) ; exécution de `pnpm install`, `pnpm check`, `pnpm build`, `pnpm audit`, `pnpm outdated` ; scripts d'expérience (couverture des 2 050 images, comptes à rebours des événements sur dates simulées, simulation Monte-Carlo du boost, mesure WebP, vérification de 2 700 URL de la source d'images `PokeAPI/sprites`, comptage des Pokémon/formes dans PokéAPI) ; recherches web pour sourcer les points PokéAPI et propriété intellectuelle.

**Ce que je n'ai PAS pu faire** :
- Lancer l'app dans un navigateur et la tester visuellement (le rendu, l'animation et le partage canvas sont jugés **à la lecture du code**, pas à l'écran).
- Appeler PokéAPI en conditions réelles (réseau du bac à sable restreint) : le comportement « API en panne » est déduit du code.
- Tester sur iPhone/Safari réel (A11, quotas de stockage), avec un lecteur d'écran, ou avec de vraies données v2 pour la migration.
- Mesurer les contrastes de couleurs ou lancer Lighthouse.

**Sources web utilisées** : [PokeAPI/sprites](https://github.com/PokeAPI/sprites) (contenu, `LICENCE.txt`) · [PokéAPI — documentation et politique d'usage équitable](https://pokeapi.co/docs/v2) · [The Pokémon Company International — Media Usage Guidelines](https://pokemon.gamespress.com/Media-Usage-Guidelines) · [MDN — BeforeInstallPromptEvent](https://developer.mozilla.org/en-US/docs/Web/API/BeforeInstallPromptEvent).
