# Architecture

Pro Se Wins is a layered Next.js (App Router) application. The guiding rule:
**business logic lives in `lib/`, never in UI components.** Components fetch via
services and mutate via server actions.

## Layers

```
┌─────────────────────────────────────────────────────────────┐
│ app/                Routes (RSC pages, route handlers)        │
│ components/          Presentational + interactive components   │
│   ui/               Accessible primitives (Button, Card, …)    │
│   case/             Case shell, header, summary cards          │
│   modules/          Feature modules (Documents, Timeline, …)   │
├─────────────────────────────────────────────────────────────┤
│ lib/actions.ts      Server actions ('use server') — mutations  │
│ lib/services/       Query/read services (cases, …)             │
│ lib/auth/           Session abstraction (dev user → NextAuth)  │
│ lib/documents/      Filename generation, classification        │
│ lib/deadlines/      Rule-engine interface + mock rules         │
│ lib/providers/ai/   Provider registry, router, mock            │
│ lib/integrations/   Adapter registry + status resolution       │
│ lib/storage/        StorageProvider interface + local impl     │
│ lib/enums.ts        String-union "enums" + trust states        │
├─────────────────────────────────────────────────────────────┤
│ prisma/             schema.prisma, migrations, seed            │
└─────────────────────────────────────────────────────────────┘
```

## Request flow

- **Reads:** Server Components call `lib/services/*` (or Prisma directly for
  module-local queries), which enforce ownership via `getCurrentUser()`.
- **Writes:** Client components call **server actions** in `lib/actions.ts`.
  Each action re-checks case ownership, validates input with **Zod**, writes via
  Prisma, records an `AuditLog`, and calls `revalidatePath()`.
- **Files:** uploads go through the `StorageProvider` interface
  (`lib/storage/local.ts`) and are streamed back by a route handler
  (`app/case/[id]/document/[docId]/file/route.ts`).

## Navigation & routing

`lib/navigation.ts` is the single source of truth for the case IA. It drives the
sidebar, the mobile drawer, and a catch-all route
(`app/case/[id]/[...section]/page.tsx`) that dispatches each slug to a module or
a polished empty state. Adding a real module = add a branch in that dispatcher.

## Extensibility seams (adapters/abstractions)

| Concern | Interface | v1 implementation | Later |
|--------|-----------|-------------------|-------|
| Auth | `getCurrentUser()` | dev single user | NextAuth/Auth.js |
| Storage | `StorageProvider` | local filesystem | iCloud companion, OneDrive |
| AI | provider registry + `routeProvider()` | mock | OpenAI/Claude/Perplexity/Gemini |
| Deadlines | `DeadlineRule` + `computeAdHoc` | labeled example rules | verified jurisdiction rules |
| Integrations | `IntegrationDef` + `resolveStatus()` | mock/unavailable | real connectors |
| Background work | (synchronous now) | inline in actions | queue/worker |

Every seam is typed so a real implementation drops in without changing callers.

## Why SQLite in dev

Prisma bundles the SQLite driver, so the app runs with zero database setup. The
schema deliberately avoids Postgres-only features (native enums, scalar arrays)
— "enums" are validated strings and categories are relational — so switching to
PostgreSQL is a datasource change plus `prisma migrate`, not a rewrite.
