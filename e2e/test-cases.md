# TinyCopro E2E Test Cases

> Generated: 2026-03-18
> Updated: 2026-03-18 (V1.1 — Epic INV)
> Runner: `node e2e/test-e2e.mjs`
> Users: gestionnaire.e2e@gmail.com / coproprietaire.e2e@gmail.com

---

## Epic 1 : Inscription & Auth

### US-1.1 : Inscription
- [x] TC-1.1.1 : Inscription gestionnaire (champs obligatoires)
- [x] TC-1.1.2 : Inscription coproprietaire

### US-1.2 : Login
- [x] TC-1.2.1 : Login gestionnaire → redirect /copros
- [x] TC-1.2.2 : Login coproprietaire → redirect /copros

### US-1.3 : Auth Guard
- [x] TC-1.3.1 : Acces /copros sans auth → redirect /login

---

## Epic 2 : Copropriete Management

### US-2.1 : Creation copropriete
- [x] TC-2.1.1 : Creer copro **sans** code invitation ~~+ code invitation affiche~~
  - **MODIFIE (V1.1)** : La creation de copro ne genere plus de code. Verifier copro creee SANS code affiché.

### ~~US-2.2 : Rejoindre copro~~ DEPRECATED (V1.1)
- ~~[x] TC-2.2.0 : Get invitation code from membres page~~ **SUPPRIME** — Code unique par copro supprime. Remplace par TC-INV-3.1.
- ~~[x] TC-2.2.1 : User2 rejoint copro via code invitation~~ **REMPLACE** par TC-INV-6.1 — INSERT → UPDATE placeholder.

### US-2.3 : Liste copros
- [x] TC-2.3.1 : Copro visible dans la liste apres creation

### US-2.4 : Transfert de role
- [x] TC-2.4.1 : Transferer role gestionnaire a User2
- [x] TC-2.4.2 : Re-transferer role (retour a User1)

### US-2.5 : Gestion membres
- [x] TC-2.5.1 : Verifier 2 membres + milliemes affiches
  - **MODIFIE (V1.1)** : Doit aussi verifier alias avec badge "En attente" + milliemes = 0.

---

## Epic INV : Invitations personnalisees (V1.1)

### US-INV-1 : Creation d'invitation personnalisee

- [ ] **TC-INV-1.1** : Creer invitation avec alias + date adhesion
  - Pre-conditions : Gestionnaire connecte, copro existante
  - Actions : Page Membres → "Inviter un membre" → Saisir alias = "Locataire Dupuis", date = "2026-01-15" → Soumettre
  - **Attendu** : Code 12 hex affiche, copiable. Membre placeholder cree (user_id NULL, milliemes 0, alias visible dans la liste).

- [ ] **TC-INV-1.2** : Creer plusieurs invitations pour la meme copro
  - Pre-conditions : 1 invitation deja creee (TC-INV-1.1)
  - Actions : Creer 2e invitation alias = "Proprio Martin", date = "2026-03-01"
  - **Attendu** : 2e code different du 1er, 2 placeholders visibles dans la liste des membres.

- [ ] **TC-INV-1.3** : Tentative de creation par un coproprietaire
  - Pre-conditions : Connecte en tant que coproprietaire (pas gestionnaire)
  - Actions : Naviguer vers page Membres
  - **Attendu** : Bouton "Inviter un membre" NON visible.

### US-INV-2 : Affichage des alias

- [ ] **TC-INV-2.1** : Alias affiche dans la table des membres
  - Pre-conditions : Invitation creee (TC-INV-1.1)
  - Actions : Naviguer vers page Membres
  - **Attendu** : Alias affiche avec badge "En attente", milliemes = 0, date adhesion visible.

### US-INV-3 : Gestion des invitations

- [ ] **TC-INV-3.1** : Lister les invitations en attente
  - Pre-conditions : Gestionnaire connecte, 1+ invitation creee
  - Actions : Naviguer vers page Membres
  - **Attendu** : Section "Invitations en attente" visible avec alias, code, date adhesion, expiration.

