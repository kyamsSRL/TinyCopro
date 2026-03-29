# User Stories — TinyCopro V1.1

## Epic 1 : Inscription & Authentification

### US-1.1 : Inscription
**En tant que** visiteur,
**je veux** m'inscrire sur la plateforme,
**afin de** créer mon compte et accéder à l'application.

**Critères d'acceptation :**
- Champs obligatoires : email, mot de passe, nom, prénom, adresse
- Champs optionnels : nom de société, numéro de société
- Pas de choix de rôle à l'inscription (le rôle est déterminé par les actions : créer une copro = devenir gestionnaire, rejoindre = copropriétaire)
- Validation email (confirmation Supabase Auth)
- Redirection vers le dashboard après confirmation (page "Mes copros" vide avec options : créer ou rejoindre)

### US-1.2 : Connexion
**En tant que** utilisateur inscrit,
**je veux** me connecter avec mon email et mot de passe,
**afin d'** accéder à mes copropriétés.

**Critères d'acceptation :**
- Connexion email/mot de passe
- Mot de passe oublié avec lien de réinitialisation
- Session persistante

### US-1.3 : Modifier mon profil
**En tant que** utilisateur connecté,
**je veux** modifier mes informations personnelles,
**afin de** garder mon profil à jour.

**Critères d'acceptation :**
- Modifier nom, prénom, adresse, société, numéro de société
- L'email ne peut pas être changé (identifiant unique)

---

## Epic 2 : Gestion des copropriétés

### US-2.1 : Créer une copropriété
**En tant que** utilisateur,
**je veux** créer une copropriété,
**afin de** commencer à gérer les comptes.

