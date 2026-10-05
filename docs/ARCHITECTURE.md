# Architecture actuelle de Pokédaily (v3.1)

> Document **descriptif** : il explique comment l'application fonctionne **aujourd'hui** (commit `b4ba73c`), pour qu'on puisse la reconstruire sans rien oublier. Ce n'est pas la cible : pour la cible, voir [`REBUILD_PLAN.md`](REBUILD_PLAN.md). Les problèmes sont listés dans [`AUDIT.md`](AUDIT.md) et référencés ici par leur code (B-3, A2…).

---

## 1. Vue d'ensemble

Pokédaily est une **application web à page unique (SPA)**, **sans serveur à nous** : tout tourne dans le navigateur.

```
┌──────────────────────────── Navigateur ────────────────────────────┐
│                                                                    │
│  index.html → main.ts → App.svelte (coquille)                      │
│                          │                                         │
│        ┌─────────────────┼──────────────────────────┐              │
│        │ vues (hash)     │ popups                   │ PWA          │
│  PokemonCard  History    EventBanner  Changelog     InstallBanner  │
│  Stats  Pokedex  Pokekit DevPanel                   badges cache   │
│                  ├─ TeamOfMonth                                    │
│                  ├─ VRoulette                                      │
│                  └─ EventsCalendar                                 │
│        │                                                           │
│        ▼                                                           │
│  lib/scripts : script.ts ─ events.ts ─ db.ts ─ pokeAPI.ts          │
│                    │            │         │          │             │
│                    │            │         ▼          ▼             │
│                    │            │    IndexedDB    pokeapi.co ──► (réseau)
│                    │            ▼                                  │
│                    │       /events.json (fetch)                    │
│                    ▼                                               │
│            localStorage / sessionStorage (3 clés, voir §6)         │
│                                                                    │
│  Service Worker (sw.ts) : précache du shell + cache des images     │
└────────────────────────────────────────────────────────────────────┘
```

Fournisseurs externes : **PokéAPI** (noms, types, natures), **Google Fonts** (police Roboto Condensed). Hébergement : Vercel (statique).

---

## 2. Séquence de démarrage

1. `main.ts` importe `app.css` et monte `App.svelte` sur `#app`.
2. `App.svelte` :
   - lit `window.location.hash` pour choisir la vue initiale (`#history`, `#pokedex`, `#stats`, `#pokekit` ; défaut : carte du jour) ;
   - appelle `script()` dans `onMount` → résultat stocké dans `data` (`AppData`) ;
   - enregistre le Service Worker `/sw.js` (en plus de `registerSW.js` injecté par le plugin, A9) et les écouteurs `beforeinstallprompt`, `appinstalled`, `online/offline`, raccourci `Ctrl/Cmd+Shift+C`.
3. Pendant `script()` : écran « Chargement… » ; une erreur `offline-no-data` donne l'écran « Hors ligne ».
4. Quand `data` est prêt, la vue active reçoit `data` en props.

### Que fait `script()` (le cœur, `script.ts`)

```
openDB()
 └─ si localStorage['data'] existe → migrateFromLocalStorage()  (v2 → v3, une seule fois)
loadEvents()  ← fetch('/events.json'), mis en cache mémoire ; [] si échec
 └─ activeEvents / nextEvent / upcomingEvents(7 j)   (date « maintenant », en UTC)
state = getState()   todayEntry = getTodayEntry()
dateNow = début du jour UTC (ms)
shouldRefresh = (dateNow - state.lastDate ≥ 24 h) ET navigator.onLine
 ├─ NON → si todayEntry : renvoie les données stockées ; sinon : throw 'offline-no-data'
 └─ OUI → nouveau tirage :
      1. archive todayEntry dans history
      2. id  = localStorage['_devNextId'] (mode dev) sinon aléatoire 1..1025
         shiny = Math.random() < 1/69 ; niveau = 1..99
      3. applyEventModifiers(activeEvents, {id, shiny, level})
      4. nature aléatoire 1..25
      5. PokéAPI : pokémon + espèce + nature, puis les types (4–5 requêtes)
      6. construit PokemonEntry (noms FR/EN, types…), sauvegarde today
      7. met à jour pokedex / shinydex / lastDate (state)
      8. tickets Victini (+1 si id=494 ; + événements ; boîtes Lucky Day / Poisson d'avril)
      9. sessionStorage['done']='0' ; renvoie AppData
```

