# Système de Charges — Remplacement des Dépôts

## Principe fondamental

**Charges = Dépôts automatisés.** Le mécanisme de `membres.solde` ne change pas. La seule différence :
- Avant : le copropriétaire crée un dépôt manuellement → solde augmente
- Après : le système crée des charges automatiquement → quand le gestionnaire les marque comme payées → solde augmente

Le reste du système (déduction du solde lors de la génération de paiement, calculs) reste identique.

---

## Configuration par le gestionnaire

### Onglet "Charges" dans les paramètres de la copropriété

Le gestionnaire définit :
1. **Liste de postes de charges** : chaque poste a un libellé, un montant et une fréquence
2. **Delta** : montant fixe ajouté au total → constitue le crédit restant après déduction des dépenses

```
┌──────────────────────────────────────────────────┐
│ Charges de la copropriété                        │
│                                                  │
│ Postes de charges :                              │
│ ┌──────────────────────────────────────────────┐ │
│ │ Électricité    │ 20.00 € │ Mensuelle        │ │
│ │ Gaz            │ 20.00 € │ Mensuelle        │ │
│ │ Assurance      │ 20.00 € │ Annuelle         │ │
│ └──────────────────────────────────────────────┘ │
│                          [Ajouter un poste]      │
│                                                  │
│ Delta (provision supplémentaire) :  60.00 EUR    │
│                                                  │
│ Total charges ce mois :            100.00 EUR    │
│ (= 20 + 20 + delta 60)                          │
│ En janvier : 120.00 EUR                          │
│ (= 20 + 20 + 20 assurance + delta 60)           │
└──────────────────────────────────────────────────┘
```

### Fréquences

| Fréquence | Mois de génération |
|---|---|
| Mensuelle | Tous les mois, le 2 |
| Trimestrielle | Janvier, Avril, Juillet, Octobre, le 2 |
| Annuelle | Janvier, le 2 |

---

## Cron — Le 2 de chaque mois

### Étape 1 : Créer les dépenses individuelles

Pour chaque poste de charge applicable ce mois-ci, le cron crée une **dépense** :
- `libelle` = nom du poste (ex: "Électricité — Mars 2026")
- `montant_total` = montant du poste
- `is_validated = true` (auto-acceptée, votes créés automatiquement)
- `is_charge = true` → **exclue de la génération manuelle de paiement**
- Répartitions créées pour tous les membres (prorata millièmes)

Exemple en janvier : 3 dépenses créées (Électricité 20€, Gaz 20€, Assurance 20€)
Exemple en février : 2 dépenses créées (Électricité 20€, Gaz 20€)

### Étape 2 : Créer UNE charge par copropriétaire

Pour chaque membre actif, crée **une seule ligne de charge** qui regroupe tout :
- `montant` = (somme des dépenses créées + delta) × millièmes / 1000
- `statut` = "en attente de paiement"
- Référence aux dépenses liées
- **Génère un PDF d'appel de charge** (même template que les appels de paiement)

### Exemple concret

Configuration : Électricité 20€/mois, Gaz 20€/mois, Assurance 20€/an, Delta 60€
Membre A : 500 millièmes (50%)

**En janvier :**
- Dépenses créées : Électricité 20€, Gaz 20€, Assurance 20€ = 60€
- Charge membre A : (60€ + 60€ delta) × 500/1000 = **60€**
- PDF généré pour 60€

**En février :**
- Dépenses créées : Électricité 20€, Gaz 20€ = 40€
- Charge membre A : (40€ + 60€ delta) × 500/1000 = **50€**
- PDF généré pour 50€

---

## Quand le gestionnaire marque une charge comme payée

1. `charges_membres.statut` → "payé"
2. `membres.solde` += montant de la charge (**exactement comme un dépôt**)
3. Les répartitions des dépenses liées (celles avec `is_charge = true`) → statut "payé"
4. Les **paiements** liés à ces dépenses (appels_paiement) → statut "payé" + création du paiement

Tout passe par la charge : charge payée → solde mis à jour → dépenses liées payées → paiements liés payés.

### Paiements liés aux charges

Les paiements générés automatiquement pour des dépenses `is_charge = true` :
- **Ne peuvent PAS être marqués comme payés** depuis la liste des paiements
- Leur statut passe à "payé" **uniquement** quand la charge correspondante est marquée comme payée
- Dans la liste des paiements, ces paiements affichent un indicateur "Charge" et le bouton "Marquer comme payé" est masqué

### Impact sur les paiements normaux

Quand le membre génère un paiement pour des dépenses normales (non-charge) :
- Le solde (augmenté par les charges payées) est déduit du montant à payer
- **Exactement le même mécanisme qu'avec les dépôts actuels**

### Exemple de déduction

- Charge payée : 60€ → solde = 60€
- Dépenses normales à payer : 30€ (quote-part)
- Génération paiement : 30€ - 30€ (solde déduit) = **0€ à payer**
- Solde restant : 30€ (le delta reste en crédit)

