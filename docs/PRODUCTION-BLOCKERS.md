# Production blocker register (Phase 6 §4)

The formal register of everything standing between the current staging-ready
build and a safe production launch with real case data. Each item is classified:

| Class | Meaning |
|-------|---------|
| **launch-blocker** | Must be resolved before any real case data enters production. |
| **high-post-launch** | Not a launch stopper, but fix early in stabilization. |
| **defect** | Ordinary bug with a workaround. |
| **enhancement** | Optional improvement. |
| **deferred** | Intentionally out of scope; needs an external account/approval. |
| **unsupported** | Will not be built; honest permanent limitation. |

This register mirrors the `ProductionBlocker` table (`lib/actions/phase6.ts`
`upsertBlocker` / `setBlockerStatus`), so it can be tracked in-app and gated by
`openLaunchBlockerCount()`.

> **Status legend:** open · in-progress · resolved · accepted-risk · deferred.
> Every item below is **owner-owned** and requires the owner's explicit approval
> at the point an external/irreversible action is taken.

---

## Launch blockers (must clear before real data)

### B1 — Replace dev-mode single-user auth with real authentication
- **Subsystem:** authentication
- **Description:** `AUTH_DEV_MODE=true` signs in a fixed local user. Production must use a real credential + verified email + enforced 2FA.
- **Severity:** launch-blocker · **Status:** open
- **Impact:** Without it, anyone reaching the URL is the owner. Absolute blocker.
- **Reproduction:** Set `NODE_ENV=production`; `npm run launch:check` reports `auth-dev-mode` = FAILURE.
- **Proposed resolution:** Wire NextAuth/Auth.js (credentials or Apple/Google), enforce 2FA at first login (§9–10). Keep the existing `getCurrentUser`/authorization architecture — actions already re-check ownership server-side.
- **Testing required:** login, 2FA enrollment, recovery-code use + invalidation, session revoke, sensitive-op reauth.
- **Deployment dependency:** `AUTH_SECRET` + provider secrets in production secret store.
- **Rollback impact:** None (additive); revert to prior image restores prior auth.

### B2 — Managed PostgreSQL + encryption at rest
- **Subsystem:** database
- **Description:** Dev uses unencrypted SQLite. Production requires managed PostgreSQL with encryption at rest.
- **Severity:** launch-blocker · **Status:** open
- **Reproduction:** `launch:check` reports `database-driver` = FAILURE and `encryption-config` = FAILURE in production with a `file:` URL.
- **Proposed resolution:** Provision managed Postgres; set `DATABASE_URL` + `ENCRYPTION_KEY`; `prisma migrate deploy`. Schema is already Postgres-portable (no native enums/scalar arrays).
- **Testing required:** connectivity, migration deploy, index verification, DR restore rehearsal (§17).
- **Deployment dependency:** paid managed DB (needs approval).
- **Rollback impact:** Additive migrations only; prior schema stays compatible.

### B3 — Private object storage (replace local disk)
- **Subsystem:** storage
- **Description:** Originals are stored on local disk via `StorageProvider`. Production needs private object storage with authorized, time-limited access.
- **Severity:** launch-blocker · **Status:** open
- **Proposed resolution:** Implement an object-storage `StorageProvider` (same interface); set `STORAGE_PROVIDER`; enforce signed-URL expiry. Originals remain immutable.
- **Testing required:** upload/download, signed-URL expiry, authorization, hash integrity, backup inclusion.
- **Deployment dependency:** object-storage bucket (needs approval).
- **Rollback impact:** None; interface is swappable.

### B4 — Production secret management
- **Subsystem:** security
- **Description:** Production secrets must be created only in the host's secret store; never committed, never copied from staging.
- **Severity:** launch-blocker · **Status:** open
- **Proposed resolution:** Create DB/storage/auth/AI/monitoring secrets in the production secret manager; document rotation + revocation + owner + expiry (§11).
- **Testing required:** boot with production secrets; confirm no secret reaches the browser.
- **Rollback impact:** None.

### B5 — Verified off-box backups + restore rehearsal
- **Subsystem:** backup / restore
- **Description:** A verified backup + a successful non-destructive restore rehearsal must exist before real data lands.
- **Severity:** launch-blocker · **Status:** open
- **Proposed resolution:** Configure `BACKUP_DESTINATION`; enable daily/weekly/monthly + pre-migration backups; run the DR rehearsal (§17) and record recovery time.
- **Testing required:** create → verify checksum → restore into temp env → destroy temp env.
- **Deployment dependency:** backup storage (needs approval).
- **Rollback impact:** None.

---

## High-priority post-launch

| ID | Title | Subsystem | Notes |
|----|-------|-----------|-------|
| H1 | Wire error monitoring (`SENTRY_DSN`) | performance | `launch:check` warns until set. |
| H2 | Enforce 2FA for sensitive operations | security | TOTP + hashed recovery-code scaffolding already present. |
| H3 | Background job worker for OCR/large imports | jobs | Jobs run inline today; fine for single-user, but a worker de-risks big migrations. |
| H4 | Real OCR for scanned PDFs | search | Page-level search depends on extractable text; scanned-only PDFs need OCR. |

---

## Ordinary defects

None open. (The Phase 4 duplicate-exhibit rejection returns a **handled** client error by design — not a defect.)

---

## Enhancements (optional, post-launch)

- Hosted/semantic search (Meili/Typesense/pgvector) behind the existing `SearchProvider`.
- Real PDF/ZIP generation for exhibits, binders, and exports (structured manifests today).
- Live OAuth calendar/storage/email adapters.
- Rich-text/PDF diff for draft version comparison.

---

## Intentionally deferred (need external account / approval)

- Signed native Mac companion binary (Apple Developer account) + live iCloud folder monitoring.
- Live PACER/PeachCourt docket API access (paid; credentialed).
- Native iOS push notifications.

---

## Unsupported (permanent, honest limitations)

- **Direct court e-filing.** Pro Se Wins **records** filing/service; it never submits to a court. PeachCourt/PACER remain external links.
- **Docket monitoring without an authorized source.** No scraping of portals behind a login; monitoring is manual/import-based unless a real authorized feed is connected.
- **Presenting AI output as verified legal fact**, or producing a win-probability score. Never.
