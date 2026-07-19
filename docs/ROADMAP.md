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

## Phase 3 (next) — Filing Workspace, Communications, Service, Research, Strategy
- Filing packages, hearing binders, certificates of service, proposed orders
- Communications (emails/letters/calls) + Service History; link to meet-and-confer
- Research + Authorities pinpoint verification; Strategy (objectives/leverage/decision log/damages)

## Phase 5 — Production hardening
- NextAuth/Auth.js (+ optional Apple/Google/Microsoft, 2FA), Postgres deployment
- Background-job queue for document processing
- Real calendar + storage (iCloud companion) adapters
- Export/backup, audit history UI, safe deletion workflow
