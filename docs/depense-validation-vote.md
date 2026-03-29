# Validation des dépenses par vote — Analyse

> Date : 2026-03-24

---

## 1. Contraintes techniques

- **Toute logique métier côté backend** (RPC SECURITY DEFINER)
- **Frontend = affichage** — services = passerelle `supabase.rpc()`
- `auth.uid()` pour identifier l'utilisateur
- Le calcul du statut de validation (unanimité) se fait côté backend
- Le frontend affiche les compteurs et les boutons

---

## 2. Résumé du changement

Quand un **copropriétaire** crée une dépense, elle est soumise au vote de tous les membres. Tant qu'elle n'est pas validée par **tous**, elle :
- N'est **pas comptabilisée** dans le dashboard (montants dû, encaissé, etc.)
- N'est **pas payable** (pas de génération de paiement possible)
- Reste dans un statut "En attente de validation"

Quand un **gestionnaire** crée une dépense, elle est **auto-validée** — pas de vote nécessaire.

---

## 3. Modèle de données

### Nouvelle table : `depense_votes`
```sql
CREATE TABLE depense_votes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  depense_id uuid NOT NULL REFERENCES depenses(id) ON DELETE CASCADE,
  membre_id uuid NOT NULL REFERENCES membres(id),
  vote boolean NOT NULL,              -- true = validé, false = rejeté
  motif_rejet text,                   -- obligatoire si vote = false
  created_at timestamptz DEFAULT now(),
  UNIQUE(depense_id, membre_id)       -- un vote par membre par dépense
);
```

### Nouvelle colonne sur `depenses`
```sql
ALTER TABLE depenses ADD COLUMN is_validated boolean DEFAULT false;
```
- `true` = dépense validée (auto ou par vote unanime)
- `false` = en attente de validation

### Logique
- Dépense créée par **gestionnaire** → `is_validated = true` directement
- Dépense créée par **copropriétaire** → `is_validated = false`, soumise au vote
- Quand tous les membres actifs ont voté `true` → `is_validated = true`
- Si un seul membre rejette → la dépense reste `is_validated = false` (le créateur peut la modifier ou la supprimer)

---

## 4. Impact sur les fonctionnalités existantes

### Dashboard (`get_dashboard_stats`)
- **"Mon état financier"** : ne comptabilise que les dépenses avec `is_validated = true`
- **"Ma copropriété"** : idem — dépenses totales, encaissé, restant dû = uniquement validées
- **Soldes membres** : idem

### Paiements (`get_repartitions_en_cours`)
- Ne retourne que les répartitions dont la dépense est `is_validated = true`
- Le dialog "Générer un paiement" ne montre pas les dépenses non validées

### Liste des dépenses (`get_depenses`)
- Toutes les dépenses sont visibles (validées et non validées)
- Les non validées ont un badge "En attente de validation" + compteur de votes
- Retourne aussi : `is_validated`, `votes` (liste des votes avec nom + vote + motif)

### Création de dépense (`create_depense_with_repartitions`)
- Si le créateur est gestionnaire → `is_validated = true`
- Si copropriétaire → `is_validated = false`

---

## 5. User Stories

### US-VOTE-1 : Dépense copropriétaire soumise au vote
**En tant que** copropriétaire,
**je veux** que ma dépense soit soumise au vote de tous les membres,
**afin de** garantir l'accord collectif.

**Critères d'acceptation :**
- Dépense créée par un copropriétaire → `is_validated = false`
- Dépense créée par le gestionnaire → `is_validated = true` (auto-validée)
- Badge "En attente de validation" sur les dépenses non validées
- Compteur : "3/5 validé" (nombre de votes positifs / nombre total de membres)

### US-VOTE-2 : Voter sur une dépense
**En tant que** membre (gestionnaire ou copropriétaire),
**je veux** voter (valider ou rejeter) une dépense soumise au vote,
**afin d'** exprimer mon accord ou désaccord.

