# User Stories — TinyCopro V1

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
- Un code d'invitation unique est généré automatiquement
- La copro apparaît dans "Mes copros"

### US-2.2 : Rejoindre une copropriété
**En tant que** copropriétaire,
**je veux** rejoindre une copropriété avec un code d'invitation,
**afin de** voir mes charges et effectuer mes paiements.

**Critères d'acceptation :**
- Saisir le code copro
- Renseigner ses millièmes (tantièmes)
- Le gestionnaire voit la demande et peut valider/refuser
- Une fois validé, le copropriétaire a accès à la copro

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
**En tant que** gestionnaire,
**je veux** ajouter une dépense à la copropriété,
**afin que** chaque copropriétaire voie sa quote-part.

**Critères d'acceptation :**
- Champs : libellé, montant total, date, catégorie, description (optionnel)
- La répartition se fait automatiquement selon les millièmes
- La dépense est flaggée "en cours" par défaut
- Notification aux copropriétaires qu'une nouvelle dépense a été ajoutée

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

### US-4.3 : Marquer un paiement comme "payé"
**En tant que** gestionnaire,
**je veux** marquer un groupe de paiement comme "payé",
**afin de** confirmer la réception du virement.

**Critères d'acceptation :**
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

### US-5.1 : Dashboard copropriétaire
**En tant que** copropriétaire,
**je veux** voir un résumé de ma situation financière,
**afin de** savoir où j'en suis.

**Critères d'acceptation :**
- Total dû (dépenses en cours)
- Total en cours de paiement
- Total payé
- Liste des prochaines échéances
- Accès rapide à la génération de paiement

### US-5.2 : Dashboard gestionnaire
**En tant que** gestionnaire,
**je veux** voir une vue globale de la situation financière de la copro,
**afin de** suivre les encaissements et les retards.

**Critères d'acceptation :**
- Total des dépenses de l'exercice
- Total encaissé vs total dû
- Liste des copropriétaires en retard de paiement
- Répartition par catégorie de dépense
- Accès rapide à la création de dépense et aux invitations de paiement

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

## Récapitulatif des rôles

> **Note :** Il n'y a pas de rôle à l'inscription. Le rôle est déterminé **par copropriété** :
> - Créer une copro → tu deviens **gestionnaire** de cette copro
> - Rejoindre une copro → tu deviens **copropriétaire** de cette copro
> - Un même utilisateur peut être gestionnaire dans une copro et copropriétaire dans une autre

| Rôle (par copro) | Droits |
|---|---|
| **Gestionnaire** | Ajouter dépenses, override montants, valider paiements, gérer membres, transférer la gestion, clôturer exercices, voir audit log, générer invitations pour les membres. Peut avoir 0 millième (gestionnaire pur). |
| **Copropriétaire** | Voir dépenses et sa quote-part, générer ses invitations de paiement, voir son historique, voir son dashboard |

## Statuts d'une dépense (pour un copropriétaire)

```
[En cours] → [En cours de paiement] → [Payé]
                 (irréversible)        (gestionnaire uniquement)
```
