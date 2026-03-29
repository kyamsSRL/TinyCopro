# Règles de statut des paiements — Analyse

> Date : 2026-03-24

---

## 1. Contraintes techniques

- Toute logique métier côté backend (RPC SECURITY DEFINER)
- Frontend = affichage uniquement, services = passerelle vers RPC
- `auth.uid()` pour identifier l'utilisateur, jamais un paramètre frontend

---

## 2. État actuel

### Qui peut marquer un paiement comme payé
- **Gestionnaire uniquement** — le bouton "Marquer comme payé" est conditionné par `isGestionnaire` dans `PaiementsPage.tsx`
- Un copropriétaire ne peut pas marquer son propre paiement comme payé

### Quand une dépense est-elle "payée" ?
- Actuellement : quand **toutes** les répartitions ont le statut `paye`
- Pas de vérification que la somme payée = montant total de la dépense
- Si un override fait que la somme des répartitions < montant total, la dépense peut quand même être "payée" (bug potentiel)

---

## 3. Changements demandés

### 3.1 Copropriétaire peut marquer son paiement comme payé
- Un copropriétaire doit pouvoir marquer **ses propres** appels de paiement comme payés
- Le gestionnaire peut marquer **tous** les appels comme payés
- Le RPC `mark_payment_as_paid` doit vérifier : soit l'appelant est gestionnaire, soit l'appel lui appartient (`membre_id` correspond à son membre)

### 3.2 Dépense payée = somme des paiements = montant total
- Une dépense n'est considérée "Payé" que si la somme de toutes les répartitions payées = le montant total de la dépense
- Si la somme est inférieure (à cause d'overrides en dessous), le statut reste "En cours" même si tous les membres ont payé leur part
- Le calcul du statut reste côté frontend (c'est de la logique d'affichage) mais la logique est ajustée

---

## 4. User Stories

### US-PAY-1 : Copropriétaire peut marquer son paiement comme payé
**En tant que** copropriétaire,
**je veux** marquer mon propre appel de paiement comme payé,
**afin de** confirmer que j'ai effectué le virement.

**Critères d'acceptation :**
- Le bouton "Marquer comme payé" est visible sur les appels du copropriétaire connecté (pas seulement pour le gestionnaire)
- Le RPC `mark_payment_as_paid` accepte l'appel si l'appelant est le membre concerné OU le gestionnaire
- Le copropriétaire ne peut marquer que ses propres appels
- Le gestionnaire peut marquer les appels de tous les membres

### US-PAY-2 : Dépense payée seulement si somme = total
**En tant que** système,
**je veux** qu'une dépense ne soit considérée "Payé" que si la somme des montants payés = le montant total,
**afin de** refléter la réalité financière.

**Critères d'acceptation :**
- Le statut "Payé" d'une dépense = toutes les répartitions `paye` ET `SUM(montant_effectif) >= montant_total`
- Si la somme est inférieure (overrides en dessous), le statut reste "En attente" ou "En cours" même si tous les membres ont payé
- Ce calcul est de la logique d'affichage (côté frontend dans `getDepenseStatus`)

---

## 5. Change Records

### Backend

| ID | Type | Description |
|---|---|---|
| CR-1 | RPC | Modifier `mark_payment_as_paid` : accepter si `auth.uid()` est gestionnaire OU membre propriétaire de l'appel |

### Frontend

| ID | Type | Description | Fichier |
|---|---|---|---|
| CR-2 | UI | Bouton "Marquer comme payé" visible pour le copropriétaire sur ses propres appels | `PaiementsPage.tsx` |
| CR-3 | UI | `getDepenseStatus` : ajouter vérification somme = total pour statut "Payé" | `DepensesPage.tsx` |

---

## 6. Tests E2E

| Test | Description |
|---|---|
| TC-PAY-1.1 | Copropriétaire voit "Marquer comme payé" sur son propre appel |
| TC-PAY-1.2 | Gestionnaire voit "Marquer comme payé" sur tous les appels |
| TC-PAY-2.1 | Dépense avec overrides < total → statut n'est pas "Payé" même si tous marqués payé |
