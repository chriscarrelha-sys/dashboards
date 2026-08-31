# docorg

Single-source-of-truth document organization for a macOS iCloud + Google Drive
+ OneDrive setup: de-duplicate, rename, OCR, full-text index, catalog.

- **[RUNBOOK.md](RUNBOOK.md)** — copy/paste commands, in order. Start here.
- **[STORAGE-ARCHITECTURE.md](STORAGE-ARCHITECTURE.md)** — which cloud wins and why.

## Safety contract

- Nothing is ever deleted. Duplicates are **moved** to a quarantine folder.
- Cloud placeholder files are never read, so running this does **not** pull
  your whole Drive down onto the laptop.
- Every mutating step emits a CSV to review and a shell script to run — you
  see the plan before anything moves.

## Commands

| Command | Does |
|---|---|
| `docorg scan ROOT...` | Inventory files, metadata only |
| `docorg dupes` | Hash size-collisions, emit duplicate report + quarantine script |
| `docorg rename` | Propose `DATE__MATTER__DOCTYPE__slug.ext` names |
| `docorg index` | Build offline SQLite FTS5 full-text index |
| `docorg search TERMS` | Search that index |
| `docorg catalog` | Emit `CATALOG.md` / `CATALOG.csv` |
