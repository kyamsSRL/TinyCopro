# Refonte UI Dépenses — Terminologie, Layout & Auto-acceptation

## Terminologie

| Ancien terme (technique) | Nouveau terme (visible) |
|---|---|
| En attente de validation | **En attente d'acceptation** |
| Validée | *(pas de badge — on passe au statut de paiement)* |

### Statuts visibles dans la liste des dépenses (carte)

| Condition | Badge affiché |
|---|---|
| `is_validated = false` | En attente d'acceptation |
| `is_validated = true`, toutes répartitions `en_cours` | En attente de paiement |
| Au moins une répartition `en_cours_paiement` | En cours de paiement |
| Toutes répartitions `paye` | Payé |

La liste des dépenses (cartes) ne change pas de design. Seuls les libellés de statut et leurs conditions changent.

---

## User Stories

### US-UI-1 : Terminologie "acceptation"
- Remplacer "En attente de validation" par "En attente d'acceptation" partout
- Les 4 statuts visibles : En attente d'acceptation / En attente de paiement / En cours de paiement / Payé

### US-UI-2 : Popup détail dépense — nouveau layout
- Le bouton fermer (X) est sur sa propre ligne, au-dessus du reste
- Titre : gras, légèrement plus grand
- Montant : gras, aligné à droite, sur la même ligne que le titre (pas sous le X)
- Sous le titre : badges date + catégorie + fréquence (pas de badge statut ici)
- Si `!is_validated` : cadre d'acceptation avec boutons Accepter/Refuser + compteur votes
- Si `is_validated` : pas de cadre d'acceptation

### US-UI-3 : Statut global sous "Répartitions"
- Toujours visible sous le titre "Répartitions" quand la dépense est acceptée
- Affiche le statut global : En attente de paiement / En cours de paiement / Payé
- Si `!is_validated` : pas de statut global (le cadre d'acceptation est déjà au-dessus)

### US-UI-4 : Répartitions — layout 2 lignes par copropriétaire
- Ligne 1 : Nom du membre
- Ligne 2 :
  - Gauche : statut du copropriétaire pour cette répartition
  - Centre : bouton [Payer] si applicable (user connecté + répartition `en_cours` + dépense acceptée)
  - Droite : montant (gras)

#### Statut par copropriétaire dans la liste des répartitions

| Situation | Statut affiché |
|---|---|
| Dépense pas acceptée, copro a voté "accepter" | Accepté |
| Dépense pas acceptée, copro a voté "refuser" | Refusé + raison sur ligne suivante (fond gris) |
| Dépense pas acceptée, copro n'a pas voté | *(rien)* |
| Dépense acceptée, répartition `en_cours` | En attente de paiement |
| Dépense acceptée, répartition `en_cours_paiement` | En cours de paiement |
| Dépense acceptée, répartition `paye` | Payé |

**Important** : quand une dépense est auto-acceptée par le gestionnaire, la RPC crée physiquement une ligne `depense_votes` avec `vote = true` pour **chaque membre actif** dans la DB. Ce sont de vraies lignes de vote, identiques à celles créées manuellement. La dépense passe donc directement à `is_validated = true` et le trigger auto-paiement se déclenche. Le résultat visible : la dépense apparaît directement en "En attente de paiement" (ou "Payé" si le solde couvre).

### US-UI-5 : Auto-acceptation par le gestionnaire
- **Actuellement** : les dépenses du gestionnaire sont auto-validées sans créer de votes
- **Nouveau** : le gestionnaire a une checkbox "Auto-accepter" dans le formulaire de création
  - Si cochée : crée des votes "accepté" pour TOUS les membres actifs → `is_validated = true` → trigger auto-paiement
  - Si non cochée : `is_validated = false`, même flux que les dépenses créées par un copropriétaire (votes nécessaires)
- Le copropriétaire n'a pas cette checkbox (sa dépense est toujours en attente d'acceptation)

---

## Design — Popup détail dépense (acceptée, en attente de paiement)

```
┌──────────────────────────────────────────┐
│                                      [X] │  ← X seul sur sa ligne
│                                          │
│ Entretien ascenseur          450.00 EUR  │  ← titre gras + montant gras droite
│                                          │
│ [2026-03-15] [Maintenance] [Unique]      │  ← badges
│                                          │
│ Description si présente...               │
│                                          │
│ Répartitions                             │
│ En attente de paiement                   │  ← statut global dépense
│ ──────────────────────────────────────── │
│ Jean Dupont                              │  ← ligne 1 : nom
│ En attente de paiement [Payer] 225.00 €  │  ← ligne 2 : statut + btn + montant
│ ──────────────────────────────────────── │
│ Marie Martin                             │
│ En attente de paiement         225.00 €  │  ← pas de btn (autre user)
│ ──────────────────────────────────────── │
└──────────────────────────────────────────┘
```

