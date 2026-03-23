# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

TinyCopro is a co-property (copropriete) finance management SPA for Belgian apartment buildings. Users can be **gestionnaire** (manager) or **copropriétaire** (co-owner) per property. The app handles expenses, payment invitations with SEPA QR codes, member management via invitation codes, and audit logging.

## Commands

```bash
npm run dev          # Dev server (Turbopack, SSR mode — dynamic routes work)
npm run build        # Static export to out/ directory
npm run lint         # ESLint
node e2e/test-e2e.mjs  # E2E tests (requires `npm run build` first, serves out/ on port 3456)
```

No unit test framework is configured. Testing is E2E only via Puppeteer.

## Mandatory Rules

### Service Layer — NO direct Supabase queries in components

**Components and hooks MUST NEVER import `supabase` or call `supabase.from()`, `supabase.rpc()`, or `supabase.storage` directly.**

The only exception is `src/components/auth/AuthProvider.tsx` which uses `supabase.auth.*` for authentication.

All data access follows this chain:

```
Components → Services (src/services/) → supabase.rpc() → PostgreSQL SECURITY DEFINER functions
```

- **Components** (`src/components/`, `src/app/`) import functions from `src/services/` only
- **Services** (`src/services/`) are the sole gateway to Supabase — they call `supabase.rpc()` for all queries and mutations, and `supabase.storage` for file uploads only
- **RPC functions** are PostgreSQL `SECURITY DEFINER` functions that handle all business logic, calculations, and multi-step operations atomically

### No business logic in the frontend

- Financial calculations (expense distribution, totals) happen in PostgreSQL functions, never in JavaScript
- Multi-step operations (create copro + member + exercice, generate payment + link repartitions + update statuses) are atomic in a single RPC call
- Permission checks are enforced server-side in RPC functions, not trusted from frontend state
- Invitation codes are generated server-side with `gen_random_bytes()`, not `Math.random()`

### Services structure

```
src/services/
  copropriete.ts    → create, list, detail
  membre.ts         → invitation, join, milliemes, transfer, revoke
  depense.ts        → create, list, categories, override
  paiement.ts       → generate, mark paid, upload proof, list
  exercice.ts       → close, create, list, export
```

### Validation messages must be translated

- All Zod schemas use translated messages via `useTranslations('validation')`
- Schema factory functions live in `src/lib/validation.ts` (e.g., `createLoginSchema(tv)`)
- Never use bare `.min(6)` or `.email()` without a translated message parameter

## Architecture

### Static Export SPA

- **Production**: `output: 'export'` generates static HTML. Hosted on one.com with `.htaccess` SPA fallback.
- **Dev**: `output: undefined` enables SSR so dynamic routes work without `generateStaticParams` restrictions.
- All client-side routing under `copro/[[...slug]]` — a single catch-all route handles all copro sub-pages.

### Routing Pattern

```
src/app/[locale]/                          # i18n: fr, nl, en (default: fr)
  (auth)/  login|register|reset-password   # Public routes
  (dashboard)/                             # Protected routes
    copros/                                # List user's co-properties
    profil/                                # User profile
    copro/[[...slug]]/page.tsx             # Catch-all → CoproDetailShell
```

The catch-all `page.tsx` is a **server wrapper** (has `generateStaticParams`) that renders `<CoproCatchAllPageContent />`. The actual routing happens client-side in `CoproDetailShell.tsx`, which parses the slug from `usePathname()` (since `useParams().slug` is empty in static export).

Sub-routes within a copro (dashboard, depenses, paiements, membres, parametres) are handled by components in `src/components/pages/`.

### Key Architectural Decisions

- **Server wrappers for dynamic routes**: `'use client'` cannot appear in files with `generateStaticParams()`. Client logic lives in `src/components/pages/`, page.tsx files are thin server wrappers.
- **Single AuthProvider**: One `onAuthStateChange` subscription in `src/components/auth/AuthProvider.tsx`, exposed via `useAuth()` hook. Never use per-component auth subscriptions.
- **CoproContext**: Provided by `CoproDetailShell`, gives child pages access to `copro`, `membres`, `currentMembre`, `isGestionnaire`, `exercice`.
- **Supabase client singleton**: `src/lib/supabase.ts` with Web Locks bypass for static export navigation.

### Component Organization

```
src/components/
  ui/          # shadcn/ui (uses @base-ui/react, NOT Radix — no asChild prop)
  auth/        # AuthProvider, AuthGuard
  layout/      # Header, Sidebar, LanguageSwitcher
  copro/       # CoproDetailShell, CoproContext, invitation management
  depenses/    # Expense forms, categories, overrides
  paiements/   # Payment generation, mark-as-paid
  pages/       # Page-level client components (CoproDashboardPage, DepensesPage, etc.)
  audit/       # Audit log display
```

### i18n

- next-intl with routing config in `src/i18n/routing.ts`
- Translation files: `src/messages/{fr,nl,en}.json`
- Server components: `setRequestLocale()` + `getMessages()`
- Client components: `useTranslations('namespace')`

### Database

- Supabase PostgreSQL with RLS on all tables
- Types in `src/types/database.types.ts` (regenerate via Supabase MCP `generate_typescript_types`)
- Key tables: `coproprietes`, `membres`, `profiles`, `exercices`, `depenses`, `repartitions`, `appels_paiement`, `appel_repartitions`, `paiements`, `categories_depenses`, `journal_audit`
- All mutations and queries go through SECURITY DEFINER RPC functions (see `src/services/`)
- `invitations` table has been removed — invitation data lives on `membres` (columns: `invitation_code`, `invitation_email`, `invitation_expires_at`, `invitation_used_by`)

### Utilities

- `src/lib/validation.ts` — Zod schema factories with translated messages
- `src/lib/pdf-generator.ts` — payment invoice PDFs (@react-pdf/renderer)
- `src/lib/qr-generator.ts` — EPC/SEPA QR codes
- `src/lib/csv-export.ts` — CSV export (papaparse)
- `src/lib/audit.ts` — append-only audit logging (fire-and-forget)
- `src/lib/notifications.ts` — email via Supabase Edge Function (fire-and-forget)

### E2E Tests

Puppeteer-based in `e2e/test-e2e.mjs`. Multi-user tests use `browser.createBrowserContext()` for isolated localStorage. Uses `domcontentloaded` (not `networkidle0`) because Supabase realtime keeps connections open.

## Critical Patterns

- **Never `await` inside `onAuthStateChange`** — causes deadlock when token refresh is needed. Fire-and-forget only.
- **Never call `supabase.from()` in components** — always go through `src/services/` which call `supabase.rpc()`.
- **All multi-step DB operations must be in a single RPC** — never do sequential inserts/updates from the frontend.
- **Dialog submit buttons must be inside `<form>`** — `form="id"` attribute doesn't work in portals (base-ui Dialog).
- **Use `window.location.href` for navigation** (not `router.replace`) in static export for reliable behavior.
- **`setState` + function call in same handler**: the function sees stale state. Pass the value as a parameter instead.
- **New RPC functions** must be SECURITY DEFINER with `SET search_path = ''`, added to `src/types/database.types.ts` Functions section, and exposed via the appropriate service in `src/services/`.
