# Chase Forensic Evidence Retrieval

Organizes an iCloud case master folder for *Carrelha v. JPMorgan Chase Bank,
N.A.*: 23 categories, SHA-256 deduplication, OCR companions, prove/contradict
flagging, a master spreadsheet, and a P0 completion report.

Case facts live in `case_profile.py` — the two tradelines, the identifiers, the
20 P0 targets, and the superseded narratives. Change a case fact there and
nowhere else.

**This runs on your Mac, against your real iCloud Drive.** It cannot be run
from a cloud session — the files are not there.

## Quick start

```bash
git clone <this repo> && cd dashboards/chase_forensic

# 1. See what it would do, without copying anything:
python3 retrieve.py --dest ~/Chase_Forensic_Master --dry-run

# 2. Real run over all of iCloud Drive:
python3 retrieve.py --dest ~/Chase_Forensic_Master --download-icloud
```

No pip packages are required. Python 3.8+ and the macOS built-ins are enough.

### Recommended before the real run

```bash
brew install ocrmypdf tesseract poppler
```

Without these, scanned PDFs and images are still hashed, filed, and indexed,
but their text is not searchable and their contents cannot be classified or
flagged. For a forensic index that matters — most Chase correspondence arrives
as scans.

## What it does

1. **Scans everything**, not just the Chase folder. Defaults to
   `~/Library/Mobile Documents` so records cross-filed under E\*TRADE, Regions,
   credit reporting, payment reconstruction, duplicates, regulatory complaints,
   or master evidence folders are picked up.
2. **Preserves the original.** Nothing is moved, modified, or deleted. The
   organized tree is built from copies (`shutil.copy2`, timestamps preserved).
   This is verified by test: source hashes and mtimes are unchanged after a run.
3. **Identifies exact duplicates by SHA-256** and picks the best-provenance copy
   as the file of record — a copy in `Duplicates/` or named `... copy.pdf` loses
   to one filed in a real case folder. Duplicates stay listed in the index with
   their own source paths, so every copy on disk is accounted for.
4. **Preserves materially different versions.** Different hash means a separate
   document with its own ID, never a silent overwrite.
5. **OCRs image-only documents** into a searchable companion under
   `OCR_COMPANIONS/`, leaving the original untouched.
6. **Captures the original source path**, creation time, modification time,
   size, and SHA-256 for every document.
7. **Assigns each document to one of the 23 categories** by weighted scoring
   over filename, path, and extracted text. Filename and path outrank body text,
   because a statement mentions many things but is filed by what it is.
   Anything below the confidence threshold lands in
   `00_UNCLASSIFIED_NEEDS_REVIEW` rather than being guessed into a category.
8. **Flags documents that prove or contradict** the seven key issues: the
   $18,703.85 payment, charge-off accounting, paid-in-full status, CRA
   furnishing, Chase reinvestigation, identity theft/fraud investigation, and
   authentication/security records.
9. **Writes the master spreadsheet** with all 18 required columns.

## The two tradelines

The matter involves two Chase tradelines with different theories. They are
tracked separately end to end, and every row in the master index carries a
`Tradeline` column.

| Tradeline | Card | Theory |
|---|---|---|
| **552475** | 3816 | Charge-off / payment contradiction. Chase reports a 2023-09-06 charge-off — six days *before* the first payment attempt — while current TU/EX disclosures show $0 and "paid in full — was a charge-off". The 2023-09-28 successful $18,703.85 debit has never been ledger-accounted for. |
| **414720** | 6974 | The objectively-falsifiable field. Chase continues to report an **$8,045** balance against Chase's own 2026-02-09 settlement letter for **$8,045.23**. |

A document about 414720 that carries no 552475 marker is filed to the 414720
folder regardless of what else it scores on, so the two records never blend.

The 23-cent difference is detected precisely: `$8,045` and `$8,045.23` are
matched by separate patterns that cannot match each other, and a document
reporting the bare figure in a credit-reporting context is flagged as the
falsifiable field.

## The superseded-narrative guard

The 2026-08-15 evidence audit determined there was **ONE** successful debit of
$18,703.85 — **not** two totaling $37,407.70. Any document asserting the old
figure is capped at **P3**, cannot satisfy a P0 target, and is listed in
`SUPERSEDED_DO_NOT_CITE.md`. Prior "SEND READY" packages are treated the same
way; only the 2026-08-26 Pre-Suit Settlement Demand is current.

The guard distinguishes a document that *asserts* the corrected figure from one
that *quotes it in order to correct it*. The August 15 audit necessarily
mentions $37,407.70 — it is the corrective record and a P0 target, so it is
exempt. Without that distinction the single most important corrective document
in the case would be buried at P3.

Nothing superseded is deleted. It is preserved at its original path and indexed
in full; it simply cannot be promoted.

## Source evidence vs derivative material

