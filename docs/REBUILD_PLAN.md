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
| Images | **`PokeAPI/sprites` en base + Pokémon DB pour combler les trous**, en respectant leurs règles (§4.2 bis). Générées au build et non commitées. Taille 256/512 px : **à trancher après un essai visuel**. |
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

**Décision : les 326 formes sont dans le jeu.** Pour information, leur composition (comptage sur les noms ✅) :

| Catégorie | Nb |
|---|---|
| Méga | 97 |
| Gigamax | 34 |
| Régionales (Alola 20, Galar 20, Hisui 16, Paldea 4) | 60 |
| Primo | 2 |
| Totem | 11 |
| Pikachu casquettes / costumes | 14 |
| Autres (états de combat, genres, tailles, couleurs, « partenaires », Koraidon/Miraidon…) | 108 |
| **Total** | **326** ✅ |

**Noms français et anglais : PokéAPI les fournit pour les 326 formes.** *Vérifié le 5 oct. 2026* en interrogeant le point d'accès `pokemon-form` de chaque forme : **326 sur 326 ont un nom français**. Exemples : `charizard-mega-x` → « Méga-Dracaufeu X », `raichu-alola` → « Raichu d'Alola », `groudon-primal` → « Primo-Groudon », `pikachu-sinnoh-cap` → « Pikachu Casquette de Sinnoh », `eevee-starter` → « Évoli Partenaire ». La relecture rapide de 20 noms donne des résultats cohérents. Deux **doublons** à départager (même nom FR pour deux formes) : `zygarde-10` / `zygarde-10-power-construct` et `meowstic-male-mega` / `meowstic-female-mega`.
> Correction d'une hypothèse : sur deux pages testées (Raichu, Dracaufeu), **Pokémon DB ne donne que le nom français de l'espèce**, pas celui des formes ✅. Il n'est donc pas la source des noms de formes ; les noms viennent de PokéAPI.

**`forms.json`** (généré) contient pour chaque forme : `id`, `speciesId`, catégorie, noms FR/EN, `canBeShiny`, et si une image existe. **Aucun filtre** : tout est actif.

**Images : 39 fichiers manquent chez `PokeAPI/sprites`** (✅ vérifié) : 16 formes n'ont **aucune** image normale (costumes de Pikachu ×6, Pikachu et Évoli « partenaires », modes de Koraidon/Miraidon ×8) et 23 n'ont **pas de shiny** (dont 6 casquettes de Pikachu, les costumes ci-dessus, les modes de Koraidon/Miraidon).
- **Pour les combler** : script ponctuel `scripts/fill-gaps.ts` qui cherche chez Pokémon DB, avec leurs règles (§4.2 bis). Je n'ai pas encore la certitude qu'ils aient ces formes (mes premiers essais à l'aveugle ont donné 404, **non concluants**).
- **Image plus petite** (128/256 px) : affichée telle quelle, jamais agrandie artificiellement.
- **Shiny qui n'existe pas dans le jeu** : on marque `canBeShiny: false` (la forme ne peut alors pas sortir en shiny). ❓ à confirmer forme par forme.
- **Cas limite** : une forme **sans aucune image nulle part** ne peut pas être affichée ; elle est mise de côté jusqu'à ce qu'on trouve une image (voir §10, question 3), car « toutes sans exception » ne doit pas produire d'image cassée.

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

### Phase 2 — Données et images
- `scripts/build-dex.ts` (dex + natures FR/EN, **vérifiés** contre PokéAPI) et `scripts/sync-sprites.ts` (§4), manifeste, test de complétude.
- `forms.json` (métadonnées des 326 formes, noms FR/EN depuis PokéAPI, §4.4), `scripts/fill-gaps.ts` (trous comblés chez Pokémon DB, §4.2 bis) et **page de comparaison 256/512 px** pour choisir la taille.
- **Sortie** : `pnpm sprites` et `pnpm dex` produisent tout sans intervention ; l'app n'appelle plus jamais PokéAPI.

### Phase 3 — Noyau testé (`core/`)
- `constants`, `rng`, `dates` (jour local), `createEntry`, `draw`, moteur d'événements (mêmes 12 événements, mêmes résultats, durcis).
- **Tests** : tirage des formes (pourcentage progressif, §4.5), toutes les dates clés des événements (y compris ponctuel vs annuel), tirage avec graine, probabilité de boost, passage de minuit et changement de fuseau.
- **Sortie** : le « tirage du jour » complet est testé sans navigateur.

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

## 7. Cahier de non-régression

### 7.1 Parité fonctionnelle (à cocher avant de remplacer la v3.1)
- [ ] Pokémon du jour (nature, niveau, shiny, surnom 16 car.) · [ ] Carte : partager / copier / télécharger
- [ ] Historique mensuel + points d'événements · [ ] Pokédex + Shinydex · [ ] Stats
- [ ] 12 événements + bandeau + calendrier · [ ] Tickets Victini · [ ] V-Roulette + boîtes spéciales
- [ ] Team du mois · [ ] Changelog intégré · [ ] FR/EN · [ ] PWA installable + hors-ligne · [ ] **Mode dev**

### 7.2 Bugs de la v3.1 à ne **pas** reproduire (chacun devient un test)
| Réf. | Test d'acceptation |
|---|---|
| B-1 | Chaque espèce 1–1025 a une image (normale et shiny, ou repli propre) |
| B-2 | Un tour de roulette qui échoue **ne consomme pas** de ticket |
| B-3 | Une boîte spéciale **expire** et deux boîtes ne s'écrasent pas |
| B-4 | Un événement ponctuel passé n'affiche **aucun** compte à rebours |
| B-5 | Le boost affiché = le boost réel |
| B-6 | « Retour » du navigateur change bien de vue |
| B-7 | Les compteurs se mettent à jour sans recharger |
| B-8 / B-9 | Série en cours correcte ; un seul compte de shiny cohérent partout |
| A7 | Un seul fuseau de référence : le jour **local** |
| A10 | `events.json` et la police disponibles hors-ligne |

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

## 10. Questions encore ouvertes (petites, avec une valeur par défaut)

1. **Un « jour » du pourcentage progressif** : compte-t-on les **tirages réels** (par défaut : si tu n'ouvres pas l'app un jour, le compteur ne bouge pas) ou les **jours du calendrier** (le pourcentage monte même si tu ne viens pas) ?
2. **Quelle forme sort** : **uniformément parmi les 326** (par défaut) ou en choisissant d'abord une espèce ?
3. **Forme sans aucune image** (jusqu'à 16 aujourd'hui) : par défaut, **mise de côté** tant qu'on n'a pas d'image (jamais d'image cassée). Ça te va ?
4. **V-Roulette et Team du mois** : par défaut **espèces seulement** (sans formes, sans compteur). Ça te va, ou tu veux des formes aussi ?

Réglé : toutes les formes, pourcentage progressif, Pokédex séparé, noms FR (PokéAPI), images (PokeAPI/sprites + trous Pokémon DB), nom `v4`, copie de sauvegarde, ancienne base supprimée, export/import tôt.

## 11. Prochaine action

**Phase 1** sur la branche `v4` : fondations (outillage, tests, CI) + essai « carte du jour » sans framework, en petits commits relisibles. Les questions du §10 ne bloquent pas la phase 1 (elles concernent les phases 2 à 4).
