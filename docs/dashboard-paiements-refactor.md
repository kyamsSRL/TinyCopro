# Refactoring Dashboard & Paiements — Analyse

> Date : 2026-03-24

---

## 1. État actuel

### Dashboard gestionnaire
- 4 cards : nombre de membres, dépenses totales, encaissé, restant dû
- "Membres en retard" : liste des membres avec des répartitions `en_cours`
- Répartition par catégorie
- Infos bancaires
- 3 boutons raccourcis : Dépenses, Paiements, Paramètres

### Dashboard copropriétaire
- 3 cards : total dû, en cours de paiement, total payé
- Prochaines échéances
- 2 boutons raccourcis : Générer un paiement, Voir les dépenses

### Page Paiements
- Bouton "Générer un paiement" → ouvre le dialog `GeneratePaymentForm`
- Liste des appels de paiement (cards) avec statut
- Gestionnaire : onglets "Mon historique" / "Tous les paiements"
- Actions : télécharger PDF, marquer payé, joindre preuve

### Concept de "dépôt" / "solde"
**N'existe pas actuellement.** Pas de table ni colonne pour les dépôts. Le système ne gère que les dettes (répartitions) et leur paiement.

---

## 2. Contraintes techniques

### Règle fondamentale : séparation front/back

**Toute la logique métier est côté backend (PostgreSQL SECURITY DEFINER).**
Le frontend ne contient que de la logique d'affichage (UI).

| Couche | Responsabilité | Exemples |
|---|---|---|
| **Frontend (composants)** | Affichage, navigation, interactions UI | Afficher les cards, gérer les dialogs, formater les montants |
| **Frontend (services)** | Passerelle vers le backend | Appeler `supabase.rpc()`, transmettre les résultats aux composants |
| **Backend (RPC)** | Logique métier, calculs, validations, permissions | Calculer le solde, vérifier les droits, déduire le surplus, agréger les stats |

**Interdit côté frontend :**
- Calculer des montants ou des soldes
- Vérifier des permissions (gestionnaire vs copropriétaire)
- Effectuer des opérations multi-étapes (insert + update + delete)
- Utiliser `supabase.from()` dans les composants (tout passe par `src/services/`)

**Les RPC doivent :**
- Utiliser `auth.uid()` pour identifier l'utilisateur (jamais un paramètre du frontend)
- Vérifier `is_member_of()` ou `is_gestionnaire_of()` selon le contexte
- Être atomiques (une seule transaction pour les opérations multi-étapes)

---

## 3. Changements demandés

### 3.1 Dashboard unifié (gestionnaire = copropriétaire)

Le dashboard est **identique** pour les deux rôles. Organisé en deux sections :

#### Section 1 : "Mon état financier" (ligne du haut)

3 cards sur la même ligne, sous le titre "Mon état financier" :

| Carte | Description |
|---|---|
| **Total dû** | Somme des répartitions `en_cours` du membre connecté. Contient un **bouton "Payer"**. |
| **En cours de paiement** | Somme des répartitions `en_cours_paiement` du membre connecté |
| **Total payé** | Somme des répartitions `paye` du membre connecté |

Le bouton "Payer" navigue vers la page Paiements avec le dialog "Générer un paiement" déjà ouvert.

**Backend** : ces 3 montants sont calculés par une RPC `get_dashboard_stats(p_copro_id)` qui utilise `auth.uid()` pour identifier le membre connecté. Le frontend ne fait aucun calcul.

#### Section 2 : "Ma copropriété" (lignes suivantes)

| Élément | Description | Layout |
|---|---|---|
| **IBAN** | Affiche l'IBAN de la copropriété (toujours visible) | En haut de la section |
| **Dépenses totales** | Montant total des dépenses de l'exercice en cours | Card |
| **Encaissé** | Somme des répartitions `paye` de tous les membres | Card |
| **Restant dû** | Dépenses totales - encaissé | Card |
| **Soldes membres** | Pour chaque membre, 2 colonnes : **Dû** (≤ 0, somme répartitions non payées) et **Dépôt** (≥ 0, somme des dépôts). Jamais mélangés. | Card avec tableau |
| **Répartition par catégorie** | Ventilation des dépenses par catégorie | Card |

**Backend** : toutes ces valeurs sont agrégées par la même RPC `get_dashboard_stats`. Le calcul des soldes inclut les dépôts.

