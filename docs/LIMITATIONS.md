# Known limitations (completed / mocked / unimplemented)

Written plainly so nothing is oversold.

## ✅ Completed & functional — Phase 5 (advanced AI analysis, docket, companion, prod config)
- Advanced Case Review: **versioned, source-linked** analysis with element-gap flags, adverse evidence, contradictions, procedural-risk, verification-needed — **no win-probability score**; Source Graph
- Court-Docket Monitoring: entries + dedupe, docket-sheet import → Verification Queue, monitor config (non-manual providers honestly shown **unavailable**)
- Mac companion: secure device-registration API (one-time code → **hashed** device token, returned once), device revoke, reference agent + spec
- PWA (manifest + conservative offline shell, no private-doc caching); 2FA scaffolding (TOTP secret + hashed recovery codes); per-case AI privacy modes; provider-usage tracking
- Production config: `Dockerfile`, CI pipeline, `validate:env` (blocks SQLite/dev-auth in prod), DB indexes
- 8 new DB integration tests (53 total passing)

## ✅ Completed & functional — Phase 4 (search, exhibits/binders, calendar, backup, security)
- Universal Search: `SearchProvider` abstraction + local index, case/global scope with isolation, page-level results, filters, saved searches + smart collections, reindex
- Exhibit Builder (page ranges, numbering + duplicate prevention, auth/redaction status); **Bates numbering creates a derivative — source never altered**
- Binder Builder (seeded sections, validation with source checks); downloadable manifests (filing package, export)
- Calendar sync (mock; **confirmed-only auto-sync**, idempotent); Notification engine (deduped reminders, digests, priorities)
- Integration diagnostics (test connection, honest statuses); iCloud/local companion **mock** + spec
- Backup (create/verify/restore-preview), Full Case Export (**confidentiality review** + manifest), Trash & Restore (soft-delete + typed-`DELETE` purge)
- Security: server-side authorization + case-scoped search isolation, security-event log, sessions + revoke, System Health page, secrets server-side only
- 12 new DB integration tests (45 total passing)

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
- **Search backend** — a local index (`SearchIndexEntry`) queried with contains/rank; fuzzy is approximate and there's no semantic/vector search yet. The `SearchProvider` interface accepts Meili/Typesense/pgvector.
- **Calendar / storage / email / court integrations** — Apple/Google/Outlook calendars, OneDrive/iCloud, Gmail/Outlook are **mock** (no OAuth); PeachCourt/PACER are **external-link only** (the app records filing info, it does not file). iCloud companion is a documented mock protocol.
- **PDF / OCR / ZIP** — exhibit page-extraction, true redaction, and binder/export **PDF and ZIP bundling are not implemented**; the app produces **structured text/JSON manifests** and never claims a corrupt or misleading final PDF. True redaction must be done in a trusted PDF tool.
- **Notifications** — dashboard is real; **email and push are mock channels** (no native iOS push).
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
- Real authentication (dev-mode single user only), Apple/Google/Microsoft sign-in, 2FA, passkeys, biometric unlock (see `docs/SECURITY.md`)
- Real PDF/OCR/ZIP generation (exhibits, binders, exports produce structured manifests); true redaction
- Live OAuth for calendars/storage/email; native iOS push; hosted search backend + semantic search
- Real background-job worker (jobs are modeled and run inline); encryption at rest; file-upload malware scanning
- Mac companion agent (protocol is specified + mocked), court-docket monitoring, direct court filing

## Security limitations (honest)
- **No production auth.** `AUTH_DEV_MODE=true` signs in a single fixed local user. Do not deploy as-is.
- **No encryption at rest** beyond the host filesystem/database; dev DB is unencrypted SQLite.
- **Transport security** depends on your deployment (use HTTPS in production).
- API keys are read **server-side only** and are never sent to the client; `.env` is git-ignored.
- Documents are never sent to an AI provider without a configured provider and an explicit user action.
- **No "military-grade" or similar claims** — this list is the real state.

## 🔴 Deferred to Phase 6 (require external accounts / your approval)
- Actual production deployment + managed PostgreSQL + encryption at rest
- Signed native Mac companion binary (Apple Developer account); live iCloud folder monitoring
- Live PACER/PeachCourt/AI/calendar/storage OAuth; hosted search backend + job worker; native iOS push
- Full 2FA verification + forced re-auth for sensitive ops (scaffolding present)

## Recommended next build step
**Phase 5 — Production Deployment, Mac Companion App, Mobile Experience, Advanced AI
Case Analysis, Court-Docket Monitoring, and Operational Validation:** real auth (NextAuth +
2FA/passkeys), PostgreSQL + encryption at rest, a hosted search backend and job queue, real
OAuth calendar/storage, PDF/OCR/ZIP generation, the Mac companion agent, a polished mobile
experience, and a read-only court-docket monitor.
