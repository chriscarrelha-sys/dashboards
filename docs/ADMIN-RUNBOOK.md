# Administrator runbook (Phase 6 §61)

Exact operational commands for running Pro Se Wins in production. Incident
response, DR exercises, monitoring, and retention live in
[`RUNBOOK.md`](RUNBOOK.md); this document is the command reference.

> Every command that touches production data, secrets, DNS, or paid resources
> requires the owner's explicit approval at the moment it is run.

---

## Pre-flight (every deploy)

```bash
npm ci
npm run validate:env        # blocks SQLite / dev-auth in production
npm run typecheck
npm run test                # 65 integration + unit tests
npm run launch:check        # readiness gate — 0 failures required; ack warnings
```

## Deployment

```bash
# Build (also runs `prisma generate`)
npm run build

# Apply migrations to production Postgres (additive; never `migrate reset` in prod)
DATABASE_URL="$PROD_DATABASE_URL" npx prisma migrate deploy

# Start
npm run start               # or the container image (see Dockerfile)

# Verify
curl -fsS https://<host>/api/health   # expect status:ok, database:up, expected schemaVersion
```

Docker: the image runs as a least-privilege user and migrates on start
(see `Dockerfile`, [`DEPLOYMENT.md`](DEPLOYMENT.md)).

## Rollback

```bash
# Application: redeploy the previous image/tag. Migrations are additive, so the
# prior code runs against the current schema without a down-migration.

# Migration batch (real-case import): reversible, source-safe
#   in-app: rollbackBatch(batchId) — removes only app records this batch created,
#   preserves source files, the source inventory, and audit history.

# Data: restore a verified backup into a TEMPORARY env first, never destructively
# over production (see RUNBOOK.md DR exercise).
```

## Database maintenance

```bash
npx prisma migrate status                     # applied vs pending
DATABASE_URL=... npx prisma migrate deploy     # apply pending
npx prisma studio                              # inspect (non-prod)
```
Indexes are defined in `schema.prisma` (`@@index` on hot columns). Verify FK and
soft-delete (`deletedAt`) behavior after any migration via `npm run test`.

## Storage maintenance
Originals are immutable (write-once). Downloads are authorized + signed with
expiry once object storage is configured (`STORAGE_PROVIDER`). Verify hashes on
import; quarantine suspicious uploads. Never expose a public bucket.

## Job queue
Jobs run inline in v1 (no external worker). To scale out, set `JOB_QUEUE_URL`
and run a worker; `launch:check` reports the queue status. Monitor failed jobs;
support retry/timeout/cancel/dead-letter (see §14).

## Search rebuild

```bash
# The local index is fully rebuildable from the database + stored document text.
# In-app: Administration → Search → Reindex (SearchProvider.reindex()).
```
Case-scoped isolation is enforced; secrets and confidential records are excluded.

## Backup & restore
- Enable daily DB, weekly full, monthly retained, pre-migration, and manual backups (`BACKUP_DESTINATION`).
- In-app: create → **verify checksum** → **restore preview**.
- Real restore uses managed Postgres PITR + object-storage versioning into a temp env.
- Alert on backup failure. Never delete the only successful backup.

## Secret rotation

```bash
# 1. Create the new secret in the production secret store (never in git, never from staging).
# 2. Deploy with the new value.
# 3. Revoke the old secret.
# Rotate: DATABASE_URL, AUTH_SECRET, ENCRYPTION_KEY, provider API keys, OAuth creds,
#         companion signing creds, device-registration secret.
# Record owner + expiry for each (§11).
```
On compromise: rotate the affected secret, revoke sessions + companion devices +
integration tokens, review the SecurityEvent log.

## Provider outage
AI provider down → falls back to the labeled mock (no fabrication). Calendar/
email down → in-app notifications still fire; ICS export always works. Disable a
provider globally or set a case's AI mode to `disabled`.

## Companion release
Sign the native build (Apple Developer account), point it at the production API,
publish an update. The registration protocol is unchanged: one-time code →
device-scoped token stored **hashed**, returned once. Revoke a device to cut it
off immediately. See [`COMPANION.md`](COMPANION.md).

## Mobile / PWA release
Validate on current iPhone/iPad Safari + installed PWA. The service worker caches
only a conservative offline shell — **never** private document contents. Logout
clears caches; bump the SW version to invalidate.

## Dependency updates

```bash
npm outdated
npm update              # minor/patch
# majors: update deliberately, then npm run typecheck && npm run test && npm run build
```

## Monitoring & logs
- Health: `GET /api/health` (liveness + schema version).
- Error monitoring: set `SENTRY_DSN`/`ERROR_MONITORING_DSN` (H1).
- System Health page: Administration → System Health.
- Audit log (`AuditLog`) + SecurityEvent log are append-only and exclude document contents/secrets.