---

## Vue copropriétaire — Onglet "Charges" (remplace "Mes dépôts")

```
┌──────────────────────────────────────────────────┐
│ Total charges mensuelles :          100.00 EUR   │
│ Ma quote-part :                      50.00 EUR   │
│                                                  │
│ Charges Mars 2026   │ 50.00 € │ [En attente]    │
│ Charges Fév 2026    │ 50.00 € │ [Payé]          │
│ Charges Jan 2026    │ 60.00 € │ [Payé]          │
└──────────────────────────────────────────────────┘
```

- Clic sur une charge → popup avec détail + téléchargement PDF
- **Pas de bouton "Marquer comme payé"** — seul le gestionnaire peut

---

## Permissions — Marquer comme payé

### Changement global

| Action | Copropriétaire | Gestionnaire |
|---|---|---|
| Marquer un paiement normal comme payé | **Non** (retiré) | Oui |
| Marquer un paiement lié à une charge comme payé | Non | **Non** (passe par la charge) |
| Marquer une charge comme payée | Non | Oui |

Le bouton "Marquer comme payé" disparaît :
- Pour les **copropriétaires** : partout (paiements, dépenses, dashboard)
- Pour les **paiements liés aux charges** : partout y compris gestionnaire (le statut est géré via la charge)

---

## Dépenses liées aux charges (`is_charge = true`)

- Créées automatiquement par le cron
- Auto-acceptées (pas de vote nécessaire)
- **Exclues** de `get_repartitions_en_cours` → pas de génération manuelle de paiement
- Marquées comme payées **automatiquement** quand la charge est marquée payée
- Visibles dans la liste des dépenses avec un indicateur "Charge"

---

## Changements techniques

### DB

#### Nouvelle table `charges_copro` (postes de charges)
```sql
CREATE TABLE charges_copro (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  copropriete_id uuid REFERENCES coproprietes(id) NOT NULL,
  libelle text NOT NULL,
  montant numeric NOT NULL,
  frequence text NOT NULL, -- 'mensuelle', 'trimestrielle', 'annuelle'
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);
```

#### Colonne `delta_charges` sur `coproprietes`
```sql
ALTER TABLE coproprietes ADD COLUMN delta_charges numeric DEFAULT 0;
```

#### Table `charges_membres` (remplace `depots`)
```sql
CREATE TABLE charges_membres (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  copropriete_id uuid REFERENCES coproprietes(id) NOT NULL,
  membre_id uuid REFERENCES membres(id) NOT NULL,
  montant numeric NOT NULL,
  reference text,
  statut text DEFAULT 'en_attente', -- 'en_attente', 'paye'
  date_charge date NOT NULL,
  marked_paid_by uuid REFERENCES auth.users(id),
  paid_at timestamptz,
  created_at timestamptz DEFAULT now()
);
```

#### Table de liaison `charge_depenses` (lie une charge à ses dépenses)
```sql
CREATE TABLE charge_depenses (
  charge_id uuid REFERENCES charges_membres(id) ON DELETE CASCADE,
  depense_id uuid REFERENCES depenses(id) ON DELETE CASCADE,
  PRIMARY KEY (charge_id, depense_id)
);
```

#### Colonne `is_charge` sur `depenses`
```sql
ALTER TABLE depenses ADD COLUMN is_charge boolean DEFAULT false;
```

### RPCs

- `get_charges_config(p_copro_id)` — postes + delta
- `add_charge_config(p_copro_id, p_libelle, p_montant, p_frequence)`
- `update_charge_config(p_charge_id, p_libelle, p_montant, p_frequence)`
- `delete_charge_config(p_charge_id)`
- `update_delta_charges(p_copro_id, p_delta)`
- `get_charges_membres(p_copro_id, p_membre_id?)` — charges par membre
- `mark_charge_paid(p_charge_id)` — gestionnaire uniquement :
  - `charges_membres.statut = 'paye'`
  - `membres.solde += montant`
  - Pour chaque dépense liée (`is_charge = true`) : `repartitions.statut = 'paye'` pour ce membre
  - Pour chaque `appel_paiement` lié à ces répartitions : `statut = 'paye'` + création `paiement`

### Modifier `get_repartitions_en_cours`
Exclure `WHERE d.is_charge = false` (ou `is_charge IS NOT true`)

### Cron
Supabase Edge Function ou `pg_cron`, le 2 de chaque mois.

### Frontend

- Retirer bouton "Marquer comme payé" pour non-gestionnaires (PaiementsPage, DepensesPage, Dashboard)
- Retirer bouton "Déposer un montant" + formulaire dépôt
- Onglet "Mes dépôts" → "Charges"
- Nouvelle page/section paramètres charges (gestionnaire)
- Badge "Charge" sur les dépenses avec `is_charge = true`