**Critères d'acceptation :**
- Bouton "Valider" et "Rejeter" dans le détail de la dépense non validée
- Si rejet → champ "Motif" obligatoire
- Un seul vote par membre par dépense (peut changer son vote)
- Visible par tous : qui a voté quoi (nom + validé/rejeté)
- Pop-up pour voir le motif de rejet

### US-VOTE-3 : Validation unanime déclenche l'activation
**En tant que** système,
**je veux** qu'une dépense soit automatiquement validée quand tous les membres ont voté oui,
**afin de** l'intégrer aux calculs et aux paiements.

**Critères d'acceptation :**
- Quand le dernier vote positif arrive → RPC met `is_validated = true`
- La dépense apparaît dans le dashboard et les paiements
- Les répartitions deviennent payables

### US-VOTE-4 : Dépenses non validées exclues du dashboard et des paiements
**En tant que** membre,
**je veux** que les dépenses non validées n'apparaissent pas dans mes montants à payer,
**afin de** ne pas être facturé pour une dépense non approuvée.

**Critères d'acceptation :**
- Dashboard : `my_total_due`, `copro_total_expenses`, etc. = uniquement `is_validated = true`
- Paiements : `get_repartitions_en_cours` filtre par `is_validated = true`
- Liste dépenses : toutes visibles mais les non validées sont clairement identifiées

---

## 6. Change Records

### Backend

| ID | Type | Description |
|---|---|---|
| CR-1 | Migration | Créer table `depense_votes` + colonne `is_validated` sur `depenses` |
| CR-2 | RPC | `vote_depense(p_depense_id, p_vote boolean, p_motif text)` — auth.uid(), un vote par membre, si unanimité → is_validated = true |
| CR-3 | RPC | Modifier `create_depense_with_repartitions` — si gestionnaire → is_validated = true, sinon false |
| CR-4 | RPC | Modifier `get_depenses` — inclure `is_validated`, `votes[]` (nom, vote, motif), compteur |
| CR-5 | RPC | Modifier `get_dashboard_stats` — filtrer par `is_validated = true` |
| CR-6 | RPC | Modifier `get_repartitions_en_cours` — filtrer par dépense `is_validated = true` |

### Frontend

| ID | Type | Description | Fichier |
|---|---|---|---|
| CR-7 | Service | `voteDepense()` | `src/services/depense.ts` |
| CR-8 | UI | Badge "En attente de validation" + compteur votes | `DepensesPage.tsx` |
| CR-9 | UI | Boutons Valider/Rejeter dans le détail | `DepensesPage.tsx` |
| CR-10 | UI | Dialog de rejet (motif obligatoire) | `DepensesPage.tsx` |
| CR-11 | UI | Pop-up détail des votes (qui a voté quoi + motifs) | `DepensesPage.tsx` |
| CR-12 | Types | Table `depense_votes`, `is_validated`, RPC `vote_depense` | Types TS |
| CR-13 | Traductions | Clés : validation, valider, rejeter, motif rejet, en attente de validation, votes | Messages |

---

## 7. Plan de test

### Tests E2E à ajouter (et lancer)

| Test | Description |
|---|---|
| TC-VOTE-1.1 | Dépense créée par copro → badge "En attente de validation" visible |
| TC-VOTE-1.2 | Dépense créée par gestionnaire → pas de badge, auto-validée |
| TC-VOTE-2.1 | Membre vote "Valider" → compteur mis à jour |
| TC-VOTE-2.2 | Membre vote "Rejeter" avec motif → visible dans les votes |
| TC-VOTE-3.1 | Tous les membres valident → dépense passe à validée |
| TC-VOTE-4.1 | Dépense non validée → pas comptabilisée dans le dashboard |
| TC-VOTE-4.2 | Dépense non validée → pas dans la liste de génération de paiement |

### Tests manuels
1. Copro crée une dépense → "En attente de validation" + compteur "0/2"
2. Gestionnaire valide → compteur "1/2"
3. Copro valide → compteur "2/2" → badge disparaît, dépense validée
4. Dashboard : vérifier que le montant n'apparaît qu'après validation
5. Paiements : vérifier que la dépense n'est pas dans la liste avant validation
6. Rejet : un membre rejette avec motif → voir le motif dans le détail
