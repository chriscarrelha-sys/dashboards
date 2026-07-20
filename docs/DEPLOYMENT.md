# Deployment & operations

## Hosting decision (recommended)
**Vercel (app) + managed PostgreSQL (Neon/Supabase) + encrypted object storage (S3/R2).**
Rationale: the app is Next.js App Router — Vercel is the lowest-friction fit; managed
Postgres gives backups/PITR without ops; object storage keeps private legal files off the
web tier behind signed URLs. Alternatives: Railway/Render/Fly.io (single-container via the
included `Dockerfile`) or AWS/GCP for full control. **Not auto-deployed here** — deployment
requires accounts, secrets, and your approval.

### Estimated recurring cost (assumptions, not commitments)
- Vercel Pro ~$20/mo; Neon/Supabase ~$0–25/mo; R2/S3 a few $/mo at this scale;
  AI usage is pay-as-you-go per provider. Single-user total ≈ **$20–70/mo** depending on tier.

## Environments
`local` → `test` (CI) → `staging` → `production`, each with **separate** DB, storage, search,
jobs, and all OAuth/AI/notification/calendar credentials and encryption keys. Never reuse
production secrets in dev. Validate with `npm run validate:env` (fails on SQLite/dev-auth in prod).

## Pipeline (`.github/workflows/ci.yml`)
lint → typecheck → tests → `prisma migrate deploy` → build. Staging deploy + smoke tests +
**manual/protected** promotion to production happen in the platform; production deploy is gated
on green checks and never automatic. Rollback = redeploy the previous build + `prisma migrate`
compatibility (backups taken pre-migration).

## Staging deploy steps
1. Provision staging Postgres + storage. 2. Set env (see `.env.example` + `AUTH_SECRET`, real
`DATABASE_URL`). 3. `npm ci && npm run validate:env && npx prisma migrate deploy`. 4. `npm run build`.
5. Deploy. 6. Smoke test (landing, a case, search, backup).

## Production deploy steps
Same as staging with production secrets, `AUTH_DEV_MODE=false` + a real auth provider,
PostgreSQL (not SQLite), encrypted storage, and a **backup taken before the first migrate**.
Promote only after staging smoke tests pass.

## Database production readiness
Indexes added on `Case(userId)`, `Document(caseId)`, `Deadline(caseId,dueDate)`,
`DocketEntry(caseId)`, `CaseReview(caseId)`, `ProviderUsage(provider)`, `CompanionDevice(userId)`.
Expected hot queries: case-scoped lists, deadline ordering, search-index lookups, audit by date.
Move the search index and job queue off SQLite for production (interfaces already abstract them).
