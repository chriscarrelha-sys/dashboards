# Your private copy — personal setup

This gets **Pro Se Wins running on your own Mac**, for you alone. Everything
stays on your computer — no accounts, no cloud, nothing uploaded.

## What you need
- A Mac.
- **Node.js 20 or newer** — one-time install from <https://nodejs.org> (choose the
  “LTS” button). If you're not sure whether you have it, the setup script checks.

## Set it up (one command)

1. Get the code onto your Mac (download the ZIP from the repository, or
   `git clone` it and switch to the branch `claude/pro-se-case-management-fcnu9m`).
2. Open **Terminal**, go into the project folder, and run:

   ```bash
   ./setup.sh
   ```

   That installs everything, builds your local database, and loads the pricing
   catalog — **no demo cases**, a clean slate for your real matters. (Want to poke
   around with two fake sample cases first? Run `./setup.sh --demo` instead.)

## Use it

Start it whenever you want to work:

```bash
npm run dev
```

Then open **http://localhost:3000**. Add your first real case with **“+ Add New
Case.”** Leave the Terminal window open while you use it; press `Ctrl-C` there to
stop, and `npm run dev` to start again.

## Make it yours (optional)
Open `.env` in a text editor and set your name/email so the app greets you:

```
OWNER_NAME="Your Name"
OWNER_EMAIL="you@example.com"
```

## Where your data lives (and how to back it up)
Everything is two things on your Mac:

- **Database:** `prisma/dev.db`  (all case records, deadlines, evidence, etc.)
- **Your files:** the `./storage/` folder  (the actual documents you upload)

**Back up = copy those two** somewhere safe (Time Machine, an external drive, or
your own iCloud folder). To wipe everything and start fresh: `npm run db:reset`.

## Honest notes
- This local copy has **no password** — that's fine because it only runs on your
  Mac. **Don't expose `localhost:3000` to the internet.** When you want to reach it
  from your iPhone/iPad, that's the *hosted* step, and it needs a real login added
  first (next on the list).
- AI features run as a **labeled mock** until you add a provider key — no AI cost,
  no data leaves your machine. It never presents AI output as verified legal fact,
  and it never files with a court.
- Billing/pricing screens run in **mock mode** — they're there so the hosted
  version is turnkey later; nothing charges you locally.

## When you're ready for phone/iPad access (hosted)
The next step is a private, logged-in version on the web. That needs: a real login
(so only you can get in), a managed Postgres database, and a host. I'll walk you
through it and add the login when you're ready — just say the word and tell me
which host you'd like to use.
