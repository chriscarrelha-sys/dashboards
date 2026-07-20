# Phone access — hosting your private instance

Goal: reach Pro Se Wins from your iPhone/iPad/Mac at a private URL that **only you**
can sign into. This guide covers the login (already built) and the deploy.

> **The one rule:** a hosted instance must have `AUTH_DEV_MODE="false"` so the
> login is enforced. With it, every page requires your password; without it, the
> URL would be open to anyone. The middleware + login are already in the code.

---

## What the login gives you (already built & tested)
- A single-owner password login on every route (`/login`), signed **httpOnly**
  session cookie (HMAC via `AUTH_SECRET`), 30-day sessions, sign-out on the home
  page. Health check (`/api/health`) stays public for uptime monitoring.
- Set it up with three env vars: `AUTH_DEV_MODE=false`, a long random
  `AUTH_SECRET`, and a password (`OWNER_PASSWORD`, or a hash from
  `npm run make:password`).

---

## The honest part: where your uploaded files live

Your **case records** (deadlines, evidence, notes) live in the database — easy to
host free (Postgres free tier). Your **uploaded documents** are files, and *where
those files persist* decides your hosting options:

- **Free serverless hosts (e.g. Vercel Hobby) have no permanent disk** — a file
  written during one request can vanish on the next deploy. So on a free host,
  documents go to **object storage** (a bucket). This is **built and wired**: set
  `STORAGE_PROVIDER=s3` plus the S3 credentials below and uploads persist to any
  S3-compatible bucket (Cloudflare R2, Supabase, Backblaze, AWS).
- **A host with a persistent disk** (Render/Railway/Fly, ~$5–7/mo) works with
  `STORAGE_PROVIDER=local` — no bucket needed, but not free.

Pick your path below.

---

## Option A — Free ($0/mo): Vercel + Neon + object storage

Best if you want zero cost and don't mind me wiring object storage first.

1. **Database (Neon, free):** create a project at neon.tech → copy the connection
   string → this is your `DATABASE_URL` (starts with `postgresql://`).
2. **File storage (Cloudflare R2, ~10 GB free):** create an R2 bucket → create an
   API token (Access Key ID + Secret) → note the S3 endpoint
   `https://<accountid>.r2.cloudflarestorage.com`. Set `STORAGE_PROVIDER=s3` and
   the four `S3_*` vars. (Supabase/Backblaze/AWS work identically.)
3. **App (Vercel, free Hobby):** push this repo to GitHub → “Add New Project” in
   Vercel → import the repo → set the environment variables below → Deploy.
4. **Migrate:** the build runs `prisma generate`; run `prisma migrate deploy`
   once against Neon (Vercel build step or locally with the Neon `DATABASE_URL`),
   then `npm run db:seed:commercial` once to load the pricing catalog.

> Vercel Hobby is free for **personal, non-commercial** use — perfect for your own
> matters. If you later sell access to others, you'd move to a paid tier.

## Option B — Simplest, ~$5–7/mo: a host with a disk (works today)

Best if you want it live now with no extra code.

1. **Render** (example): New → Web Service → connect this GitHub repo.
2. Add a **PostgreSQL** instance (Render/Neon) → set `DATABASE_URL`.
3. Add a **persistent disk** mounted at `./storage` (keeps your documents).
4. Set the environment variables below → deploy. Build: `npm run build`;
   start: `npm run start`; pre-deploy: `prisma migrate deploy`.

Railway and Fly.io work the same way (volume mounted at `./storage`).

---

## Environment variables (both options)

| Variable | Value |
|----------|-------|
| `DATABASE_URL` | Your Postgres connection string |
| `AUTH_DEV_MODE` | `false` (**required** for a hosted instance) |
| `AUTH_SECRET` | A long random string — `openssl rand -hex 32` |
| `OWNER_PASSWORD` *or* `OWNER_PASSWORD_HASH` | Your login password (hash via `npm run make:password -- "yourpw"`) |
| `OWNER_NAME`, `OWNER_EMAIL` | Personalize your account |
| `STORAGE_PROVIDER` | `s3` for a free host (bucket) · `local` for a disk host |
| `S3_ENDPOINT`, `S3_BUCKET`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY` | Your bucket (Option A only) |

Then confirm readiness before going live:

```bash
npm run validate:env     # blocks SQLite / dev-auth in production
npm run launch:check     # env + DB + migrations + auth + storage checks
```

Both must be happy (no failures) before you share the URL.

---

## First sign-in
Visit your URL → you're redirected to `/login` → enter your password → you're in.
Add it to your phone's home screen (Safari → Share → “Add to Home Screen”) for an
app-like icon; the PWA shell is already configured.

## Keep it yours
- Never commit `.env`; set secrets only in the host's dashboard.
- Rotate: change `AUTH_SECRET` (signs everyone out) or your password anytime.
- Back up: the database (host's backups) + your object-storage bucket / disk.

---

## What's left to go live
The code is ready — login, S3 storage, Postgres-portable schema, and the readiness
gate are all wired. The remaining steps need **your** accounts (I can't create
accounts or spend money for you), but I'll walk you through each screen:
1. Create the accounts (Neon + Cloudflare R2 + Vercel — all have free tiers).
2. Paste the environment variables above into Vercel.
3. Deploy, run `prisma migrate deploy` + `npm run db:seed:commercial` once.
4. Run `npm run launch:check` against the production env — fix any failures — then
   open the URL on your phone and sign in.
