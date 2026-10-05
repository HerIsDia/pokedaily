# Pokédaily

**Quel Pokémon es-tu aujourd'hui ?**

Une application web (PWA) qui t'assigne un Pokémon par jour, avec sa nature, son niveau et une petite chance d'être shiny. Tout reste **sur ton appareil** : pas de compte, pas de publicité, pas de suivi.

> 🚧 **Version 4 en construction** (reconstruction de zéro en TypeScript pur, sans framework). L'ancienne version 3.1 est toujours en ligne sur [pokedaily.vercel.app](https://pokedaily.vercel.app). État d'avancement : [`docs/REBUILD_PLAN.md`](docs/REBUILD_PLAN.md).

## Principes

- **Local d'abord, hors-ligne d'abord** — aucun serveur à nous.
- **Jamais de monétisation** : ni pub, ni achat, ni statistiques de suivi. Projet fun entre amis.
- **Français + anglais.**
- **Aucun moteur de rendu** (ni Svelte, ni React…) : du TypeScript standard, avec Vite et une PWA.

## Développer

```bash
pnpm install --frozen-lockfile   # Node ≥ 22.12, pnpm 10
pnpm dev                         # serveur de développement
pnpm test                        # tests (Vitest)
pnpm lint && pnpm format && pnpm check && pnpm build   # ce que vérifie la CI
```

Documentation : [`AGENTS.md`](AGENTS.md) (consignes pour les agents IA) · [`docs/AUDIT.md`](docs/AUDIT.md) · [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) (v3.1) · [`docs/REBUILD_PLAN.md`](docs/REBUILD_PLAN.md).

## Droits et mentions

Le **code** est sous licence MIT (voir [`LICENCE`](LICENCE)). Les **images et noms de Pokémon** appartiennent à leurs ayants droit (The Pokémon Company, Nintendo, Game Freak, Creatures) et ne sont **pas** couverts par cette licence. Pokédaily est un projet de fans, non commercial, **non affilié** à Nintendo, Game Freak ou The Pokémon Company.

Fait par [diamant](https://diamant.ink).
