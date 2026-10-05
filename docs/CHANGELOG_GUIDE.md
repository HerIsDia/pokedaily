# Guide de rédaction — Changelog Pokédaily

Ce document définit les règles à suivre pour rédiger les notes de mise à jour de Pokédaily, afin de garantir un style cohérent et accessible à tous les joueurs.

---

## 1. Nommage des versions

Le format est : **`Majeur.Mineur_bNuméroBuild`**

| Composant | Rôle | Exemple |
|---|---|---|
| Majeur | Refonte complète de l'app | `3` |
| Mineur | Ajout de fonctionnalités notables | `0`, `1`, `2`… |
| Build | Itération de correction ou mise à jour | `b1`, `b2`, `b3`… |

**Exemples :**
- `3.0_b1` → première build de la version 3.0 (refonte)
- `3.0_b2` → corrections et ajouts mineurs sur la 3.0
- `3.1_b1` → première build d'une version 3.1 avec de nouvelles fonctionnalités

---

## 2. Structure d'une entrée

Chaque version dans le changelog doit contenir dans l'ordre :

1. **Numéro de version** et **date** (mois + année)
2. **Note de Diamant** *(optionnelle)* — message personnel
3. **Sections de contenu** — une ou plusieurs parmi :
   - `Nouveautés` — fonctionnalités ajoutées
   - `Améliorations` — fonctionnalités existantes améliorées
   - `Corrections` — bugs résolus

---

## 3. La Note de Diamant

La Note de Diamant est un message personnel et optionnel signé *— Diamant*. Elle est affichée en encart au-dessus des sections, dans un bloc distinct.

**Quand l'utiliser :**
- Pour accompagner une version importante (refonte, lancement, nouvelle saison)
- Pour partager une anecdote, une intention ou un message aux utilisateurs
- Pas obligatoire pour chaque petite correction

**Ton :** libre, sincère, personnel. Ce n'est pas un communiqué officiel.

**Comment l'ajouter dans le code (`Changelog.svelte`) :**
```ts
{
  version: '3.1_b1',
  date: 'Juin 2026',
  note: 'Mon message personnel ici.',  // ← champ optionnel
  sections: [...]
}
```

---

## 4. Règles de style pour les items

### ✅ À faire
- Écrire pour **un joueur Pokémon ordinaire** qui ne connaît rien au développement web
- Utiliser **"tu"** (tutoiement)
- Décrire **ce que l'utilisateur voit ou ressent**, pas ce qui a changé dans le code
- Être **concret** : nommer les Pokémon, les dates, les boutons concernés
- Utiliser des phrases complètes et naturelles

### ❌ À éviter
- Tout jargon technique : *IndexedDB, localStorage, framework, API, migration, composant, rune, build…*
- Les termes liés au mode développeur (invisible pour les utilisateurs)
- Les items trop vagues : *"amélioration des performances"*, *"correction de bugs mineurs"*
- Passif impersonnel : préférer *"tu peux désormais…"* à *"il est maintenant possible de…"*

### Exemples comparatifs

| ❌ Trop technique | ✅ Grand public |
|---|---|
| Migration localStorage → IndexedDB | Tes données sont maintenant sauvegardées de façon plus fiable sur ton appareil |
| Fix du bouton copy qui ne donnait pas de feedback | Le bouton "Copier" passe au vert pour confirmer que ta carte a bien été copiée |
| Ajout du système d'events avec modifiers | Des évènements spéciaux apparaissent à certaines dates pour changer ton Pokémon du jour |
| Refactoring du DevPanel | *(ne pas mentionner)* |

---

## 5. Ce qu'on ne mentionne **jamais**

Ces éléments sont internes et n'ont aucun sens pour les utilisateurs :

- Changements dans le mode développeur
- Noms de bibliothèques (Svelte, Vite, Workbox…)
- Détails de base de données (IndexedDB, localStorage, stores…)
- Optimisations de code ou refactoring
- Changements de dépendances ou de configuration

---

## 6. Comment mettre à jour le changelog

Deux fichiers doivent toujours être mis à jour en cohérence :

### `src/lib/components/Changelog.svelte`
C'est le fichier affiché dans l'application. Ajouter la nouvelle entrée **en premier** dans le tableau `entries` (la plus récente en haut) :

```ts
const entries: ChangeEntry[] = [
  {
    version: '3.1_b1',
    date: 'Juin 2026',
    note: 'Message optionnel.',
    sections: [
      {
        title: lang === 'fr' ? 'Nouveautés' : "What's new",
        items: lang === 'fr'
          ? ['Item en français…']
          : ['Item in English…'],
      },
    ],
  },
  // … entrées précédentes
];
```

### `CHANGELOG.md`
C'est la version documentaire (texte brut, pour les archives). Ajouter la section en haut du fichier, avant les versions précédentes. Le contenu peut être légèrement plus concis que dans l'app.

---

## 7. Sections disponibles et leur usage

| Section | Utiliser quand… |
|---|---|
| **Nouveautés** | Une fonctionnalité entièrement nouvelle est ajoutée |
| **Améliorations** | Une fonctionnalité existante est rendue plus agréable ou plus pratique |
| **Corrections** | Un comportement bugué ou imprévu est résolu |

Il n'est pas nécessaire d'avoir toutes les sections à chaque version. Une version de correction peut n'avoir qu'une section "Corrections".
