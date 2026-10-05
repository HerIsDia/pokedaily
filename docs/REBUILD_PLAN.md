# Plan de reconstruction — Pokédaily v4

> Mis à jour le 5 octobre 2026 avec les **décisions de Diamant** (§0). Le reste reste des *recommandations argumentées* : les points encore ouverts sont listés au §10.
> Contexte : [`AUDIT.md`](AUDIT.md) (problèmes de la v3.1) · [`ARCHITECTURE.md`](ARCHITECTURE.md) (fonctionnement de la v3.1).

---

## 0. Décisions actées

| Sujet | Décision |
|---|---|
| Technologie | **Reconstruction de zéro en TypeScript/JavaScript pur**, sans moteur de rendu (donc **ni Svelte, ni React, ni équivalent**). On **garde Vite et la PWA**. |
| Essai « sans framework » | **Validé** : on commence par l'écran « carte du jour » (§2.3). |
| Formes alternatives | **Toutes, sans aucune exception** (les 326 de PokéAPI). |
| Tirage des formes | **Pourcentage progressif** : 1 % par défaut, +1 % par jour sans forme, retour à 1 % dès qu'une forme sort (§4.5). |
| Pokédex | **Séparé** : 1 025 espèces + un onglet « Formes » (validé). |
| Noms français des formes | Pris dans **PokéAPI** (326/326 vérifiés, §4.4). Pokémon DB ne fournit que les noms d'**espèces**. |
| Images | **`PokeAPI/sprites` avec chaîne de repli** (Pokémon DB essayé : il ne comble rien, §4.2 bis). Générées au build, non commitées. **Tailles décidées : 512 px (carte, partage) + 128 px (grilles)**. **Images de repli 2D : gardées** (« toutes les formes, sans exception »). |
| Dépôt | **Branche vide nommée `v4`** dans le même dépôt. Copie de sauvegarde de la v3.1 **déjà faite par Diamant**. La bascule (suppression de l'ancien) reste en dernier, avec confirmation. |
| Changement de jour | **Minuit heure locale** de chaque joueur. |
| Données existantes | 3 à 5 utilisateurs : **aucune migration**. L'ancienne base est **supprimée** au premier lancement de la v4 (§5). |
| Export / import de la collection | **Tôt** (phase 4). |
| Langues | **Français + anglais**, pas d'autre. |
| Mode développeur | **Conservé**, pour tout le monde : « il fait partie intégrante du système ». |
| Monétisation | **Jamais** : ni pub, ni achat, ni statistiques de suivi. Projet fun entre amis. |

---

## 1. Principes

1. **Zéro dépendance de rendu.** On écrit le DOM avec du TypeScript standard (voir §2). Le code doit pouvoir se lire sans connaître un framework.
2. **Local d'abord, hors-ligne d'abord** : aucun serveur à nous, aucun compte ; après la 1ʳᵉ visite plus aucune requête n'est nécessaire pour jouer.
3. **Aucun suivi** : pas d'analytics, pas de polices distantes, pas de service tiers qui voit les joueurs. (Cohérent avec « jamais monétisé » ; à écrire noir sur blanc dans le README.)
4. **Une seule source de vérité** pour l'état, **une seule fonction** pour fabriquer un Pokémon.
5. **La logique pure est testée** (tirage, événements, dates) ; l'interface est fine.
6. **Les contenus sont des données** (événements, textes, changelog), pas du code.
7. **Petites étapes livrables**, chacune vérifiable (`check`, tests, build), relisibles en langage clair.
8. **L'ancienne app reste en ligne** jusqu'à la parité fonctionnelle (§7).

---

## 2. Construire l'interface sans framework : l'approche proposée

> Honnêteté : sans framework, **on écrit et on maintient à la main ce que Svelte faisait pour nous** (mise à jour de l'écran quand les données changent, échappement du texte, organisation du CSS). C'est faisable à cette taille (l'app v3.1 = 6 750 lignes, dont 52 % de CSS) et le gain est réel : **aucune dépendance de rendu, aucune montée de version imposée, un code qu'on comprend en entier**. Mais le coût est réel aussi : plus de code « de plomberie » et plus de discipline. C'est pourquoi je propose de **valider l'approche par un petit essai** (§6, phase 1) avant de construire le reste.

### 2.1 Les 4 briques maison (≈ 300 lignes au total, à écrire et tester)

| Brique | Rôle | Idée |
|---|---|---|
| `ui/dom.ts` | Créer des éléments : `h('div', { class: 'card' }, enfants…)` | Le texte passe **toujours** par `textContent` (jamais `innerHTML` avec une donnée du joueur) → pas de faille XSS, y compris pour le surnom |
| `ui/store.ts` | Petit store réactif : `get()`, `set()`, `subscribe()` | Remplace `data` + `window.location.reload()` (bug B-7) |
| `ui/router.ts` | Routage par hash **avec** `hashchange` | Corrige B-6 |
| `i18n/` | `t('card.level')` typé : le compilateur **refuse** une clé présente en FR mais pas en EN | Fin des `lang === 'fr' ? … : …` |

### 2.2 Organisation des vues

- Une vue = **une fonction** `renderX(ctx): HTMLElement` ; une mise à jour = on **abonne** la partie concernée au store, on ne reconstruit pas toute la page.
- Pour les gros blocs réutilisables (fenêtres modales), on peut utiliser les **Custom Elements natifs** du navigateur (standard web, aucune lib).
- **CSS** : un fichier par fonctionnalité, classes préfixées (`card-…`, `roulette-…`), variables communes dans `ui/tokens.css`. Une seule feuille pour les **couleurs de types** (aujourd'hui dupliquées 3 fois, D-3) et **une seule Modal** (D-10).

### 2.3 Critères de réussite de l'essai (spike)

Reconstruire **l'écran « carte du jour »** (affichage, renommage, changement de langue ; le **partage en image** est reporté en phase 5, car il ne dépend pas du choix framework ou pas) et vérifier : (1) code lisible ; (2) renommage sans perte de focus ni de défilement ; (3) aucun `innerHTML` avec une donnée utilisateur ; (4) changement de langue sans rechargement ; (5) < ~300 lignes de plomberie. Si un critère échoue, on en discute **avant** d'aller plus loin (autre option : Custom Elements partout).

### 2.4 Résultat de l'essai « carte du jour » (5 oct. 2026) ✅

L'essai a été réalisé sur la branche `v4` (code : `src/ui/`, `src/i18n/`, `src/features/card/`). **Verdict : l'approche sans framework est viable à cette échelle** ; voici ce qui a été mesuré, critère par critère :

| Critère | Résultat |
|---|---|
| 1. Code lisible | ✅ Une vue = une fonction ; la structure est construite une fois, seuls les textes/attributs sont « liés » à des états. `card.ts` : 192 lignes non vides pour tout l'écran. *(Jugement subjectif : à relire par toi.)* |
| 2. Renommage sans perte de focus | ✅ **avec une nuance.** Le champ n'est jamais recréé : un changement de langue ou de données **par le code** conserve le nœud, le focus et la saisie (test automatique). Mais dans un vrai navigateur, **cliquer sur le bouton de langue retire le focus du champ**, ce qui **valide le surnom** (même comportement que la v3) : c'est le fonctionnement normal d'un clic, pas un défaut. |
| 3. Aucun `innerHTML` avec une donnée utilisateur | ✅ **Imposé par une règle ESLint** (vérifiée : elle échoue bien sur un fichier de test volontairement fautif) + `h()` n'utilise que des nœuds texte. Surnom hostile `<img onerror=…>` testé dans les tests ET dans Chromium : rien ne s'exécute. |
| 4. Changement de langue sans rechargement | ✅ Testé en test unitaire et dans Chromium ; `<html lang>` suit la langue ; le choix est mémorisé après rechargement. |
| 5. Moins de ~300 lignes de plomberie | ✅ **285 lignes** (DOM 102, routeur 66, i18n 54, état 43, nettoyage 20), hors commentaires et lignes vides. C'est **proche de la limite** et ça ne comprend pas encore les fenêtres modales ni les listes longues. |

**Vérifié aussi** dans un vrai Chromium (24 contrôles) : bouton « retour/avancer » du navigateur (bug B-6 de la v3 corrigé), image absente → repère « ? » au lieu d'une image cassée, **aucune requête vers un site externe**, service worker actif et **application qui se charge hors-ligne**, manifeste PWA.
**Le contrôle visuel a trouvé 2 défauts** que les tests ne voyaient pas (en-tête qui débordait sur mobile ; couleur du type écrasée par une règle CSS), tous deux corrigés.
**Chiffres** : JavaScript 10,9 Ko (4,6 Ko compressé) pour 1 écran + À propos, contre 218,7 Ko pour la v3.1 entière : **non comparable tant que les autres écrans n'existent pas**.
**Non testé** : iPhone/Safari réel, lecteur d'écran, déroulement sur plusieurs jours. **Non encore fait** : partage en image (phase 5), persistance des données (phase 4).
**Coût réel constaté** : on réécrit à la main des choses que Svelte donnait gratuitement (ex. `bindAttr` pour les attributs booléens, `bindChildren` pour les listes) et il faut de la discipline (écrire `data-shiny` présent/absent plutôt que `'true'`). C'est le prix de « zéro dépendance de rendu », que tu as choisi.

---

## 3. Architecture cible

```
index.html
vite.config.ts                  Vite + PWA (injectManifest) — conservés
src/
├── main.ts                     point d'entrée : charge, monte, enregistre le SW
├── app/                        coquille : barre du bas, vues, popups globales
├── core/                       ⭐ logique pure, SANS navigateur → testable
│   ├── constants.ts            DEX_SIZE, SHINY_RATE, LEVEL_MIN/MAX, VICTINI_ID…
│   ├── rng.ts                  aléatoire injectable (Math.random en prod, graine en test)
│   ├── dates.ts                UNE convention : jour local au format 'YYYY-MM-DD'
│   ├── pokemon.ts              createEntry(id, opts) ← remplace les 5 copies
│   ├── draw.ts                 tirage du jour = pokemon + événements
│   └── events/                 moteur d'événements (schéma validé, once/yearly)
├── data/                       GÉNÉRÉ par script (voir §4) — pas écrit à la main
│   ├── dex.json                id → { fr, en, types[], speciesId… }
│   ├── natures.json            25 natures FR/EN
│   └── events.json            (existant, enrichi)
├── storage/
│   ├── schema.ts               types persistés + version
│   └── repository.ts           API unique (getToday, saveDraw, addTickets…) en TRANSACTIONS
├── state/store.ts              état global (vues abonnées)
├── i18n/                       fr.ts, en.ts, index.ts
├── features/                   un dossier par fonctionnalité (vue + logique + css)
│   └── card/ history/ stats/ pokedex/ roulette/ team/ events/ changelog/ dev/
├── pwa/                        sw.ts, register.ts (UNE seule inscription)
└── ui/                         dom.ts, store.ts, router.ts, modal.ts, tokens.css, types.css
scripts/
├── build-dex.ts                PokéAPI → data/dex.json (UNE fois, hors navigateur)
└── sync-sprites.ts             PokeAPI/sprites → public/sprites/*.webp (voir §4)
tests/                          Vitest (core + storage via fake-indexeddb)
.github/workflows/ci.yml        install → check → test → build
```

### Choix techniques recommandés

| Sujet | Recommandation | Pourquoi |
|---|---|---|
| Données Pokémon | **Fichier embarqué** généré par script ; **plus d'appel PokéAPI** à l'exécution | Hors-ligne total, plus d'`axios`/`pokenode-ts` (−36 alertes prod), respecte la [politique de cache de PokéAPI](https://pokeapi.co/docs/v2), tirage instantané |
| Modèle d'entrée | Stocker seulement `id, natureId, level, isShiny, day, rename` ; noms résolus à l'affichage | Zéro migration pour corriger un nom |
| Stockage | IndexedDB avec **vrais stores** + **transactions** ; nouvelle base (pas de lecture de l'ancienne) | Atomicité (A5) |
| Jour | Clé `'YYYY-MM-DD'` **locale** ; événements évalués sur cette même date | Décision « minuit local » ; plus de mélange UTC/local (A7) |
| Tests | **Vitest** (`core/`, `storage/`) ; 1–2 parcours Playwright plus tard | Filet de sécurité |
| Qualité | `tsc --noEmit` strict + **ESLint + Prettier** (ou Biome ❓) | Cohérence |
| CI | GitHub Actions + Dependabot | Fin des régressions silencieuses |
| Police | Auto-hébergée (`@fontsource/roboto-condensed`) | Hors-ligne + vie privée |
| Version | Une source (`package.json`) injectée au build (`__APP_VERSION__`) | D-7 |
| Changelog | `changelog.json` lu par l'app **et** utilisé pour générer `CHANGELOG.md` (la note de Diamant y reste **sa** voix) | D-4 |

---

## 4. Images : la solution automatisée

### 4.1 Ce que j'ai mesuré (5 oct. 2026)

- Ton dossier actuel contient **1025/1025** images normales et **1024/1025** shiny (il manque seulement `774S`). Pour les **espèces**, il ne manque donc presque rien ; ce qui manque massivement, ce sont les **formes** (Alola, Galar, Méga, etc.) : ton dossier n'en contient **aucune**.
- PokéAPI compte **1 351** entrées « pokémon » = **1 025 espèces + 326 formes** (identifiants `10001` à `10326`).
- Le dépôt **[`PokeAPI/sprites`](https://github.com/PokeAPI/sprites)** propose des rendus **Home 512×512** (`sprites/pokemon/other/home/`, et `shiny/`) : même taille que tes images, donc très probablement leur source (❓ non prouvée : je n'ai pas comparé visuellement).
- Test sur **2 700 fichiers** (1 351 × normal + shiny) : **2 661 existent**. Les **39 absents sont tous des formes**. **Aucune des 2 050 images d'espèces ne manque** (y compris le shiny de Minior).
- Leur `LICENCE.txt` dit : *« All image contents within are Copyright The Pokémon Company. This repository is distributed under CC0 »* → le CC0 couvre la structure du dépôt, **pas les images**.

### 4.2 Les options (et ma recommandation)

| Option | Principe | Avantages | Inconvénients |
|---|---|---|---|
| **B — Générer au build (recommandée)** | Un script télécharge, convertit en WebP et écrit dans `public/sprites/`, **non commité** ; lancé automatiquement avant le build | Dépôt léger, **zéro manipulation manuelle**, reproductible (commit source épinglé), mise à jour = relancer | Le build dépend de GitHub (un échec **fait échouer le build visiblement**, jamais en silence) ; build un peu plus long |
| A — Commiter les WebP | Le script tourne en local, on commit le résultat | Simple, build sans réseau | Redevient lourd (~30–40 Mo, ❓ extrapolé), l'historique regonfle à chaque régénération |
| C — Lien direct vers un CDN (jsDelivr/raw GitHub) | L'app charge les images chez eux, le SW les met en cache | Aucun hébergement | Dépendance externe en direct, ❓ limites et conditions de jsDelivr non vérifiées, 1ʳᵉ visite hors-ligne impossible |
| D — Stockage d'objets (R2, Blob…) | On héberge les fichiers ailleurs | Léger | Un service + un compte de plus à gérer |

### 4.2 bis Et la source Pokémon DB ? (vérifié le 5 oct. 2026)

Diamant a signalé que [Pokémon DB](https://pokemondb.net/sprites) possède une très grande collection de sprites. C'est vrai : toutes les générations (Gen 1 à 9), normal et shiny, formes, dos, et même **plus de 100 costumes Pokémon GO** pour Pikachu seul ✅. Mais pour **notre usage principal** (alimenter l'app automatiquement), ce n'est pas la bonne source :

| Critère | `PokeAPI/sprites` (retenue) | Pokémon DB |
|---|---|---|
| Qualité des rendus « Home » | **512×512** PNG ✅ | **128×128** (`/1x/`) ; **256×256** au chemin sans taille ✅ ; pas de variante `/2x/` (404 ✅) |
| Artworks | Official Artwork 475×475 PNG ✅ | `large` en **JPEG** (82 Ko pour Pikachu, **sans transparence**) ; version vectorielle 639×800 PNG 16 bits ; AVIF ✅ |
| Nommage | Par **identifiant** PokéAPI (`10001.png`) : correspond 1 pour 1 à nos données | Par **nom** (`raichu-alolan`, `pikachu-sinnoh-cap`) : il faudrait un tableau de correspondance, avec un risque d'erreurs (ex. `alolan` chez eux, `alola` chez PokéAPI) |
| Conçue pour un usage par programme | Oui (c'est le dépôt compagnon de PokéAPI) | **Non** : site web grand public |
| Règles d'usage | Dépôt CC0 ; les images restent © The Pokémon Company ✅ | Le site demande de **ne pas faire de lien direct** (« hotlinking uses bandwidth and costs us money ») et de les **télécharger puis héberger soi-même** ou d'utiliser leur code avec **lien retour** ; les sites qui coûtent trop de bande passante **peuvent être bloqués** ✅ ([notice sur leurs pages de sprites](https://pokemondb.net/sprites/pikachu), [discussion PokéBase](https://pokemondb.net/pokebase/meta/66098/what-does-the-message-the-sprites-gallery-mean-layman-terms)) |
| `robots.txt` | — | `Crawl-delay: 2` pour tous ; `wget` interdit ✅ ([robots.txt](https://pokemondb.net/robots.txt)) |
| Couverture de nos 39 images manquantes | — | **Peu utile** : sur 12 noms testés (costumes de Pikachu, Koraidon/Miraidon, « partenaires »), seul `pikachu-sinnoh-cap` répond (normal + shiny). Les autres noms essayés renvoient 404, mais **mes noms sont des suppositions** ❓ : résultat non concluant |

**Décision de Diamant (5 oct.)** : `PokeAPI/sprites` reste la base et **Pokémon DB sert à combler les trous**, en respectant leurs règles : téléchargement **ponctuel** (jamais à chaque build), **2 s entre deux requêtes**, `User-Agent` qui nous identifie, pas de `wget`, **fichiers auto-hébergés** (pas de lien direct), provenance notée, **lien retour** dans l'écran « À propos ». Les données PokéAPI et les fichiers Pokémon DB sont gardés dans un **cache local** (`.cache/`, non commité) : on ne retélécharge jamais ce qu'on a déjà, ce qui respecte aussi la [politique d'usage équitable de PokéAPI](https://pokeapi.co/docs/v2).

**Verdict final après essai (phase 2, 5 oct. 2026)** — avec 4 pages de galerie téléchargées poliment (2 s entre requêtes) :
- Pokémon DB n'a **rien** pour Évoli « partenaire », Koraidon et Miraidon (0 correspondance) ✅.
- Ses « shiny » des casquettes de Pikachu sont **strictement identiques** aux normaux (même empreinte numérique) : ce sont de faux shiny, ce qui confirme que **le shiny n'existe pas** pour ces formes ✅.
- Le costume `cosplay` n'existe que dans une vieille galerie en **120×120 px**, d'un autre style, et les 5 autres costumes n'y figurent pas ✅.
- **Conclusion : Pokémon DB ne comble aucun trou valable.** Les trous ont été comblés autrement, dans la source principale elle-même (chaîne de repli, §4.6). Aucun fichier de Pokémon DB n'est utilisé ; le script `fill-gaps` prévu n'a pas été écrit. Le dossier `assets/extra/` reste disponible pour déposer un jour une image à la main (qui devrait alors être créditée, avec lien vers sa source).

**Verdict initial (inchangé)** : on garde **`PokeAPI/sprites`** comme source du script. Aspirer ~2 700 fichiers sur Pokémon DB à chaque build, à raison d'une requête toutes les 2 s (≈ 1 h 30), serait lent, fragile et peu respectueux d'un site qui vit de la bande passante qu'on lui demanderait.

**Là où Pokémon DB peut quand même servir** :
- **Combler quelques trous à la main** (par ex. les shiny de casquettes de Pikachu absents chez PokeAPI) : une seule fois, quelques fichiers, 2 s entre chaque requête, ajoutés dans un petit dossier `assets/extra/` avec la liste de provenance. Qualité à comparer (128/256 px contre 512 px).
- **Idées fun** : costumes Pokémon GO pour des événements, sprites « rétro » par génération. À noter que `PokeAPI/sprites` propose déjà les sprites par génération ✅ : à regarder en premier.
- **Si on utilise un jour leurs fichiers** : les créditer et ajouter un **lien vers Pokémon DB** dans l'écran « À propos ».

### 4.3 Fonctionnement de l'option B

`pnpm sprites` (idempotent, reprend où il s'est arrêté, cache local) :
1. lit la liste des 1 351 Pokémon (PokéAPI) ;
2. télécharge `home/{id}.png` et `home/shiny/{id}.png` depuis `PokeAPI/sprites` **à un commit épinglé** ;
3. convertit en **WebP 256 px** (UI) — ou 512 px si on veut une carte de partage HD — avec un outil d'image en `devDependency` (`sharp` ❓ à valider) ;
4. écrit `public/sprites/{id}.webp` / `{id}s.webp` + un **`sprites-manifest.json`** (quels ids ont une image, un shiny…) ;
5. affiche un **rapport des manquants** (39 attendus, tous des formes).

Dans l'app : `getSprite(id, shiny)` consulte le manifeste → **repli propre** (shiny absent → image normale + étincelle ✦ ; image absente → silhouette `000`) : le bug « image cassée » de Minior ne peut plus exister. Un **test CI** échoue si une espèce 1–1025 n'a pas d'image.

**Essai visuel avant de choisir la taille** : la phase 2 génère les deux tailles et une page de comparaison (carte du jour, grille du Pokédex 56 px, image de partage). Ma lecture *a priori* : 256 px suffit pour la grille et l'affichage à l'écran, mais l'image de partage (carte de 400×560 px, jusqu'à 2× sur écran dense) pourrait paraître un peu douce ; je ne peux pas juger le rendu à ta place, c'est pour ça qu'on regarde. Le script prend la taille en paramètre : changer d'avis ne coûte qu'une régénération.

**Poids estimé** (extrapolé depuis un échantillon de 30 images, ❓) : 2 702 fichiers × ~11 Ko (256 px) ≈ **30 Mo**, ou × ~15 Ko (512 px) ≈ **41 Mo**, contre **95 Mo** aujourd'hui, et **0 Mo** dans le dépôt.

### 4.4 Les formes alternatives : toutes, sans exception

**Décision : les 326 formes sont dans le jeu.** Leur composition **exacte** (calculée par `pnpm dex`, une forme n'a qu'une catégorie ; mes comptages du premier jour se chevauchaient et étaient approximatifs) :

| Catégorie | Nb |
|---|---|
| Méga | 97 |
| Gigamax | 34 |
| Régionales (Alola 18, Galar 20, Hisui 16, Paldea 4) | 58 |
| Primo | 2 |
| Totem | 12 |
| Pikachu : casquettes et costumes | 14 |
| « Partenaires » (Pikachu, Évoli) | 2 |
| Autres (états de combat, genres, tailles, couleurs, modes de Koraidon/Miraidon…) | 107 |
| **Total** | **326** ✅ |

**Noms français et anglais : PokéAPI les fournit pour les 326 formes.** *Vérifié le 5 oct. 2026* en interrogeant le point d'accès `pokemon-form` de chaque forme : **326 sur 326 ont un nom français**. Exemples : `charizard-mega-x` → « Méga-Dracaufeu X », `raichu-alola` → « Raichu d'Alola », `groudon-primal` → « Primo-Groudon », `pikachu-sinnoh-cap` → « Pikachu Casquette de Sinnoh », `eevee-starter` → « Évoli Partenaire ». La relecture rapide de 20 noms donne des résultats cohérents. Deux **doublons** à départager (même nom FR pour deux formes) : `zygarde-10` / `zygarde-10-power-construct` et `meowstic-male-mega` / `meowstic-female-mega`.
> Correction d'une hypothèse : sur deux pages testées (Raichu, Dracaufeu), **Pokémon DB ne donne que le nom français de l'espèce**, pas celui des formes ✅. Il n'est donc pas la source des noms de formes ; les noms viennent de PokéAPI.

**Données générées** (`src/data/dex.json`) : une entrée par Pokémon ou forme avec `id`, `speciesId`, noms FR/EN, types, et pour les formes `{ slug, category }`. **Aucun filtre** : tout est actif. La disponibilité des images est dans `src/data/sprites.json`.

**Noms anglais manquants et doublons** : PokéAPI n'a **pas de nom anglais** pour les 8 formes de Koraidon/Miraidon (j'avais seulement testé le français) et donne le **même nom** à deux paires de formes. Les 12 corrections sont dans `scripts/dex-overrides.json`, **chacune avec sa source** (ex. « Limited Build » confirmé par Pokémon DB ; Zygarde départagé par son talent, « Rassemblement » / « Aura Inversée », noms lus dans PokéAPI).

**Images** (résultat final, voir §4.6) : il ne manque plus que **2 images normales** (`koraidon-swimming-build`, `miraidon-aquatic-mode`), grâce à une chaîne de repli. Ces 2 formes **ne sont pas tirées au sort** (jamais d'image cassée) tant qu'on n'a pas d'image.
- **Image plus petite** (repli Écarlate/Violet, 256 px) : affichée telle quelle, jamais agrandie artificiellement.
- **Pas d'image shiny** : le Pokémon **ne peut pas sortir en shiny** (`canBeShiny` faux). 21 formes sont concernées (casquettes de Pikachu, Minior en météore, Terapagos stellaire, « partenaires », certaines formes de Koraidon/Miraidon). ❓ « le jeu non plus » est plausible mais non vérifié forme par forme.

**Modèle de données** : `id` (identifiant PokéAPI, jusqu'à `10326`) **et** `speciesId` dès le départ.

### 4.5 Tirage des formes : le « pourcentage progressif »

**Règle voulue par Diamant** : chaque jour, la chance d'obtenir une forme est de **1 %** ; si aucune forme ne sort, elle monte de **+1 % par jour** (2 %, 3 %, 4 %…) jusqu'à ce qu'une forme sorte ; **elle retombe alors à 1 %**.

- **État à sauvegarder** : un compteur `joursSansForme` (0 au départ). Chance du jour = `min(100, joursSansForme + 1)` %. Si une forme sort : compteur à 0 ; sinon : compteur + 1. Au bout de **100 jours** sans forme, c'est **garanti**.
- **Ce que ça donne** (calcul exact + simulation de 300 000 jours ✅) :

| | |
|---|---|
| Nombre de jours moyen entre deux formes | **≈ 12,2 jours** (médiane : 12) |
| Part des jours avec une forme (long terme) | **≈ 8,2 %** |
| Forme obtenue dans les 7 premiers jours | 25,0 % |
| … dans les 14 premiers jours | 66,9 % |
| … dans les 21 premiers jours | 91,8 % |
| … dans les 30 premiers jours | 99,5 % |

  C'est un mécanisme « de pitié » : une forme environ toutes les 2 semaines, avec le suspense qui monte chaque jour.
- **Valeurs par défaut que je propose** (tu les ajustes, §10) : (a) un « jour » = un **tirage réel** (si tu n'ouvres pas l'app un jour, pas de tirage, le compteur ne bouge pas) ; (b) quand une forme sort, elle est choisie **uniformément parmi les 326** (donc ≈ 4 % de chances pour chacune ; des familles nombreuses comme Pikachu ou Minior sortiront un peu plus souvent que Dracaufeu) ; (c) les **événements** qui forcent un Pokémon fonctionnent comme avant, et si le résultat est une forme, le compteur repart à 0 ; (d) la **V-Roulette** et la **Team du mois** n'utilisent pas ce compteur ; (e) le **shiny** reste 1/69 (sauf `canBeShiny: false`).
- **Dans l'interface** : la chance du jour pourrait s'afficher comme une petite jauge sur la carte (idée §9).
- **Mode développeur** : afficher et modifier le compteur, pour tester sans attendre 12 jours.
- **Tests** (phase 3) : avec un aléa à graine, le compteur ne dépasse jamais 100, repart à 0 après une forme, et la moyenne simulée est ≈ 12,2 jours.
- **Contournement possible** : changer l'horloge de l'appareil permet de tricher ; assumé (jeu entre amis, sans classement).

---

### 4.6 Ce qui a été réalisé en phase 2 (5 oct. 2026) ✅

**Commandes** (Node exécute directement les scripts TypeScript, sans outil en plus ; `pnpm check` signale la syntaxe non supportée) :

| Commande | Rôle | Mesures |
|---|---|---|
| `pnpm dex` | Génère `src/data/dex.json` (1 025 espèces + 326 formes) et `natures.json` depuis PokéAPI | **2 747 requêtes, 16 s** la 1ʳᵉ fois (ensuite 0 requête : tout est en cache `.cache/`) ; fichier de 142 Ko (**29 Ko compressé**) ; **1 025 + 326 + 25** vérifiés par des tests |
| `pnpm sprites` | Télécharge, convertit et écrit `public/sprites/<taille>/<id>.webp` (+ `s` pour le shiny) ; met à jour `src/data/sprites.json` | **74 s** la 1ʳᵉ fois, **2,5 s** ensuite (cache) ; 2 662 images par taille |

**Poids réels des ensembles complets** (WebP, qualité 80) : **128 px = 13,1 Mo · 256 px = 29,6 Mo · 512 px = 46,2 Mo** (estimations de départ : 30 et 41 Mo pour 256 et 512).

**Chaîne de repli** (première source disponible) : ① rendus 3D « Home » 512 px (référence) → ② illustrations officielles 2D 475 px (`official-artwork`) → ③ sprites Écarlate/Violet 256 px. Résultat : **14 des 16 images normales manquantes sont récupérées** (12 en illustration 2D : costumes et « partenaires » de Pikachu, Évoli, 4 formes de Koraidon/Miraidon ; 2 en sprite Écarlate/Violet). Il reste 2 formes sans image.
**Règle des shiny** : un shiny n'est cherché **que dans la source de son normal** (jamais de mélange 2D/3D pour un même Pokémon : j'avais d'abord laissé passer 17 mélanges, corrigé), et un shiny **identique octet pour octet** au normal est écarté (8 cas : Minior en météore ×6, casquette « partenaire » de Pikachu, Terapagos stellaire).
**Contrôle de qualité des shiny** : sur 1 330 paires normal/shiny comparées pixel à pixel, aucune n'est visuellement identique en dehors de ces cas ; les 10 shiny issus du repli 2D diffèrent nettement de leur normal.

**Résultat côté application** : l'écran « carte du jour » utilise maintenant les vraies données (noms FR/EN, types, natures, images, **badge de forme**, numéro de l'espèce pour les formes). Vérifié dans Chromium sur 6 cas (espèce, Méga en shiny, repli 2D, repli Écarlate/Violet, anglais, forme sans image) : aucune erreur, aucune image cassée. Paramètres d'adresse de développement : `/?id=10034&shiny=1&level=88&nature=timid`.

**Essai visuel 256 px / 512 px** (écran ×3, comme un iPhone) : à taille normale la différence est **discrète** ; en zoom, les contours en 256 px sont **nettement plus flous** ; pour les **vignettes de 56 px**, 128 px et 256 px sont **indiscernables**.
**Décision de Diamant (5 oct.)** : **512 px pour la carte** (et l'image de partage) + **128 px pour les grilles** ; **256 px abandonné** (−29,6 Mo). Total ≈ **59 Mo** (13,1 + 46,2) contre 89 Mo pour trois tailles. Les vignettes (13 Mo) seront mises en cache pour le hors-ligne ; les grandes images seulement quand on les affiche. Les **images 2D de repli sont conservées**.

**Limites connues** : (1) `dex.json` est pour l'instant **inclus dans le JavaScript principal** (+ ≈ 35 Ko compressés ; bundle total 133 Ko / 35 Ko compressés) : le chargement différé est prévu en phase 6 ; (2) les 2 sprites Écarlate/Violet sont **petits** (256 px, contenu ≈ 110 px) : ils paraissent flous une fois étirés ; (3) les images de repli 2D ont un style **différent** des rendus 3D (voir la planche envoyée à Diamant) ; (4) **non fait** : déploiement des images (le build de prod devra lancer `pnpm sprites`, voir phase 6) ; (5) **non testé** : iPhone/Safari réel.

## 5. Données du joueur (sans migration, ancienne base supprimée)

- **Nouvelle base IndexedDB** (nom/version distincts). Pas de `migrateFromLocalStorage`, pas de conversion : le code est plus simple.
- **Au premier lancement de la v4** (décision : on supprime) : une petite routine **nettoie l'ancienne installation** : base `pokedaily` (v3), clés `localStorage` (`data`, `_devNextId`), clé `sessionStorage` (`done`), et le cache d'images `pokemon-images-v1` (qui peut peser jusqu'à ~91 Mo sur l'appareil).
  - **Garde-fous** : on ne supprime **qu'après** avoir ouvert la nouvelle base avec succès ; on gère le cas « un autre onglet garde l'ancienne base ouverte » (suppression bloquée) en réessayant au lancement suivant ; la routine ne s'exécute **que sur le site de production** (les prévisualisations n'ont pas d'ancienne base) et est **testée** avant la bascule.
  - **Irréversible** : c'est écrit dans le changelog 4.0.
- **Prévenir les 3–5 personnes** : une ligne dans la **Note de Diamant** du changelog 4.0 (rédigée par toi, avec ta voix) : la collection repart de zéro.
- **Export / import de la collection** : **dès la phase 4**. Fichier JSON versionné (`{ app, schemaVersion, exportedAt, données }`), **validé avant import**, avec confirmation avant d'écraser quoi que ce soit. Pratique pour changer de téléphone et pour se protéger d'un vidage du navigateur.

---

## 6. Phases

Chaque phase se termine par un état qui **build, passe les tests et se déploie**.

### Phase 1 — Fondations + essai « sans framework » ✅ FAIT (voir §2.4)
- Nouveau dépôt/branche propre (§8), Vite + PWA, TypeScript strict, ESLint/Prettier, Vitest, CI, Dependabot, un seul gestionnaire de paquets (pnpm).
- `ui/dom.ts`, `ui/store.ts`, `ui/router.ts`, `i18n/` + **essai** de l'écran « carte du jour » (§2.3).
- **Sortie** : verdict sur l'approche ; CI verte.

### Phase 2 — Données et images ✅ FAIT (voir §4.6)
- `pnpm dex` : 1 025 espèces + 326 formes + 25 natures, noms FR/EN (12 corrections sourcées dans `dex-overrides.json`).
- `pnpm sprites` : images WebP, chaîne de repli, shiny de même source, disponibilité dans `src/data/sprites.json`. Pokémon DB essayé : ne comble rien (§4.2 bis).
- Reste ouvert : **choix final des tailles** (recommandation : 512 + 128 px, §4.6).
- **Sortie atteinte** : `pnpm dex` et `pnpm sprites` produisent tout sans intervention ; l'app n'appelle plus jamais PokéAPI.

### Phase 3 — Noyau testé (`core/`) ✅ FAIT (voir §6.1)
- `constants`, `rng` (aléa injectable), `dates` (jour local `AAAA-MM-JJ`), `pokemon` (**une seule** fabrique), `form-pity` (pourcentage progressif), `draw` (tirage du jour), `events/` (moteur + effets + validation), `boxes` (boîtes spéciales qui expirent), `roulette` (boîtes du mois, boost exact), `team`.
- **Sortie atteinte** : le « tirage du jour » complet, la roulette et la team sont testés **sans navigateur** (321 tests au total).

### Phase 4 — Stockage, état, export/import
- Repository transactionnel, store global, tickets/boîtes avec **dates de validité**.
- **Export / import** de la collection (§5) et **routine de nettoyage** de l'ancienne installation (testée, non activée avant le lancement).
- **Sortie** : tickets, Pokédex et Stats se mettent à jour **en direct** (plus de rechargement).

### Phase 5 — Fonctionnalités (parité)
- Carte + partage, historique, Pokédex/Shinydex, stats, événements, Pokékit (V-Roulette, Team du mois), changelog, **mode dev**, FR/EN, accessibilité des fenêtres (focus, Échap, `aria`).
- **Sortie** : checklist §7 cochée.

### Phase 6 — PWA, poids, lancement
- SW unique, précache correct (`events.json`, police, manifeste), mise à jour **avec confirmation**, pré-cache progressif des images, parcours iOS (aide « Ajouter à l'écran d'accueil »), mesures Lighthouse avant/après.
- README (code/images/non-commercial), changelog 4.0, bascule (§8).

---

### 6.1 Ce qui a été réalisé en phase 3 (5 oct. 2026) ✅

**Le noyau (`src/core/`) est pur** : aucun navigateur, aucun fichier, aucun `Math.random()` direct. Le hasard est « injecté » : en production c'est le vrai hasard, dans les tests c'est un hasard à graine (même graine = même résultat), donc tout est reproductible. `src/data/pool.ts` est le seul pont avec les vraies données (« réserve de tirage » : 1 025 espèces, 324 formes, 25 natures).

| Domaine | Ce qui est fait | Vérifié par |
|---|---|---|
| **Dates** | Jour **local** `AAAA-MM-JJ` (texte, jamais des millisecondes) ; ajout de jours, jour de semaine, comparaison ; **pas de nouveau tirage si l'horloge recule** | 21 tests, **rejoués sous 5 fuseaux** (Paris, Los Angeles, Auckland, Kolkata, UTC) : minuit, heure d'été, années bissextiles |
| **Fabrique de Pokémon** | `createPokemon` : nature, niveau 1–99 (100 seulement par événement), shiny 1/69 ; un Pokémon **sans image shiny n'est jamais shiny**, même un jour « shiny garanti » | fréquences mesurées sur 200 000 tirages |
| **Pourcentage progressif** | 1 % → +1 % par tirage sans forme → retour à 1 % ; garanti au 100ᵉ | calcul exact + simulation de **60 000 cycles** : moyenne ≈ **12,2 jours**, médiane 12, 25 % en 7 jours, 66,9 % en 14, 99,5 % en 30, **≈ 8,2 % des jours**, jamais plus de 100 ; avec la pire malchance : forme **exactement** au 100ᵉ jour |
| **Tirage du jour** | Événements → Pokémon (imposé / forme / espèce) → nature, niveau, shiny → tickets Victini → boîtes spéciales ; fonction pure | sur 60 000 jours avec les vraies données : formes ≈ 8,2 %, shiny ≈ 1/69, presque toutes les formes sorties ; une **année entière** jour après jour avec les 12 vrais événements |
| **Événements** | Les **12 mêmes** événements, désormais importés dans l'app (**fonctionnent hors-ligne**, A10) ; `repeats: once/yearly` ; **validation du fichier** (18 types d'erreurs détectées) | mêmes dates actives et mêmes comptes à rebours que la v3.1 (sauf les bugs corrigés ci-dessous) |
| **Boîtes spéciales** | Une date de fin (7 jours) et **une boîte par genre** | B-3 |
| **V-Roulette** | Boîtes du mois (16 espèces **différentes**), tour avec boost **exact** | 400 000 tours : boosté = 25,0 % (±0,4), autres cases 5 % chacune |
| **Team du mois** | 6 espèces différentes, hors événements | — |

**Bugs de la v3.1 corrigés dans le noyau** : **B-3** (boîtes qui n'expiraient jamais et s'écrasaient), **B-4** (compte à rebours des événements ponctuels : Pokopia affichait « dans 147 j »), **B-5** (boost annoncé 1/4, réel ≈ 29,7 %), **A7** (mélange UTC/local), **A10** (événements non disponibles hors-ligne). *B-2 (ticket consommé avant le résultat) concerne le stockage : phase 4.*

**Deux défauts de MON code trouvés par les tests avant de pousser** : (1) le shiny d'un événement était comparé à 1/69, ce qui **ignorait le Poisson d'avril à 1/100** (moins bon que d'habitude) ; (2) un jeu de test où le « hasard maximal » tombait sur Victini faussait un compte de tickets (c'était mon jeu de test, pas le tirage).

**Règles d'empilement quand plusieurs événements agissent le même jour** (documentées dans le code et testées) : Pokémon imposé = le dernier jet réussi ; shiny = chaque événement **remplace** la chance par défaut et le meilleur gagne (en v3.1 : le dernier écrasait les autres) ; niveau = le plus élevé ; tickets additionnés ; boîtes cumulées.

**Choix par défaut que j'ai faits (à confirmer, voir §10)** : boîtes spéciales valables **7 jours** (jour de réception compris) et utilisables à volonté pendant ce temps (chaque tour coûte un ticket) ; niveau 1–99 au hasard, **100 réservé** à l'événement du Nouvel An.

**Non fait / limites** : le noyau n'est **pas encore branché** à l'écran (l'écran utilise toujours l'exemple de `sample-entry.ts`) : c'est la phase 4 (sauvegarde + état). Les noms de formes ne servent pas au tirage. Aucune de ces fonctions n'a été essayée sur un vrai appareil.

---

## 7. Cahier de non-régression

### 7.1 Parité fonctionnelle (à cocher avant de remplacer la v3.1)
- [ ] Pokémon du jour (nature, niveau, shiny, surnom 16 car.) · [ ] Carte : partager / copier / télécharger
- [ ] Historique mensuel + points d'événements · [ ] Pokédex + Shinydex · [ ] Stats
- [ ] 12 événements + bandeau + calendrier · [ ] Tickets Victini · [ ] V-Roulette + boîtes spéciales
- [ ] Team du mois · [ ] Changelog intégré · [ ] FR/EN · [ ] PWA installable + hors-ligne · [ ] **Mode dev**

### 7.2 Bugs de la v3.1 à ne **pas** reproduire (chacun devient un test)
| Réf. | Test d'acceptation | Statut |
|---|---|---|
| B-1 | Chaque espèce 1–1025 a une image (normale et shiny, ou repli propre) | ✅ phase 2 |
| B-2 | Un tour de roulette qui échoue **ne consomme pas** de ticket | ⏳ phase 4 (stockage) |
| B-3 | Une boîte spéciale **expire** et deux boîtes ne s'écrasent pas | ✅ phase 3 |
| B-4 | Un événement ponctuel passé n'affiche **aucun** compte à rebours | ✅ phase 3 |
| B-5 | Le boost affiché = le boost réel | ✅ phase 3 |
| B-6 | « Retour » du navigateur change bien de vue | ✅ phase 1 |
| B-7 | Les compteurs se mettent à jour sans recharger | ⏳ phase 4 (état) |
| B-8 / B-9 | Série en cours correcte ; un seul compte de shiny cohérent partout | ⏳ phase 5 |
| A7 | Un seul fuseau de référence : le jour **local** | ✅ phase 3 |
| A10 | `events.json` et la police disponibles hors-ligne | ✅ événements (phase 3) et police (phase 1) ; précache complet : phase 6 |

---

## 8. Dépôt propre : la branche vide

**Décision : branche vide (orpheline) dans le même dépôt.** On garde l'adresse, les étoiles et le lien avec Vercel.

**Déroulé**
1. **Sauvegarde de l'ancien** : ✅ **déjà faite par Diamant** (copie complète de la v3.1 hors du dépôt) : on ne perd rien, même après le nettoyage.
2. **Création** de la branche **`v4`**, sans aucun historique (`git checkout --orphan …`), qui démarre avec uniquement `docs/` et `AGENTS.md` (la mémoire du projet). Toute la v4 se construit dessus.
3. **Prévisualisation** : pendant le chantier, la v3.1 reste en production sur la branche par défaut. Vercel crée en général une adresse de prévisualisation par branche (❓ à confirmer dans ton tableau de bord Vercel, rien n'est versionné) : tu pourras tester la v4 sans toucher à la v3.1.
4. **Bascule** (en dernier, avec ta confirmation explicite) : la branche v4 devient la branche par défaut (nom sans emoji : `main`), puis on **supprime l'ancienne branche `🏡master`** et les branches de travail anciennes.

**Poids après nettoyage** : un `git clone` classique ne récupère que les branches et étiquettes, pas les références des Pull Requests (`refs/pull/*`) ; une fois les anciennes branches supprimées, le clone devrait donc redevenir léger (❓ à vérifier au moment de la bascule). GitHub peut en revanche conserver l'ancien contenu côté serveur à cause des PR #16–18 : ça n'affecte pas les joueurs ni les clones.

> ⚙️ Contrainte de cette session : je travaille sur la branche `claude/ecstatic-edison-vsuq66` et ne pousse nulle part ailleurs sans ton autorisation explicite. Créer la branche vide demande donc un « oui » de ta part (voir §11).

---

## 9. Idées « fun » (backlog à piocher une fois la base saine)

> Classées par **effort** (S/M/L). Ce sont des *idées*, pas des engagements. Toutes respectent « local, sans suivi, sans argent ».

### Rendre le quotidien plus vivant
| Idée | Effort | Note |
|---|---|---|
| 🔔 **Notification « ton Pokémon du jour est arrivé »** (opt-in) | M | ❓ support limité selon navigateur (iOS) |
| 🔥 **Vraie série en cours + badges** (7, 30, 100 jours…) | S | Corrige B-8 |
| 🎖️ **Succès** (premier shiny, 10 types différents…) | M | 100 % local |
| 🧬 **Descriptions de natures + « horoscope » du jour** (petit texte drôle selon nature + type) | S | Textes FR/EN statiques |
| 🎨 **Thème par type** (l'interface prend la couleur du type du jour) | S | Les couleurs existent |
| 🎁 **Événements saisonniers** supplémentaires | S | Juste du JSON |

### Collection & partage entre amis
| Idée | Effort | Note |
|---|---|---|
| 💾 **Export / import de la collection** (fichier ; lien plus tard) | S–M | **Décidé : tôt, phase 4** |
| 🤝 **Comparer avec un·e ami·e** (lien contenant les Pokémon du jour, sans serveur) | M | « On a le même Pokémon ! » — colle à l'esprit « rigoler entre amis » |
| 📊 **Récap annuel « Pokédaily Wrapped »** | M | Image partageable (canvas) |
| 🖼️ **Cartes de partage thématisées** (cadre shiny animé) | S–M | Étend la carte existante |
| 🏷️ **Surnoms suggérés** | S | |

### Jeux autour des tickets
| Idée | Effort | Note |
|---|---|---|
| 🎯 **« Quel est ce Pokémon ? »** pour gagner un ticket | M | Silhouettes en CSS sur les images existantes |
| 🔮 **V-Roulette : vraie animation séquentielle**, sons optionnels | M | Aujourd'hui les sauts sont aléatoires |
| 🗓️ **Événements entre amis** pilotés par `events.json` | M | Fichier statique mis à jour par déploiement |
| 📈 **Jauge « chance de forme »** sur la carte (le pourcentage du jour qui monte) | S | Rend le mécanisme §4.5 visible et fun |
| 🧩 **Formes alternatives** (Alola, Galar, Méga…) dans la collection | M–L | **Décidé : oui** ; catégories à choisir (§4.4) |
| 🎃 **Événements avec des formes** (Halloween spectral, Pokémon Day avec Pikachu à casquette) | S | Une fois les formes en place |

### Spécial écriture ✍️
| Idée | Effort | Note |
|---|---|---|
| **« Amorce d'écriture du jour »** : à partir du Pokémon, de sa nature et de son type, une *amorce* (lieu, dilemme, trait de caractère), jamais un texte écrit à ta place | S–M | Tu gardes la plume ; banque de phrases rédigée par toi → ton style |
| **« Fiche personnage »** exportable du Pokémon du jour | S | Pour du worldbuilding |

### Fun « méta »
| Idée | Effort | Note |
|---|---|---|
| 🥚 **Easter eggs** (codes secrets, blagues de Pokémon) | S | Dans l'esprit du Diamant Day |
| 🛠️ **Mode dev enrichi** (simuler une date, déclencher n'importe quel événement) | S | Très utile pour tester les fêtes sans attendre le 31 octobre |

---

## 10. Questions encore ouvertes

**Réglé** : tailles d'images **512 + 128 px**, images 2D de repli **gardées** ; toutes les formes, pourcentage progressif, Pokédex séparé ; un « jour » = un tirage réel ; formes tirées à égalité ; formes sans image mises de côté ; V-Roulette et Team du mois sur les espèces seulement ; noms FR/EN depuis PokéAPI ; branche `v4` ; ancienne base supprimée ; export/import tôt.

**À confirmer (petites décisions de produit, avec une valeur par défaut déjà codée)**
1. **Durée des boîtes spéciales** (Lucky Day, Poisson d'avril) : **7 jours**, jour de réception compris, utilisables à volonté (1 ticket par tour). Plus court (le jour même) ou plus long ?
2. **Poisson d'avril : chance shiny de 1/100** (moins bonne que 1/69). C'était déjà le cas en v3.1 ; est-ce voulu, ou préfères-tu une meilleure chance un jour de fête (comme 1/30 pour Halloween) ?
3. **Niveau 100** : réservé à l'événement du Nouvel An (le hasard va de 1 à 99). OK ?

## 11. Prochaine action

**Phase 4 — stockage, état, export/import** : base IndexedDB neuve avec de vrais compartiments et des **transactions** (rien d'écrit à moitié), état partagé qui met l'écran à jour sans recharger (B-7), **branchement du tirage du jour** à l'écran, **tickets débités seulement après succès** (B-2), **export/import** de la collection, et **nettoyage de l'ancienne installation** (avec ses garde-fous).
