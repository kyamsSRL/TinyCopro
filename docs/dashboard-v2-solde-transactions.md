# Dashboard V2 — Solde, dépôts automatiques, transactions, navigation annuelle

> Date : 2026-03-25

---

## 1. Contraintes techniques

- **Toute logique métier côté backend** (RPC SECURITY DEFINER, `auth.uid()`)
- **Frontend = affichage** — services = passerelle `supabase.rpc()`
- **Solde = une seule colonne en DB** sur `membres` (pas de calcul complexe à chaque requête)
- **Historique des dépôts** conservé dans la table `depots` (append-only)
- **Navigation annuelle** impacte uniquement le dashboard, pas les autres écrans

---

## 2. Changement majeur : solde sur `membres`

### Nouvelle colonne
```sql
ALTER TABLE membres ADD COLUMN solde numeric DEFAULT 0;
```
- `solde >= 0` → le membre a un crédit (dépôt excédentaire)
- `solde = 0` → à jour
- Le solde ne peut **jamais** être négatif — quand on doit de l'argent, ce sont les répartitions qui le reflètent

### Mise à jour du solde
- **Dépôt** : `solde += montant_depot`
- **Création de dépense** (quand `is_validated = true`) : pour chaque membre avec solde > 0 :
  - Si `solde >= part_copro` → solde -= part_copro, paiement auto généré avec statut `paye`, répartition `paye`
  - Si `solde < part_copro` → **pas de paiement auto**, le solde reste intact, le copro génère son paiement manuellement
  - Si `solde = 0` → rien, le copro génère manuellement

### Trigger : paiement auto à la validation

Un **trigger PostgreSQL** sur la table `depenses` se déclenche quand `is_validated` passe à `true` (via UPDATE ou INSERT). Pas de logique dupliquée dans les RPC.

```sql
-- Fonction trigger
CREATE FUNCTION trigger_on_depense_validated() RETURNS trigger AS $$
  -- Pour chaque répartition de la dépense :
  --   Si membre.solde >= part_copro → créer paiement auto, solde -= part, répartition = paye
  --   Sinon → rien
$$ LANGUAGE plpgsql;

-- Trigger UPDATE (vote_depense valide la dépense)
CREATE TRIGGER depense_validated_trigger
  AFTER UPDATE ON depenses FOR EACH ROW
  WHEN (OLD.is_validated = false AND NEW.is_validated = true)
  EXECUTE FUNCTION trigger_on_depense_validated();

-- Trigger INSERT (gestionnaire crée une dépense auto-validée)
CREATE TRIGGER depense_created_validated_trigger
  AFTER INSERT ON depenses FOR EACH ROW
  WHEN (NEW.is_validated = true)
  EXECUTE FUNCTION trigger_on_depense_validated();
```

**Avantages** :
- Logique centralisée : quel que soit le chemin de validation, le paiement auto se fait
- Pas de duplication entre `vote_depense` et `create_depense_with_repartitions`
- Extensible si un 3e chemin de validation apparaît

### Déduction du solde à la génération de paiement
Quand le copro génère un paiement (sélection de dépenses) :
- Le RPC calcule le total des répartitions sélectionnées
- Si le membre a un `solde > 0`, le solde est déduit du montant à payer
- `montant_facture = total_repartitions - MIN(solde, total_repartitions)`
- Le solde est mis à jour : `solde -= MIN(solde, total_repartitions)`
- Le PDF affiche : montant total des dépenses sélectionnées, déduction du solde disponible, montant restant à payer
- Le QR code = montant restant à payer (après déduction)

---

## 3. Onglets du dashboard

### Section du haut : navigation annuelle
Année avec flèches ← → au-dessus des onglets. Appel API quand on change d'année. Impacte uniquement le dashboard.

### Onglet 1 : "Mon état financier"
- **Carte Solde** : montant du solde du membre (remplace "Total dû")
- **Carte En cours** : somme des répartitions `en_cours_paiement`
- **Carte Payé** : somme des répartitions `paye`
- **10 dernières transactions** : paiements (sorties) + dépôts (entrées), mélangés, triés par date décroissante
- Bouton "Voir plus" → navigue vers page Paiements