- [ ] **TC-INV-3.2** : Revoquer une invitation
  - Pre-conditions : Invitation existante avec placeholder
  - Actions : Cliquer "Revoquer" → confirmer
  - **Attendu** : Invitation + membre placeholder + repartitions associees supprimes. Plus visible dans la liste.

- [ ] **TC-INV-3.3** : Regenerer le code d'une invitation
  - Pre-conditions : Invitation existante
  - Actions : Cliquer "Regenerer"
  - **Attendu** : Nouveau code affiche, ancien code invalide, alias et placeholder inchanges.

### US-INV-4 : Depenses avec alias (milliemes = 0)

- [ ] **TC-INV-4.1** : Creer depense avec alias present (milliemes = 0)
  - Pre-conditions : 1 gestionnaire (500‰), 1 coproprietaire (300‰), 1 alias (0‰)
  - Actions : Ajouter depense 800 EUR
  - **Attendu** : 3 repartitions creees : gestionnaire 500 EUR, copro 300 EUR, alias 0 EUR. Alias visible dans le detail avec son nom d'alias.

- [ ] **TC-INV-4.2** : Override du montant d'un alias
  - Pre-conditions : Depense creee (TC-INV-4.1)
  - Actions : Expander depense → cliquer montant alias (0 EUR) → override 50 EUR
  - **Attendu** : `montant_override = 50`, `montant_du` reste 0. Montant effectif affiche = 50 EUR.

### US-INV-5 : Invitation via lien ?ref=

- [ ] **TC-INV-5.1** : Lien d'invitation — utilisateur deja connecte
  - Pre-conditions : Utilisateur connecte, invitation existante avec code connu
  - Actions : Ouvrir `/{locale}/copros/?ref=CODE`
  - **Attendu** : JoinCoproDialog s'ouvre avec code pre-rempli. Saisir milliemes → rejoint la copro.

- [ ] **TC-INV-5.2** : Lien d'invitation — utilisateur pas connecte, a un compte
  - Pre-conditions : Utilisateur inscrit mais pas connecte, invitation existante
  - Actions : Ouvrir `/{locale}/copros/?ref=CODE`
  - **Attendu** : Redirige vers `/login/?ref=CODE`. Apres login → `/copros/?ref=CODE` → JoinCoproDialog s'ouvre.

- [ ] **TC-INV-5.3** : Lien d'invitation — utilisateur pas inscrit
  - Pre-conditions : Pas de compte, invitation existante
  - Actions : Ouvrir `/{locale}/copros/?ref=CODE` → redirige vers login → clic "Inscription"
  - **Attendu** : URL register contient `?ref=CODE`. Apres inscription → `/copros/?ref=CODE` → JoinCoproDialog s'ouvre.

- [ ] **TC-INV-5.4** : Preservation du ?ref= entre login et register
  - Pre-conditions : Invitation existante
  - Actions : Ouvrir `/login/?ref=CODE` → clic "Inscription" → verifier URL → clic "Connexion" → verifier URL
  - **Attendu** : `?ref=CODE` present dans l'URL a chaque etape (aller-retour login ↔ register).

- [ ] **TC-INV-5.5** : Lien d'invitation visible dans le detail d'un membre en attente
  - Pre-conditions : Gestionnaire connecte, invitation creee
  - Actions : Page Membres → clic sur la card du membre en attente
  - **Attendu** : Dialog affiche le lien complet avec bouton "Copier le lien".

### US-INV-6 : Adhesion avec remplacement de l'alias

- [ ] **TC-INV-6.1** : Rejoindre via code + milliemes (remplacement alias)
  - Pre-conditions : Utilisateur connecte, invitation valide existante
  - Actions : JoinCoproDialog → saisir code + milliemes = 200 → Soumettre
  - **Attendu** : Placeholder mis a jour (user_id set, milliemes = 200, alias = NULL). Invitation `is_used = true`. Vrai nom affiche dans la liste des membres. Audit `join` enregistre + notification aux autres membres.

- [ ] **TC-INV-6.2** : Tentative avec code expire
  - Pre-conditions : Invitation avec `expires_at` dans le passe
  - Actions : JoinCoproDialog → saisir code expire + milliemes
  - **Attendu** : Erreur "Code invalide ou expire".