**Critères d'acceptation :**
- Champs : nom de la copro, adresse, numéro de société (optionnel), compte bancaire (IBAN + BIC)
- Le créateur devient automatiquement **gestionnaire** de la copro (rôle attribué à la création, pas à l'inscription)
- Le gestionnaire peut avoir 0 millième (s'il est uniquement gestionnaire et pas copropriétaire)
- Champ millièmes optionnel à la création (0 par défaut)
- ~~Un code d'invitation unique est généré automatiquement~~ **SUPPRIME (V1.1)** — remplacé par Epic INV (invitations personnalisées créées séparément via US-INV-1)
- La copro apparaît dans "Mes copros"

### ~~US-2.2 : Rejoindre une copropriété~~ DEPRECATED (V1.1)

> **Remplacée par** US-INV-5 (inscription via lien d'invitation) et US-INV-6 (adhésion avec remplacement de l'alias).
> L'ancien flux (saisie libre du code + INSERT nouveau membre) est remplacé par un UPDATE du membre placeholder créé par le gestionnaire.

~~**En tant que** copropriétaire,
**je veux** rejoindre une copropriété avec un code d'invitation,
**afin de** voir mes charges et effectuer mes paiements.~~

~~**Critères d'acceptation :**~~
- ~~Saisir le code copro~~
- ~~Renseigner ses millièmes (tantièmes)~~
- ~~Le gestionnaire voit la demande et peut valider/refuser~~
- ~~Une fois validé, le copropriétaire a accès à la copro~~

### US-2.3 : Voir mes copropriétés
**En tant que** utilisateur connecté,
**je veux** voir la liste de toutes mes copropriétés,
**afin de** naviguer entre elles.

**Critères d'acceptation :**
- Liste des copros avec nom, adresse, mon rôle (gestionnaire ou copropriétaire)
- Accès au détail de chaque copro en un clic
- Support multi-copro (un utilisateur peut être dans plusieurs copros)

### US-2.4 : Transférer la gestion
**En tant que** gestionnaire,
**je veux** transférer mon rôle de gestionnaire à un autre membre de la copropriété,
**afin de** passer la main à quelqu'un d'autre.

**Critères d'acceptation :**
- Seul le gestionnaire actuel peut initier le transfert
- Le destinataire doit être un membre existant de la copro
- Le transfert est immédiat : l'ancien gestionnaire perd ses droits de gestion, le nouveau les obtient
- L'ancien gestionnaire devient copropriétaire simple (conserve ses millièmes)
- Si l'ancien gestionnaire avait 0 millième, il reste membre avec 0 millième
- Entrée dans le journal d'audit

### US-2.5 : Voir les membres de la copropriété
**En tant que** membre d'une copropriété,
**je veux** voir la liste des copropriétaires et leurs millièmes,
**afin de** connaître la répartition.

**Critères d'acceptation :**
- Liste des membres : nom, prénom, millièmes
- Le gestionnaire voit tous les détails
- Les copropriétaires voient les noms et millièmes (pas les infos personnelles)

---

## Epic 3 : Gestion des dépenses

### US-3.1 : Ajouter une dépense
**En tant que** membre (gestionnaire ou copropriétaire),
**je veux** ajouter une dépense à la copropriété,
**afin que** chaque copropriétaire voie sa quote-part.

**Critères d'acceptation :**
- Champs : libellé, montant total, date, catégorie, description (optionnel)
- La répartition se fait automatiquement selon les millièmes (base 1000)
- La dépense est flaggée "en cours" par défaut
- Notification aux copropriétaires qu'une nouvelle dépense a été ajoutée
- **Tout membre** peut ajouter une dépense (pas seulement le gestionnaire)

### US-3.7 : Modifier une dépense
**En tant que** membre,
**je veux** modifier une dépense que j'ai créée,
**afin de** corriger une erreur ou mettre à jour les informations.

**Critères d'acceptation :**
- Un copropriétaire peut modifier uniquement les dépenses qu'il a créées (`created_by`)
- Un gestionnaire peut modifier toutes les dépenses
- Champs modifiables : libellé, montant total, date, catégorie, description, récurrence
- Si le montant change, les répartitions non payées et non overridées sont recalculées (base 1000)

### US-3.8 : Supprimer une dépense
**En tant que** membre,
**je veux** supprimer une dépense que j'ai créée,
**afin de** corriger une erreur.

**Critères d'acceptation :**
- Un copropriétaire peut supprimer uniquement les dépenses qu'il a créées
- Un gestionnaire peut supprimer toutes les dépenses
- La suppression supprime également toutes les répartitions associées
- Confirmation demandée avant suppression

### US-3.2 : Catégoriser les dépenses
**En tant que** gestionnaire,
**je veux** assigner une catégorie à chaque dépense,
**afin de** permettre le suivi par type de charge.

**Critères d'acceptation :**
- Catégories prédéfinies : eau, électricité parties communes, ascenseur, ménage, assurance, travaux, honoraires syndic, divers
- Possibilité d'ajouter des catégories personnalisées
- Filtre par catégorie dans la vue des dépenses

### US-3.3 : Joindre un justificatif
**En tant que** gestionnaire,
**je veux** attacher une facture ou un devis à une dépense,
**afin de** justifier la charge auprès des copropriétaires.

**Critères d'acceptation :**
- Upload de fichiers (PDF, image) via Supabase Storage
- Plusieurs fichiers par dépense
- Les copropriétaires peuvent télécharger les justificatifs

### US-3.4 : Marquer une dépense récurrente
**En tant que** gestionnaire,
**je veux** marquer une dépense comme récurrente (mensuelle, trimestrielle, annuelle),
**afin de** ne pas la ressaisir manuellement chaque période.

**Critères d'acceptation :**
- Option récurrence : unique, mensuelle, trimestrielle, annuelle
- Les dépenses récurrentes sont automatiquement recréées à chaque période
- Possibilité de stopper une récurrence

### US-3.5 : Override du montant par le gestionnaire
**En tant que** gestionnaire,
**je veux** modifier le montant attribué à un copropriétaire spécifique pour une dépense,
**afin de** gérer les cas particuliers (exonérations, charges spéciales).

**Critères d'acceptation :**
- Override du montant calculé pour un copropriétaire donné
- L'override est visible (indicateur visuel) pour le copropriétaire concerné
- Le montant overridé remplace le calcul par millièmes
- Historique des overrides

### US-3.6 : Voir les dépenses
**En tant que** copropriétaire,
**je veux** voir la liste des dépenses de ma copro,
**afin de** comprendre mes charges.

**Critères d'acceptation :**
- Liste des dépenses : libellé, montant total, ma quote-part, statut (en cours / payé), date
- Voir le montant des autres copropriétaires selon leur quote-part
- Filtre : en cours / payé / toutes
- Filtre par catégorie
- Tri par date, montant

---

## Epic VOTE : Validation des dépenses par vote (V1.2)

### US-VOTE-1 : Dépense copropriétaire soumise au vote
**En tant que** copropriétaire,
**je veux** que ma dépense soit soumise au vote de tous les membres,
**afin de** garantir l'accord collectif.

**Critères d'acceptation :**
- Dépense créée par copropriétaire → `is_validated = false`, soumise au vote
- Dépense créée par gestionnaire → auto-validée
- Badge "En attente de validation" + compteur votes visible

### US-VOTE-2 : Voter sur une dépense
**En tant que** membre,
**je veux** voter (valider ou rejeter) une dépense,
**afin d'** exprimer mon accord.

**Critères d'acceptation :**
- Boutons Valider/Rejeter dans le détail
- Rejet → motif obligatoire
- Un vote par membre (modifiable)
- Liste des votes visible par tous

### US-VOTE-3 : Validation unanime
**En tant que** système,
**je veux** valider automatiquement quand tous ont voté oui.

**Critères d'acceptation :**
- Dernier vote positif → `is_validated = true`
- La dépense entre dans le dashboard et les paiements

### US-VOTE-4 : Exclusion du dashboard et paiements
**En tant que** membre,
**je veux** que les dépenses non validées n'impactent pas mes montants.

**Critères d'acceptation :**
- Dashboard : uniquement dépenses validées
- Paiements : uniquement répartitions de dépenses validées

---

## Epic STAT : Statuts, versioning et override (V1.2)

### US-STAT-1 : Statuts clairs des dépenses
**En tant que** membre,
**je veux** voir le statut de chaque dépense (En attente / En cours / Payé),
**afin de** savoir où en est chaque charge.

**Critères d'acceptation :**
- Labels : "En attente" (`en_cours`), "En cours" (`en_cours_paiement`), "Payé" (`paye`)
- Bouton "Payer" à côté de la répartition du membre connecté si en attente → navigue vers Paiements

### US-STAT-2 : Interdiction de supprimer une dépense en cours ou payée
**En tant que** système,
**je veux** empêcher la suppression d'une dépense en paiement ou payée,
**afin de** garantir l'intégrité.

**Critères d'acceptation :**
- RPC refuse si répartition en `en_cours_paiement` ou `paye`
- Bouton Supprimer caché si `can_delete = false`

### US-STAT-3 : Interdiction de modifier une dépense en cours ou payée
**En tant que** système,
**je veux** empêcher la modification d'une dépense en paiement ou payée.

**Critères d'acceptation :**
- RPC refuse si répartition en `en_cours_paiement` ou `paye`
- Bouton Modifier caché si `can_edit = false`

### US-VER-1 : Versioning optimiste
**En tant que** système,
**je veux** un versioning sur les dépenses pour empêcher les modifications concurrentes.

**Critères d'acceptation :**
- Colonne `version` sur `depenses`, incrémentée à chaque modification
- RPC vérifie que la version fournie correspond à celle en DB
- Erreur "Depense has been modified" si conflit

### US-OVR-1 : Override — somme ≤ montant total
**En tant que** système,
**je veux** que la somme des overrides ne dépasse pas le montant total.

**Critères d'acceptation :**
- RPC refuse si `somme_autres + override > montant_total`
- En dessous est accepté → badge "Partiellement couvert"

---

## Epic PDF : Document de demande de paiement (V1.2)

### US-PDF-1 : Format professionnel du PDF
**En tant que** membre,
**je veux** recevoir un PDF de demande de paiement professionnel,
**afin de** savoir exactement ce que je dois payer et comment.

**Critères d'acceptation :**
- Destinataire : nom + adresse du copropriétaire
- Copropriété : nom + adresse + n° d'entreprise
- Syndic : nom + email + téléphone
- Date + référence
- Tableau : 3 colonnes (libellé, montant total, part du copropriétaire)
- Totaux des deux colonnes
- Modalités : montant à payer + IBAN + bénéficiaire + communication + QR code SEPA
- Signature du syndic (nom + image PNG si uploadée)
- Toutes les données calculées côté backend (RPC `get_payment_pdf_data`)

### US-PDF-2 : Upload de signature
**En tant que** gestionnaire,
**je veux** uploader ma signature (PNG),
**afin qu'** elle apparaisse sur les demandes de paiement.

**Critères d'acceptation :**
- Upload dans la page Profil (section "Signature")
- Format PNG uniquement
- Stocké dans Supabase Storage
- URL dans `profiles.signature_url`
- Optionnel : si pas de signature, le PDF affiche juste le nom
- Remplacement possible à tout moment

---

## Epic 4 : Paiements

### US-4.1 : Générer une invitation de paiement (copropriétaire)
**En tant que** copropriétaire,
**je veux** sélectionner les dépenses que je souhaite payer et générer un document de paiement,
**afin de** effectuer mon virement depuis mon application bancaire.

**Critères d'acceptation :**
- Sélection multiple de dépenses "en cours"
- Génération d'un PDF contenant : liste des dépenses sélectionnées, montants, total, IBAN de la copro, référence de virement
- Génération d'un QR code de virement (format EPC/SEPA) scannable par les apps bancaires
- Le PDF est stocké dans Supabase Storage (espace du copropriétaire)
- Une fois généré, les dépenses sélectionnées passent au statut "en cours de paiement"
- **Pas de retour en arrière possible** une fois le PDF généré
- Le PDF est consultable/téléchargeable depuis l'historique

### US-4.2 : Générer une invitation de paiement pour un membre (gestionnaire)
**En tant que** gestionnaire,
**je veux** sélectionner des dépenses et générer une invitation de paiement pour un copropriétaire,
**afin de** l'inviter à régler ses charges.

**Critères d'acceptation :**
- Sélection d'un copropriétaire
- Sélection des dépenses à inclure
- Génération du PDF + QR code (même format que US-4.1)
- Notification au copropriétaire qu'une invitation a été créée
- Les dépenses passent au statut "en cours de paiement"

### US-4.3 : Marquer un paiement comme "payé" (V1.2 — élargi)
**En tant que** membre (gestionnaire ou copropriétaire),
**je veux** marquer un paiement comme "payé",
**afin de** confirmer le règlement.

**Critères d'acceptation :**
- Un copropriétaire peut marquer ses propres appels de paiement comme payés
- Un gestionnaire peut marquer les appels de tous les membres comme payés
- Le RPC vérifie côté serveur que l'appelant est autorisé (gestionnaire OU propriétaire de l'appel)

### US-4.5 : Dépense payée seulement si somme = total (V1.2)
**En tant que** système,
**je veux** qu'une dépense ne soit "Payé" que si la somme des montants effectifs payés ≥ montant total,
**afin de** refléter la réalité financière.

**Critères d'acceptation :**
- Statut "Payé" = toutes répartitions `paye` ET somme effective ≥ montant total
- Si overrides font que la somme < total, le statut reste "En attente" même si tous ont payé
- Logique d'affichage côté frontend

**Anciens critères d'acceptation (conservés) :**
- Seul le gestionnaire peut passer le statut à "payé"
- Le statut passe de "en cours de paiement" à "payé"
- Date de paiement enregistrée
- Notification au copropriétaire que son paiement est confirmé

### US-4.4 : Historique des paiements
**En tant que** copropriétaire,
**je veux** voir l'historique de mes paiements,
**afin de** suivre ce que j'ai réglé.

**Critères d'acceptation :**
- Liste des invitations de paiement : date, montant, statut (en cours / payé), lien vers le PDF
- Filtre par statut et par période

---

## Epic 5 : Dashboards

### US-5.1 : Dashboard unifié (V1.2 — remplace US-5.1 et US-5.2)
**En tant que** membre (gestionnaire ou copropriétaire),
**je veux** voir un dashboard identique quel que soit mon rôle,
**afin de** comprendre ma situation financière et celle de la copropriété.

**Critères d'acceptation :**
- Section "Mon état financier" : 3 cards (Total dû, En cours de paiement, Total payé) — propres au membre connecté, sans déduction des dépôts
- Bouton "Payer" dans la carte "Total dû" → navigue vers Paiements avec dialog ouvert
- Section "Ma copropriété" : IBAN visible, dépenses totales, encaissé, restant dû
- Carte "Soldes membres" : 2 colonnes par membre (Dû ≤ 0, Dépôt ≥ 0)
- Répartition par catégorie
- Pas de boutons raccourcis en bas (la sidebar suffit)
- Pas de différence entre gestionnaire et copropriétaire

### ~~US-5.2 : Dashboard gestionnaire~~ REMPLACÉ par US-5.1 (V1.2)

---

## Epic 6 : Exercice comptable

### US-6.1 : Gérer les exercices comptables
**En tant que** gestionnaire,
**je veux** clôturer un exercice et en ouvrir un nouveau,
**afin de** séparer les comptes par année.

**Critères d'acceptation :**
- Un exercice a une date de début et de fin
- Clôturer un exercice fige les dépenses et paiements
- Les dépenses récurrentes sont reportées sur le nouvel exercice
- Navigation entre exercices (2025, 2026...)

### US-6.2 : Export comptable
**En tant que** gestionnaire,
**je veux** exporter les dépenses et paiements en CSV/Excel,
**afin de** transmettre les données au comptable.

**Critères d'acceptation :**
- Export CSV avec : date, libellé, catégorie, montant total, répartition par copropriétaire
- Export des paiements : date, copropriétaire, montant, statut
- Filtre par exercice

---

## Epic 7 : Notifications

### US-7.1 : Notifications par email
**En tant que** membre de la copro,
**je veux** recevoir des notifications par email,
**afin d'** être informé des événements importants.

**Critères d'acceptation :**
- Nouvelle dépense ajoutée → notification aux copropriétaires
- Invitation de paiement créée → notification au copropriétaire concerné
- Paiement confirmé ("payé") → notification au copropriétaire
- Relance si paiement en retard (configurable par le gestionnaire)
- Nouveau membre rejoint la copro → notification au gestionnaire

---

## Epic 8 : Audit & Transparence

### US-8.1 : Journal d'audit
**En tant que** gestionnaire,
**je veux** voir un historique de toutes les actions effectuées,
**afin de** garantir la transparence.

**Critères d'acceptation :**
- Log de : création/modification de dépense, override de montant, changement de statut de paiement, ajout/suppression de membre
- Chaque entrée : qui, quoi, quand
- Consultable par le gestionnaire
- Non modifiable / non supprimable

---

## Epic INV : Invitations personnalisées avec alias et recalcul rétroactif

> **Ajouté en V1.1** — Remplace le flux de code unique par copro (US-2.1 partiel, US-2.2) par un système d'invitations personnalisées avec alias (placeholders), date d'adhésion et recalcul rétroactif des répartitions.

### US-INV-1 : Création d'invitation personnalisée

**En tant que** gestionnaire,
**je veux** créer une invitation personnalisée avec un alias et une date d'adhésion,
**afin de** préparer l'arrivée d'un futur copropriétaire.

**Critères d'acceptation :**
- Le formulaire contient : "Alias" (texte, obligatoire, min 2 chars) + "Date d'adhésion" (date, obligatoire)
- A la soumission, le système crée :
  - Une ligne `invitations` (code 12 hex, lié à la copro, `expires_at` = now + 1 an)
  - Une ligne `membres` (`user_id = NULL`, `milliemes = 0`, `alias` = nom fourni, `date_adhesion` = date fournie, `invitation_id` = invitation créée)
- Le code est affiché avec bouton copier
- Plusieurs invitations possibles par copro
- Seul un gestionnaire peut créer des invitations

### US-INV-2 : Affichage des alias dans la liste des membres

**En tant que** membre,
**je veux** voir les alias (placeholders) dans la liste des membres,
**afin de** savoir quels futurs copropriétaires sont attendus.

**Critères d'acceptation :**
- Les membres `user_id = NULL` affichent leur alias à la place du nom/prénom
- Badge visuel "En attente" distinctif
- Millièmes affichés = 0, date d'adhésion visible
- Le gestionnaire voit aussi le code d'invitation associé

### US-INV-3 : Gestion des invitations

**En tant que** gestionnaire,
**je veux** lister, révoquer et régénérer les invitations,
**afin de** garder le contrôle.

**Critères d'acceptation :**
- Section "Invitations en attente" sur la page Membres (alias + code + date adhésion + expiration)
- Révoquer = supprime invitation + membre placeholder + répartitions associées
- Régénérer = nouveau code, ancien invalide, placeholder inchangé
- L'ancien flux de code unique par copro est supprimé

### US-INV-4 : Dépenses avec alias (millièmes = 0)

**En tant que** gestionnaire,
**je veux** que les alias soient inclus dans les répartitions avec `montant_du = 0`,
**afin de** pouvoir surcharger manuellement si nécessaire.

**Critères d'acceptation :**
- `calculateRepartition()` inclut tous les membres actifs (aliases = 0 millièmes -> 0 EUR)
- Répartitions des alias visibles dans le détail de la dépense
- Gestionnaire peut override via `OverrideDialog` sur la répartition d'un alias
- Le nom affiché est l'alias (pas "-- --")

### US-INV-5 : Invitation via lien ?ref=

**En tant que** futur copropriétaire,
**je veux** recevoir un lien d'invitation,
**afin de** rejoindre la copropriété facilement.

**Critères d'acceptation :**
- Format du lien : `/{locale}/copros/?ref={code}`
- 3 scénarios supportés :
  - **Déjà connecté** : arrive sur `/copros/?ref=CODE`, le JoinCoproDialog s'ouvre automatiquement avec le code pré-rempli
  - **Pas connecté, a un compte** : AuthGuard redirige vers `/login/?ref=CODE`, après login → `/copros/?ref=CODE` → dialog join
  - **Pas connecté, pas de compte** : AuthGuard → `/login/?ref=CODE` → clic "Inscription" → `/register/?ref=CODE` → inscription → `/copros/?ref=CODE` → dialog join
- Le `?ref=` est préservé dans tous les liens entre login et register (aller-retour)
- Lors de la création de l'invitation, un champ email (optionnel) permet d'envoyer le lien par email
- Après création : popup avec le lien complet + boutons "Copier le lien" et "Envoyer par email" (si email renseigné)
- Le lien d'invitation est visible dans le détail d'un membre en attente (clic sur la card)

### US-INV-6 : Adhésion avec remplacement de l'alias

**En tant qu'** utilisateur inscrit avec un code,
**je veux** rejoindre la copro en entrant le code + mes millièmes,
**afin de** remplacer l'alias par mon vrai profil.

**Critères d'acceptation :**
- JoinCoproDialog accepte code + millièmes (min 1)
- Vérifie : code valide, non utilisé, non expiré
- **UPDATE** du membre placeholder (pas INSERT) : `user_id` = utilisateur, `milliemes` = valeur saisie, `alias = NULL`
- Invitation marquée `is_used = true`, `used_by` = user_id
- Erreur si déjà membre actif de cette copro
- Audit `join` enregistré + notification aux autres membres

### US-INV-7 : Recalcul rétroactif des répartitions

**En tant que** système,
**je veux** recalculer les montants des répartitions non payées après l'adhésion,
**afin que** la quote-part reflète les nouveaux millièmes.

**Critères d'acceptation :**
- Après US-INV-6, identifier toutes les répartitions du membre dont `date_depense >= date_adhesion`
- Si `montant_override IS NOT NULL` -> ne pas modifier (surcharge préservée)
- Si `montant_override IS NULL` ET `statut != 'paye'` -> recalculer `montant_du` selon nouveaux millièmes / total millièmes copro
- Dépenses avec `date_depense < date_adhesion` -> inchangées
- Répartitions payées -> jamais recalculées
- Répartitions des AUTRES membres pour les mêmes dépenses également recalculées (nouveau total millièmes)
- Audit `recalcul_retroactif` enregistré

---

## Récapitulatif des rôles

> **Note :** Il n'y a pas de rôle à l'inscription. Le rôle est déterminé **par copropriété** :
> - Créer une copro → tu deviens **gestionnaire** de cette copro
> - Rejoindre une copro → tu deviens **copropriétaire** de cette copro
> - Un même utilisateur peut être gestionnaire dans une copro et copropriétaire dans une autre

| Rôle (par copro) | Droits |
|---|---|
| **Gestionnaire** | Ajouter/modifier/supprimer toutes les dépenses, override montants, valider paiements, gérer membres, transférer la gestion, clôturer exercices, voir audit log, générer invitations pour les membres. Peut avoir 0 millième (gestionnaire pur). |
| **Copropriétaire** | Ajouter des dépenses, modifier/supprimer ses propres dépenses, voir toutes les dépenses et sa quote-part, générer ses invitations de paiement, voir son historique, voir son dashboard |

## Statuts d'une dépense (pour un copropriétaire)

```
[En cours] → [En cours de paiement] → [Payé]
                 (irréversible)        (gestionnaire uniquement)
```
