# Known limitations (completed / mocked / unimplemented)

Written plainly so nothing is oversold.

## ✅ Completed & functional — Phase 3 (filing, service, research, strategy)
- Filing Workspace: 20-stage lifecycle with history + backward moves; support links; draft versions (never overwritten) with final-for-filing designation
- Readiness checklist + rule-based QC warnings; **waivers/overrides logged to audit**
- Filing packages + downloadable manifest; submission + filed-stamped tracking (records, does not file)
- Certificates of service (draft → review); Service recipients (last-verified) + Service History mirrored to timeline
- Communications Center with follow-up → task; confidentiality/settlement markers
- Legal Research: authorities + verification workflow (unverified until source opened); research questions + memoranda
- Strategy Workspace + snapshots; **immutable Decision Log (supersede)**; Opposing Positions; Settlement comparison; Damages (with assumptions); Remedies
- Source-controlled AI drafting (visible scope) + AI draft review → Verification Queue
- 12 new DB integration tests (33 total passing)

## ✅ Completed & functional — Phase 2 (evidence, contradictions, legal issues, discovery)
- Evidence Command Center: table/card views, filters (type/posture/AI-vs-user), search, create-from-document, cross-links to legal issues/elements/discovery
- Legal Issues (unified) with Elements & Burdens matrix; supporting / adverse / missing evidence surfaced per element; element status updates
- Contradiction Tracker with side-by-side source statements + confirm/reject; Admissions Tracker (source-linked)
- Discovery Command Center: sets + individual numbered requests, response comparison, Deficiency Tracker, Meet-and-Confer, Subpoenas, Witnesses
- Verification Queue extended to all proposal kinds — approval creates the structured record and writes the audit log; Audit History view
- Server-side case-isolation on every link (cross-case linking rejected); 9 new DB integration tests (21 total passing)

## ✅ Completed & functional — Phase 1
- Next.js 15 + strict TypeScript app; `build`, `typecheck`, and unit tests pass
- Prisma schema (~50 entities) + migration + seed (2 demo cases)
- Landing page; Add New Case (manual + upload path)
- Case homepage: caption, court/division/judge, case number, Copy, Open in PeachCourt/PACER, 3 expandable summary cards, sticky identifier
- Full responsive IA (sidebar + mobile drawer); every section routed
- Documents: real upload + SHA-256 + local storage; mock classification; standardized filenames; split-view workspace with real preview of uploaded files; reclassify
- Review/Verification queue: approve / reject / reclassify
- Timeline CRUD; Deadlines & Tasks CRUD; deadline calculator; Confirm-unverified flow
- AI workspace with provider router (mock responses); Integrations hub with honest status
- Server-side Zod validation, per-action ownership checks, audit logging

## 🟡 Mocked (interface real, external call not)
- **AI drafting / draft review / citation extraction** (Phase 3) — mock output with visible source scope; routes proposals to the Verification Queue; never fabricates citations/pages. Real provider drops in behind the router.
- **Filing packages** produce a downloadable text **manifest**; ZIP bundling and PDF merge are not yet implemented.
- **Direct filing / service are NOT implemented** — Pro Se Wins records filing and service details; it does not submit to PeachCourt/PACER or serve documents. Email ingestion, rich-text/PDF diff, and a live legal-research provider are also not wired.
- **Authority treatment checking** is manual — automated negative-treatment/Shepardizing is not connected to any source.
- **AI structured extraction** (evidence, contradictions, discovery import, deficiency review) — produces clearly-labeled `[MOCK]` proposals routed to the Verification Queue; never fabricates page numbers (marks them `unavailable`). Real provider drops in behind the same contract.
- **Authentication/foundation** — schema + fields exist; a dedicated checklist UI and deposition transcript management are not built yet.
- **Exhibit binder generation** — exhibit status/label fields exist on evidence; PDF binder production is deferred.
- **Document classification / extraction** — heuristic on filename, not a real model. Deadlines/hearings/facts it might imply are never auto-confirmed.
- **AI providers** — all responses come from a deterministic built-in mock. Real OpenAI/Claude/Perplexity/Gemini calls are gated on server API keys and not yet wired to live endpoints.
- **Deadline rules** — example rules only, clearly labeled "EXAMPLE — not legal authority." Not authoritative for any jurisdiction.
- **Calendars & cloud storage** — interfaces + mock providers; no real Apple/Google/Outlook/iCloud/OneDrive calls.
- **New-case extraction** — pre-fills from the filename; every field is flagged for review.

## 🔴 Not implemented yet
- Real authentication (dev-mode single user only), Apple/Google/Microsoft sign-in, 2FA, biometric unlock
- Most Phase-4 modules (Legal Issues, Evidence library, Discovery, Motions/filings, Parties, Strategy) render polished empty states
- Drag-and-drop upload, OCR, version comparison, `Undo` after auto-organize
- Background job queue (document processing runs inline)
- Calendar event creation / reminders; export & backup UI; audit history UI; safe-deletion workflow
- PACER/PeachCourt/Adobe integrations (external links only)

## Security limitations (honest)
- **No production auth.** `AUTH_DEV_MODE=true` signs in a single fixed local user. Do not deploy as-is.
- **No encryption at rest** beyond the host filesystem/database; dev DB is unencrypted SQLite.
- **Transport security** depends on your deployment (use HTTPS in production).
- API keys are read **server-side only** and are never sent to the client; `.env` is git-ignored.
- Documents are never sent to an AI provider without a configured provider and an explicit user action.
- **No "military-grade" or similar claims** — this list is the real state.

## Recommended next build step
**Phase 4 — Universal Search, Exhibit & Binder Generation, Calendar & Notifications,
External Integrations, Backup, Export, and Security Hardening:** case-wide search
across every record type, real exhibit/binder PDF generation (building on the
filing-package model), calendar sync + reminder scheduling for deadlines and
filing events, real external connectors (starting with one live AI provider and
a read-only court-docket source), and export/backup + production auth (NextAuth,
2FA) with encryption-at-rest.