## Design — Popup détail dépense (en attente d'acceptation)

```
┌──────────────────────────────────────────┐
│                                      [X] │
│                                          │
│ Entretien ascenseur          450.00 EUR  │
│                                          │
│ [2026-03-15] [Maintenance] [Unique]      │
│                                          │
│ ┌──────────────────────────────────────┐ │
│ │ En attente d'acceptation  2/3 votes  │ │  ← cadre acceptation
│ │                                      │ │
│ │ [Accepter] [Refuser]  Badge(Accepté) │ │  ← boutons + état du vote
│ └──────────────────────────────────────┘ │
│                                          │
│ Répartitions                             │
│ ──────────────────────────────────────── │
│ Jean Dupont                              │
│ Accepté                        225.00 €  │  ← statut vote
│ ──────────────────────────────────────── │
│ Marie Martin                             │
│ Refusé                         225.00 €  │  ← a voté refuser
│ ┌────────────────────────────────────┐   │
│ │ Trop cher, demander un 2e devis   │   │  ← raison du refus (fond gris)
│ └────────────────────────────────────┘   │
│ ──────────────────────────────────────── │
│ Paul Durand                              │
│                                225.00 €  │  ← pas encore voté
│ ──────────────────────────────────────── │
└──────────────────────────────────────────┘
```

## Design — Formulaire création dépense (gestionnaire)

```
┌──────────────────────────────────────────┐
│ Ajouter une dépense                      │
│                                          │
│ Libellé *           [________________]   │
│ Montant total *     [________________]   │
│ Date *              [________________]   │
│ Catégorie           [▾ Sélectionner  ]   │
│ Fréquence           [▾ Unique        ]   │
│ Description         [________________]   │
│                                          │
│ [✓] Auto-accepter                        │  ← checkbox (gestionnaire only)
│                                          │
│                          [Ajouter]       │
└──────────────────────────────────────────┘
```

Le copropriétaire voit le même formulaire SANS la checkbox.

---

## Changements techniques

### RPC `create_depense_with_repartitions`
- Nouveau paramètre : `p_auto_accept boolean DEFAULT false`
- Si `p_auto_accept = true` ET user est gestionnaire :
  - `is_validated = true`
  - **Créer physiquement une ligne `depense_votes`** pour chaque membre actif avec `vote = true` et `motif_rejet = NULL`
  - Ces lignes sont identiques à des votes manuels — le système de votes est unifié
  - Le trigger `trigger_on_depense_validated()` se déclenche (INSERT avec `is_validated = true`)
- Si `p_auto_accept = false` :
  - `is_validated = false` (même pour le gestionnaire)
  - Aucun vote créé — les membres devront voter manuellement

### Service `createDepense()`
- Nouveau paramètre optionnel : `autoAccept?: boolean`
- Passe `p_auto_accept` à la RPC

### Formulaire `DepenseForm.tsx`
- Checkbox "Auto-accepter" visible uniquement si `isGestionnaire`
- Par défaut cochée (pour garder le comportement habituel du gestionnaire)

### Traductions
- `depenses.autoAccept` : "Auto-accepter" / "Auto-accept" / "Automatisch accepteren"
- `depenses.enAttenteAcceptation` : "En attente d'acceptation" / "Pending acceptance" / "In afwachting van acceptatie"
- `depenses.enAttentePaiement` : "En attente de paiement" / "Pending payment" / "In afwachting van betaling"

### Filtres — passer en backend

**Actuellement** : les filtres (catégorie + statut) sont en frontend — on charge toutes les dépenses puis on filtre en JS avec `depenses.filter(...)`.

**Nouveau** : les filtres doivent être passés au backend via la RPC `get_depenses`.

- Ajouter 2 paramètres optionnels à la RPC :
  - `p_categorie_id uuid DEFAULT NULL` — filtre par catégorie
  - `p_statut text DEFAULT NULL` — filtre par statut visible : `'en_attente_acceptation'`, `'en_attente_paiement'`, `'en_cours_paiement'`, `'paye'`
- Logique côté RPC :
  - `en_attente_acceptation` → `WHERE is_validated = false`
  - `en_attente_paiement` → `WHERE is_validated = true` et toutes répartitions en `en_cours`
  - `en_cours_paiement` → au moins une répartition `en_cours_paiement`
  - `paye` → toutes répartitions `paye`
  - `p_categorie_id` → `WHERE categorie_id = p_categorie_id`
- Mettre à jour le service `listDepenses()` pour accepter les filtres optionnels
- Mettre à jour le composant : au changement de filtre, rappeler `fetchDepenses(category, status)` au lieu de filtrer en local
- Les options du filtre statut doivent être les 4 nouveaux statuts :
  - En attente d'acceptation
  - En attente de paiement
  - En cours de paiement
  - Payé
