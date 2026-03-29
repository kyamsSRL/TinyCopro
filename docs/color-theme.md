# Thème couleur — Turquoise pastel

## Couleur primaire choisie

**Turquoise pastel** : `oklch(0.75 0.1 180)` (~`#5BB8B0`)

Déclinaisons :
- **Primaire complète** : `oklch(0.75 0.1 180)` — boutons uniquement
- **Primaire pâle** (badges positifs) : `oklch(0.92 0.04 180)` — fond très léger turquoise
- **Primaire pâle foreground** : `oklch(0.45 0.08 180)` — texte turquoise foncé sur fond pâle
- **Primary foreground** : `oklch(0.985 0 0)` — blanc (texte sur bouton)

---

## Règles d'application

### Boutons
| Élément | Avant | Après |
|---|---|---|
| Bouton default (noir) | `bg-primary` (noir) | `bg-primary` (turquoise) |
| Bouton hover | noir foncé | turquoise foncé |
| Texte bouton | blanc | blanc (inchangé) |

Tous les boutons noirs deviennent turquoise. Les boutons `outline`, `ghost`, `destructive` ne changent pas de logique.

### Badges / Statuts

**Aucun badge ne peut avoir la couleur primaire complète.** Uniquement des versions pâles ou grises.

| Statut | Variant actuel | Nouveau style |
|---|---|---|
| En attente d'acceptation | `secondary` (gris) | Gris — `bg-secondary` (inchangé) |
| En attente de paiement | `outline` (bordure) | Gris — `bg-secondary` |
| En cours de paiement | `secondary` (gris) | Gris — `bg-secondary` (inchangé) |
| Accepté | `default` (noir) | Pâle turquoise — `bg-primary/10 text-primary` |
| Payé | `default` (noir) | Pâle turquoise — `bg-primary/10 text-primary` |
| Refusé | `destructive` | Rouge pâle (inchangé) |
| Rôle Gestionnaire | `default` (noir) | Pâle turquoise |
| Rôle Copropriétaire | `secondary` (gris) | Gris (inchangé) |

### Onglets (Tabs)
| Élément | Avant | Après |
|---|---|---|
| Onglet sélectionné | Style par défaut | Texte turquoise + indicateur turquoise |
| Onglet non sélectionné | Gris | Gris (inchangé) |

### Navigation latérale (desktop)
| Élément | Avant | Après |
|---|---|---|
| Item sélectionné | `bg-primary/10 text-primary` (noir) | `bg-muted text-primary` (fond gris, texte+icône turquoise) |
| Item non sélectionné | Gris | Gris (inchangé) |

### Navigation bottom bar (mobile)
| Élément | Avant | Après |
|---|---|---|
| Item sélectionné | `text-primary` (noir) | `text-primary` (turquoise) — pas de fond |
| Item non sélectionné | `text-muted-foreground` | Gris (inchangé) |

---

## Implémentation technique

Modifier uniquement `src/app/globals.css` — les variables CSS `--primary` :

```css
:root {
  --primary: oklch(0.75 0.1 180);        /* turquoise */
  --primary-foreground: oklch(0.985 0 0); /* blanc */
}
.dark {
  --primary: oklch(0.75 0.1 180);        /* même turquoise en dark */
  --primary-foreground: oklch(0.145 0 0); /* noir */
}
```

Et dans les composants, remplacer les badges `default` (noir) des statuts positifs par un style pâle (`bg-primary/10 text-primary`).

### Fichiers à modifier

| Fichier | Changement |
|---|---|
| `src/app/globals.css` | `--primary` → turquoise |
| `src/components/pages/DepensesPage.tsx` | Badges "Accepté" et "Payé" → `bg-primary/10 text-primary` |
| `src/components/pages/PaiementsPage.tsx` | Badge "Payé" |
| `src/components/pages/MembresPage.tsx` | Badge "Gestionnaire" |
| `src/components/pages/CoproDashboardPage.tsx` | Badges dans les dépenses |
| `src/components/copro/CoproDetailShell.tsx` | Nav active → `bg-muted text-primary` |