---

## 3. Modèle de données (IndexedDB)

Base **`pokedaily`**, **version 1**, 3 *object stores* :

| Store | Clé | Contenu |
|---|---|---|
| `state` | `k` (texte) | Magasin clé/valeur générique (voir ci-dessous) |
| `today` | `k` (= `'entry'`) | Une seule ligne : le Pokémon du jour (`PokemonEntry` + `k`) |
| `history` | `date` (ms UTC du jour) | Un `PokemonEntry` par jour passé |

Clés du store `state` (chaque ligne = `{ k, v }`) :

| `k` | `v` | Écrit par |
|---|---|---|
| `lastDate` | nombre (ms UTC du dernier tirage) | `script.ts`, DevPanel (remis à 0 pour forcer un tirage) |
| `pokedex` | `number[]` (IDs uniques déjà obtenus) | `script.ts`, VRoulette, TeamOfMonth, DevPanel |
| `shinydex` | `number[]` | idem |
| `victiniTickets` | nombre | `script.ts`, VRoulette, DevPanel |
| `monthlyTeam` | `{ month: 'YYYY-MM', pokemon: PokemonEntry[6] }` | TeamOfMonth |
| `vrouletteState` | `{ month, boxes: number[3][16], boostedId, firstTimeClaimed }` | VRoulette |
| `luckyDayBox` | `{ date, box: number[16], shinySlots? }` | `script.ts` (jamais relue avec sa date : B-3) |

`PokemonEntry` (type exporté par `db.ts`) :

```ts
{ id, natureId, level, isShiny, rename, date,        // données « vraies »
  nameFr, nameEn, natureFr, natureEn,                // noms mis en cache (dénormalisé : A4)
  types: string[], typeNamesFr: string[], typeNamesEn: string[] }
```

Autres stockages navigateur :

| Où | Clé | Rôle |
|---|---|---|
| `localStorage` | `data` | **Ancien** format v2 ; lu une fois pour migration puis supprimé |
| `localStorage` | `_devNextId` | Mode dev : ID à forcer au prochain tirage (consommé puis supprimé) |
| `sessionStorage` | `done` | Astuce d'animation « premier chargement de la session » |
| Cache Storage | `pokemon-images-v1` | Images (service worker) |
| Cache Storage | caches Workbox | Shell (HTML/JS/CSS/manifeste/icônes) |

---

## 4. Moteur d'événements (`events.ts` + `public/events.json`)

### 4.1 Types d'événements (`type`)

| `type` | Champs | Actif quand… | Exemple |
|---|---|---|---|
| `date_range` | `startDate`, `endDate` (`YYYY-MM-DD`, **année incluse**) | la date UTC du jour est dans l'intervalle | Pokopia (mars 2026) |
| `recurring_date` | `month`, `day` | chaque année ce jour-là | 1ᵉʳ avril, Noël, Halloween… |
| `recurring_dates` | `dates: [{month, day}]` | chaque année à l'une de ces dates | Changement de saison, GO Fest |
| `recurring_weekday_date` | `weekday` (0=dim … 5=ven), `day` | quand le jour du mois ET le jour de semaine correspondent | Vendredi 13 |
| `date_range_weekday` | `startDate`, `endDate`, `weekday` | dans l'intervalle ET le bon jour de semaine | Dimanches de mars 2026 |

### 4.2 Modificateurs (`modifiers`)

| Champ | Effet |
|---|---|
| `forcedPokemonId` + `forcedPokemonChance` (0–1) | Avec cette probabilité, l'ID tiré est remplacé |
| `forcedPokemonIds[]` + `forcedPokemonChance` | idem, ID choisi au hasard dans la liste |
| `forcedShiny` | shiny garanti |
| `shinyRate` | shiny avec probabilité `1/shinyRate` (**remplace** le 1/69) |
| `forcedLevel` | niveau imposé |
| `victiniTicketsMin/Max` | tickets Victini accordés (tirage uniforme entre min et max) |
| `luckyDayBox` | génère la boîte PC Vendredi 13 (13 aléatoires + 3 Victini) |
| `aprilFoolsBox` | génère la boîte Poisson d'avril (10 Magicarpe, 3 Léviator, dont 3 cases shiny garanties) |

