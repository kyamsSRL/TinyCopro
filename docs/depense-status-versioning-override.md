# Statuts des dépenses, versioning et override — Analyse

> Date : 2026-03-24

---

## 1. Contraintes techniques

### Règle fondamentale
- **Zéro logique métier côté frontend** — tous les calculs, validations et vérifications dans les RPC PostgreSQL SECURITY DEFINER
- **Frontend = affichage uniquement** — appelle les services, affiche les résultats
- **Services = passerelle** — `src/services/*.ts` appelle `supabase.rpc()`, c'est tout

### Architecture respectée
```
Composant UI → Service (src/services/) → supabase.rpc() → RPC SECURITY DEFINER
```

---

## 2. État actuel et problèmes

### Statuts
Le statut d'une dépense est dérivé côté frontend des statuts des répartitions (c'est de la logique d'affichage, pas de la logique métier — acceptable côté frontend) :
- `en_cours` → affiché "En attente"
- `en_cours_paiement` → affiché "En cours"
- `paye` → affiché "Payé"

**Problème** : les labels actuels ne correspondent pas. "En cours" est actuellement "En cours de paiement", il faut simplifier.

### Suppression
Aucune vérification : on peut supprimer une dépense même si des répartitions sont en cours de paiement ou payées.

### Modification
Aucune vérification de concurrence : deux utilisateurs peuvent modifier la même dépense en même temps, le dernier écrase les modifications du premier.

### Override
Aucune validation que la somme des overrides ne dépasse pas le montant total de la dépense.

---

## 3. User Stories

### US-STAT-1 : Statuts clairs des dépenses
**En tant que** membre,
**je veux** voir le statut de chaque dépense (En attente / En cours de paiement / Payé),
**afin de** savoir où en est chaque charge.