**Supprimé** :
- Les 3 boutons raccourcis (Dépenses, Paiements, Paramètres) — la sidebar les couvre déjà
- Les "prochaines échéances" (redondant avec "Total dû")
- BIC et autres infos bancaires (seul l'IBAN est conservé)
- La distinction gestionnaire/copropriétaire dans l'affichage

### 3.2 Système de dépôt

Un membre peut **déposer un montant** dans la copropriété. Ce montant est un crédit qui réduit sa dette future.

#### Nouvelle table : `depots`
```sql
CREATE TABLE depots (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  membre_id   uuid NOT NULL REFERENCES membres(id),
  copropriete_id uuid NOT NULL REFERENCES coproprietes(id),
  montant     numeric NOT NULL CHECK (montant > 0),
  date_depot  date NOT NULL DEFAULT current_date,
  reference   text,
  created_at  timestamptz DEFAULT now()
);
```

#### Logique de solde (calculée côté backend uniquement)

Pour chaque membre, la RPC calcule :
```
solde = SUM(depots.montant) - SUM(repartitions.montant_effectif WHERE statut IN ('en_cours', 'en_cours_paiement'))
```
Où `montant_effectif = COALESCE(montant_override, montant_du)`

- `solde < 0` → le membre doit de l'argent
- `solde = 0` → à jour
- `solde > 0` → le membre a un surplus (dépôt excédentaire)

Le frontend reçoit le solde déjà calculé et ne fait qu'afficher.

#### Impact sur la génération de paiement (logique backend)

La RPC `generate_payment` est modifiée pour :
1. Calculer le total des répartitions sélectionnées
2. Calculer le solde positif du membre (surplus de dépôts)
3. `montant_paiement = MAX(0, montant_repartitions - solde_positif)`
4. Le surplus est "consommé" naturellement (les répartitions passent en `en_cours_paiement`)
5. Le PDF reflète le montant réel à payer

Le frontend n'intervient pas dans ce calcul.

### 3.3 Page Paiements — Bouton "Déposer un montant"

Deux boutons en haut :
1. **Générer un paiement** (existant) — sélectionne des répartitions, génère un appel
2. **Déposer un montant** (nouveau) — saisit un montant + référence optionnelle, date

**Backend** : `create_deposit(p_copro_id, p_montant, p_reference, p_date)` — vérifie `auth.uid()` et `is_member_of()`, insère dans `depots`.

### 3.4 Auto-ouverture du dialog de paiement

Quand l'URL contient `?generate=true`, la page Paiements ouvre automatiquement le dialog `GeneratePaymentForm`. C'est de la logique UI pure (lecture d'un query param).

---

## 4. User Stories

### US-DASH-1 : Dashboard unifié
**En tant que** membre (gestionnaire ou copropriétaire),
**je veux** voir un dashboard identique quel que soit mon rôle,
**afin de** comprendre ma situation financière et celle de la copropriété.

**Critères d'acceptation :**
- Section "Mon état financier" : 3 cards sur une ligne (Total dû, En cours de paiement, Total payé) — propres au membre connecté
- Bouton "Payer" dans la carte "Total dû"
- Section "Ma copropriété" : IBAN visible, cards stats (dépenses totales, encaissé, restant dû), soldes membres, répartition par catégorie
- Pas de boutons raccourcis en bas
- Pas de différence de contenu entre gestionnaire et copropriétaire
- Tous les montants sont calculés côté backend

### US-DASH-2 : Bouton "Payer" dans le dashboard
**En tant que** membre,
**je veux** cliquer sur "Payer" dans la carte "Total dû",
**afin d'** aller directement à la page Paiements avec le dialog de génération de paiement ouvert.

**Critères d'acceptation :**
- Le clic navigue vers `/{locale}/copro/{id}/paiements?generate=true`
- La page Paiements ouvre automatiquement le dialog `GeneratePaymentForm`

### US-DEP-1 : Déposer un montant
**En tant que** membre,
**je veux** déposer un montant dans la copropriété,
**afin de** constituer un crédit qui réduira mes prochains paiements.

**Critères d'acceptation :**
- Bouton "Déposer un montant" sur la page Paiements
- Dialog avec champs : montant (obligatoire, > 0), référence (optionnel), date
- Le dépôt est enregistré via RPC `create_deposit` (vérifie auth + membership côté serveur)
- Le solde du membre est mis à jour (visible dans "Soldes membres" du dashboard)

### US-DEP-2 : Solde déduit lors de la génération de paiement
**En tant que** membre avec un solde positif,
**je veux** que mon solde soit automatiquement déduit du montant à payer,
**afin de** ne pas payer plus que ce que je dois.

**Critères d'acceptation :**
- Lors de la génération d'un paiement, la RPC calcule : montant = total répartitions - solde positif (minimum 0)
- Le surplus restant est conservé pour les prochains paiements
- Le PDF reflète le montant réel à payer (après déduction)
- Le frontend affiche le montant reçu de la RPC sans le recalculer

### US-DASH-3 : Carte "Soldes membres"
**En tant que** membre,
**je veux** voir le solde de chaque membre de la copropriété,
**afin de** savoir qui est à jour et qui a des impayés.

**Critères d'acceptation :**
- Pour chaque membre : nom + 2 colonnes (Dû ≤ 0, Dépôt ≥ 0)
- Dû = -somme des répartitions non payées (négatif ou zéro)
- Dépôt = somme des dépôts (positif ou zéro)
- Calculé côté backend (RPC), jamais côté frontend
- Visible par tous les membres

---

## 5. Change Records

### Backend (migrations DB + RPC)

| ID | Type | Description |
|---|---|---|
| CR-1 | Migration | Créer table `depots` avec RLS |
| CR-2 | RPC | `create_deposit(p_copro_id, p_montant, p_reference, p_date)` — auth.uid() + is_member_of |
| CR-3 | RPC | `get_dashboard_stats(p_copro_id)` — retourne en un seul appel : stats perso (total dû/pending/payé), stats copro (dépenses totales/encaissé/restant), soldes tous membres, catégories |
| CR-4 | RPC | Modifier `generate_payment` — déduire le solde positif du montant généré |

### Frontend (services)

| ID | Type | Description | Fichier |
|---|---|---|---|
| CR-5 | Service | `createDeposit()` | `src/services/paiement.ts` |
| CR-6 | Service | `getDashboardStats()` | `src/services/copropriete.ts` |

### Frontend (UI — logique d'affichage uniquement)

| ID | Type | Description | Fichier |
|---|---|---|---|
| CR-7 | UI | Réécrire `CoproDashboardPage.tsx` — 2 sections, cards, bouton Payer | Composant |
| CR-8 | UI | `PaiementsPage.tsx` — bouton "Déposer", dialog dépôt | Composant |
| CR-9 | UI | `PaiementsPage.tsx` — ouvrir dialog si `?generate=true` | Composant |
| CR-10 | Types | `src/types/database.types.ts` — table `depots`, nouvelles RPC | Types |
| CR-11 | Traductions | Clés fr/en/nl : dépôt, solde, mon état financier, ma copropriété, payer | Messages |

---

## 6. Plan de test

### Tests manuels
1. **Dashboard** : se connecter en gestionnaire → même dashboard qu'un copropriétaire
2. **"Mon état financier"** : 3 cards affichent les bons montants (propres au membre connecté)
3. **Bouton "Payer"** : navigue vers Paiements avec dialog ouvert
4. **"Ma copropriété"** : IBAN visible, stats copro correctes
5. **Déposer** : déposer 100€ → solde dans "Soldes membres" reflète le changement
6. **Soldes membres** : tous les membres listés avec le bon solde (couleur correcte)
7. **Générer paiement avec solde positif** : déposer 500€, dépenses = 300€ → montant paiement = 0€, solde restant = 200€

### Tests E2E (à ajouter dans `e2e/test-cases.md`)

| Test | Description |
|---|---|
| TC-DASH-1.1 | Dashboard gestionnaire affiche section "Mon état financier" avec 3 cards |
| TC-DASH-1.2 | Dashboard copropriétaire affiche les mêmes sections que gestionnaire |
| TC-DASH-1.3 | Section "Ma copropriété" affiche IBAN |
| TC-DASH-2.1 | Bouton "Payer" navigue vers paiements avec dialog ouvert |
| TC-DEP-1.1 | Déposer un montant → apparaît dans le solde |
| TC-DEP-2.1 | Générer paiement avec solde positif → montant réduit |
| TC-DASH-3.1 | Carte "Soldes membres" affiche tous les membres avec solde correct |