### Onglet 2 : "Ma copropriété"
- IBAN
- Dépenses totales, encaissé, restant dû
- **Soldes membres** : une seule colonne (le solde de chaque membre)
- Répartition par catégorie

---

## 4. Onglets de la page Paiements (mobile first)

3 onglets :
1. **Mes paiements** — appels de paiement du membre connecté
2. **Mes dépôts** — liste des dépôts du membre connecté
3. **Tous les paiements** — tous les appels (gestionnaire only, exclut ses propres)

---

## 5. User Stories

### US-SOLDE-1 : Solde membre en DB
**En tant que** système,
**je veux** un champ `solde` sur chaque membre,
**afin de** suivre le crédit disponible sans calcul complexe.

**Critères d'acceptation :**
- Colonne `solde numeric DEFAULT 0` sur `membres`
- Dépôt → solde += montant
- Le solde ne peut jamais être négatif
- Historique des dépôts conservé dans table `depots`

### US-SOLDE-2 : Paiement automatique uniquement si solde couvre totalement
**En tant que** système,
**je veux** que lors de la création d'une dépense validée, les membres dont le solde couvre **totalement** leur part soient auto-payés,
**afin de** simplifier le processus sans créer de paiements partiels.

**Critères d'acceptation :**
- Si `solde >= part_copro` → paiement auto généré (statut `paye`), `solde -= part`, répartition `paye`
- Si `solde < part_copro` → **aucun paiement auto**, solde inchangé, répartition `en_cours`
- Le paiement auto est visible dans "Mes paiements"
- Logique dans le RPC `create_depense_with_repartitions` (côté backend)

### US-SOLDE-3 : Déduction du solde à la génération de paiement
**En tant que** copropriétaire avec un solde disponible,
**je veux** que mon solde soit déduit du montant à payer quand je génère un paiement,
**afin de** ne payer que ce qui reste dû.

**Critères d'acceptation :**
- Quand le copro sélectionne des dépenses et génère un paiement :
  - `montant_facture = total_sélectionné - MIN(solde, total_sélectionné)`
  - `solde -= MIN(solde, total_sélectionné)`
- Le PDF affiche :
  - Montant total des dépenses : X €
  - Solde déduit : -Y €
  - **Montant à payer : Z €** (= X - Y)
- Le QR code = montant à payer (après déduction)
- Si le solde couvre tout → montant à payer = 0 €, le QR code n'est pas affiché
- Logique dans les RPC `generate_payment` + `get_payment_pdf_data`

### US-DASH-4 : Navigation annuelle
**En tant que** membre,
**je veux** naviguer entre les années sur le dashboard,
**afin de** voir l'historique financier.

**Critères d'acceptation :**
- Flèches ← → avec l'année affichée au-dessus des onglets
- Changement d'année = appel RPC `get_dashboard_stats` avec l'exercice correspondant
- Impacte uniquement le dashboard (pas les autres écrans)
- Année par défaut = exercice ouvert

### US-DASH-5 : Onglets dashboard
**En tant que** membre,
**je veux** voir "Mon état financier" et "Ma copropriété" en onglets,
**afin de** naviguer facilement.

**Critères d'acceptation :**
- 2 onglets : "Mon état financier" / "Ma copropriété"
- "Mon état financier" : carte Solde + En cours + Payé + 10 dernières transactions + "Voir plus"
- "Ma copropriété" : IBAN, stats, soldes membres (1 colonne), catégories

### US-DASH-6 : Transactions dans "Mon état financier"
**En tant que** membre,
**je veux** voir mes 10 dernières transactions (paiements + dépôts mélangés),
**afin de** suivre mon activité financière.

**Critères d'acceptation :**
- Paiements marqués payés (sorties, montant négatif) + dépôts (entrées, montant positif)
- Triés par date décroissante
- 10 max avec bouton "Voir plus" → page Paiements
- Données fournies par le RPC `get_dashboard_stats`

### US-PAY-3 : Onglet "Mes dépôts" dans les paiements
**En tant que** membre,
**je veux** voir la liste de mes dépôts,
**afin de** suivre mes versements.

**Critères d'acceptation :**
- 3e onglet dans la page Paiements : "Mes dépôts"
- Liste des dépôts : montant, date, référence
- Cards mobile first

