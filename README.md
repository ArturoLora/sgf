# SGF — Sistema de Gestión Financiera (Financial Management System)

## Description

SGF is a full-stack financial management system designed to handle operations such as membership registration, shift management, and sales processing. The system is built around a strict layered architecture governed by a formal Architectural Constitution, which defines the responsibilities, contracts, and constraints of each layer. The goal is not only functional correctness but long-term maintainability, predictable data flow, and an explicit, enforceable separation of concerns.

This repository is intended to demonstrate disciplined software design in a real-world context — not a proof of concept, but a system built to survive change.

---

## Architectural Principles

The architecture is organized around eight core principles, each of which maps to a concrete set of enforceable rules:

- **P-1 — Unidirectional Dependencies**: Dependencies flow in one direction only. Inner layers are never aware of outer layers.
- **P-2 — Centralized Orchestration**: Each use case is coordinated by exactly one Service. No orchestration logic lives in the HTTP boundary or in the presentation layer.
- **P-3 — Pure Domain**: The domain layer has zero dependencies on infrastructure, HTTP, or persistence. It contains only business logic, expressed as pure functions.
- **P-4 — Explicit Contracts**: Each layer boundary is defined by an explicit contract (Zod schemas, TypeScript types). Implicit coupling is a violation.
- **P-5 — Use Case-Oriented Design**: Services model business use cases ("register member", "close shift with summary"), not CRUD operations.
- **P-6 — Structural Symmetry**: Contexts are structured consistently across the codebase. A developer familiar with one context should be immediately oriented in any other.
- **P-7 — UI Without Business Logic**: Presentation components receive data and callbacks as props. They do not query APIs, evaluate business rules, or own business state.
- **P-8 — Single Use Case Authority**: Every use case has exactly one canonical Service. If a use case is needed in multiple contexts, the non-owning context calls the owning Service — it never reimplements it.

Violations of these principles constitute active architectural debt. Exceptions require an approved Architecture Decision Record (ADR) before the change is integrated.

---

## Project Structure

```
/
├── app/                    # HTTP boundary — API routes and server-rendered pages
│   └── [context]/
│       ├── route.ts        # Entry point: validates input, calls one Service, returns response
│       └── page.tsx        # Server page: fetches initial data, passes to Manager
│
├── lib/
│   ├── domain/             # Pure domain layer — business rules, calculations, validators
│   │   ├── [context]/      # Domain logic per bounded context
│   │   └── shared/         # Cross-context pure utilities
│   ├── services/           # Use case layer — orchestrates persistence + domain
│   │   └── [context]/      # One Service per context; each method is a use case
│   └── api/                # Client-side fetch wrappers (called only from Manager)
│
├── types/
│   └── api/                # HTTP contract layer — Zod schemas and inferred TypeScript types
│
└── components/
    └── [context]/
        ├── [Context]Manager.tsx   # Orchestrates UI state; only component that calls lib/api
        └── [Component].tsx        # Presentational components — props in, render out
```

Each context (e.g., `members`, `sales`, `shifts`, `inventory`) follows the same internal structure. Deviations from this layout are considered structural violations.

---

## Data Flow Overview

### Backend

```
HTTP Request
  → API Route (app/[context]/route.ts)
      Validates input via types/api schemas
      Calls exactly one Service method
  → Service (lib/services/[context])
      Reads entities via Prisma
      Delegates business logic to lib/domain
      Writes results to database
      Returns typed response
  → API Route serializes and returns HTTP response
```

No business logic lives in the route. No Prisma access occurs in the domain. The Service is the sole coordinator.

### Frontend

```
Server Page (app/[context]/page.tsx)
  Fetches initial data server-side
  Passes data as props to Manager

Manager ([Context]Manager.tsx)
  Owns all UI state (selected item, open modals, filters)
  Calls lib/api for mutations
  Imports logic from lib/domain only
  Distributes data and callbacks to child components

Presentational Components
  Render received props
  Emit events via callbacks
  Contain no business logic, no API calls, no independent data fetching
```

---

## Architectural Rules — What Is Explicitly Prohibited

The following are hard constraints enforced during code review. They are not style preferences.

- An API route may not contain conditional business logic or access Prisma directly.
- A Service may not import models from another context's Prisma schema directly.
- A Service may not expose Prisma types in its public method signatures.
- A Service method may not reimplement a use case that already exists in another Service.
- A domain function may not import from any infrastructure layer (Prisma, HTTP, environment config).
- A presentational component may not call `lib/api` or own business state.
- A modal component may not fetch its own data — it receives the data it needs as a prop from the Manager.
- A use case may not exist in more than one Service. If two contexts need the same operation, one calls the other.

Rules marked as absolute (NUNCA / NEVER in the constitution) have no exception process. If a situation appears to require breaking them, the issue is with the design of the proposed use case, not with the rule.

---

## Project Status

**In active development.** The system is being progressively aligned with the Architectural Constitution. Some modules may still contain documented violations under remediation. All new code is expected to conform fully. Each exception must be covered by an approved ADR.

---

## Technologies Used

| Layer             | Technology                               |
| ----------------- | ---------------------------------------- |
| Framework         | Next.js (App Router)                     |
| Language          | TypeScript                               |
| ORM / Persistence | Prisma                                   |
| Validation        | Zod                                      |
| Styling           | Tailwind CSS                             |
| UI Components     | React (functional components with hooks) |

---

## How to Run

> Setup and run instructions will be added once the environment configuration is stabilized. This section is a placeholder.

```bash
# Install dependencies
npm install

# Run database migrations
npx prisma migrate dev

# Start development server
npm run dev
```

Environment variables (database connection string, etc.) should be configured in a `.env` file. See `.env.example` for reference.

---

## Final Notes

SGF is an exercise in deliberate software design. The architecture is not incidental — it is the result of a written governing document that predates the implementation decisions it constrains. This means that structural intent is explicit, traceable, and enforceable in code review.

The primary engineering goals are:

- **Predictability**: A developer reading any part of the codebase should be able to reason about it without needing to trace execution across unexpected layer boundaries.
- **Maintainability**: Business logic lives in one place. Changing a rule means changing one module. Changing a use case means changing one Service method.
- **Testability**: The pure domain layer can be tested without mocking databases, HTTP clients, or any infrastructure. Services can be tested with mocked Prisma clients. Components can be tested with static props.

Architecture debt is tracked explicitly. Any deviation from the constitution that cannot be resolved immediately is documented in an ADR, which records what was broken, why, and the conditions under which it should be reverted.

The goal is not a perfect system on day one. It is a system that degrades with intent rather than by accident.

## Portfolio Note

This repository is part of my professional portfolio and showcases
real-world architectural decisions, not a tutorial or template.

## License

MIT License — see LICENSE file for details.