**Règles d'empilement** (quand plusieurs événements sont actifs le même jour, ex. Pokopia + Dimanche V-Roulette) : `applyEventModifiers` les applique **dans l'ordre du fichier**, chacun pouvant écraser le résultat du précédent (dernier gagnant). Les boîtes spéciales écrasent la clé unique `luckyDayBox`.

### 4.3 Les 12 événements actuels

| id | Quand | Effet principal |
|---|---|---|
| `pokopia_2026` | 1–31 mars 2026 (ponctuel) | Métamorph 10 %, shiny 1/30 |
| `april_fools` | 1ᵉʳ avril | Magicarpe 100 %, shiny 1/100, 1 ticket, boîte spéciale |
| `pokemon_day` | 27 février | Pikachu 10 %, shiny garanti |
| `diamant_day` | 18 novembre | shiny garanti, niveau 69 |
| `season_change` | 20/3, 21/6, 22/9, 21/12 | Vivaldaim/Haydaim 20 % |
| `christmas` | 25 décembre | Cadoizo 100 %, shiny 1/50 |
| `halloween` | 31 octobre | 24 Pokémon spectraux 30 %, shiny 1/30 |
| `valentine` | 14 février | 30 Pokémon Fée/cœur 50 %, shiny 1/30 |
| `new_year` | 1ᵉʳ janvier | niveau 100, shiny 1/50 |
| `go_fest` | 14–15 juin (dates **fixes**, ❓ factices) | shiny 1/30 |
| `lucky_day` | Vendredi 13 | shiny 1/13, 1–3 tickets, boîte Lucky Day |
| `victini_launch_march_2026` | dimanches de mars 2026 | Victini 5 % |

Les textes FR/EN, les noms et descriptions sont dans le JSON (`nameFr`, `descriptionEn`…).

### 4.4 Calculs de dates

Tout est en **UTC** (`getUTC*`). `getNextEvent` / `getUpcomingEvents` calculent le nombre de jours jusqu'à la prochaine occurrence (balayage jusqu'à 365 jours pour les types « weekday »). **Limite connue (B-4)** : les `date_range` sont considérés comme annuels pour le compte à rebours alors que leurs dates incluent l'année.

---

## 5. V-Roulette et Team du mois (Pokékit)