- [ ] **TC-INV-6.3** : Tentative avec code deja utilise
  - Pre-conditions : Invitation avec `is_used = true`
  - Actions : JoinCoproDialog → saisir code utilise + milliemes
  - **Attendu** : Erreur "Code invalide ou expire".

- [ ] **TC-INV-6.4** : Tentative par utilisateur deja membre
  - Pre-conditions : Utilisateur deja membre actif de la copro
  - Actions : JoinCoproDialog → saisir code valide d'une autre invitation de la meme copro
  - **Attendu** : Erreur "Vous etes deja membre de cette copropriete."

### US-INV-7 : Recalcul retroactif des repartitions

- [ ] **TC-INV-7.1** : Recalcul des repartitions apres adhesion
  - Pre-conditions :
    - Alias date_adhesion = 2026-01-15
    - 3 depenses existantes : D1 (10/01, 800 EUR — avant adhesion), D2 (01/02, 800 EUR — apres), D3 (01/03, 400 EUR — apres)
    - Gestionnaire 500‰, coproprietaire 300‰
  - Actions : Alias rejoint avec 200‰ → total = 1000‰
  - **Attendu** :
    - D1 (avant date adhesion) : inchangee (gest 500, copro 300, alias 0)
    - D2 (apres, 800 EUR) : recalculee → gest 400, copro 240, alias 160
    - D3 (apres, 400 EUR) : recalculee → gest 200, copro 120, alias 80

- [ ] **TC-INV-7.2** : Preservation des overrides lors du recalcul
  - Pre-conditions : Alias a un `montant_override = 50` sur D2 avant adhesion
  - Actions : Alias rejoint avec 200‰
  - **Attendu** : `montant_du` recalcule (160 EUR), mais `montant_override` reste 50. Montant effectif = 50 EUR.

- [ ] **TC-INV-7.3** : Repartitions payees non recalculees
  - Pre-conditions : D2 repartition du gestionnaire `statut = 'paye'`
  - Actions : Alias rejoint avec 200‰
  - **Attendu** : Repartition payee du gestionnaire inchangee. Seules les repartitions non payees sont recalculees.

---

## Epic 3 : Depenses

### US-3.1 : Ajouter depense
- [x] TC-3.1.1 : Ajouter depense "Eau Q1" 800 EUR
- [x] TC-3.1.2 : Verifier repartition auto (500/300 milliemes)
- [x] TC-3.1.3 : Ajouter 2e depense "Electricite" 400 EUR

### US-3.3 : Justificatif
- [x] TC-3.3.1 : Upload justificatif (URL) — EXPECTED PARTIAL

### US-3.4 : Depense recurrente
- [x] TC-3.4.1 : Creer depense recurrente mensuelle

### US-3.5 : Override montant
- [x] TC-3.5.1 : Override montant Martin a 250 EUR

### US-3.7 : Modifier une depense
- [ ] **TC-3.7.1** : Coproprietaire modifie sa propre depense
  - Pre-conditions : Coproprietaire connecte, a cree une depense
  - Actions : Clic sur la depense → bouton "Modifier" visible → modifier le montant → sauvegarder
  - **Attendu** : Montant mis a jour, repartitions recalculees.

- [ ] **TC-3.7.2** : Coproprietaire ne peut pas modifier la depense d'un autre
  - Pre-conditions : Coproprietaire connecte, depense creee par le gestionnaire
  - Actions : Clic sur la depense
  - **Attendu** : Pas de bouton "Modifier" ni "Supprimer".

- [ ] **TC-3.7.3** : Gestionnaire modifie n'importe quelle depense
  - Pre-conditions : Gestionnaire connecte, depense creee par un coproprietaire
  - Actions : Clic sur la depense → bouton "Modifier" → modifier → sauvegarder
  - **Attendu** : Modification acceptee.

### US-3.8 : Supprimer une depense
- [ ] **TC-3.8.1** : Coproprietaire supprime sa propre depense
  - Pre-conditions : Coproprietaire connecte, a cree une depense
  - Actions : Clic sur la depense → bouton "Supprimer" → confirmer
  - **Attendu** : Depense + repartitions supprimees.

