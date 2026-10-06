# Guide — ajouter un événement (y compris « entre amis »)

Les événements sont des **données**, pas du code : on ajoute une fête en écrivant quelques lignes dans `src/data/events.json`. Rien d'autre à toucher. L'application affiche le bandeau, la liste, la description et les étiquettes toute seule.

> Un événement « entre amis » (anniversaire d'un·e ami·e, soirée entre vous…) est un événement comme les autres : il suffit de choisir la date et le Pokémon préféré de la personne. Tout le monde le verra, puisque c'est dans le fichier de l'application.

## Un exemple complet

```json
{
  "id": "anniv_lea",
  "nameFr": "L'anniversaire de Léa",
  "nameEn": "Léa's birthday",
  "descriptionFr": "C'est l'anniversaire de Léa ! Évoli a 60 % de chances de passer faire la fête. Taux de Chromatique : 1/30.",
  "descriptionEn": "It's Léa's birthday! Eevee has a 60% chance of dropping by. Shiny rate: 1/30.",
  "type": "recurring_date",
  "month": 5,
  "day": 17,
  "modifiers": { "forcedPokemonId": 133, "forcedPokemonChance": 0.6, "shinyRate": 30 }
}
```

## Les champs

| Champ | Rôle |
|---|---|
| `id` | Identifiant unique, sans espace (lettres, chiffres, `_`). |
| `nameFr`, `nameEn`, `descriptionFr`, `descriptionEn` | Textes affichés. **Les quatre sont obligatoires.** |
| `type` | **Quand ?** (voir ci-dessous). |
| `modifiers` | **Quoi ?** Ce que l'événement change. |

### Quand ? (`type`)

| `type` | À remplir | Exemple |
|---|---|---|
| `recurring_date` | `month`, `day` | Chaque 31 octobre : `"month": 10, "day": 31` |
| `recurring_dates` | `dates` : liste de `{ "month", "day" }` | Les 4 changements de saison |
| `recurring_weekday_date` | `weekday` (0 = dimanche … 6 = samedi), `day` | Chaque vendredi 13 : `"weekday": 5, "day": 13` |
| `date_range` | `startDate`, `endDate` (`AAAA-MM-JJ`), `repeats` (`"once"` ou `"yearly"`) | Un mois de sortie : `once` ; une semaine d'été chaque année : `yearly` |
| `date_range_weekday` | comme `date_range` + `weekday` | Chaque dimanche de mars |

### Quoi ? (`modifiers`, tous facultatifs)

| Modificateur | Effet |
|---|---|
| `forcedPokemonId` **ou** `forcedPokemonIds` (liste) | Force ce Pokémon (ou l'un de ceux de la liste, au hasard). **Les formes alternatives marchent aussi** (ex. `10034` = Méga-Dracaufeu X). |
| `forcedPokemonChance` | Probabilité de 0 (exclu) à 1. **Obligatoire dès qu'un Pokémon est forcé.** `1` = à coup sûr. |
| `shinyRate` | Chance de shiny de 1 sur N (ex. `30`). Remplace le 1/69 habituel ; le meilleur taux gagne si plusieurs événements se cumulent. |
| `forcedShiny` | Shiny garanti (si le Pokémon peut l'être). |
| `forcedLevel` | Niveau imposé (1 à 100). |
| `victiniTicketsMin` + `victiniTicketsMax` | Tickets Victini offerts (entre min et max). Vont par deux. |
| `luckyDayBox`, `aprilFoolsBox` | Offrent la boîte spéciale correspondante. |

Trouver l'identifiant d'un Pokémon : c'est son numéro de Pokédex (1 à 1025) ; pour une forme, l'identifiant PokéAPI (10001 et plus, voir `src/data/dex.json`). **Une forme ou un Pokémon sans image est refusé** par la validation.

## Plusieurs événements le même jour

Ils se **cumulent** : tous les jets sont faits ; si plusieurs forcent un Pokémon, c'est le **dernier de la liste** qui gagne ; pour le shiny le **meilleur taux** gagne ; le niveau le plus haut gagne ; les tickets s'additionnent.

## Vérifier avant de publier

1. `pnpm test` : le fichier est contrôlé en entier (faute de frappe, date impossible, Pokémon inconnu, doublon…). Le test « le vrai fichier events.json est valide » donne un message en français qui dit **quel événement et quel champ**. Pense à mettre à jour le nombre d'événements attendu dans ce test.
2. **Simuler le jour** pour voir l'événement sans attendre : ouvre le mode développeur (Ctrl/Cmd+Maj+C, ou le lien en bas de « À propos »), section « Simuler une date », choisis l'événement. C'est un bac à sable : ta vraie collection n'est pas touchée.
3. Relis les textes FR et EN (ton, fautes). Reste dans l'esprit : tutoiement, pas de jargon.
