# Refactoring PDF de demande de paiement + Signature

> Date : 2026-03-24

---

## 1. État actuel

### PDF actuel
- Header : nom de la copro + adresse
- Référence + date
- Info membre (nom + adresse)
- Tableau des charges : description, date, montant
- Total
- Infos bancaires (IBAN, BIC, communication)
- QR code SEPA/EPC

### Ce qui manque
- Destinataire (nom + adresse du copropriétaire) en haut
- Nom du gestionnaire (syndic)
- Colonne "montant total" de chaque dépense en plus du montant du copropriétaire
- Totaux des deux colonnes
- Signature du gestionnaire
- Pas de lien bancaire (le QR code SEPA est la norme universelle en Belgique)

### Signature
Aucun support actuel. Pas de champ `signature_url` dans la table `profiles`, pas d'upload dans le profil ou l'inscription.

---

## 2. Contraintes techniques

- **Toute logique métier côté backend** : les montants totaux et les parts copropriétaire sont calculés par le RPC `generate_payment`, pas par le frontend
- **Le frontend** ne fait que : afficher le PDF, formater les données, gérer l'upload de signature
- **Librairies** : `@react-pdf/renderer` pour le PDF, `qrcode` pour le QR SEPA/EPC
- **Signature** : image PNG stockée dans Supabase Storage (bucket `justificatifs`), URL dans `profiles.signature_url`
- **Lien bancaire** : pas de standard universel. Le QR code SEPA est suffisant et scannable par toutes les apps bancaires belges.

---

## 3. User Stories

### US-PDF-1 : Nouveau format de demande de paiement
**En tant que** membre,
**je veux** recevoir un PDF de demande de paiement professionnel,
**afin de** savoir exactement ce que je dois payer et comment.

**Critères d'acceptation :**
- **En-tête** :
  - "À l'attention de :" + nom et adresse du copropriétaire destinataire
  - Nom de la copropriété + adresse + n° d'entreprise
  - "Syndic :" + nom du gestionnaire + email + téléphone
  - Date du document
- **Tableau des charges** : 3 colonnes
  - Libellé de la dépense
  - Montant total de la dépense
  - Part du copropriétaire (montant effectif = override ou calculé)
