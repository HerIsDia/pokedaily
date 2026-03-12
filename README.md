# Pokédaily

**Quel Pokémon es-tu aujourd'hui ?**

Pokédaily est une PWA qui t'assigne un Pokémon aléatoire chaque jour — avec sa nature, son niveau, et une chance d'être shiny. Tout est stocké localement, aucun compte requis.

🌐 **[pokedaily.vercel.app](https://pokedaily.vercel.app)**

---

## Fonctionnalités

- **Pokémon du jour** — Un Pokémon aléatoire parmi les 1025 du Pokédex national, avec nature et niveau aléatoires
- **Shiny** — 1 chance sur 69 (~1,45%) d'obtenir une version shiny
- **Surnom** — Modifie le nom de ton Pokémon du jour directement sur la carte
- **Historique** — Retrouve tous tes Pokémon passés, triés par date
- **Pokédex personnel** — Visualise en grille tous les Pokémon que tu as déjà été
- **Partager sa carte** — Génère une image de ta carte Pokémon et partage-la sur les réseaux sociaux
- **PWA** — Installe l'app sur ton téléphone pour un accès hors-ligne
- **Mode développeur** — `CMD+SHIFT+C` (ou `CTRL+SHIFT+C`) ouvre un panneau pour éditer le Pokémon du jour, l'historique, et forcer un nouveau tirage

---

## Stack technique

| Technologie | Rôle |
|---|---|
| [Svelte 5](https://svelte.dev) | Framework UI (Runes) |
| [TypeScript](https://typescriptlang.org) | Typage statique |
| [Vite 5](https://vitejs.dev) | Build & dev server |
| [pokenode-ts](https://github.com/Gabb-c/pokenode-ts) | Client PokéAPI |
| [vite-plugin-pwa](https://vite-pwa-org.netlify.app/) | PWA & Service Worker |
| [Workbox](https://developer.chrome.com/docs/workbox/) | Cache stratégies |

---

## Lancer localement

```bash
# Cloner le repo
git clone https://github.com/HerIsDia/pokedaily
cd pokedaily

# Installer les dépendances (pnpm requis)
pnpm install

# Lancer le serveur de développement
pnpm dev
```

## Build production

```bash
pnpm build
pnpm preview
```

---

## Architecture

```
src/
├── App.svelte              # Shell principal, routing, navigation
├── app.css                 # Design tokens et styles globaux
├── main.ts                 # Point d'entrée Svelte
├── sw.ts                   # Service Worker (Workbox)
└── lib/
    ├── components/
    │   ├── PokemonCard.svelte   # Carte du Pokémon du jour + partage
    │   ├── Pokedex.svelte       # Grille des 1025 Pokémon
    │   ├── History.svelte       # Historique des Pokémon passés
    │   ├── DevPanel.svelte      # Panneau développeur (CMD+SHIFT+C)
    │   └── InstallBanner.svelte # Bannière d'installation PWA
    └── scripts/
        ├── script.ts        # Logique métier (génération, localStorage)
        ├── pokeAPI.ts       # Wrapper pokenode-ts
        └── connection.ts    # Détection réseau
```

---

## Mode développeur

Appuie sur **`CMD+SHIFT+C`** (Mac) ou **`CTRL+SHIFT+C`** (Windows/Linux) pour ouvrir le panneau développeur. Il permet de :

- Modifier le niveau, le statut shiny et le surnom du Pokémon actuel
- Forcer un nouveau Pokémon aléatoire
- Choisir un Pokémon spécifique par son ID (1–1025)
- Supprimer des entrées de l'historique
- Reset complet des données

---

## Remarques

- Les données sont stockées dans le `localStorage` du navigateur — elles sont locales à l'appareil
- Le Pokémon du jour se renouvelle à minuit UTC
- Les images Pokémon sont servies en local (`/images/`) pour le support hors-ligne

---

## Disclaimer

Pokédaily n'est pas affilié à Nintendo ou Game Freak Inc.
Pokémon et les noms des personnages Pokémon sont des marques déposées de Nintendo.

---

## Licence

[MIT](https://choosealicense.com/licenses/mit/) — Fait par [diamant](https://diamant.ink) avec Claude Code
