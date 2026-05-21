# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**SGF** (Sistema de Gestión Financiera) is a full-stack financial management system built with Next.js App Router, TypeScript, Prisma, Zod, and Tailwind CSS. It manages members, products, inventory movements, shift/cash-register cycles, and sales.

Authentication is handled by **better-auth** (email + password, Prisma adapter). The Prisma client is generated into `app/generated/prisma/`.

---

## Commands

```bash
# Development
npm run dev              # Start Next.js dev server

# Build & lint
npm run build
npm run lint             # ESLint

# Database (Prisma)
npm run prisma:generate  # Regenerate Prisma client after schema changes
npm run prisma:migrate   # Create and apply a new migration
npm run prisma:push      # Push schema without a migration file (dev only)
npm run prisma:studio    # Open Prisma Studio
npm run prisma:seed      # Seed the database (tsx prisma/seed.ts)
npm run prisma:reset     # Drop and recreate the database + seed
```

**Environment variables** (see `.env.example`):
```
DATABASE_URL=
BETTER_AUTH_SECRET=
BETTER_AUTH_URL=
```

---

## Architecture

The project enforces a strict **layered architecture** governed by eight principles. Understanding them before writing any code is mandatory:

| Principle | Rule |
|-----------|------|
| P-1 | Unidirectional dependencies — inner layers never import outer layers |
| P-2 | Each use case is coordinated by exactly **one** Service |
| P-3 | Domain layer is pure — no Prisma, no HTTP, no env config |
| P-4 | Explicit contracts — layer boundaries use Zod schemas / TypeScript types |
| P-5 | Services model **business use cases**, not CRUD operations |
| P-6 | Structural symmetry — every context follows the same folder layout |
| P-7 | UI has no business logic — components receive data/callbacks as props |
| P-8 | A use case exists in exactly one Service; other contexts call that Service |

### Folder Map

```
app/
  (dashboard)/           # Server pages + per-page component trees
    [context]/
      page.tsx           # Fetches initial data server-side, passes to Manager
      _components/       # [Context]Manager + all presentational components
  api/
    [context]/route.ts   # Validates input via types/api → calls one Service → returns response

modules/                 # ← New canonical home for domain logic (actively migrated)
  members/
  products/
  inventory/
  sales/
  Each module contains:
    *.service.ts         # Use-case functions (async, touches Prisma)
    types.ts             # Module-level types
    domain/              # Pure functions: filters, payloads, formatters, calculations

lib/
  domain/                # Legacy domain logic (sales, shifts, reports, shared) — being migrated
  api/
    *.client.ts          # Client-side fetch wrappers — called ONLY from Manager components
  auth.ts                # better-auth instance
  db.ts                  # Prisma singleton (lib/db.ts) — used by services in lib/
  require-role.ts        # Server-side role guard

services/                # Legacy use-case layer for shifts/reports/users — being migrated
  index.ts               # Re-exports all services (both old and new module locations)

types/
  api/                   # Zod schemas + inferred TypeScript types for HTTP contracts
    common.ts, members.ts, products.ts, sales.ts, shifts.ts, reports.ts
  models/                # Domain model types (Socio, Producto, Corte, etc.)

components/
  ui/                    # shadcn/ui primitives
  layout/                # Sidebar, Header, ThemeToggle
```

### Data Flow — Backend

```
HTTP Request
  → app/api/[context]/route.ts
      parse & validate with types/api schemas
      call exactly ONE Service method
  → modules/[context]/*.service.ts  (or services/*.service.ts for legacy)
      read/write via Prisma
      delegate business rules to domain/
      return typed response
  → route serializes HTTP response
```

### Data Flow — Frontend

```
app/(dashboard)/[context]/page.tsx   (server component)
  → fetches initial data
  → passes as props to [Context]Manager

[Context]Manager  (Client component — "use client")
  → owns ALL UI state (modals open, selected item, filters, pagination)
  → calls lib/api/*.client.ts for mutations and refreshes
  → imports pure logic from modules/[context]/domain or lib/domain
  → distributes data + callbacks to presentational children

Presentational components
  → render received props
  → fire callbacks on user interaction
  → NEVER call lib/api or own business state
```

---

## Key Conventions

### Service methods
Services expose **named async functions** (not a class). Each function represents one use case. They return serialized response types (never raw Prisma types). Input is received as parsed domain types, not raw HTTP payloads.

### Modules vs. services/
New contexts go under `modules/`. The `services/` folder and `lib/domain/` contain older code being progressively migrated. `services/index.ts` re-exports both so API routes don't need to know the physical location.

### Prisma client location
The client is generated into `app/generated/prisma/` (not the default location). Services in `modules/` import from there; `lib/db.ts` uses `@prisma/client` (legacy).

### Input parsing pattern
Every route delegates input parsing to a `parse*Input` / `parse*Query` helper that lives in the service file itself (e.g., `parseMembersQuery`, `parseCreateMemberInput`). These helpers convert raw HTTP input into the domain request types.

### Hard constraints (never violate)
- API route may not contain conditional business logic or direct Prisma calls.
- Service method signatures must not expose Prisma types.
- Domain functions may not import from Prisma, HTTP, or environment config.
- Presentational components may not call `lib/api` or own business state.
- Modals receive their data as props — they never fetch their own data.
- A use case may not be reimplemented in a second Service.
