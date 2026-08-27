# Chase Forensic Evidence Retrieval

Organizes an iCloud case master folder against the Chase Forensic Evidence
Retrieval Checklist: 23 categories, SHA-256 deduplication, OCR companions,
prove/contradict flagging, a master spreadsheet, and a P0 completion report.

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

## Output

```
~/Chase_Forensic_Master/
├── ORGANIZED/                  copies, filed into the 23 categories
│   ├── 01_Core_Account_Records/
│   ├── 02_Sept2023_Payment_Evidence/
│   ├── ...
│   ├── 19_SEPARATE_JPMCB_8045_Tradeline_QUARANTINE/
│   └── 00_UNCLASSIFIED_NEEDS_REVIEW/
├── OCR_COMPANIONS/             searchable copies of image-only documents
└── REPORTS/
    ├── MASTER_INDEX.csv        the master spreadsheet (opens in Excel/Numbers)
    ├── MASTER_INDEX.xlsx       same, formatted, if openpyxl is installed
    ├── P0_COVERAGE_REPORT.md   READ THIS FIRST
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

## The quarantined tradeline

Category 19 holds the separate ~$8,045 JPMCB tradeline. A document carrying the
separate-tradeline markers and none of this account's markers is routed there
regardless of what else it scores on, so it cannot be merged into the main
analysis before provenance is established. The folder's README states the two
questions that must be answered before anything in it is used.

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
