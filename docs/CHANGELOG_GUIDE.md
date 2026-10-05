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

**Comment l'ajouter dans le code (`src/data/changelog.ts`) :**
```ts
{
  version: '4.1_b1',
  date: { fr: 'Novembre 2026', en: 'November 2026' },
  note: { fr: 'Mon message personnel ici.', en: 'My personal message here.' }, // ← optionnel
  sections: [...]
}
```

> ⚠️ **L'IA n'écrit jamais la Note de Diamant.** Tant qu'elle ne l'a pas rédigée, on **omet** le champ `note` (un test le vérifie pour la 4.0). Les anciennes notes (3.x) sont les siennes, reprises mot pour mot.

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

Dans la v4, tout est dans **un seul fichier** : `src/data/changelog.ts`. Il alimente la fenêtre « Dernières mises à jour » (qu'on ouvre en touchant le numéro de version, en haut à côté de « Pokédaily »). Ajoute la nouvelle entrée **en premier** dans le tableau `changelog` (la plus récente en haut) :

```ts
export const changelog: ChangelogEntry[] = [
  {
    version: '4.1_b1',
    date: { fr: 'Novembre 2026', en: 'November 2026' },
    // note: { fr: '…', en: '…' },   ← seulement si Diamant l'a écrite
    sections: [
      {
        title: { fr: 'Nouveautés', en: "What's new" },
        items: {
          fr: ['Item en français…'],
          en: ['Item in English…'],
        },
      },
    ],
  },
  // … entrées précédentes
];
```

Le français et l'anglais doivent avoir **le même nombre d'items** par section. Des tests (`tests/features/dev-changelog.test.ts`) vérifient : dates et titres présents dans les deux langues, même nombre d'items, **aucun jargon** (IndexedDB, framework, API…), **pas de vouvoiement**, et l'absence de Note de Diamant tant qu'elle n'est pas écrite.

**Le numéro affiché dans l'en-tête** vient de `package.json` (`version`, réduit à « majeur.mineur » : `4.0.0-dev.1` → `4.0`). Pense à le tenir cohérent avec la dernière entrée.

### `CHANGELOG.md` (facultatif)
Version documentaire en texte brut pour les archives, à la racine du dépôt si on décide d'en tenir un.

---

## 7. Sections disponibles et leur usage

| Section | Utiliser quand… |
|---|---|
| **Nouveautés** | Une fonctionnalité entièrement nouvelle est ajoutée |
| **Améliorations** | Une fonctionnalité existante est rendue plus agréable ou plus pratique |
| **Corrections** | Un comportement bugué ou imprévu est résolu |

Il n'est pas nécessaire d'avoir toutes les sections à chaque version. Une version de correction peut n'avoir qu'une section "Corrections".
