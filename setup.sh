#!/usr/bin/env bash
#
# Pro Se Wins — one-command personal setup (macOS).
#
# Stands up your OWN private copy on this Mac: installs dependencies, creates a
# local config, builds the database, and seeds the pricing catalog (NO demo
# cases). Everything stays on this computer — nothing is uploaded. Re-running is
# safe.
#
# Usage:   ./setup.sh          # clean start (your real cases)
#          ./setup.sh --demo   # also load 2 fictitious demo cases to explore
#
set -euo pipefail

cd "$(dirname "$0")"
echo "→ Pro Se Wins personal setup"

# 1. Node check ---------------------------------------------------------------
if ! command -v node >/dev/null 2>&1; then
  echo "✗ Node.js is not installed. Install Node 20+ from https://nodejs.org (LTS), then re-run ./setup.sh"
  exit 1
fi
NODE_MAJOR="$(node -p 'process.versions.node.split(".")[0]')"
if [ "$NODE_MAJOR" -lt 20 ]; then
  echo "✗ Node $(node -v) found, but 20+ is required. Update Node, then re-run ./setup.sh"
  exit 1
fi
echo "✓ Node $(node -v)"

# 2. Config -------------------------------------------------------------------
if [ ! -f .env ]; then
  cp .env.example .env
  echo "✓ Created .env (local SQLite; single-user owner login; no secrets needed)"
  echo "  Tip: set OWNER_NAME and OWNER_EMAIL in .env to personalize your instance."
else
  echo "✓ .env already exists (left unchanged)"
fi

# 3. Dependencies -------------------------------------------------------------
echo "→ Installing dependencies (first run can take a few minutes)…"
npm install

# 4. Database + catalog -------------------------------------------------------
echo "→ Building your local database…"
npm run setup   # migrate deploy + generate + seed the pricing catalog (no demo cases)

# 5. Optional demo cases ------------------------------------------------------
if [ "${1:-}" = "--demo" ]; then
  echo "→ Loading demonstration cases…"
  npm run db:seed
fi

cat <<'DONE'

✓ Setup complete.

Start it any time with:
    npm run dev
Then open http://localhost:3000 in your browser.

Your data lives entirely on this Mac:
  • database → prisma/dev.db
  • uploaded files → ./storage/
Back up by copying those two. To wipe and start over: npm run db:reset

This local build is for you alone. Keep it on your machine — it has no password
yet, so don't expose http://localhost:3000 to the internet. A private, logged-in
hosted version is the next step when you want phone/iPad access.
DONE
