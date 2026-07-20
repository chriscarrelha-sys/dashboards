# Privacy & data handling

## What is stored & where
Case metadata + relationships → database. Original files + derivatives → storage provider
(local in dev; private object storage in prod behind signed URLs). Secrets/tokens → server-side
env/secret store only, **never** returned to the browser or indexed.

## Which providers receive data
Only when you act: AI providers (per-case **AI mode**: disabled / manual / approved-automation;
confidential documents excluded by default), calendars/storage (mock until you connect OAuth),
court portals (external links only — no credentials stored). Nothing is transmitted silently.

## Controls
Per-case AI mode + confidential toggle (Administration → AI Privacy & 2FA), provider allowlist,
calendar detail level (privacy-safe summaries by default), notification detail (no confidential
content in subject/lock-screen text), export defaults (external-sharing excludes strategy/privileged).

## Export / delete / backups
Full case export with confidentiality review; Trash (30-day restore) + typed-`DELETE` purge that
removes only the app record (not external files) unless you choose otherwise. Backups may retain
deleted data until they age out — documented, not hidden.

## Mobile caching
Conservative offline shell only (case list + navigation); **private document contents are not
cached** by the service worker.

## Disclaimers
Organizational & research tool — not a substitute for licensed counsel. AI outputs may be wrong;
deadlines must be independently verified; external court systems remain authoritative; no direct
court filing. Surfaced at onboarding, AI setup, and deadline/research workflows — not on every screen.
