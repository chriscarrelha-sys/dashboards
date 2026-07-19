# Pro Se Wins

**A personal litigation command center.** _“Success is the best revenge.”_

A private, single-user application for managing your own active court cases —
documents, deadlines, evidence, discovery, filings, correspondence, research,
strategy, and AI-assisted analysis. It is **not** a public SaaS product and is
**not** a legal-advice platform.

> This is the first working vertical slice (Phase 0 + core Phase 1–3), built on a
> modular foundation designed to grow into the full specification. See
> [`docs/LIMITATIONS.md`](docs/LIMITATIONS.md) for exactly what is real, mocked,
> and not yet built.

## Trust model (the core idea)

Every value that can come from AI extraction or date calculation carries a
**verification status** and is rendered with a distinct badge, so you can always
tell apart:

| State | Meaning |
|-------|---------|
| **Confirmed** | A fact you've verified. |
| **Proposed** | AI- or system-suggested; awaiting review. |
| **Unverified** | Calculated (e.g. a deadline) but not yet confirmed. |
| **Disputed / Corrected** | Flagged or edited by you. |

Deadlines, hearing dates, service dates, and legal conclusions are **always**
`unverified` until you confirm them. The app never presents an AI-generated
legal conclusion as a verified fact.

## Tech stack

- **Next.js 15** (App Router) · **React 19** · **TypeScript** (strict)
- **Tailwind CSS** with a calm, theme-aware design system
- **Prisma ORM** — SQLite for zero-setup dev, schema written to port to **PostgreSQL** in production
- **Zod** for server-side validation
- Modular service / provider / adapter layers (AI, storage, integrations, deadlines, jobs)

Business logic lives in `lib/*`, never in UI components.

## Getting started

```bash
# 1. Install
npm install

# 2. Configure environment
cp .env.example .env         # dev defaults use SQLite; no secrets needed

# 3. Create the database and seed two demonstration cases
npm run db:migrate           # applies migrations
npm run db:seed              # 1 Georgia/PeachCourt case + 1 federal/PACER case

# 4. Run
npm run dev                  # http://localhost:3000
```

Other scripts:

```bash
npm run build       # production build (runs prisma generate first)
npm run start       # serve the production build
npm run typecheck   # tsc --noEmit (strict)
npm run test        # vitest — filename + deadline-rule unit tests
npm run db:studio   # Prisma Studio
npm run db:reset    # drop, re-migrate, re-seed
```

## What's in this build

- **Landing page** — minimal “Select a Matter” with one card per case + Add New Case.
- **Add New Case** — wizard with manual entry and initiating-document upload (mock extraction review).
- **Case homepage** — full caption, court/division/judge, case number, Copy Case Number, Open in PeachCourt/PACER, and three expandable summary cards (Next Action, Next Court Date/Deadline, Current Posture).
- **Responsive navigation** — the complete case IA (10 groups) as a collapsible desktop sidebar and a mobile drawer; every section is routed. Sections without a dedicated module yet show polished empty states.
- **Documents** — upload → automatic mock classification → standardized filename → split-view workspace (preview + case record + reclassify). Low-confidence uploads route to the review queue.
- **Review / Verification Queue** — approve, reject, or open to reclassify.
- **Timeline** — manual CRUD with trust badges.
- **Deadlines & Tasks** — CRUD, a calendar/business-day calculator (clearly-labeled example rules), and explicit Confirm for unverified deadlines.
- **AI Workspace** — persistent conversation with a provider router; responses come from a built-in **mock** unless a provider key is configured. Active provider is always shown before sending.
- **Integrations hub** — honest connected / mock / unavailable status for AI, storage, calendars, court systems, and PDF tools.

See [`docs/`](docs/) for architecture, data model, integration status, roadmap, and limitations.

## Documentation

- [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) — layers, folder map, request flow
- [`docs/DATA-MODEL.md`](docs/DATA-MODEL.md) — entities and the trust fields
- [`docs/INTEGRATIONS.md`](docs/INTEGRATIONS.md) — every connector's real status
- [`docs/ROADMAP.md`](docs/ROADMAP.md) — phased build plan
- [`docs/LIMITATIONS.md`](docs/LIMITATIONS.md) — completed / mocked / unimplemented + security notes

## Security & privacy

The first version runs with a **dev-mode single user** (no external auth yet).
API keys are read **server-side only** and never exposed to the client; documents
are never sent to an AI provider without a configured provider and an explicit
action. See [`docs/LIMITATIONS.md`](docs/LIMITATIONS.md) for the honest list of
what is implemented vs. planned — there are **no “military-grade” claims** here.

---

The earlier static-HTML prototype (“CaseDeck”) is preserved under
[`legacy-prototype/`](legacy-prototype/) for reference.