**Tickets Victini** — gagnés : en tirant Victini (#494) comme Pokémon du jour ; par certains événements ; **+1 au tout premier passage dans la V-Roulette**. Dépensés : 1 ticket par tour.

**V-Roulette** (`VRoulette.svelte`) :
1. Au montage : bonus du premier passage, **génération des 3 boîtes du mois** si le mois a changé (PRNG `mulberry32`, graine = chaîne `YYYY-MM` → **identiques pour tous les joueurs** ce mois-là), lecture de la boîte spéciale éventuelle.
2. Le joueur choisit une boîte (verrouillée ensuite), peut « booster » un Pokémon de la boîte (annoncé 1/4, réel ≈ 29,7 % : B-5).
3. Tour : animation sur la grille 4×4 (sauts aléatoires qui ralentissent), résultat tiré avant l'animation ; le ticket est débité, **le nouveau Pokémon remplace** celui du jour (nature/niveau aléatoires, shiny 1/69 ou garanti sur les cases shiny), Pokédex mis à jour. Il faut **recharger la page** pour tout resynchroniser (B-7).

**Team du mois** (`TeamOfMonth.svelte`) : 6 IDs distincts tirés au hasard par mois (mois **local**), stockés dans `monthlyTeam`, ajoutés au Pokédex/Shinydex, non affectés par les événements.

---

## 6. PWA et hors-ligne

| Élément | Fonctionnement |
|---|---|
| `vite-plugin-pwa` (stratégie `injectManifest`) | compile `src/sw.ts` en `dist/sw.js` et y injecte la liste du shell |
| Précache (shell) | `**/*.{js,css,html,ico,woff2,svg,webp}` hors `images/` → 8 fichiers, 284 Ko. ⚠️ `events.json` et `*.png` hors images non inclus (A10) |
| Images | route `CacheFirst` sur `/images/*` (cache `pokemon-images-v1`) : à la 1ʳᵉ vue |
| Pré-cache total | message `PRECACHE_IMAGES` → 2 050 images par lots de 15, avec messages de progression (`PRECACHE_PROGRESS`/`COMPLETE`). Déclenché **uniquement** à l'événement `appinstalled` et seulement si `isUnlimitedConnection()` (A11) |
| Mise à jour | nouvelle version détectée → `SKIP_WAITING` + rechargement automatique (A9) |
| Manifeste | nom « Pokédex Daily », `standalone`, portrait, icônes 192/512 |
| Mode dev | `devOptions.enabled: true` → le SW tourne aussi en `pnpm dev` |

Règle de rafraîchissement hors-ligne : si l'appareil est hors-ligne, l'app **affiche le dernier Pokémon** sans tirer ; sans aucune donnée → écran « Hors ligne ».

---

## 7. Interface

### 7.1 Navigation

Barre du bas à 5 entrées : **Historique · Stats · (Pokémon du jour, bouton central) · Pokédex · Pokékit**. Routage par `location.hash` (pas de routeur) ; **pas d'écoute de `hashchange`** (B-6). `Pokekit` a sa propre sous-navigation interne (menu → Team / V-Roulette / Événements) non reflétée dans l'URL.

### 7.2 Composants (rôle · entrées principales)

| Composant | Rôle | Reçoit |
|---|---|---|
| `App.svelte` | Coquille, routage, PWA, raccourci dev | — |
| `PokemonCard` | Carte du jour, renommage, partage/copie (canvas) | `data` |
| `History` | Calendrier mensuel, détail d'un jour | `data` (+ recharge `events.json`) |
| `Stats` | Statistiques calculées (`$derived`) | `data` |
| `Pokedex` | Grille 1 025 + onglet Shinydex | `data` |
| `Pokekit` | Menu secondaire | `data`, `onreload` |
| `TeamOfMonth`, `VRoulette`, `EventsCalendar` | Sous-vues du Pokékit | `data` (+ IndexedDB en direct) |
| `EventBanner` | Pastille d'événement + popup (barre du haut) | `activeEvents`, `upcomingEvents` |
| `Changelog` | Popup des notes de version (texte en dur) | `onclose` |
| `InstallBanner` | Invitation à installer la PWA | callbacks |
| `DevPanel` | Outils de triche/diagnostic | `onclose`, `onreload` |

### 7.3 Style

`app.css` : variables de design (`--bg-main #0f0f1a`, `--accent #9b4dca`, `--shiny-color #ffd700`, `--card-radius 20px`, police `Roboto Condensed`) + classes `.type-*` + animations (`spin`, `pulse-glow`, `shiny-sparkle`, `fadeSlideUp`). Chaque composant a son CSS scopé. Thème **sombre uniquement**.

### 7.4 Langue

`getUserLang()` : paramètre d'URL `?lang=fr|en`, sinon 2 premières lettres de `navigator.language`, sinon `en`. Chaque composant appelle la fonction et écrit ses textes avec `lang === 'fr' ? … : …`.

---

## 8. Mode développeur (`Ctrl/Cmd+Shift+C`)

Panneau pour : modifier niveau/shiny/surnom du jour ; forcer un nouveau tirage (aléatoire ou ID donné, via `_devNextId` + `lastDate = 0` puis rechargement) ; ajouter/retirer des tickets ; **générer 1–30 jours d'historique aléatoire** (via PokéAPI, ignore les événements) ; supprimer des entrées ; vider l'historique ; reset total. Utile pour tester : **à conserver en dev** dans la reconstruction.

---

## 9. Build, scripts et déploiement

| Commande | Effet |
|---|---|
| `pnpm dev` | Vite avec `--host` (accessible sur le réseau local) |
| `pnpm build` | Build de production → `dist/` (JS, CSS, `sw.js`, manifeste) |
| `pnpm preview` | Sert `dist/` |
| `pnpm check` | `svelte-check` (typage Svelte + TS) |

Pas de `lint`, `test`, `format`. Pas de CI. Déploiement : poussé sur la branche par défaut → Vercel (❓ à confirmer côté tableau de bord Vercel, rien n'est versionné).

---

## 10. Dépendances entre fichiers (qui importe qui)

```
App ─► script.ts ─► db.ts, events.ts, pokeAPI.ts ─► pokenode-ts
App ─► connection.ts
composants ─► script.ts (types, getUserLang, getPokemonImagePath, setRename)
VRoulette, TeamOfMonth, DevPanel ─► db.ts (direct) + pokeAPI.ts (direct)   ← court-circuitent script.ts (A.1, A2)
History, EventsCalendar ─► events.ts
sw.ts ─► workbox-* (indépendant du reste ; constante 1025 dupliquée)
```
