# Design responsive : Tableau PC / Cartes mobile

## Principe

- **PC (>= 768px)** : liste sous forme de tableau avec colonnes
- **Mobile (< 768px)** : cartes empilées (1 colonne, comme actuellement)
- Les popups ne changent pas
- Seuls les 3 écrans avec listes sont concernés : Dépenses, Paiements, Dépôts

---

## 1. Dépenses

### PC — Tableau

```
┌──────────────────────────────────────────────────────────────────────────┐
│ Libellé              │ Date       │ Catégorie    │ Montant   │ Statut   │
├──────────────────────┼────────────┼──────────────┼───────────┼──────────┤
│ Entretien ascenseur  │ 2026-03-15 │ Maintenance  │ 450.00 €  │ ●En att. │
│ Frais de syndic      │ 2026-03-01 │ Admin        │ 1200.00 € │ ●Payé    │
│ Nettoyage            │ 2026-02-15 │ Entretien    │ 150.00 €  │ ●En att. │
└──────────────────────┴────────────┴──────────────┴───────────┴──────────┘
```

- Colonnes : Libellé | Date | Catégorie | Montant | Statut (badge)
- Ligne cliquable → ouvre la popup de détail (même comportement qu'actuellement)
- Ligne hover : `bg-muted/50`

### Mobile — Carte (inchangé)

```
┌──────────────────────────────┐
│ Entretien ascenseur  [●Stat] │
│ 2026-03-15 · Maintenance     │
│                    450.00 €  │
└──────────────────────────────┘
```

---

## 2. Paiements (Mes paiements / Tous les paiements)

### PC — Tableau

```
┌──────────────────────────────────────────────────────────────────────────────────┐
│ Référence        │ Membre         │ Date       │ Montant   │ Statut   │ Action  │
├──────────────────┼────────────────┼────────────┼───────────┼──────────┼─────────┤
│ AP-20260315-abc  │ Jean Dupont    │ 15/03/2026 │ 225.00 €  │ ●En att. │ [Payé]  │
│ AP-20260301-def  │ Marie Martin   │ 01/03/2026 │ 600.00 €  │ ●Payé    │         │
└──────────────────┴────────────────┴────────────┴───────────┴──────────┴─────────┘
```

- Colonnes : Référence | Membre (seulement onglet "Tous") | Date | Montant | Statut | Action (bouton "Marquer payé")
- Ligne cliquable → popup de détail
- Colonne "Membre" masquée dans l'onglet "Mes paiements"

### Mobile — Carte (inchangé)

```
┌──────────────────────────────┐
│ AP-20260315-abc      [●Stat] │
│ Jean Dupont · 15/03/2026     │
│                    225.00 €  │
│        [Marquer comme payé]  │
└──────────────────────────────┘
```

---

## 3. Dépôts (onglet "Mes dépôts" dans Paiements)

### PC — Tableau

```
┌─────────────────────────────────────────────────────┐
│ Référence          │ Date       │ Montant           │
├────────────────────┼────────────┼───────────────────┤
│ Dépôt mars         │ 15/03/2026 │ 200.00 €          │
│ Dépôt              │ 01/02/2026 │ 100.00 €          │
└────────────────────┴────────────┴───────────────────┘
```

- Colonnes : Référence | Date | Montant
- Pas cliquable (pas de popup détail pour les dépôts)

### Mobile — Carte (inchangé)

```
┌──────────────────────────────┐
│ Dépôt mars         200.00 €  │
│ 15/03/2026                   │
└──────────────────────────────┘
```

---

## 4. Membres

### PC — Tableau

```
┌────────────────────────────────────────────────────────────────────────────────┐
│ Nom              │ Alias        │ Rôle           │ Millièmes │ Actions         │
├──────────────────┼──────────────┼────────────────┼───────────┼─────────────────┤
│ Jean Dupont      │              │ Gestionnaire   │ 500       │                 │
│ Marie Martin     │ Loc. Dupuis  │ Copropriétaire │ 300       │ [Transférer]    │
│ (en attente)     │ Futur copro  │ Copropriétaire │ 200       │ [Révoquer]      │
└──────────────────┴──────────────┴────────────────┴───────────┴─────────────────┘
```

- Colonnes : Nom | Alias | Rôle | Millièmes | Actions (transférer, révoquer, etc.)
- Invitations en attente affichées avec indication "(en attente)"

### Mobile — Carte (inchangé)

Le design actuel des cartes membres est conservé.

---

## Implémentation technique

### Approche : composant conditionnel avec `md:` breakpoint

```tsx
{/* Tableau visible >= md */}
<div className="hidden md:block">
  <table className="w-full text-sm">
    <thead>...</thead>
    <tbody>
      {items.map(item => <tr className="hover:bg-muted/50 cursor-pointer" onClick={...}>...</tr>)}
    </tbody>
  </table>
</div>

{/* Cartes visibles < md */}
<div className="md:hidden grid gap-2">
  {items.map(item => <Card ... />)}
</div>
```

- Le tableau et les cartes coexistent dans le DOM
- `hidden md:block` / `md:hidden` bascule entre les deux
- Les cartes restent exactement comme aujourd'hui
- Le tableau reprend les mêmes données avec un `onClick` identique

### Fichiers à modifier

| Fichier | Changement |
|---|---|
| `src/components/pages/DepensesPage.tsx` | Tableau + cartes conditionnel |
| `src/components/pages/PaiementsPage.tsx` | Tableau + cartes conditionnel (appels + dépôts) |
| `src/components/copro/` (page membres) | Tableau + cartes conditionnel |

---

## Navigation mobile : Bottom Navigation Bar

### Actuellement
- Bouton flottant en bas à gauche (hamburger) → ouvre un Sheet (sidebar) depuis la gauche
- Lien "← Mes copropriétés" en bas du Sheet

### Nouveau design

Remplacer le bouton flottant + Sheet par une **barre de navigation fixe en bas** (style app mobile).

```
┌──────────────────────────────────────────────┐
│                                              │
│            Contenu de la page                │
│                                              │
├──────────────────────────────────────────────┤
│  🏠       📋       💳       👥       ⚙️     │
│ Tableau  Dépenses Paiements Membres Param.   │
└──────────────────────────────────────────────┘
```

- Fixé en bas de l'écran (`fixed bottom-0`)
- 5 items : Dashboard | Dépenses | Paiements | Membres | Paramètres
- Chaque item : icône + texte court en dessous
- Item actif : couleur primary
- Visible uniquement en mobile (`md:hidden`)
- Padding-bottom sur le contenu pour ne pas être masqué par la barre

### Lien "Mes copropriétés"

Déplacé dans le **menu avatar** (dropdown en haut à droite du Header) :

```
┌─────────────────────┐
│ Fabrice Kyambikwa    │
│ fabrice@email.com    │
├─────────────────────┤
│ 🏢 Mes copropriétés │  ← nouveau
│ 👤 Profil            │
├─────────────────────┤
│ 🚪 Déconnexion       │
└─────────────────────┘
```

### Fichiers à modifier

| Fichier | Changement |
|---|---|
| `src/components/copro/CoproDetailShell.tsx` | Supprimer Sheet + bouton flottant, ajouter bottom nav bar |
| `src/components/layout/Header.tsx` | Ajouter "Mes copropriétés" dans le dropdown avatar |

### Ce qui ne change PAS

- Navigation desktop (sidebar verticale à gauche) → inchangée
- Toutes les popups (détail dépense, détail paiement, générer paiement, marquer payé, etc.)
- Le dashboard (stats, soldes membres, pending depenses, transactions)
- Les filtres (restent au-dessus, identiques)
- Le comportement au clic (ouvre la même popup)
