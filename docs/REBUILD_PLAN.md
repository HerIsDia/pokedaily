# Plan de reconstruction — Pokédaily v4

> Proposition issue de l'[audit](AUDIT.md). Rien ici n'est décidé : ce sont des **recommandations argumentées**, à valider (voir les questions ouvertes de l'audit, §8). L'idée directrice : **on garde ce qui plaît aux joueurs, on refait ce qui rend le code fragile.**

---

## 1. Principes

1. **Refaire la structure, pas la techno.** Svelte 5 + Vite + PWA conviennent très bien. On les garde (en mettant à jour).
2. **Zéro serveur, zéro compte, tout local** — c'est la promesse du projet et sa simplicité.
3. **Hors-ligne d'abord** : après la 1ʳᵉ visite, plus aucune requête réseau nécessaire pour jouer.
4. **Une seule source de vérité** pour l'état, **une seule fonction** pour fabriquer un Pokémon.
5. **La logique pure est testée** (tirage, événements, dates) ; l'interface est fine.
6. **Les contenus sont des données** (événements, textes, changelog) et non du code.
7. **Ne perdre aucune donnée de joueur** : migration depuis le schéma IndexedDB actuel + export/import.
8. **Petites étapes livrables**, chacune vérifiable (`pnpm check`, tests, build) — adapté à une propriétaire qui n'est pas développeuse : chaque étape doit pouvoir être relue en langage clair.

---

## 2. Architecture cible (proposition)

```
src/
├── main.ts
├── App.svelte                 coquille minimale (routeur, popups globales)
├── core/                      ⭐ logique pure, SANS Svelte ni navigateur → testable
│   ├── constants.ts           DEX_SIZE, SHINY_RATE, LEVEL_MIN/MAX, VICTINI_ID…
│   ├── rng.ts                 aléatoire injectable (Math.random en prod, graine en test)
│   ├── dates.ts               UNE convention de jour (UTC ou local, à décider) + helpers
│   ├── pokemon.ts             createEntry(id, opts) ← remplace les 5 copies
│   ├── draw.ts                tirage du jour = pokemon + événements
│   └── events/                moteur d'événements (schéma validé, occurrences)
├── data/
│   ├── dex.json               généré : id → { fr, en, types[] } pour 1025 (≈ 100 Ko)
│   ├── natures.json           25 natures FR/EN
│   └── events.json            (existant, enrichi : version de schéma, `repeats: yearly|once`)
├── storage/
│   ├── schema.ts              types des données persistées + version de schéma
│   ├── repository.ts          API unique (getToday, saveDraw, addTickets…) en TRANSACTIONS
│   └── migrations.ts          v2 localStorage → v3 → v4
├── state/
│   └── app.svelte.ts          store réactif (runes) — remplace `data` + `window.location.reload()`
├── i18n/
│   ├── index.ts               t('key') + langue persistée + sélecteur
│   └── fr.ts, en.ts
├── features/                  une dossier par fonctionnalité (UI + logique propre)
│   ├── card/  history/  stats/  pokedex/  vroulette/  team/  events/  changelog/  dev/
├── pwa/
│   ├── sw.ts                  service worker
│   └── register.ts            enregistrement unique + mise à jour avec confirmation
└── ui/                        briques communes : Modal, Badge, TypeBadge, ProgressBar, tokens CSS
scripts/
└── build-dex.mjs              télécharge PokéAPI UNE FOIS (en local/CI) → data/dex.json + images WebP
tests/                         Vitest (core + storage avec fake-indexeddb)
.github/workflows/ci.yml       check + test + build à chaque push
```

### Choix techniques recommandés

| Sujet | Recommandation | Pourquoi |
|---|---|---|
| Données Pokémon | **Fichier embarqué généré par script** (`build-dex.mjs`), plus d'appel PokéAPI à l'exécution | Hors-ligne total, −`axios`/`pokenode-ts`, −36 alertes prod, respect de la [politique de cache de PokéAPI](https://pokeapi.co/docs/v2), tirage instantané |
| Modèle d'entrée | Stocker seulement `id, natureId, level, isShiny, date, rename` ; **noms résolus à l'affichage** | Ajouter une langue ou corriger un nom = 0 migration |
| Stockage | IndexedDB avec **vrais stores** (`entries`, `meta`, `roulette`, `team`) + **transactions** ; lib légère type [`idb`](https://github.com/jakearchibald/idb) (❓ à valider) | Atomicité (A5), code plus court |
| État | Store runes `$state` partagé + repository | Fin du `reload()` (B-7, A.1) |
| i18n | Dictionnaires + `t()`, sélecteur FR/EN persistant | D-2, D-5 |
| Tests | **Vitest** (core) + **fake-indexeddb** (storage) ; 1 ou 2 parcours **Playwright** plus tard | Filet de sécurité avant d'ajouter des fonctions fun |
| Qualité | **Prettier + ESLint** (ou **Biome** seul, plus simple ❓) + `svelte-check` | Cohérence, relectures plus courtes |
| CI | GitHub Actions : install → check → test → build | Plus de régression silencieuse |
| Dépendances | Mises à jour **par paliers** (voir §4 phase 0) + Dependabot/Renovate | Éviter 3 versions majeures de retard |
| Images | **WebP** (256 px suffit pour l'UI, 512 px si on veut le partage HD), nommage conservé (`025.webp`, `025s.webp`), **manquants corrigés (#774 shiny)** | −65 à −75 % (mesuré), pré-cache ~25 Mo au lieu de ~91 Mo |
| Police | Auto-hébergée (`@fontsource/roboto-condensed`) | Hors-ligne + RGPD |
| Version | Une seule source (`package.json`) injectée à la build (`__APP_VERSION__`) | D-7 |
| Changelog | `changelog.json` (ou `.md` structuré) lu par l'app **et** par `CHANGELOG.md` généré | D-4 |

### Décisions de produit à trancher avant de coder

- **Heure du nouveau jour** : minuit UTC (1 h/2 h du matin en France) ou **minuit local** ? (Recommandé : local, plus intuitif — cela impose de stocker la date en `YYYY-MM-DD` locale plutôt qu'en millisecondes UTC.)
- **Niveau max** : 99 ou 100 ? **Boost** : 25 % réel (corriger la formule) ou ~30 % (corriger le texte) ?
- **Événements ponctuels vs annuels** : ajouter un champ explicite (`repeats: 'yearly' | 'once'`).
- **Boîtes spéciales** : durée de validité (la journée ? 7 jours ?) et nombre d'utilisations.
- **Statut du mode dev** : réservé à `pnpm dev`, ou activable par un code secret en production.

---

## 3. Stratégie de migration des données joueurs

On ne casse pas la collection de quelqu'un :

1. **Conserver le nom de base `pokedaily`** et passer à `DB_VERSION = 2` avec un `onupgradeneeded` qui convertit `state/today/history` vers les nouveaux stores, **sans supprimer** les anciens avant validation.
2. Ajouter dès la première étape un **export/import JSON** (« Sauvegarder ma collection ») : filet de sécurité de la migration *et* fonctionnalité utile.
3. Tester la migration avec : a) un jeu de données v3.1 synthétique ; b) un export `localStorage` v2 réel si tu en as un (❓ à fournir).
4. Garder `migrateFromLocalStorage` tant qu'il peut rester des utilisateurs v2 (❓ à décider après avoir regardé les stats d'usage).

---

## 4. Phases (chaque phase se termine par un état qui build et qui marche)

### Phase 0 — Assainir sans rien casser (≈ petite)
- Un seul gestionnaire de paquets (supprimer `package-lock.json`, ajouter `"packageManager": "pnpm@…"`).
- Renommer `robot.txt` → `robots.txt` ; harmoniser le nom (Pokédaily) dans `index.html`/manifeste.
- Corriger les bugs triviaux : **B-1** (créer/obtenir `774S`), **B-4** (flag `once`), **B-5** (texte ou formule), **B-6** (`hashchange`), **B-2** (ne débiter le ticket qu'après succès), **B-3** (valider la date de la boîte).
- Ajouter `.github/workflows/ci.yml` (check + build) et Dependabot.
- Mettre à jour les dépendances « sûres » (patchs/mineures) ; décider du saut Vite/plugins plus tard.
- **Critère de sortie** : `pnpm check` = 0 avertissement, build vert en CI.

### Phase 1 — Le noyau (`core/`, `data/`, tests)
- `constants.ts`, `rng.ts`, `dates.ts`, `pokemon.ts` (`createEntry`), `draw.ts`, moteur d'événements migré **tel quel** puis durci (schéma validé, mêmes résultats).
- `scripts/build-dex.mjs` → `data/dex.json` + `natures.json` (vérifier les noms FR contre PokéAPI).
- **Tests** : événements (toutes les dates clés), tirage avec RNG graine, `createEntry`, probabilité de boost.
- **Critère de sortie** : l'ancien code appelle déjà le nouveau noyau (strangler pattern), PokéAPI n'est plus utilisée pour le tirage.

### Phase 2 — Stockage + état
- `storage/` avec migrations et transactions ; export/import ; store réactif ; fin des `reload()`.
- **Critère de sortie** : tickets/Pokédex/Stats se mettent à jour en direct après une roulette ; migration testée.

### Phase 3 — Interface par fonctionnalité
- Recréer les vues dans `features/` en s'appuyant sur `ui/` (Modal unique, TypeBadge unique, tokens CSS).
- i18n complète, sélecteur de langue, `lang` du document dynamique, accessibilité des popups (focus, Échap, `aria`).
- **Critère de sortie** : parité fonctionnelle avec la v3.1 (checklist ci-dessous).

### Phase 4 — PWA et poids
- Images WebP, précache correct (`events.json`, police), enregistrement SW unique, mise à jour **avec confirmation**, découpage de code (DevPanel/Changelog en *lazy*), parcours iOS (instructions « Ajouter à l'écran d'accueil »).
- **Critère de sortie** : Lighthouse PWA/perf relevés avant/après, bundle mesuré.

### Phase 5 — Lancement
- README + disclaimers (code MIT / assets réservés), changelog 4.0 rédigé selon `CHANGELOG_GUIDE.md`, décision sur l'historique git (§8 audit), mise en prod.

### Checklist de parité (à cocher avant de remplacer la v3.1)
- [ ] Pokémon du jour (nature, niveau, shiny, surnom) · [ ] Carte partager/copier/télécharger
- [ ] Historique mensuel + points d'événements · [ ] Pokédex + Shinydex · [ ] Stats
- [ ] 12 événements + bandeau + calendrier · [ ] Tickets Victini · [ ] V-Roulette + boîtes spéciales
- [ ] Team du mois · [ ] Changelog intégré · [ ] FR/EN · [ ] PWA installable + hors-ligne
- [ ] Migration des données v3.1 (et v2) · [ ] Mode dev (dev seulement)

---

## 5. Risques de la reconstruction

| Risque | Parade |
|---|---|
| Perdre des données joueurs | Export/import d'abord, migration non destructive, tests sur jeux de données |
| « Tout refaire » s'éternise | Strangler : on remplace module par module, l'app reste livrable à chaque phase |
| Régressions invisibles (pas de tests aujourd'hui) | Phase 1 écrit les tests **avant** de déplacer la logique |
| Images : droits d'auteur | Décision explicite (audit §6.7) avant publication de la v4 |
| Dépendre de l'IA pour tout | Documents lisibles (ce dossier), `AGENTS.md`, étapes petites relues par toi |

---

## 6. Idées « fun » (backlog à piocher une fois la base saine)

> Classées par **effort** (S/M/L) et par **fit** avec l'esprit du projet. Ce sont des *idées*, pas des engagements.

### Rendre le quotidien plus vivant
| Idée | Effort | Note |
|---|---|---|
| 🔔 **Notification « ton Pokémon du jour est arrivé »** (PWA, opt-in) | M | Dépend du support navigateur ; ❓ limité sur iOS |
| 🔥 **Vraie série en cours + badges** (7 jours, 30 jours, 100 jours…) | S | Corrige B-8 au passage |
| 🎖️ **Succès** (premier shiny, 10 types différents, tous les types Feu…) | M | Totalement local |
| 🧬 **Descriptions de natures et « horoscope » du jour** (petit texte drôle selon nature + type) | S | Données statiques FR/EN, ton léger |
| 🎨 **Thème par type** (la carte et l'UI prennent la couleur du type du jour) | S | Les couleurs existent déjà |
| 🎁 **Calendrier de l'Avent / événements saisonniers** supplémentaires | S | Juste du JSON |

### Collection & partage
| Idée | Effort | Note |
|---|---|---|
| 💾 **Sauvegarde/restauration** de la collection (fichier ou lien) | S–M | Prévu phase 2 : devient une feature |
| 📊 **Récap annuel « Pokédaily Wrapped »** (type le plus fréquent, plus beau shiny…) | M | Images partageables en canvas (déjà maîtrisé) |
| 🖼️ **Cartes de partage thématisées** (variantes, cadre shiny animé) | S–M | Étend `generateCardBlob` |
| 🤝 **Comparer avec un·e ami·e** (lien contenant les IDs du jour, sans serveur) | M | Fun : « on a le même Pokémon ! » |
| 🏷️ **Titres / surnoms suggérés** générés à partir du Pokémon | S | |

### Jeux autour des tickets
| Idée | Effort | Note |
|---|---|---|
| 🎯 **Mini-jeu « Quel est ce Pokémon ? »** pour gagner un ticket Victini | M | Silhouettes via CSS `filter` sur les images existantes |
| 🔮 **V-Roulette : animation réelle sur la grille**, effets sonores optionnels | M | Aujourd'hui les sauts sont aléatoires |
| 🛡️ **Team du mois : mini-défis** (« bats la team d'un ami » sur des types) | L | À cadrer |
| 🗓️ **Événements communautaires** pilotés par `events.json` à distance | M | Sans serveur : fichier statique mis à jour par déploiement |

### Spécial écriture ✍️ (idée pour toi qui écris)
| Idée | Effort | Note |
|---|---|---|
| **« Amorce d'écriture du jour »** : à partir du Pokémon, de sa nature et de son type, proposer une *amorce* (un lieu, un dilemme, un trait de caractère) — jamais un texte écrit à ta place | S–M | Tu gardes la plume ; l'outil ne fait que lancer l'étincelle. Banque de phrases rédigée par toi → ton style |
| **« Fiche personnage »** exportable du Pokémon du jour | S | Utile pour du worldbuilding |

### Fun « méta »
| Idée | Effort | Note |
|---|---|---|
| 🥚 **Easter eggs** (codes secrets, Konami code, Pokémon qui fait une blague) | S | Ton léger, comme le Diamant Day |
| 🧾 **Écran « À propos / dev log »** avec ta Note de Diamant | S | Existe déjà dans le changelog |

---

## 7. Prochaine action concrète proposée

1. Tu réponds aux **questions ouvertes** (audit §8) — même en 1 ligne chacune.
2. On lance la **Phase 0** (une petite branche, un seul sujet par commit), car elle corrige des bugs réels sans risque.
3. On enchaîne Phase 1 (noyau + tests), qui débloque tout le reste.
