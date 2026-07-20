# Launch plan & readiness gate (Phase 6)

How Pro Se Wins goes from staging-ready to a live production system for real
litigation matters — safely, reversibly, and with a human approval at every
irreversible step.

> **Nothing in this document is executed automatically.** Production deploy,
> paid infrastructure, DNS changes, live OAuth, secret creation/rotation, and
> real-data migration each require the owner's explicit approval at the point
> the action is taken. Silence is never approval.

---

## 1. Launch-readiness gate

Run the gate any time; it changes nothing:

```bash
npm run launch:check
```

It inspects env vars, DB connectivity, migration status, storage/private-object
enforcement, signed-URL behavior, search, job queue, backup destination,
encryption, auth + 2FA, email/calendar/notification config, AI provider,
error monitoring, the health endpoint, and app/schema versions. Each check is
**pass**, **warning**, or **failure**:

- **Any failure blocks launch.** (`launch:check` exits non-zero for CI gating.)
- **Warnings require documented acknowledgment** before launch — record them
  against the `LaunchCheckRun` (`logLaunchCheck`) with `acknowledgedWarnings`.

A mocked or deferred subsystem is reported honestly as a **warning** (a
**failure** in production for the ones that must be real, e.g. SQLite or
dev-auth). The gate never paints a mock green.

Liveness/readiness probe for monitors: `GET /api/health` → `{ status, database,
schemaVersion, version, uptimeMs }`. Returns 503 if the database is unreachable.

---

## 2. Launch-blocker gate

Before launch, `openLaunchBlockerCount()` must be **0**. See
[`PRODUCTION-BLOCKERS.md`](PRODUCTION-BLOCKERS.md). The five launch blockers are:
real auth (B1), managed Postgres + encryption (B2), private object storage (B3),
production secrets (B4), verified backups + restore rehearsal (B5).

---

## 3. Data freeze (§47)

Before launch: pause schema changes, complete migrations, complete staging
validation + UAT, resolve launch blockers, take a final pre-launch backup, and
record the rollback point:

| Item | Value at freeze |
|------|-----------------|
| Application version | `0.1.0` |
| Schema version | `20260719133834_phase6_launch_migration` |
| Companion protocol | `POST /api/companion/register` v1 (hashed device token) |
| Rollback point | prior deployed image + last verified backup |

---

## 4. Production launch sequence (§48)

Human-approved, ordered. Do **not** migrate all cases immediately after deploy.

1. Confirm approvals (deploy, infra, secrets, data).
2. Confirm final backup + rollback point.
3. Confirm production secrets present (no staging secrets copied).
4. `npm run validate:env` (blocks SQLite/dev-auth) → `npm run launch:check` (0 failures).
5. `prisma migrate deploy` against production Postgres.
6. Deploy application image.
7. Health check: `GET /api/health` = 200, `database: up`, expected `schemaVersion`.
8. Smoke tests: login, upload, search, backup, export.
9. Register the Mac companion (one-time code → hashed token).
10. Validate mobile/PWA on the owner's devices.
11. **Migrate the first pilot case only** (§49).
12. Review logs, then approve broader migration.

---

## 5. Pilot launch criteria (§49)

Proceed to additional cases only after the pilot case satisfies **all** of:

- Case profile accurate (caption, court, case number, judge, portal link).
- Documents imported; filenames understandable; **no source file modified**.
- OCR + page-level search work.
- Deadlines require confirmation (never auto-confirmed); confirmed deadlines sync.
- Notifications privacy-safe; evidence/filing/service links work.
- Export + backup work; mobile works; Mac companion works.
- Audit + security logs complete; no critical security issue.

---

## 6. Real-case migration (controlled, reversible)

Plan-first, one case at a time. The dry-run planner never imports:

```bash
npm run migrate:inventory -- "/path/to/Case Folder"   # writes migration-inventory.json
```

It hashes every file, groups exact duplicates and version families, infers
type/date (all proposals), flags unreadable/locked files, and writes a source
inventory you review **before** any import. See §31–37 of the master prompt.

In-app, a migration is a `MigrationBatch`:
- A **pilot/full** batch **refuses to start without a pre-migration backup
  reference** (`startMigrationBatch`), guaranteeing a rollback point.
- `recordInventory` stores the source inventory (nothing touched).
- `rollbackBatch` removes **only** the app records the batch created (document
  records + their index entries) and **preserves the source files, the
  inventory, and all audit history**.

Legal deadlines, hearings, and legal conclusions from migrated documents always
land in the Verification Queue — never auto-confirmed.

---

## 7. Rollback

- **Application:** redeploy the previous image. Migrations are additive, so the
  prior schema stays compatible — no destructive down-migration.
- **Migration batch:** `rollbackBatch(batchId)` (reversible, source-safe).
- **Data:** restore the pre-launch/pre-migration backup into a temp environment
  first (never a destructive restore over production).

See [`ADMIN-RUNBOOK.md`](ADMIN-RUNBOOK.md) for exact commands.
