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

## Phase 4 — Depth across modules
- Legal Issues (claims/defenses/elements/authorities)
- Evidence (library/exhibits/admissions/contradictions/authentication)
- Discovery (requests/responses/deficiencies/compel)
- Motions & filings (packages, hearing binders, certificates of service)
- Parties & communications; Strategy (objectives/leverage/decision log/damages)

## Phase 5 — Production hardening
- NextAuth/Auth.js (+ optional Apple/Google/Microsoft, 2FA), Postgres deployment
- Background-job queue for document processing
- Real calendar + storage (iCloud companion) adapters
- Export/backup, audit history UI, safe deletion workflow