**Critères d'acceptation :**
- Les labels sont : **"En attente"** (`en_cours`), **"En cours"** (`en_cours_paiement`), **"Payé"** (`paye`)
- Le statut est calculé côté frontend (logique d'affichage à partir des statuts des répartitions — acceptable)
- À côté du nom du membre connecté, si sa répartition est "En attente" → bouton "Payer" visible
- Le bouton "Payer" navigue vers la page Paiements avec le dialog de sélection ouvert (`?generate=true`)
- Le bouton "Payer" ne pré-sélectionne pas les dépenses — l'utilisateur choisit

### US-STAT-2 : Interdiction de supprimer une dépense en cours ou payée
**En tant que** système,
**je veux** empêcher la suppression d'une dépense dont au moins une répartition est en cours de paiement ou payée,
**afin de** garantir l'intégrité financière.

**Critères d'acceptation :**
- Le RPC `delete_depense` vérifie : si au moins une répartition a `statut IN ('en_cours_paiement', 'paye')` → RAISE EXCEPTION
- Le frontend affiche le bouton "Supprimer" uniquement si toutes les répartitions sont `en_cours` (calculé côté backend)
- Message d'erreur clair si tentative de suppression bloquée

### US-STAT-3 : Interdiction de modifier une dépense en cours ou payée
**En tant que** système,
**je veux** empêcher la modification d'une dépense dont au moins une répartition est en cours de paiement ou payée,
**afin d'** éviter les incohérences.

**Critères d'acceptation :**
- Le RPC `update_depense` vérifie : si au moins une répartition a `statut IN ('en_cours_paiement', 'paye')` → RAISE EXCEPTION
- Le frontend affiche le bouton "Modifier" uniquement si toutes les répartitions sont `en_cours` (calculé côté backend)
- Message d'erreur clair si tentative de modification bloquée

### US-VER-1 : Versioning optimiste des dépenses
**En tant que** système,
**je veux** un système de versioning sur les dépenses,
**afin d'** empêcher les modifications concurrentes.

**Critères d'acceptation :**
- Nouvelle colonne `version integer DEFAULT 1` sur la table `depenses`
- À chaque modification réussie, `version` est incrémenté
- Le RPC `update_depense` reçoit `p_version` : si `version` en DB ≠ `p_version` fourni → RAISE EXCEPTION "Depense has been modified"
- Le RPC `delete_depense` reçoit `p_version` : même vérification
- Le frontend passe toujours la `version` qu'il connaît (reçue via `get_depenses`)
- Si conflit → message d'erreur demandant de rafraîchir

### US-OVR-1 : Validation de l'override — somme ≤ montant total
**En tant que** système,
**je veux** que la somme des montants effectifs (override ou calculé) de toutes les répartitions ne dépasse pas le montant total de la dépense,
**afin de** garantir la cohérence financière.

**Critères d'acceptation :**
- Le RPC `override_repartition` calcule : `somme_autres = SUM(COALESCE(montant_override, montant_du)) pour les autres répartitions`
- Si `somme_autres + nouveau_montant > montant_total` → RAISE EXCEPTION
- Si `somme_autres + nouveau_montant < montant_total` → accepté (la dépense ne sera pas totalement couverte)
- Le frontend affiche le montant max autorisé dans le dialog d'override

### US-OVR-2 : Dépense partiellement couverte
**En tant que** gestionnaire,
**je veux** être informé qu'une dépense n'est pas totalement couverte après un override,
**afin de** prendre une décision.

**Critères d'acceptation :**
- Si la somme des répartitions < montant total → badge/indicateur "Partiellement couvert" sur la dépense
- Le statut "Payé" ne peut être atteint que si toutes les répartitions sont `paye` (déjà le cas)
- Pas de solution automatique pour l'instant — le gestionnaire gère manuellement

---

## 4. Change Records

### Backend (DB + RPC)

| ID | Type | Description |
|---|---|---|
| CR-1 | Migration | Ajouter `version integer DEFAULT 1` à la table `depenses` |
| CR-2 | RPC | Modifier `delete_depense` : vérifier qu'aucune répartition n'est en paiement/payée + vérifier version |
| CR-3 | RPC | Modifier `update_depense` : vérifier qu'aucune répartition n'est en paiement/payée + vérifier version + incrémenter version |
| CR-4 | RPC | Modifier `override_repartition` : vérifier que somme ≤ montant_total |
| CR-5 | RPC | Modifier `get_depenses` : inclure `version`, `can_edit` (bool), `can_delete` (bool) pour chaque dépense |

### Frontend

| ID | Type | Description | Fichier |
|---|---|---|---|
| CR-6 | UI | Renommer labels : `en_cours` → "En attente" / "Pending" / "In afwachting", `en_cours_paiement` → "En cours" / "In progress" / "Lopend" | Messages fr/en/nl |
| CR-7 | UI | Bouton "Payer" dans le détail de la dépense (à côté de la répartition du user connecté si en attente) | `DepensesPage.tsx` |
| CR-8 | UI | Cacher bouton Modifier/Supprimer si `can_edit`/`can_delete` = false | `DepensesPage.tsx` |
| CR-9 | UI | Passer `version` dans les appels `updateDepense` et `deleteDepense` | Services + composants |
| CR-10 | UI | Afficher montant max dans OverrideDialog | `OverrideDialog.tsx` |
| CR-11 | UI | Badge "Partiellement couvert" si somme répartitions < montant total | `DepensesPage.tsx` |
| CR-12 | Types | `depenses.version`, `can_edit`, `can_delete` dans les types + services | Types TS |

---

## 5. Plan de test

### Tests E2E à ajouter (et lancer)

| Test | Description | Automatisable E2E |
|---|---|---|
| TC-STAT-1.1 | Dépense nouvelle affiche "En attente" (pas "En cours") | Oui |
| TC-STAT-1.2 | Bouton "Payer" visible dans le détail de la dépense à côté de la répartition du user connecté si en attente | Oui |
| TC-STAT-1.3 | Bouton "Payer" navigue vers /paiements?generate=true (dialog ouvert, pas de pré-sélection) | Oui |
| TC-STAT-1.4 | Après génération de paiement, la dépense affiche "En cours" (pas "En cours de paiement") | Oui |
| TC-STAT-1.5 | Après marquage payé, la dépense affiche "Payé" | Oui |
| TC-STAT-2.1 | Bouton Supprimer caché si au moins une répartition est en cours ou payée | Oui |
| TC-STAT-2.2 | RPC delete_depense refuse si répartition en cours/payée (même si frontend bypass) | Oui (via test d'erreur) |
| TC-STAT-3.1 | Bouton Modifier caché si au moins une répartition est en cours ou payée | Oui |
| TC-STAT-3.2 | RPC update_depense refuse si répartition en cours/payée | Oui (via test d'erreur) |
| TC-VER-1.1 | Modification avec bonne version → succès, version incrémentée | Oui |
| TC-OVR-1.1 | Override qui fait dépasser la somme au-dessus du total → erreur RPC | Oui |
| TC-OVR-2.1 | Override en dessous du total → badge "Partiellement couvert" visible | Oui |

### Tests manuels
1. Créer une dépense → statut "En attente"
2. Générer un paiement → statut passe à "En cours de paiement" → bouton Supprimer/Modifier disparaît
3. Marquer payé → statut "Payé"
4. Tenter de modifier une dépense depuis 2 onglets → le 2e échoue avec "modified"
5. Override qui dépasse → erreur affichée
6. Override en dessous → badge "Partiellement couvert"
