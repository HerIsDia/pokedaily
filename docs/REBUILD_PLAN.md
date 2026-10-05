# Plan de reconstruction — Pokédaily v4

> Mis à jour le 5 octobre 2026 avec les **décisions de Diamant** (§0). Le reste reste des *recommandations argumentées* : les points encore ouverts sont listés au §10.
> Contexte : [`AUDIT.md`](AUDIT.md) (problèmes de la v3.1) · [`ARCHITECTURE.md`](ARCHITECTURE.md) (fonctionnement de la v3.1).

---

## 0. Décisions actées

| Sujet | Décision |
|---|---|
| Technologie | **Reconstruction de zéro en TypeScript/JavaScript pur**, sans moteur de rendu (donc **ni Svelte, ni React, ni équivalent**). On **garde Vite et la PWA**. |
| Images | Solution **automatisée** (aucune récupération manuelle) pour couvrir tous les Pokémon **et leurs formes** → §4. |
| Historique git | On **repart propre** (sans les 294 Mo). Exécution à la fin (§8), avec une dernière confirmation car c'est destructif. |
| Changement de jour | **Minuit heure locale** de chaque joueur. |
| Données existantes | Environ 3 à 5 utilisateurs : **aucune migration**, on peut tout écraser. |
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

Reconstruire **l'écran « carte du jour »** (affichage, renommage, partage) et vérifier : (1) code lisible ; (2) renommage sans perte de focus ni de défilement ; (3) aucun `innerHTML` avec une donnée utilisateur ; (4) changement de langue sans rechargement ; (5) < ~300 lignes de plomberie. Si un critère échoue, on en discute **avant** d'aller plus loin (autre option : Custom Elements partout).

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

### 4.3 Fonctionnement de l'option B

