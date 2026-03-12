# Changelog — Pokédaily

## 3.0_b2 — Mars 2026

### Nouveautés
- **Système d'évènements** : évènements saisonniers (Pokémon Day, Poisson d'avril, Noël, Halloween, Saint-Valentin, Diamant Day, changements de saison, Pokémon GO Fest, Bonne Année, Sortie de Pokopia). Chaque évènement peut modifier le Pokémon du jour (ID forcé, taux Chromatique, niveau).
- **Compte à rebours** en haut de l'app : badge doré si un évènement est actif, compte à rebours violet pour le prochain évènement. Clic pour voir les détails.
- **Changelog** : ce panneau ! Accessible via le badge de version dans le header.
- **Mode développeur revu** : fonctionne maintenant avec IndexedDB. Nouvelle fonctionnalité pour générer automatiquement X jours d'historique aléatoire via l'API.

### Corrections
- Mode développeur corrigé : les données étaient lues depuis `localStorage` (ancien format) au lieu d'IndexedDB.
- Retour visuel sur le bouton « Copier » : le bouton passe désormais au vert lors d'une copie réussie.

---

## 3.0_b1 — Février 2026

### Refonte complète
- Nouvelle interface inspirée de Pokémon Écarlate et Violet (thème Violet).
- Migration des données de `localStorage` vers IndexedDB pour une meilleure fiabilité.
- Migration vers Svelte 5 avec les nouvelles runes (`$state`, `$props`).
- Calendrier historique, Shinydex, support hors-ligne amélioré.
- Nouveau système de partage de carte (canvas + clipboard API).
