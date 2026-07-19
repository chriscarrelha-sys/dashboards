# Known limitations (completed / mocked / unimplemented)

Written plainly so nothing is oversold.

## ✅ Completed & functional
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
Wire **one real AI provider** (Claude or OpenAI) behind the existing router,
key-gated, with results flowing into the **Verification Queue** — this proves the
end-to-end trust model on a live provider while keeping every safeguard intact.
Then deepen the **Evidence** and **Discovery** modules (highest litigation value).
