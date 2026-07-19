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

### Phase 2 — Evidence → structured work product
- **Evidence Command Center** — table/card views, filters (type, posture, AI-vs-user), search; create evidence directly from a document (source page + quoted text), cross-linked to legal issues and discovery.
- **Legal Issues** (unified: claims/counterclaims/defenses/affirmative/procedural) with an **Elements & Burdens matrix** that shows supporting, adverse, and missing evidence per element.
- **Contradiction Tracker** — side-by-side source statements with confirm/reject; **Admissions Tracker** with exact source + page.
- **Discovery Command Center** — sets → numbered requests, response comparison, **Deficiency Tracker**, **Meet-and-Confer**, Subpoenas, Witnesses.
- **Verification Queue** — every AI proposal (evidence, contradiction, admission, legal issue, discovery import, deficiency) is confirmed here; **approval creates the structured record and writes the audit log**. Mock extraction never fabricates pages.
- **Audit History** at Administration → Audit History.

### Phase 3 — Operational litigation workspace
- **Filing Workspace** — a 20-stage filing lifecycle with history and backward moves; a tabbed workspace (Overview / Draft / Support / Checklist / Cert & Service / Package / Filing / AI); support linked to legal issues, evidence, authorities, discovery, and documents.
- **Drafts & versions** — versions are never overwritten; designate one final-for-filing.
- **Readiness & QC** — a readiness checklist plus rule-based warnings (operational, not legal conclusions); waiving a warning requires a reason and is logged.
- **Filing packages** — ordered components + a downloadable manifest; submission + filed-stamped tracking (Pro Se Wins **records**, it does not file).
- **Certificates & service** — draft certificates of service; reusable recipient profiles with last-verified dates; a Service History mirrored to the timeline.
- **Communications** — log emails/letters/calls with confidentiality + settlement markers; spin follow-ups into tasks.
- **Legal Research** — authorities with a verification workflow (unverified until you open the source), research questions, and memoranda.
- **Strategy** — strategy items with supersession + snapshots, an **immutable Decision Log**, Opposing Positions, Settlement comparison, Damages, and Remedies.
- **Source-controlled AI drafting** — visible source scope before submission; AI draft review files issues into the Verification Queue (never rewrites).

### Phase 4 — Operationally complete for daily use
- **Universal Search** — case- or all-cases scope (with isolation), page-level results, filters, saved searches & smart collections, behind a swappable `SearchProvider`. Secrets are never indexed; confidential records excluded unless opted in.
- **Exhibit & Binder Builders** — assemble page ranges into exhibits (numbering + duplicate prevention, authentication/redaction status) and binders (seeded sections, validation). **Bates numbering creates a derivative — the source is never altered.**
- **Calendar & Notifications** — mock Apple/Google/Outlook sync (only **confirmed** deadlines auto-sync, idempotent); a notification engine with deduped reminders, digests, and priorities.
- **Integrations Hub + Diagnostics** — honest connected/mock/unavailable status, test-connection, and an iCloud/local **companion mock** + spec.
- **Backup, Export, Trash** — create/verify/restore-preview backups; full case export with a **confidentiality review** and downloadable manifest; soft-delete with 30-day restore and typed-`DELETE` permanent purge.
- **Security & Health** — server-side authorization everywhere, case-scoped search isolation, a security-event log, sessions + revoke, secrets kept server-side, and a System Health page.

### Phase 5 — Advanced analysis, docket, companion, production config
- **Advanced Case Review** — a versioned, **source-linked** analysis of your *confirmed* data: element-by-element gaps, adverse evidence, contradictions, procedural risks, and what needs verification. Every finding shows its status and links to sources. **No win-probability score.** Plus a **Source Graph** of case relationships.
- **Court-Docket Monitoring** — record entries (deduped), import a docket sheet (proposals → Verification Queue), and configure monitoring — without pretending to have live portal access (PeachCourt/PACER stay external links; no stored passwords).
- **Mac Companion** — a secure device-registration protocol (`POST /api/companion/register`: one-time code → device-scoped token stored **hashed**, returned once), device management + revoke, a reference agent (`scripts/companion-agent.mjs`), and a full native-app spec ([`docs/COMPANION.md`](docs/COMPANION.md)).
- **PWA & mobile** — installable manifest + a conservative offline shell (no private-document caching).
- **Security scaffolding** — 2FA enrollment (TOTP secret + hashed recovery codes), per-case AI privacy modes, provider-usage tracking.
- **Production config** — `Dockerfile`, CI pipeline, `npm run validate:env` (blocks SQLite/dev-auth in prod), and DB indexes. **Not auto-deployed** — see [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md).

See [`docs/`](docs/) for [architecture](docs/ARCHITECTURE.md), [data model](docs/DATA-MODEL.md), the [verification workflow](docs/VERIFICATION-WORKFLOW.md), [filing/service/research workflows](docs/FILING-WORKFLOW.md), [security threat model](docs/SECURITY.md), [deployment](docs/DEPLOYMENT.md), [companion spec](docs/COMPANION.md), [operations runbook & DR](docs/RUNBOOK.md), [privacy](docs/PRIVACY.md), roadmap, and limitations.

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