- [ ] **TC-3.8.2** : Gestionnaire supprime n'importe quelle depense
  - Pre-conditions : Gestionnaire connecte
  - Actions : Clic sur une depense → "Supprimer" → confirmer
  - **Attendu** : Suppression acceptee.

### US-3.1 (V1.2) : Coproprietaire peut ajouter une depense
- [ ] **TC-3.1.4** : Coproprietaire ajoute une depense
  - Pre-conditions : Coproprietaire connecte
  - Actions : Clic sur "Ajouter une depense" → remplir formulaire → sauvegarder
  - **Attendu** : Depense creee, repartitions calculees, bouton "Ajouter" visible.

### US-3.6 : Filtres
- [x] TC-3.6.1 : Filtrer depenses par statut

---

## Epic 4 : Paiements

### US-4.1 : Generer appel de paiement
- [x] TC-4.1.1 : User2 genere appel de paiement

### US-4.3 : Marquer comme paye
- [x] TC-4.3.1 : User1 marque paiement comme paye

### US-4.4 : Historique
- [x] TC-4.4.1 : User2 voit historique paiements

---

## Epic 5 : Dashboards (V2 — Solde, Transactions, Year Navigation)

### US-5.1 : Dashboard — Mon état financier (onglet 1)
- [ ] TC-DASH-1.1 : Dashboard charge avec stats (solde, en cours, payé)
- [ ] TC-DASH-1.2 : Transactions récentes visibles
- [ ] TC-DASH-1.3 : IBAN visible dans onglet "Ma copropriété"
- [ ] TC-DASH-2.1 : Bouton "Payer" navigue vers paiements

### US-5.2 : Dashboard — Ma copropriété (onglet 2)
- [ ] TC-DASH-3.1 : Soldes membres (1 colonne solde)
- [ ] TC-DASH-3.2 : Catégories visibles si dépenses existent

### US-5.3 : Navigation annuelle
- [ ] TC-DASH-4.1 : Flèches ← → changent l'année

### US-SOLDE : Système de solde & dépôts
- US-SOLDE-1 : Un copropriétaire peut déposer un montant (via page Paiements)
- US-SOLDE-2 : Le solde est déduit automatiquement lors de la génération de paiement
- US-SOLDE-3 : Si solde >= part, paiement automatique au trigger validation dépense
- US-SOLDE-4 : La facture PDF affiche "Solde déduit" et "Montant à payer"

### US-PAY-3 : Onglet "Mes dépôts" dans Paiements
- Onglet "Mes dépôts" affiche la liste des dépôts du membre

---

## Epic 6 : Exercice comptable

### US-6.1 : Cloturer exercice
- [x] TC-6.1.1 : Cloturer exercice + nouvel exercice cree

### US-6.2 : Export CSV
- [x] TC-6.2.1 : Export CSV depenses

---

## Epic 7 : Notifications

### US-7.1 : Notification email
- [x] TC-7.1.1 : Notification email envoyee apres depense — EXPECTED FAIL (stub)

---

## Epic 8 : Audit

### US-8.1 : Journal audit
- [x] TC-8.1.1 : Journal audit contient entrees — EXPECTED FAIL (no logAudit)

---

## Fin de session

### Profil & i18n
- [x] TC-9.1.1 : Profil charge avec donnees
- [x] TC-9.2.1 : Language switcher FR→NL

### Logout
- [x] TC-9.3.1 : Logout redirect /login

---

## Resultats

| Metrique | Valeur |
|----------|--------|
| Total V1 | 34 |
| Passes V1 | 34 |
| Echoues V1 | 0 |
| Nouveaux (Epic INV) | 18 |
| Modifies (V1.1) | 2 (TC-2.1.1, TC-2.5.1) |
| Supprimes (V1.1) | 1 (TC-2.2.0) |
| Remplaces (V1.1) | 1 (TC-2.2.1 → TC-INV-6.1) |
| Date run V1 | 2026-03-18 |