- **Totaux** : ligne totale avec montant total global + montant copropriétaire
- **Modalités de paiement** :
  - Montant à payer = la part du copropriétaire
  - IBAN du bénéficiaire (la copro)
  - Communication structurée (référence de l'appel)
  - QR code SEPA/EPC scannable
- **Signature** : en bas, nom du gestionnaire + image de signature (si uploadée)
- Pas de texte explicatif (pas de "dans le cadre de...")
- Pas de lien bancaire (le QR code suffit)

### US-PDF-2 : Upload de signature du gestionnaire
**En tant que** gestionnaire,
**je veux** uploader ma signature (image PNG),
**afin qu'** elle apparaisse sur les demandes de paiement.

**Critères d'acceptation :**
- Upload disponible dans la page Profil
- Upload disponible à l'inscription (optionnel)
- Format accepté : PNG uniquement
- La signature est stockée dans Supabase Storage
- L'URL est enregistrée dans `profiles.signature_url`
- Si pas de signature uploadée, le PDF affiche juste le nom sans image
- Le gestionnaire peut remplacer sa signature à tout moment

### US-PDF-3 : Données du PDF calculées côté backend
**En tant que** système,
**je veux** que toutes les données du PDF soient préparées côté backend,
**afin de** garantir l'intégrité des montants.

**Critères d'acceptation :**
- Le RPC `generate_payment` retourne déjà `montant_total` (la part copro après déduction solde)
- Ajouter au retour : la liste des dépenses avec montant total + montant copro pour chaque
- Ajouter au retour : les infos du gestionnaire (nom, email, téléphone, signature_url)
- Ajouter au retour : les infos du copropriétaire (nom, adresse)
- Ajouter au retour : les infos de la copro (nom, adresse, n° entreprise, IBAN)
- Le frontend utilise ces données telles quelles pour générer le PDF, sans recalculer

---

## 4. Change Records

### Backend

| ID | Type | Description |
|---|---|---|
| CR-1 | Migration DB | Ajouter `signature_url text` à la table `profiles` |
| CR-2 | RPC | `upload_signature(p_url text)` — auth.uid(), met à jour `profiles.signature_url` |
| CR-3 | RPC | Nouveau `get_payment_pdf_data(p_appel_id uuid)` — retourne toutes les données nécessaires pour le PDF en un seul appel (infos copro, gestionnaire, copropriétaire, liste dépenses avec 2 montants, signature_url) |

### Frontend

| ID | Type | Description | Fichier |
|---|---|---|---|
| CR-4 | Service | `uploadSignature()`, `getPaymentPdfData()` | `src/services/paiement.ts` ou `src/services/copropriete.ts` |
| CR-5 | UI | Upload signature dans page Profil | `src/app/[locale]/(dashboard)/profil/page.tsx` |
| CR-6 | UI | Upload signature optionnel à l'inscription | `src/app/[locale]/(auth)/register/page.tsx` |
| CR-7 | PDF | Réécrire le template PDF avec le nouveau format | `src/lib/pdf-generator.ts` |
| CR-8 | Types | `profiles.signature_url`, nouvelles RPC | `src/types/database.types.ts` |
| CR-9 | Traductions | Clés pour le PDF et la signature | `src/messages/{fr,en,nl}.json` |

---

## 5. Format du PDF

```
┌─────────────────────────────────────────────────────┐
│ À l'attention de :                                   │
│ Sophie MARTIN                                        │
│ 20 Av du Parc, 1050 Ixelles                         │
│                                                      │
│ Association des Copropriétaires                       │
│ ACP Rue de Hollande 48                               │
│ Rue de Hollande 48 – 1060 Saint-Gilles              │
│ N° d'entreprise : 1009.868.285                       │
│                                                      │
│ Syndic :                                             │
│ Fabrice KYAMBIKWA                                    │
│ Email : fabrice.kyambikwa@gmail.com                  │
│ Tél : +32 484 64 52 56                              │
│                                                      │
│ Date : 24/03/2026                                    │
│ Référence : AP-20260324-abc12345                     │
├─────────────────────────────────────────────────────┤
│                                                      │
│ Libellé              │ Montant total │ Votre part    │
│ ─────────────────────┼───────────────┼──────────────│
│ Eau Q1               │   800,00 €    │   120,00 €   │
│ Électricité          │   400,00 €    │    60,00 €   │
│ Assurance annuelle   │   600,00 €    │    90,00 €   │
│ ─────────────────────┼───────────────┼──────────────│
│ TOTAL                │ 1 800,00 €    │   270,00 €   │
│                                                      │
├─────────────────────────────────────────────────────┤
│ Modalités de paiement                                │
│                                                      │
│ Montant à payer : 270,00 €                          │
│ IBAN : BE04 0689 5734 1931                          │
│ Bénéficiaire : ACP Rue de Hollande 48               │
│ Communication : AP-20260324-abc12345                 │
│                                                      │
│ [QR Code SEPA]                                       │
│                                                      │
├─────────────────────────────────────────────────────┤
│                                                      │
│ Fabrice KYAMBIKWA                                    │
│ Syndic – ACP Rue de Hollande 48                      │
│ [Signature PNG]                                      │
│                                                      │
└─────────────────────────────────────────────────────┘
```

---

## 6. Plan de test

### Tests manuels
1. Créer des dépenses, générer un paiement → vérifier le PDF contient le nouveau format
2. Uploader une signature dans le profil → vérifier qu'elle apparaît dans le PDF
3. Pas de signature → le PDF affiche juste le nom sans image
4. Vérifier les 2 colonnes de montants (total + part copro) dans le tableau
5. Vérifier le QR code est scannable

### Tests E2E

| Test | Description |
|---|---|
| TC-PDF-1.1 | Générer un paiement → PDF téléchargé (vérifié par le non-crash de la génération) |
| TC-PDF-2.1 | Page profil affiche section "Signature" |
| TC-PDF-2.2 | Upload signature PNG → URL enregistrée |
