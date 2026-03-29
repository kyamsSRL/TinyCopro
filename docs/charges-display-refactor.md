# Charges — Refonte affichage (backend inchangé)

## Principe

**Le backend ne change pas.** Le système de charges fonctionne exactement comme les dépôts en interne. Seule la présentation change côté frontend et PDF.

---

## Analyse technique

### Ce qui ne change PAS (backend)

- La RPC `generate_monthly_charges` crée des dépenses (`is_charge = true`) + une charge_membre par copropriétaire
- La RPC `mark_charge_paid` incrémente `membres.solde` et marque dépenses/paiements liés comme payés
- La génération de paiement (`generate_payment`) déduit le solde comme avant → le montant réel du paiement de charge sera souvent 0€ ou faible
- `get_repartitions_en_cours` exclut les dépenses `is_charge`

### Ce qui change (frontend uniquement)

#### 1. Onglet "Charges" dans Paiements

**Avant** : affichait la liste des charges par membre avec bouton "Marquer comme payé"

**Après** : affiche un descriptif informatif des charges de la copro :
- Total des charges mensuelles (copro)
- Quote-part du user connecté
- Liste des postes de charges avec montant total copro + montant quote-part
- Ligne "Provisionnement" (delta) avec montant total + quote-part
- Pas de PDF ici — juste informatif

#### 2. Paiements liés aux charges dans "Mes paiements"

Les paiements liés aux charges apparaissent dans "Mes paiements" comme les autres. Mais leur **affichage dans la popup** est différent :

**Paiement normal** : montre les dépenses + montant + déduction solde + montant à payer

**Paiement de charge** : montre les charges (dépenses `is_charge`) avec :
- Liste des items de charge (Électricité, Gaz, etc.) avec montant total + quote-part
- Ligne "Provisionnement" avec montant delta total + quote-part delta
- Total = somme charges + provision (montant plein, pas la version déduite)

#### 3. PDF de charge

Le PDF est le même template mais avec un affichage adapté :
- Table : items de charge + provisionnement (au lieu des dépenses normales)
- Montant affiché = montant plein (charges + provision), pas le montant après déduction
- Le provisionnement apparaît comme une ligne supplémentaire dans le tableau

---

## User Stories

### US-CHG-1 : Onglet "Charges" — vue informative

**En tant que** copropriétaire/gestionnaire,
**je veux** voir un récapitulatif des charges de la copro,
**afin de** comprendre la composition de mes charges mensuelles.

**Critères d'acceptation :**
- L'onglet "Charges" montre les postes de charges configurés
- Pour chaque poste : libellé, fréquence, montant total copro, montant quote-part du user
- Ligne "Provisionnement" avec le delta
- Total affiché
- Pas de bouton d'action, pas de PDF — purement informatif

### US-CHG-2 : Paiement de charge — affichage popup

**En tant que** copropriétaire,
**je veux** que la popup d'un paiement de charge affiche le détail des charges,
**afin de** comprendre ce qui compose mon appel de charge.

**Critères d'acceptation :**
- Badge "Charge" sur les paiements liés aux charges dans la liste
- La popup montre : items de charge + provision
- Les montants affichés sont les montants pleins (pas après déduction)
- Le gestionnaire peut toujours marquer comme payé

### US-CHG-3 : PDF de charge — provisionnement

**En tant que** copropriétaire,
**je veux** que le PDF de mon appel de charge montre le détail avec la provision,
**afin d'** avoir un document clair pour mon comptable.

**Critères d'acceptation :**
- Même template que les PDF normaux
- Table : items de charge + ligne "Provisionnement"
- Montant total = charges + provision (montant plein)
- QR code SEPA avec le montant plein

---

## Test Cases

### TC-CHG-1 : Onglet Charges — affichage config

| # | Action | Résultat attendu |
|---|---|---|
| 1 | Naviguer vers Paiements > Charges | Voir la liste des postes de charges |
| 2 | Vérifier les montants | Total copro + quote-part user affichés |
| 3 | Vérifier le provisionnement | Ligne delta visible avec montants |

### TC-CHG-2 : Paiement de charge — popup

| # | Action | Résultat attendu |
|---|---|---|
| 1 | Cliquer sur un paiement de charge | Popup montre les items de charge |
| 2 | Vérifier les montants | Montants pleins (pas déduits) |
| 3 | Vérifier le badge | Badge "Charge" visible |

### TC-CHG-3 : PDF de charge

| # | Action | Résultat attendu |
|---|---|---|
| 1 | Télécharger PDF d'un paiement de charge | PDF avec items + provisionnement |
| 2 | Vérifier le montant QR | Montant plein (charges + provision) |

---

## Contraintes techniques

### Frontend

- **Onglet Charges** : remplacer la liste des charges_membres par un affichage de la config (`getChargesConfig`) + calcul quote-part local (millièmes du user / 1000)
- **Popup paiement** : détecter si l'appel est lié à des charges (vérifier si les dépenses liées ont `is_charge = true`), si oui → affichage alternatif
- **PDF** : dans `pdf-generator.ts`, si paiement de charge → ajouter ligne "Provisionnement" et afficher montant plein au lieu du montant déduit

### Comment détecter un paiement de charge

L'appel de paiement contient `appel_repartitions` → `repartitions` → `depenses`. Si toutes les dépenses ont `is_charge = true`, c'est un paiement de charge.

### Calcul du montant plein pour l'affichage

Le montant plein = somme des `montant_du` (ou `montant_override`) des répartitions + provision (delta × millièmes / 1000).
Le backend garde le montant réel (après déduction solde) pour le système financier.

### Fichiers à modifier

| Fichier | Changement |
|---|---|
| `src/components/pages/PaiementsPage.tsx` | Onglet Charges (vue config), popup paiement charge |
| `src/lib/pdf-generator.ts` | Ligne provisionnement, montant plein |
| `src/services/charge.ts` | Déjà en place |

### Ce qui ne change PAS

- Aucune RPC / migration
- Le calcul du solde
- La logique de déduction des paiements
- La génération des charges (cron)
