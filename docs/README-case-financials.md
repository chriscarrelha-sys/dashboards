# collect-case-financials.sh

Finds every financial-proof document you have for each case — ledgers,
transaction and payment histories, payment confirmations, payment
verifications, wire transfer confirmations, bank statements, bank confirmation
letters, cancelled checks, escrow and payoff figures — and organizes them by
case and by evidence type.

It never moves, renames, or deletes anything. Your originals stay where they are.

## Quick start

```bash
# 1. Tell it what your cases are called (aliases, loan numbers, account numbers)
vi config/cases.conf

# 2. See what it would find, without writing anything
./bin/collect-case-financials.sh --scan ~/Documents --dry-run

# 3. Run it for real
./bin/collect-case-financials.sh --scan ~/Documents --scan ~/Downloads -v
```

With no `--scan`, it looks in Documents, Desktop, Downloads, Google Drive,
Dropbox, OneDrive, and iCloud Drive if those exist.

## What it produces

```
case-financials-20260825-143000/
├── MANIFEST.csv    one row per case+category+file: path, SHA-256, size,
│                   modified date, which terms matched, and whether the match
│                   came from the filename or the document's contents
├── INDEX.md        readable index, grouped by case then evidence category
├── GAPS.md         READ THIS — what it could not find or could not read
└── by-case/
    └── shellpoint/
        ├── ledger/
        ├── transaction_history/
        ├── payment_confirmation/
        ├── payment_verification/
        ├── wire_transfer/
        ├── bank_statement/
        ├── bank_confirmation/
        ├── checks_money_orders/
        ├── escrow_payoff/
        ├── servicing_correspondence/
        └── tax_forms/
```

By default `by-case/` holds symlinks (instant, no extra disk). Use `--copy` when
you want a self-contained folder to hand to someone or take offline.

Every collected file is prefixed with the first 8 characters of its SHA-256, so
two files with the same name from different folders never collide, and the same
document found in three places is collected once.

## GAPS.md is the important one

The manifest tells you what you have. GAPS.md tells you what you're missing:

- **Missing categories per case** — e.g. "no wire transfer confirmations found
  for shellpoint." Either they don't exist, or they're somewhere you didn't scan.
- **Files it could not read** — scanned PDFs and photos with no text layer.
  These are often exactly the check images and statements that matter. Re-run
  with `--ocr` (needs `tesseract`) or open them yourself.
- **Financial documents that matched no case** — real evidence carrying no case
  identifier. Add the loan or account number to `config/cases.conf` and re-run.
- **Tooling** — whether `pdftotext` and `tesseract` are installed.

## Case definitions

`config/cases.conf`, one case per line:

```
case_id | Display Name | alias regex
```

The alias regex is matched case-insensitively against each file's full path
**and** its extracted text. Loan numbers and account numbers are the single most
reliable aliases — a bank statement rarely says "Shellpoint" but it will carry
the account number.

```
shellpoint|Shellpoint Mortgage Servicing|shellpoint|newrez|mccalla|0123456789|1234 Main St
```

If no config exists, a starter one is written to `~/.case-financials/cases.conf`.

## Getting full coverage

Filename matching alone misses most evidence — a wire confirmation saved as
`scan_0042.pdf` only reveals itself from its contents. For PDF contents:

```bash
brew install poppler      # pdftotext — PDFs with a text layer
brew install tesseract    # OCR — scans and photos, then run with --ocr
```

Without `poppler` the script still runs, but PDF *contents* are not searched and
it says so at the end.

## Options

| Option | Effect |
|---|---|
| `--scan DIR` | Folder to scan, repeatable |
| `--out DIR` | Output folder |
| `--config FILE` | Case definitions file |
| `--case NAME` | Only this case (implies `--strict`) |
| `--copy` / `--link` | Copy files, or symlink them (default) |
| `--no-collect` | Manifest and reports only, no tree |
| `--ocr` | OCR images and image-only PDFs |
| `--no-content` | Filename matching only — fast, much less complete |
| `--max-size MB` | Skip files over this size (default 200) |
| `--since DAYS` | Only files modified in the last N days |
| `--strict` | Drop hits that match no case |
| `--list-cases` | Print configured cases |
| `--dry-run` | Report only, write nothing |
| `-v` | Progress output |

## A caution

This is a net, not a judgment. It matches words. It will pull in documents that
aren't evidence, and it will miss a payment record that uses vocabulary none of
these patterns anticipate. Treat the output as a worklist to review, and treat
GAPS.md as the list of places you still have to look yourself.
