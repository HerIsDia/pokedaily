# Pokédaily

**Quel Pokémon es-tu aujourd'hui ?**

Une application web (PWA) qui t'assigne un Pokémon par jour, avec sa nature, son niveau et une petite chance d'être shiny. Tout reste **sur ton appareil** : pas de compte, pas de publicité, pas de suivi.

> 🚧 **Version 4 : prête, pas encore publiée.** Reconstruction de zéro en TypeScript pur, sans framework. L'ancienne version 3.1 est toujours en ligne sur [pokedaily.vercel.app](https://pokedaily.vercel.app) jusqu'à la bascule. État d'avancement : [`docs/REBUILD_PLAN.md`](docs/REBUILD_PLAN.md).

## Ce que fait l'application

- **Un Pokémon par jour** (1 025 espèces + 326 formes alternatives), qui change à **minuit, heure de ton appareil**. Nature, niveau, 1 chance sur 69 d'être shiny ; les événements de l'année (Noël, Halloween, Poisson d'avril…) modifient le tirage.
- Une **carte à partager** (image), l'**historique** en calendrier, le **Pokédex / Shinydex / Formes**, des **statistiques**, la **V-Roulette** (tickets Victini) et la **team du mois**.
- **Installable** sur l'écran d'accueil et **utilisable sans connexion**. Tu peux exporter ta collection dans un fichier et la retrouver ailleurs.

## Principes

- **Local d'abord, hors-ligne d'abord** — aucun serveur à nous.
- **Jamais de monétisation** : ni pub, ni achat, ni statistiques de suivi. Projet fun entre amis.
- **Français + anglais.**
- **Aucun moteur de rendu** (ni Svelte, ni React…) : du TypeScript standard, avec Vite et une PWA.
- **Aucun service tiers ne voit les joueurs** : le site n'appelle que lui-même (une politique de sécurité du navigateur l'impose : `vercel.json`), pas de police ni d'image distante, pas de statistiques.

## Développer

```bash
pnpm install --frozen-lockfile   # Node ≥ 22.12, pnpm 10
pnpm dev                         # serveur de développement
pnpm sprites                     # télécharge les images (≈ 75 s la 1ʳᵉ fois) pour les voir en local
pnpm dex                         # régénère les données Pokémon depuis PokéAPI (rarement utile)
pnpm test                        # tests (Vitest)
pnpm lint && pnpm format && pnpm check && pnpm build   # ce que vérifie la CI
```

## Déploiement (Vercel)

`vercel.json` lance `pnpm sprites --verify && pnpm build` : les **images ne sont pas dans git**, elles sont téléchargées à chaque déploiement (≈ 75 s) depuis [PokeAPI/sprites](https://github.com/PokeAPI/sprites) (version épinglée) puis converties en WebP (128 px et 512 px). Si les images obtenues ne correspondent pas à `src/data/sprites.json`, le déploiement **s'arrête** plutôt que de publier un site incohérent. Le même fichier règle la politique de sécurité et les durées de cache.

## Données et crédits

Noms et types : [PokéAPI](https://pokeapi.co) (en cache local, l'application ne l'appelle jamais). Images : PokeAPI/sprites (rendus Pokémon HOME, illustrations officielles et sprites Écarlate/Violet en repli). Voir « Droits et mentions » ci-dessous.

Documentation : [`AGENTS.md`](AGENTS.md) (consignes pour les agents IA) · [`docs/AUDIT.md`](docs/AUDIT.md) · [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) (v3.1) · [`docs/REBUILD_PLAN.md`](docs/REBUILD_PLAN.md).

## Droits et mentions

Le **code** est sous licence MIT (voir [`LICENCE`](LICENCE)). Les **images et noms de Pokémon** appartiennent à leurs ayants droit (The Pokémon Company, Nintendo, Game Freak, Creatures) et ne sont **pas** couverts par cette licence. Pokédaily est un projet de fans, non commercial, **non affilié** à Nintendo, Game Freak ou The Pokémon Company.

Fait par [diamant](https://diamant.ink).