`pnpm sprites` (idempotent, reprend où il s'est arrêté, cache local) :
1. lit la liste des 1 351 Pokémon (PokéAPI) ;
2. télécharge `home/{id}.png` et `home/shiny/{id}.png` depuis `PokeAPI/sprites` **à un commit épinglé** ;
3. convertit en **WebP 256 px** (UI) — ou 512 px si on veut une carte de partage HD — avec un outil d'image en `devDependency` (`sharp` ❓ à valider) ;
4. écrit `public/sprites/{id}.webp` / `{id}s.webp` + un **`sprites-manifest.json`** (quels ids ont une image, un shiny…) ;
5. affiche un **rapport des manquants** (39 attendus, tous des formes).

Dans l'app : `getSprite(id, shiny)` consulte le manifeste → **repli propre** (shiny absent → image normale + étincelle ✦ ; image absente → silhouette `000`) : le bug « image cassée » de Minior ne peut plus exister. Un **test CI** échoue si une espèce 1–1025 n'a pas d'image.

**Poids estimé** (extrapolé depuis un échantillon de 30 images, ❓) : 2 702 fichiers × ~11 Ko (256 px) ≈ **30 Mo**, ou × ~15 Ko (512 px) ≈ **41 Mo**, contre **95 Mo** aujourd'hui, et **0 Mo** dans le dépôt.

### 4.4 Les formes dans le jeu : une vraie décision de produit (voir §10)

Les 326 formes contiennent des variantes très différentes (régionales, Méga, Gigamax, genres, costumes…). Pour les utiliser il faut décider **lesquelles** comptent dans le tirage / le Pokédex, et vérifier que leurs noms FR existent dans PokéAPI (❓ souvent incomplets). Le modèle de données prévoit dès le départ `id` (identifiant PokéAPI) **et** `speciesId`, pour pouvoir activer les formes plus tard **sans refonte**.

---

## 5. Données du joueur (sans migration)

- **Nouvelle base IndexedDB** (nom/version distincts) : l'ancienne n'est simplement plus lue. Suppression automatique de l'ancienne : à décider (par défaut : on ne touche à rien).
- Pas de `migrateFromLocalStorage`, pas de conversion v3 → v4 : le code est donc **plus simple**.
- **Prévenir les 3–5 personnes concernées** : une ligne dans la **Note de Diamant** du changelog 4.0 (rédigée par toi, avec ta voix) pour annoncer que la collection repart de zéro.
- **Export / import** de la collection : plus un filet de sécurité de migration, mais toujours une bonne **fonctionnalité** (changer de téléphone, sauvegarde, fun) → dans le backlog (§9), plus tôt si tu le souhaites.

---

## 6. Phases

Chaque phase se termine par un état qui **build, passe les tests et se déploie**.

### Phase 1 — Fondations + essai « sans framework »
- Nouveau dépôt/branche propre (§8), Vite + PWA, TypeScript strict, ESLint/Prettier, Vitest, CI, Dependabot, un seul gestionnaire de paquets (pnpm).
- `ui/dom.ts`, `ui/store.ts`, `ui/router.ts`, `i18n/` + **essai** de l'écran « carte du jour » (§2.3).
- **Sortie** : verdict sur l'approche ; CI verte.

### Phase 2 — Données et images
- `scripts/build-dex.ts` (dex + natures FR/EN, **vérifiés** contre PokéAPI) et `scripts/sync-sprites.ts` (§4), manifeste, test de complétude.
- **Sortie** : `pnpm sprites` et `pnpm dex` produisent tout sans intervention ; l'app n'appelle plus jamais PokéAPI.

### Phase 3 — Noyau testé (`core/`)
- `constants`, `rng`, `dates` (jour local), `createEntry`, `draw`, moteur d'événements (mêmes 12 événements, mêmes résultats, durcis).
- **Tests** : toutes les dates clés des événements (y compris ponctuel vs annuel), tirage avec graine, probabilité de boost, passage de minuit et changement de fuseau.
- **Sortie** : le « tirage du jour » complet est testé sans navigateur.

### Phase 4 — Stockage + état
- Repository transactionnel, store global, tickets/boîtes avec **dates de validité**.
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

## 8. Dépôt propre : comment et quand

Tu as dit oui pour repartir sans les 294 Mo. Comme c'est **destructif et irréversible**, on le fait **en dernier** et je te demande une dernière confirmation à ce moment-là. Deux voies :

1. **Nouveau dépôt** (recommandé ❓) : l'ancien est archivé (renommé `pokedaily-legacy`) et le nouveau reprend le nom `pokedaily`. À reconnecter côté Vercel. Garantit un dépôt **léger**. Raison : GitHub conserve les références des Pull Requests (`refs/pull/*`) : supprimer des branches ne suffit pas toujours à faire disparaître les anciens fichiers du dépôt hébergé (❓ à vérifier au moment de décider).
2. **Même dépôt, branche vide (orpheline)** puis bascule de la branche par défaut : on garde l'adresse, les étoiles et les tickets, mais l'ancien poids peut rester côté GitHub.

Dans les deux cas, on **garde une copie de l'ancienne v3.1** (archive du dépôt) tant que la v4 n'est pas validée. Au passage : une branche par défaut **sans emoji** (`main`).

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
| 💾 **Export / import de la collection** (fichier ou lien) | S–M | Utile pour changer de téléphone |
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
| 🧩 **Formes spéciales** (Alola, Galar, Méga…) dans la collection | M–L | Dépend de la décision §4.4 |

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

1. **Les formes dans le jeu** : tirage sur 1 025 espèces seulement, ou aussi (une sélection de) formes ? Le Pokédex compte-t-il les formes à part ?
2. **Dépôt** : nouveau dépôt (recommandé) ou branche orpheline dans le même dépôt (§8) ?
3. **Images** : OK pour l'**option B** (générées au build, non commitées) ? Et résolution **256 px** (léger) ou **512 px** (carte de partage HD) ?
4. **Essai « sans framework »** (§2.3) : OK pour démarrer par là, avec la possibilité de réajuster si un critère échoue ?
5. **Ancienne base de données** : on la laisse dormir sur les appareils, ou on la supprime automatiquement au premier lancement de la v4 ?
6. **Export/import** : en début de projet (phase 4) ou plus tard ?

## 11. Prochaine action concrète proposée

1. Tu réponds aux questions du §10 (même en un mot).
2. On démarre la **Phase 1** : fondations (outillage, CI) + l'essai de l'écran « carte du jour » sans framework.
3. On enchaîne avec les données/images (phase 2) : c'est elle qui règle ton problème d'images une fois pour toutes.
