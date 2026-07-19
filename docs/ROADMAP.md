# Roadmap

Phased build plan. Phase 0 and the core of Phases 1–3 are in this first slice.

## Phase 0 — Foundation ✅ (this build)
- Next.js/TS/Tailwind/Prisma scaffold; strict TypeScript; build + tests green
- Full schema (~50 entities) + migration + seed (GA/PeachCourt + federal/PACER)
- Dev-mode auth abstraction
- Minimal landing page; Add New Case (manual + upload/mock-extraction)
- Case homepage: header, portal buttons, copy number, three summary cards, sticky ID
- Complete responsive nav IA with polished empty states for every section

## Phase 1 — Documents ✅ core
- Upload → mock classification → standardized filename → review queue
- Split-view document workspace (preview + record + reclassify)
- **Next:** drag-and-drop zone, OCR, version compare, `Undo` after auto-organize, bulk actions

## Phase 2 — Timeline, deadlines, tasks ✅ core
- Timeline manual CRUD; Deadlines/Tasks CRUD; calculator with labeled example rules; Confirm flow
- **Next:** auto-proposed timeline entries from documents, milestone templates, calendar sync

## Phase 3 — AI & integrations ✅ core (mocked)
- Case AI workspace with provider router + mock; Integrations hub with honest states
- **Next:** real provider adapters (key-gated), document-scoped chats, "save AI output to record", prompt/output history

## Phase 2 — Evidence, Contradictions, Legal Issues, Discovery ✅ (this build)
- Evidence Command Center (table/card, filters, search); create-from-document; exhibit fields
- Legal Issues (unified model → claims/counterclaims/defenses/affirmative/procedural) with Elements & Burdens matrix and supporting/adverse/missing evidence by element
- Contradiction Tracker with side-by-side statements + confirm/reject; Admissions Tracker
- Discovery Command Center: sets → individual requests, response comparison, Deficiency Tracker, Meet-and-Confer, Subpoenas, Witnesses
- Verification Queue extended to all proposal kinds (approval creates the structured record + audit); mock AI extraction for evidence, contradictions, discovery import, deficiency review
- Relational cross-linking (document↔evidence↔element↔discovery↔witness↔timeline) with deep links; case-scoped audit view
- **Next:** authentication/foundation checklists UI, deposition transcript management, exhibit binder generation, motion-to-compel workspace

## Phase 3 — Filing Workspace, Communications, Service, Research, Strategy ✅ (this build)
- Filing Workspace: lifecycle (20 stages) with history, support links (issues/evidence/authorities/discovery/documents), draft versions (never overwritten), readiness checklist + rule-based QC warnings with logged overrides, filing packages + downloadable manifest, submission + filed-stamped tracking
- Certificates of service + Service recipients + Service History (mirrored to timeline)
- Communications Center with follow-up → task; confidentiality/settlement markers
- Legal Research: authorities + verification workflow (unverified until source opened), research questions + memoranda, citation extraction (mock → queue)
- Strategy Workspace + snapshots, immutable Decision Log (supersede), Opposing Positions, Settlement comparison, Damages, Remedies
- Source-controlled AI drafting (visible source scope) + AI draft review → Verification Queue
- **Next:** real ZIP bundling, rich-text/PDF diff, real email ingestion, live research provider

## Phase 4 — Search, Exhibits/Binders, Calendar, Notifications, Backup/Export, Security ✅ (this build)
- Universal Search (SearchProvider abstraction + local index, case/global scope, page-level results, filters, saved searches + smart collections, reindex)
- Exhibit Builder (sets, page ranges, numbering + duplicate prevention, auth/redaction status) + Bates numbering (creates a derivative; source untouched)
- Binder Builder (seeded sections, validation with source checks) + downloadable manifest
- Calendar sync (mock Apple/Google/Outlook; confirmed-only auto-sync, idempotent) + Notification engine (dedup reminders, digests, priorities)
- Integrations Hub diagnostics (test connection, honest statuses) + iCloud/local companion mock + spec
- Backup (create/verify/restore-preview), Full Case Export (confidentiality review + manifest), Trash & Restore (soft-delete + confirmed purge)
- Security: server-side authorization, security-event log, sessions + revoke, secrets server-side only, System Health page
- **Next:** real search backend (Meili/pgvector), real PDF/OCR + ZIP, live OAuth calendar/storage, real 2FA/passkeys, native push

## Phase 5 — Production config, Mac companion, mobile/PWA, advanced AI analysis, docket monitoring ✅ (this build, in-repo scope)
- Advanced Case Review: versioned, source-linked analysis (element-gap, adverse evidence, contradictions, procedural risk, verification-needed) — no win-probability; Source Graph (derived edges)
- Court-Docket Monitoring: entries + dedupe, docket-sheet import → Verification Queue, monitor config (honest statuses; no fake live access), portal helper (external-link only)
- Mac companion: secure device-registration protocol (`/api/companion/register`, one-time code → hashed device token), device management + revoke, reference agent, full spec
- PWA: manifest + conservative offline-shell service worker (no private-doc caching); mobile-aware layout
- Security scaffolding: 2FA enroll (TOTP secret + hashed recovery codes), per-case AI privacy modes, provider-usage tracking; production config (Dockerfile, CI, env-validate, DB indexes)
- **Deferred to Phase 6 (need external accounts/approval):** actual production deploy, signed native Mac binary, live PACER/PeachCourt/AI/OAuth, real PostgreSQL + encryption at rest, hosted search/job worker, native push

## Phase 6 — Production Launch, Real Case Migration, Stabilization ✅ (this build, in-repo scope)
- **Launch-readiness gate** (`npm run launch:check`) — env/DB/migrations/storage/private-object/search/jobs/backup/encryption/auth/2FA/email/calendar/notifications/AI/monitoring/health/version checks; failures block launch, warnings need acknowledgment; a mock is never green. Runs logged (`LaunchCheckRun`).
- **Health endpoint** `GET /api/health` (liveness + DB + schema version).
- **Production-blocker register** (`ProductionBlocker` + `docs/PRODUCTION-BLOCKERS.md`), gated by `openLaunchBlockerCount()`.
- **Security headers** (CSP, HSTS in prod, frame/referrer/permissions policies, COOP/CORP) + `X-Robots-Tag: noindex` + `robots.txt`; browser-verified zero CSP errors.
- **Controlled, reversible real-case migration** — dry-run inventory planner (`npm run migrate:inventory`), `MigrationBatch`/`MigrationItem`, pilot/full import requires a pre-migration backup, `rollbackBatch` preserves source + inventory + audit.
- **Docs** — operating manual, admin runbook, final integrations matrix, launch plan.
- 5 new DB/engine tests (65 total passing). Migration `..._phase6_launch_migration` (additive; Phase 1–5 preserved).
- **Deferred to production ops (need external accounts/approval):** actual deploy, managed Postgres + encryption at rest, private object storage, production secrets, off-box backups, live OAuth (calendar/storage/email/AI), signed native Mac binary, native push, hosted/semantic search, external job worker.

## After Phase 6 — Maintenance mode
The planned build is complete. Further work is **maintenance**: defect correction,
workflow refinement from real use, authorizing live integrations one at a time,
and optional enhancements. No further major architecture phase is required —
use the app with one real case, find friction, and issue narrow correction prompts.