### US-SOLDE-4 : Soldes membres une seule colonne
**En tant que** membre,
**je veux** voir le solde de chaque membre en une seule colonne,
**afin de** simplifier la lecture.

**Critères d'acceptation :**
- Remplace les 2 colonnes (Dû + Dépôt) par 1 colonne (Solde)
- Solde = la valeur du champ `membres.solde`

---

## 6. Change Records

### Backend

| ID | Type | Description |
|---|---|---|
| CR-1 | Migration | Ajouter `solde numeric DEFAULT 0` sur `membres` |
| CR-2 | RPC | Modifier `create_deposit` : `solde += montant` dans le RPC |
| CR-3 | Trigger | Créer trigger `depense_validated_trigger` (AFTER UPDATE) + `depense_created_validated_trigger` (AFTER INSERT) sur `depenses` → auto-payer les membres dont `solde >= part`. Fonction `trigger_on_depense_validated()` centralisée. |
| CR-4 | RPC | Modifier `get_dashboard_stats` : accepter `p_exercice_id` optionnel, retourner `solde` du membre, retourner 10 dernières transactions |
| CR-5 | RPC | Nouveau `get_my_deposits(p_copro_id)` : retourne liste des dépôts du membre |
| CR-6 | RPC | Modifier soldes membres : une seule colonne `solde` au lieu de `du` + `depot` |
| CR-6b | RPC | Modifier `generate_payment` : déduire le solde du montant, mettre à jour `membres.solde` |
| CR-6c | RPC | Modifier `get_payment_pdf_data` : retourner `solde_deduit` et `montant_restant` en plus du total |
| CR-6d | PDF | Modifier `pdf-generator.ts` : afficher ligne "Solde déduit : -Y €" + "Montant à payer : Z €", QR = montant restant |

### Frontend

| ID | Type | Description | Fichier |
|---|---|---|---|
| CR-7 | UI | Navigation annuelle (flèches ← →) | `CoproDashboardPage.tsx` |
| CR-8 | UI | 2 onglets dashboard : "Mon état financier" / "Ma copropriété" | `CoproDashboardPage.tsx` |
| CR-9 | UI | Carte Solde + 10 transactions + "Voir plus" | `CoproDashboardPage.tsx` |
| CR-10 | UI | Soldes membres 1 colonne | `CoproDashboardPage.tsx` |
| CR-11 | UI | 3 onglets paiements : Mes paiements / Mes dépôts / Tous les paiements | `PaiementsPage.tsx` |
| CR-12 | Service | `getMyDeposits()` | `src/services/paiement.ts` |
| CR-13 | Types | `membres.solde`, nouvelles RPC | Types TS |
| CR-14 | Traductions | onglets, solde, transactions, voir plus | Messages |

---

## 7. Tests E2E

| Test | Description |
|---|---|
| TC-SOLDE-1.1 | Dépôt augmente le solde du membre |
| TC-SOLDE-2.1 | Création dépense avec membre dont solde >= part → paiement auto, répartition payée |
| TC-SOLDE-2.2 | Création dépense avec membre dont solde < part → pas de paiement auto, solde inchangé |
| TC-SOLDE-3.1 | Génération paiement avec solde > 0 → montant facture = total - solde déduit |
| TC-DASH-4.1 | Navigation annuelle ← → change les stats du dashboard |
| TC-DASH-5.1 | 2 onglets visibles dans le dashboard |
| TC-DASH-6.1 | 10 dernières transactions visibles dans "Mon état financier" |
| TC-PAY-3.1 | Onglet "Mes dépôts" visible dans la page Paiements |
| TC-SOLDE-4.1 | Soldes membres en 1 colonne dans "Ma copropriété" |

---

## 8. Impact sur les écrans existants

| Écran | Impact |
|---|---|
| **Dashboard** | Refonte complète : onglets, navigation annuelle, carte solde, transactions |
| **Paiements** | 3e onglet "Mes dépôts" |
| **Dépenses** | Pas d'impact direct (le paiement auto est invisible pour l'utilisateur dans la liste des dépenses) |
| **Membres** | Pas d'impact |
| **PDF** | Nouvelle ligne "Solde déduit : -Y €" + "Montant à payer : Z €". QR = montant restant. Si montant = 0, pas de QR. |