Every row carries an `Evidence Class`: `SOURCE` (what a court can be shown),
`DERIVATIVE` (our own analysis, drafts, indexes, strategy), or `UNDETERMINED`.
Anything Chase or a third party produced is SOURCE regardless of filename; our
own drafts are DERIVATIVE even when they quote source documents at length.

## Retrieval order

1. **Roadmap first.** `00 CHASE - Deep Forensic Audit + Pre-Litigation Case
   Mapping - 2026-08-26.pdf` is the map. Locate every source document it cites.
2. **Then sweep by identifier.** Independent of category or folder, every
   document is searched for all nine case identifiers — 3816, 552475, 6974,
   414720, $18,703.85, 6962374806, $8,045.23, CFPB 260206-28594668, and
   ECW231003-00436-R1. Results land in `IDENTIFIER_SWEEP.md`. An identifier
   with zero hits is a hole in the record that re-filing cannot fill.

## Output

```
~/Chase_Forensic_Master/
├── ORGANIZED/                  copies, filed into the 23 categories
│   ├── 01_Core_Account_Records/
│   ├── 02_Sept2023_Payment_Evidence/
│   ├── ...
│   ├── 19_Tradeline_414720_card_6974/
│   └── 00_UNCLASSIFIED_NEEDS_REVIEW/
├── OCR_COMPANIONS/             searchable copies of image-only documents
└── REPORTS/
    ├── MASTER_INDEX.csv        the master spreadsheet (opens in Excel/Numbers)
    ├── MASTER_INDEX.xlsx       same, formatted, if openpyxl is installed
    ├── P0_COVERAGE_REPORT.md   READ THIS FIRST
    ├── IDENTIFIER_SWEEP.md     hits for all nine case identifiers
    ├── SUPERSEDED_DO_NOT_CITE.md
    ├── CONTRADICTIONS_AND_FLAGS.md
    ├── ICLOUD_NOT_DOWNLOADED.md
    └── SHA256_MANIFEST.txt
```

## The completion standard

`P0_COVERAGE_REPORT.md` implements the rule that retrieval is complete only
when every P0 category is **FOUND**, **CONFIRMED NOT PRESENT**, or
**REFERENCED BUT SOURCE COPY NOT LOCATED**.

The third state is the one that matters most and the one a plain file listing
cannot give you. It means the pipeline found a document referring to the record
— an index entry, a letter citing an enclosure, a memo — but no file matching it
anywhere in the scanned sources. That is the difference between "Chase never
produced the ACDV" and "the ACDV exists somewhere and we have lost our copy."
Those two facts lead to very different next steps.

The report also lists every category with zero documents, so absence is
something you confirm rather than something you assume.

## iCloud files that are not downloaded

This is the failure mode most likely to corrupt the result. iCloud evicts file
contents to save space and leaves either a zero-length stub or a hidden
`.Name.pdf.icloud` placeholder. Such a file cannot be hashed, read, OCR'd, or
classified — and would otherwise be indexed as an empty document.

Both forms are detected and quarantined into `ICLOUD_NOT_DOWNLOADED.md`. While
any remain, the coverage report refuses to certify any P0 item as final. Run
with `--download-icloud` to materialize them first, or:

```bash
find ~/Library/Mobile\ Documents -name '.*.icloud' -exec brctl download {} \;
```

## Options

| Option | Effect |
|---|---|
| `--source PATH` | Source tree to scan. Repeatable. Defaults to all of iCloud Drive. |
| `--dest PATH` | Destination for the organized tree and reports. Required. |
| `--download-icloud` | Materialize evicted iCloud files before indexing. |
| `--no-ocr` | Skip OCR. Much faster; image-only documents stay unsearchable. |
| `--dry-run` | Classify and report without copying anything. |
| `--limit N` | Stop after N files, for a first look at a large drive. |

`--dest` may not sit inside a `--source` tree; the run aborts if it does.

## Tuning the classifier

Classification patterns live in `taxonomy.py`, one block per category, as
`(regex, weight)` pairs. If documents land in `00_UNCLASSIFIED_NEEDS_REVIEW`,
read a few, find the language they actually use, and add it there. Anything you
add applies on the next run.

`MIN_SCORE` sets how confident the classifier must be before filing a document
at all. Lower it to file more aggressively, raise it to send more to manual
review.

## Limits worth knowing

- Contradiction detection is a set of heuristics that produce **review
  prompts, not conclusions**. Read the underlying document before relying on
  any entry.
- Dates are best-effort, from the filename first and then the head of the text.
  Where no date is found, the file mtime is used and marked `[file mtime]`.
- "Produced by Chase?" is inferred from letterhead and addressing language and
  is marked `UNKNOWN` when unclear. It is a sorting aid, not a provenance
  determination.
- Audio files are hashed and filed by name; they are not transcribed.
