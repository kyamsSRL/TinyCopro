# Architecture Technique — TinyCopro V1

## 1. Vue d'ensemble de l'architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        NAVIGATEUR (SPA)                         │
│  Next.js static export · TypeScript · Tailwind · shadcn/ui     │
│  @supabase/supabase-js (auth, queries, storage, realtime)      │
└──────────────────────────────┬──────────────────────────────────┘
                               │  HTTPS (JWT dans Authorization header)
                               ▼
┌─────────────────────────────────────────────────────────────────┐
│                      SUPABASE (Cloud EU)                        │
│                                                                 │
│  ┌──────────┐  ┌────────────┐  ┌──────────┐  ┌──────────────┐  │
│  │   Auth   │  │ PostgreSQL │  │ Storage  │  │Edge Functions│  │
│  │(email/pw)│  │  + RLS     │  │(fichiers)│  │   (Deno)     │  │
│  └──────────┘  └────────────┘  └──────────┘  └──────────────┘  │
│                                                                 │
│  ┌──────────┐                                                   │
│  │ Realtime │  (optionnel V1)                                   │
│  └──────────┘                                                   │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────┐         ┌──────────────┐
│  one.com (statique) │         │    Resend    │
│  Héberge le build   │         │   (emails)   │
│  HTML/CSS/JS        │         └──────────────┘
└─────────────────────┘
```

**Principes clés :**
- **one.com** sert uniquement les fichiers statiques (HTML, CSS, JS, images). Aucune logique serveur.
- **Toute la logique métier** réside dans Supabase : authentification, base de données, stockage de fichiers, fonctions edge.
- L'application est une **SPA** (Single Page Application) : le navigateur communique directement avec Supabase via `@supabase/supabase-js`.

---

## 2. Stack Front-end

| Techno | Rôle |
|---|---|
| **Next.js** (static export) | Framework React, routing (App Router), build statique |
| **TypeScript** | Typage statique sur tout le code front-end |
| **Tailwind CSS** | Styles utilitaires, responsive design |
| **shadcn/ui** | Composants UI accessibles (basés sur Radix UI) |
| **React Hook Form + Zod** | Gestion des formulaires + validation des données |
| **@supabase/supabase-js** | Client Supabase côté navigateur (auth, queries, storage) |

> **Note :** Pas de `@supabase/ssr`. L'authentification et la gestion de session se font entièrement côté navigateur via `localStorage`.

---

## 3. Stack Back-end (Supabase)

| Service | Usage |
|---|---|
| **Supabase Auth** | Inscription, connexion email/mot de passe, reset password, sessions JWT |
| **PostgreSQL** | Base relationnelle : copropriétés, membres, dépenses, paiements, audit |
| **Row Level Security (RLS)** | Isolation des données par utilisateur et par copropriété |
| **Supabase Storage** | Justificatifs (PDF, images), PDFs de paiement générés |
| **Edge Functions (Deno)** | Logique métier complexe : récurrence des dépenses, calcul de répartition, envoi d'emails via Resend |
| **Realtime** | Notifications temps réel — optionnel en V1 |

Tout le back-end est déployable via **MCP Supabase** (migrations SQL, RLS policies, Edge Functions, buckets Storage).

---

## 4. Librairies spécifiques

| Librairie | Usage |
|---|---|
| **@react-pdf/renderer** | Génération PDF des invitations de paiement (côté navigateur) |
| **qrcode** (ou react-qr-code) | QR code EPC/SEPA pour virements bancaires |
| **Resend** | Envoi d'emails : notifications, relances, confirmations |
| **papaparse** (ou API native) | Export CSV des dépenses et paiements |
| **next-intl** | Internationalisation (i18n), compatible static export |

---

## 4b. Internationalisation (i18n)

- **3 langues** : Français (fr), Néerlandais (nl), Anglais (en)
- **Langue par défaut** : Français
- **Librairie** : `next-intl` (compatible static export)
- **Organisation des traductions** :
  ```
  src/messages/
  ├── fr.json
  ├── nl.json
  └── en.json
  ```
- **Routing** : préfixe de langue dans l'URL
  - `/fr/copros`, `/nl/copros`, `/en/copros`
- **Détection** : langue du navigateur à la première visite, choix sauvegardé en `localStorage`
- **Scope** : toute l'UI (labels, messages d'erreur, emails si possible via les templates Resend)

---

## 5. Authentification — Flux détaillé

### Inscription
1. L'utilisateur remplit le formulaire (email, mot de passe, nom, prénom, adresse)
2. Appel à `supabase.auth.signUp()` → Supabase Auth crée le compte
3. Email de confirmation envoyé par Supabase Auth
4. L'utilisateur clique le lien → redirection vers le dashboard (page "Mes copros" vide)

### Connexion
1. L'utilisateur saisit email + mot de passe
2. Appel à `supabase.auth.signInWithPassword()`
3. Supabase retourne un `access_token` (JWT) + `refresh_token`
4. Les tokens sont stockés en **localStorage** par le SDK

### Session
- Le client JS envoie le `access_token` dans le header `Authorization: Bearer <token>` à chaque requête vers Supabase
- Le refresh est **automatique** via le SDK `@supabase/supabase-js`

### Points importants
- **Pas de cookie serveur** — mode SPA uniquement
- **Pas de `@supabase/ssr`** — tout passe par `localStorage`
- La session persiste tant que le `refresh_token` est valide

---

## 6. Hébergement & Déploiement

### Front-end — one.com (fichiers statiques)

| Étape | Détail |
|---|---|
| **Build** | `npx next build` → génère le dossier `out/` |
| **Upload** | FTP/SFTP manuel du contenu de `out/` vers one.com |
| **Routing SPA** | Fichier `.htaccess` pour rediriger toutes les routes vers `index.html` |

Exemple `.htaccess` :
```apache
RewriteEngine On
RewriteBase /
RewriteRule ^index\.html$ - [L]
RewriteCond %{REQUEST_FILENAME} !-f
RewriteCond %{REQUEST_FILENAME} !-d
RewriteRule . /index.html [L]
```

### Back-end — Supabase (cloud)

| Élément | Méthode de déploiement |
|---|---|
| Schema SQL + migrations | MCP Supabase |
| RLS policies | MCP Supabase |
| Edge Functions | MCP Supabase |
| Storage buckets | Dashboard Supabase ou MCP |

---

## 7. Structure du projet Next.js

```
TinyCopro/
├── src/
│   ├── app/                        # Pages (App Router, static export)
│   │   ├── [locale]/               # Préfixe i18n (fr, nl, en)
│   │   │   ├── (auth)/             # Pages publiques
│   │   │   │   ├── login/
│   │   │   │   ├── register/
│   │   │   │   └── reset-password/
│   │   │   ├── (dashboard)/        # Pages protégées
│   │   │   │   ├── copros/         # Liste des copropriétés
│   │   │   │   ├── copro/[id]/     # Détail d'une copropriété
│   │   │   │   │   ├── depenses/
│   │   │   │   │   ├── paiements/
│   │   │   │   │   ├── membres/
│   │   │   │   │   └── parametres/
│   │   │   │   └── profil/
│   │   │   └── layout.tsx
│   │   └── layout.tsx
│   ├── components/                 # Composants réutilisables
│   │   ├── ui/                     # shadcn/ui (Radix UI)
│   │   └── ...                     # Composants métier custom
│   ├── lib/                        # Utilitaires
│   │   ├── supabase.ts             # Client Supabase (singleton)
│   │   ├── auth.ts                 # Helpers d'authentification
│   │   └── utils.ts                # Fonctions utilitaires générales
│   ├── hooks/                      # Custom React hooks
│   ├── messages/                   # Fichiers de traduction i18n
│   │   ├── fr.json
│   │   ├── nl.json
│   │   └── en.json
│   └── types/                      # Types TypeScript (schéma DB, etc.)
├── supabase/
│   ├── migrations/                 # Migrations SQL
│   ├── functions/                  # Edge Functions (Deno/TypeScript)
│   └── seed.sql                    # Données de test
├── public/                         # Assets statiques (images, favicon)
├── next.config.ts                  # Configuration Next.js (output: 'export')
├── tailwind.config.ts              # Configuration Tailwind CSS
├── tsconfig.json                   # Configuration TypeScript
└── package.json
```

---

## 8. Sécurité

### Row Level Security (RLS)
Chaque table possède des policies PostgreSQL (`SELECT`, `INSERT`, `UPDATE`, `DELETE`) basées sur `auth.uid()`. Les données d'une copropriété ne sont accessibles qu'à ses membres.

### Double validation
- **Côté client** : validation des formulaires avec Zod (retour instantané à l'utilisateur)
- **Côté base de données** : contraintes PostgreSQL (`CHECK`, `NOT NULL`, `FOREIGN KEY`) en dernière ligne de défense

### Protection de l'IBAN
L'IBAN de la copropriété n'est **jamais exposé directement** aux copropriétaires dans l'interface. Il apparaît uniquement dans le PDF de paiement généré (et dans le QR code EPC/SEPA).

### Journal d'audit
Table `audit_log` en **append-only** :
- Aucun `UPDATE` ou `DELETE` autorisé via RLS
- Chaque entrée enregistre : qui (user_id), quoi (action), quand (timestamp), détails (payload JSON)

### RGPD
- Supabase hébergé dans l'**Union Européenne**
- Données personnelles minimales (nom, prénom, email, adresse)
- Pas de tracking, pas de cookies tiers

---

## 9. Environnements

| Environnement | Front-end | Supabase |
|---|---|---|
| **Dev** | `localhost:3000` | Projet Supabase "dev" (ou Supabase CLI en local) |
| **Production** | one.com (fichiers statiques) | Projet Supabase "prod" |

### Variables d'environnement

```env
NEXT_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon-key>
```

> Les variables préfixées `NEXT_PUBLIC_` sont exposées côté client. C'est attendu : la clé `anon` est publique, la sécurité repose sur les **RLS policies** côté Supabase.
