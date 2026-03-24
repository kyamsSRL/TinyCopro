# Audit de sécurité — TinyCopro

> Date : 2026-03-24
> Scope : Fonctions RPC PostgreSQL SECURITY DEFINER + Edge Functions

---

## Résumé

**10 fonctions RPC sur 28 sont vulnérables** : elles acceptent un `user_id` passé par le frontend au lieu d'utiliser `auth.uid()` côté serveur. Un attaquant peut manipuler ces paramètres pour effectuer des actions au nom d'un autre utilisateur.

---

## Fonctions vulnérables (P0 — Escalade de privilèges)

| Fonction | Paramètre vulnérable | Risque | Fix |
|---|---|---|---|
| `create_copro_with_member` | `p_user_id` | Créer une copro au nom d'un autre | Remplacer par `auth.uid()` |
| `create_depense_with_repartitions` | `p_created_by` | Attribuer une dépense à un autre | Remplacer par `auth.uid()` |
| `mark_payment_as_paid` | `p_confirmed_by` | Confirmer un paiement au nom d'un autre | Remplacer par `auth.uid()` |
| `update_depense` | `p_user_id` | Modifier une dépense en usurpant l'identité du créateur | Remplacer par `auth.uid()` |
| `delete_depense` | `p_user_id` | Supprimer une dépense en usurpant l'identité du créateur | Remplacer par `auth.uid()` |

## Fonctions vulnérables (P1 — Falsification d'audit trail)

| Fonction | Paramètre vulnérable | Risque | Fix |
|---|---|---|---|
| `create_invitation_with_repartitions` | `p_created_by` | Attribuer une invitation à un autre utilisateur | Remplacer par `auth.uid()` |
| `generate_payment` | `p_created_by` | Générer un appel de paiement au nom d'un autre | Remplacer par `auth.uid()` |
| `claim_invitation` | `p_user_id` | Réclamer une invitation au nom d'un autre | Remplacer par `auth.uid()` |

## Fonctions vulnérables (P2 — Divulgation d'informations)

| Fonction | Paramètre vulnérable | Risque | Fix |
|---|---|---|---|
| `get_user_copros` | `p_user_id` | Lister les copros de n'importe quel utilisateur | Remplacer par `auth.uid()` |
| `get_member_emails` | `p_exclude_user_id` | Récupérer les emails des membres | Remplacer par `auth.uid()` |
| `get_repartitions_en_cours` | `p_membre_id` | Voir les répartitions de n'importe quel membre | Résoudre le `membre_id` via `auth.uid()` |

## Fonctions sécurisées

| Fonction | Raison |
|---|---|
| `is_gestionnaire_of` | Utilise `auth.uid()` en interne |
| `is_member_of` | Utilise `auth.uid()` en interne |
| `add_category` | Pas de paramètre user, RLS protège |
| `delete_category` | Pas de paramètre user, RLS protège |
| `close_exercice` | Pas de paramètre user |
| `create_exercice` | Pas de paramètre user |
| `get_copro_detail` | Pas de paramètre user |
| `get_depenses` | Pas de paramètre user |
| `get_categories` | Pas de paramètre user |
| `get_appels` | Filtre par copro/membre |
| `get_exercices` | Pas de paramètre user |
| `get_export_data` | Pas de paramètre user |
| `override_repartition` | Pas de paramètre user (mais devrait vérifier le rôle gestionnaire) |
| `regenerate_invitation_code` | Pas de paramètre user (mais devrait vérifier le rôle gestionnaire) |
| `revoke_membre` | Pas de paramètre user (mais devrait vérifier le rôle gestionnaire) |
| `transfer_role` | Pas de paramètre user (mais devrait vérifier que l'appelant est gestionnaire) |
| `update_membre_milliemes` | Pas de paramètre user (mais devrait vérifier le rôle gestionnaire) |
| `upload_proof_url` | Pas de paramètre user |

## Fonctions à renforcer (pas de vérification de rôle)

Ces fonctions ne vérifient pas que l'appelant a le droit d'effectuer l'action :

| Fonction | Risque | Fix |
|---|---|---|
| `override_repartition` | N'importe quel membre peut overrider | Ajouter vérification `is_gestionnaire_of` |
| `regenerate_invitation_code` | N'importe quel membre peut régénérer un code | Ajouter vérification `is_gestionnaire_of` |
| `revoke_membre` | N'importe quel membre peut révoquer | Ajouter vérification `is_gestionnaire_of` |
| `transfer_role` | N'importe quel membre peut transférer | Ajouter vérification que l'appelant est le gestionnaire actuel |
| `update_membre_milliemes` | N'importe quel membre peut changer les millièmes | Ajouter vérification `is_gestionnaire_of` |
| `close_exercice` | N'importe quel membre peut clôturer | Ajouter vérification `is_gestionnaire_of` |
| `add_category` | N'importe quel membre peut ajouter | Ajouter vérification `is_gestionnaire_of` |
| `delete_category` | N'importe quel membre peut supprimer | Ajouter vérification `is_gestionnaire_of` |

## Edge Functions

Aucune Edge Function déployée. Toute la logique est dans les fonctions RPC PostgreSQL.

---

## Plan de refactoring

### Phase 1 : Remplacer les paramètres user par `auth.uid()` (10 fonctions)

Pour chaque fonction vulnérable :
1. Supprimer le paramètre `p_user_id` / `p_created_by` / `p_confirmed_by`
2. Ajouter `v_user_id uuid := (select auth.uid());` en début de fonction
3. Ajouter `IF v_user_id IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;`
4. Mettre à jour le service frontend pour ne plus passer le user_id
5. Mettre à jour les types TS

### Phase 2 : Ajouter les vérifications de rôle (8 fonctions)

Pour chaque fonction sans vérification de rôle :
1. Ajouter une vérification `is_gestionnaire_of(copropriete_id)` ou équivalent
2. Lever une exception si le rôle ne correspond pas

### Phase 3 : Vérification de membership

Pour les fonctions de lecture qui acceptent un `p_copro_id` sans vérifier que l'appelant est membre :
- `get_copro_detail`, `get_depenses`, `get_categories`, `get_appels`, etc.
- Ajouter `IF NOT is_member_of(p_copro_id) THEN RAISE EXCEPTION 'Not a member'; END IF;`

### Ordre d'exécution recommandé

1. **Migration DB** : recréer les 10 fonctions vulnérables sans paramètre user
2. **Migration DB** : ajouter les vérifications de rôle aux 8 fonctions
3. **Migration DB** : ajouter les vérifications de membership aux fonctions de lecture
4. **Services frontend** : supprimer les paramètres `userId`, `createdBy`, `confirmedBy`
5. **Types TS** : mettre à jour la section Functions
6. **Tests E2E** : vérifier que tout fonctionne encore
