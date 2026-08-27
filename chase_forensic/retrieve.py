#!/usr/bin/env python3
"""
Chase Forensic Evidence Retrieval - organizing pipeline.

Scans one or more source trees (all of iCloud Drive by default, not merely the
Chase folder), hashes every file, identifies exact duplicates by SHA-256,
preserves materially different versions, OCRs image-only documents into
searchable companion copies, classifies each document into the 23 checklist
categories, flags documents that prove or contradict the seven key issues,
and emits the master spreadsheet plus a P0 completion report.

Originals are never modified, moved, or deleted. The organized tree is built
from copies.

Usage:
    python3 retrieve.py --dest ~/Chase_Forensic_Master
    python3 retrieve.py --source ~/Library/Mobile\\ Documents --dest ./out
    python3 retrieve.py --dest ./out --dry-run
"""

import argparse
import csv
import datetime as dt
import hashlib
import json
import os
import re
import shutil
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import taxonomy as T
import extract as X
import report as R

HASH_CHUNK = 1024 * 1024

# Directories that never contain case evidence but do contain millions of files.
SKIP_DIRS = {
    ".git", ".svn", "node_modules", "__pycache__", ".Trash", ".Trashes",
    "Library/Caches", ".cache", ".npm", ".venv", "venv", "site-packages",
    "Photos Library.photoslibrary", "Music Library.musiclibrary",
    ".DocumentRevisions-V100", ".Spotlight-V100", ".fseventsd", ".TemporaryItems",
}
SKIP_DIR_SUFFIXES = (".photoslibrary", ".musiclibrary", ".tvlibrary", ".app",
                     ".framework", ".xcodeproj")

SKIP_FILES = {".DS_Store", "Icon\r", "desktop.ini", ".localized"}

# Extensions with no evidentiary value that would otherwise flood the index.
SKIP_EXT = {".dylib", ".so", ".o", ".pyc", ".class", ".ttf", ".otf", ".woff",
            ".woff2", ".icns", ".ico", ".dmg", ".pkg", ".iso"}

DEFAULT_ICLOUD = os.path.expanduser("~/Library/Mobile Documents")

# Filename characters that are unsafe or annoying in a destination tree.
_UNSAFE = re.compile(r'[/\\:*?"<>|\x00-\x1f]')


def sanitize(name, limit=120):
    name = _UNSAFE.sub("_", name).strip().strip(".")
    if len(name) > limit:
        stem, ext = os.path.splitext(name)
        name = stem[: limit - len(ext)] + ext
    return name or "unnamed"


def sha256_of(path):
    h = hashlib.sha256()
    try:
        with open(path, "rb") as fh:
            while True:
                chunk = fh.read(HASH_CHUNK)
                if not chunk:
                    break
                h.update(chunk)
    except OSError:
        return None
    return h.hexdigest()


# Folders whose copies are working copies, not the file of record.
RE_LOW_TRUST_DIR = re.compile(
    r"(?:^|/)(?:duplicates?|copies|copy|archive[sd]?|backups?|old|temp|tmp|"
    r"working|scratch|trash|recovered|downloads?)(?:/|$)", re.I)
RE_LOW_TRUST_NAME = re.compile(
    r"\bcopy\b|[-_ ]copy|\(\d+\)|\bduplicate\b|\bv\d+\b|conflicted", re.I)


def provenance_rank(rec):
    """
    Sort key choosing which copy of an identical file is the file of record.

    Lower is better. A copy sitting in a Duplicates or Archive folder, or named
    "... copy.pdf", loses to one filed in a real case folder. Ties break on the
    older creation time, then the shallower path, then the path itself, so the
    choice is deterministic across runs.
    """
    path, name = rec["path"], rec["filename"]
    penalty = 0
    if RE_LOW_TRUST_DIR.search(os.path.dirname(path)):
        penalty += 100
    if RE_LOW_TRUST_NAME.search(name):
        penalty += 50
    depth = path.count(os.sep)
    return (penalty, rec["ctime"], depth, path)


def should_skip_dir(dirpath, dirname):
    if dirname in SKIP_DIRS or dirname in SKIP_FILES:
        return True
    if dirname.endswith(SKIP_DIR_SUFFIXES):
        return True
    return False


def iter_files(roots, verbose=True):
    """Yield every candidate file under the given roots, skipping noise."""
    seen_real = set()
    for root in roots:
        root = os.path.abspath(os.path.expanduser(root))
        if not os.path.exists(root):
            if verbose:
                print("  ! source not found, skipping: %s" % root)
            continue
        if verbose:
            print("  scanning: %s" % root)
        for dirpath, dirnames, filenames in os.walk(root, topdown=True,
                                                    followlinks=False):
            dirnames[:] = [d for d in dirnames if not should_skip_dir(dirpath, d)]
            # Guard against a directory reached twice via different paths.
            try:
                real = os.path.realpath(dirpath)
            except OSError:
                continue
            if real in seen_real:
                dirnames[:] = []
                continue
            seen_real.add(real)

            for fn in filenames:
                if fn in SKIP_FILES:
                    continue
                ext = os.path.splitext(fn)[1].lower()
                if ext in SKIP_EXT:
                    continue
                full = os.path.join(dirpath, fn)
                if os.path.islink(full):
                    continue
                yield full


# --------------------------------------------------------------------------
# Classification
# --------------------------------------------------------------------------

def score_categories(filename, relpath, text):
    """
    Score every category against the document. Filename and path carry more
    weight than body text, because a scanned statement mentions many things
    but is filed by what it is.
    """
    hay_name = filename
    hay_path = relpath
    hay_text = text[:120_000] if text else ""

    scores = {}
    for cat in T.CATEGORIES:
        total = 0.0
        for rx, weight in cat["patterns"]:
            if rx.search(hay_name):
                total += weight * 3.0
            elif rx.search(hay_path):
                total += weight * 1.8
            elif hay_text and rx.search(hay_text):
                total += weight * 1.0
        if total:
            scores[cat["id"]] = total
    return scores


def classify(filename, relpath, text):
    """Return (category_id, all_scores). Quarantine rules take precedence."""
    scores = score_categories(filename, relpath, text)

    # Checklist item 19: the separate ~$8,045 JPMCB tradeline must stay
    # quarantined until provenance is established. If a document carries the
    # separate-tradeline markers and does NOT carry this account's markers,
    # it goes to quarantine regardless of what else it scores on.
    blob = " ".join([filename, relpath, text[:120_000] if text else ""])
    has_separate = bool(T.RE_SEPARATE_AMOUNT.search(blob))
    has_this_account = bool(
        T.RE_PAYMENT_AMOUNT.search(blob)
        or T.RE_CONFIRMATION.search(blob)
        or T.RE_ACCOUNT_FRAG.search(blob)
    )
    if has_separate and not has_this_account:
        return "19", scores

    if not scores:
        return "00", scores

    best = max(scores.items(), key=lambda kv: kv[1])
    if best[1] < T.MIN_SCORE:
        return "00", scores
    return best[0], scores


def detect_flags(blob):
    """Return the list of flag keys the document touches."""
    hits = []
    for key, patterns in T.FLAG_PATTERNS.items():
        for rx in patterns:
            if rx.search(blob):
                hits.append(key)
                break
    return hits


# Contradiction heuristics. These are conservative and phrased as prompts for
# human review, never as conclusions.
RE_NONZERO_BALANCE = re.compile(
    r"balance\s*:?\s*\$?\s*(?!0[.,]?0?0?\b)([1-9][\d,]{2,})", re.I)
RE_VERIFIED = re.compile(r"verified\s+as\s+accurate|meets\s+FCRA\s+requirements"
                         r"|(?:we\s+)?verified\s+(?:the\s+)?(?:account|information)", re.I)
RE_CHARGED_OFF_STATUS = re.compile(
    r"charge[\s-]?off|charged[\s-]?off|profit\s+and\s+loss|\bP&L\b", re.I)


def detect_contradictions(blob, doc_date, flags):
    """Return a list of short contradiction notes for the spreadsheet."""
    notes = []
    after_payment = bool(doc_date and doc_date >= "2023-09-28")
    after_pif = bool(doc_date and doc_date >= "2023-11-08")

    if after_pif and RE_CHARGED_OFF_STATUS.search(blob) and RE_NONZERO_BALANCE.search(blob):
        notes.append("Post-11/08/2023 document reports charge-off status with a "
                     "non-zero balance - contradicts paid-in-full letter")

    if after_payment and RE_VERIFIED.search(blob) and RE_CHARGED_OFF_STATUS.search(blob):
        notes.append("Post-payment verification of charge-off reporting - "
                     "contradicts the 09/2023 payment and PIF status")

    if "PIF" in flags and RE_NONZERO_BALANCE.search(blob) and RE_CHARGED_OFF_STATUS.search(blob):
        notes.append("Same document contains paid-in-full language and a "
                     "non-zero charged-off balance - internal inconsistency")

    if "FRAUD" in flags and after_payment and RE_VERIFIED.search(blob):
        notes.append("Verification recorded despite identity-theft notice - "
                     "review Chase's knowledge at time of verification")

    return notes


# --------------------------------------------------------------------------
# Field extraction for the master spreadsheet
# --------------------------------------------------------------------------

_DATE_PATTERNS = [
    (re.compile(r"\b(20[12]\d)[-_/.]([01]?\d)[-_/.]([0-3]?\d)\b"), (1, 2, 3)),
    (re.compile(r"\b([01]?\d)[-_/.]([0-3]?\d)[-_/.](20[12]\d)\b"), (3, 1, 2)),
    (re.compile(r"\b([01]?\d)[-_/.]([0-3]?\d)[-_/.]([12]\d)\b"), (3, 1, 2)),
]
_MONTHS = {m: i + 1 for i, m in enumerate(
    ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"])}
_MONTH_NAME = re.compile(
    r"\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.?\s+([0-3]?\d),?\s+(20[12]\d)\b",
    re.I)


def _norm_date(y, m, d):
    try:
        y, m, d = int(y), int(m), int(d)
        if y < 100:
            y += 2000
        return dt.date(y, m, d).isoformat()
    except (ValueError, TypeError):
        return None


def find_date(filename, text):
    """Best-effort document date. Filename first, then the head of the text."""
    for hay in (filename, (text or "")[:6000]):
        if not hay:
            continue
        m = _MONTH_NAME.search(hay)
        if m:
            got = _norm_date(m.group(3), _MONTHS[m.group(1).lower()[:3]], m.group(2))
            if got:
                return got
        for rx, (yi, mi, di) in _DATE_PATTERNS:
            m = rx.search(hay)
            if m:
                got = _norm_date(m.group(yi), m.group(mi), m.group(di))
                if got:
                    return got
    return ""


RE_MONEY = re.compile(r"\$\s?([\d]{1,3}(?:,\d{3})+(?:\.\d{2})?|\d+\.\d{2})")


def find_amount(blob):
    """Prefer the case-critical amounts, else the largest dollar figure."""
    if T.RE_PAYMENT_AMOUNT.search(blob):
        return "$18,703.85"
    if T.RE_SEPARATE_AMOUNT.search(blob):
        return "$8,045 (separate tradeline)"
    best, best_val = "", 0.0
    for m in RE_MONEY.finditer(blob[:60_000]):
        try:
            val = float(m.group(1).replace(",", ""))
        except ValueError:
            continue
        if val > best_val:
            best_val, best = val, "$" + m.group(1)
    return best


RE_ACCOUNT_MASK = re.compile(r"(?:x{2,}|\*{2,}|•{2,}|ending\s+in\s*)(\d{4})", re.I)


def find_account(blob):
    hits = []
    if re.search(r"\b3816\b", blob):
        hits.append("...3816")
    if re.search(r"\b552475\b", blob):
        hits.append("552475")
    for m in RE_ACCOUNT_MASK.finditer(blob[:40_000]):
        tag = "..." + m.group(1)
        if tag not in hits:
            hits.append(tag)
        if len(hits) >= 4:
            break
    return "; ".join(hits)


RE_CRA = [("TransUnion", re.compile(r"trans\s?union", re.I)),
          ("Experian", re.compile(r"experian", re.I)),
          ("Equifax", re.compile(r"equifax", re.I))]


def find_cra(blob):
    return "; ".join(name for name, rx in RE_CRA if rx.search(blob))


RE_CHASE_PRODUCED = re.compile(
    r"JPMorgan\s+Chase\s+Bank|Chase\s+Card\s+Services|P\.?O\.?\s+Box\s+15298"
    r"|Cardmember\s+Service|chase\.com|Chase\s+Bank,?\s+N\.?A\.?", re.I)
RE_SELF_AUTHORED = re.compile(
    r"Chris(?:topher)?\s+Carrelha|Dear\s+(?:Sir|Madam|Chase)|I\s+am\s+writing\s+to\s+dispute",
    re.I)


def produced_by_chase(blob, category_id):
    if RE_CHASE_PRODUCED.search(blob):
        if RE_SELF_AUTHORED.search(blob[:3000]) and category_id in ("11", "13", "20"):
            return "NO (consumer-authored, Chase addressed)"
        return "YES"
    if RE_SELF_AUTHORED.search(blob[:3000]):
        return "NO"
    return "UNKNOWN"


def key_fact(blob, flags, category_id):
    """One-line summary of why the document matters."""
    if T.RE_CONFIRMATION.search(blob):
        return "Contains payment confirmation number 6962374806"
    if T.RE_PAYMENT_AMOUNT.search(blob):
        return "Contains the $18,703.85 payment amount"
    if category_id == "05":
        return "Paid-in-full / satisfaction evidence"
    if category_id == "09":
        return "Furnisher dispute-response record (ACDV / e-OSCAR)"
    if category_id == "10":
        return "Metro 2 field-level furnishing data"
    if flags:
        return "Touches: " + ", ".join(T.FLAGS[f] for f in flags[:3])
    return ""


LEGAL_RELEVANCE = {
    "02": "FCRA 1681s-2(b) accuracy; proof of payment",
    "03": "Independent corroboration of payment; rebuts Chase records",
    "04": "Charge-off accounting; accuracy of reported balance",
    "05": "Proves paid-in-full status; falsity of continued reporting",
    "06": "CRA reporting accuracy; 1681i reinvestigation duty",
    "07": "CRA reporting accuracy; 1681i reinvestigation duty",
    "08": "CRA reporting accuracy; 1681i reinvestigation duty",
    "09": "Furnisher reinvestigation duty, 1681s-2(b); willfulness",
    "10": "Furnishing accuracy at field level; Metro 2 compliance",
    "11": "Notice to furnisher; 1681s-2(b) trigger; willfulness",
    "12": "Identity theft; 1681c-2 block; 1681s-2(b) duty",
    "13": "1681g(e) production duty; adverse inference if withheld",
    "14": "Notice, willfulness, corporate knowledge",
    "15": "Notice, willfulness, regulatory admissions",
    "16": "Notice, admissions, agent statements",
    "17": "Rebuts any claim payment was untimely or never tendered",
    "18": "Timeline; account status at each reporting period",
    "19": "PROVENANCE UNRESOLVED - do not merge with main account",
    "20": "Work product / pre-suit record",
    "21": "Actual damages under 1681n / 1681o",
    "22": "Authentication and chain of custody",
    "23": "Index of existing work product; retrieval completeness",
    "01": "Account formation, terms, arbitration clause",
    "00": "Unclassified - requires manual review",
}


def assign_priority(category_id, blob, flags):
    cat = T.CATEGORY_BY_ID[category_id]
    priority = cat["priority"]
    for rx in T.P0_ESCALATION:
        if rx.search(blob):
            return "P0"
    # CRA folders default to P1, but reinvestigation results are P0.
    if category_id in ("06", "07", "08") and "REINVESTIGATION" in flags:
        return "P0"
    return priority


# --------------------------------------------------------------------------
# Main pipeline
# --------------------------------------------------------------------------

def build(args):
    dest = os.path.abspath(os.path.expanduser(args.dest))
    organized = os.path.join(dest, "ORGANIZED")
    companions = os.path.join(dest, "OCR_COMPANIONS")
    reports = os.path.join(dest, "REPORTS")

    backends = X.Backends()
    print("Backends detected:")
    print(backends.summary())
    if not backends.can_ocr():
        print("\n  NOTE: no OCR backend. Image-only documents will be indexed but")
        print("        not made searchable. Install with:  brew install ocrmypdf tesseract\n")

    roots = args.source or [DEFAULT_ICLOUD]

    if not args.dry_run:
        for d in (organized, companions, reports):
            os.makedirs(d, exist_ok=True)

    print("\nPass 1: scanning and hashing...")
    placeholders = []    # iCloud files with no local content
    by_sha = {}          # sha -> list of candidate file records
    scanned = 0

    # Sort the file list so document IDs are stable across re-runs.
    all_paths = sorted(iter_files(roots))
    if args.limit:
        all_paths = all_paths[: args.limit]

    for path in all_paths:
        scanned += 1
        if scanned % 2000 == 0:
            print("    ...%d files hashed" % scanned)

        stub = X.icloud_placeholder_target(path)
        dataless = X.is_dataless(path)
        if stub or dataless:
            real_name = stub or os.path.basename(path)
            if args.download_icloud and backends.brctl:
                target = os.path.join(os.path.dirname(path), real_name) if stub else path
                if X.request_download(target, backends):
                    path = target
                    stub, dataless = None, False
            if stub or dataless:
                placeholders.append({"path": path, "name": real_name})
                continue

        sha = sha256_of(path)
        if sha is None:
            continue
        try:
            st = os.stat(path)
        except OSError:
            continue

        by_sha.setdefault(sha, []).append({
            "sha": sha, "path": path, "filename": os.path.basename(path),
            "size": st.st_size, "mtime": st.st_mtime, "ctime": st.st_ctime,
        })

    # Choose the best-provenance copy of each unique document as the primary.
    primaries, dupes = [], []
    for sha in sorted(by_sha):
        group = sorted(by_sha[sha], key=provenance_rank)
        primary, rest = group[0], group[1:]
        primary["duplicate_of"] = None
        primary["dupe_paths"] = [r["path"] for r in rest]
        primaries.append(primary)
        for r in rest:
            r["duplicate_of"] = sha
            r["doc_id"] = None
            dupes.append(r)

    # Assign IDs in a stable order.
    primaries.sort(key=lambda r: r["path"])
    for i, rec in enumerate(primaries, 1):
        rec["doc_id"] = "CHASE-%05d" % i
    by_sha_primary = {r["sha"]: r for r in primaries}

    print("  %d files scanned, %d unique documents, %d exact duplicates, "
          "%d iCloud placeholders" % (scanned, len(primaries), len(dupes),
                                      len(placeholders)))

    print("\nPass 2: extracting text, classifying, and copying...")
    rows = []
    reference_corpus = []
    found_probes = {p["key"]: [] for p in T.P0_PROBES}

    for i, rec in enumerate(primaries, 1):
        if i % 200 == 0:
            print("    ...%d/%d documents processed" % (i, len(primaries)))

        text, mode = X.extract(rec["path"], backends, allow_ocr=not args.no_ocr)
        relpath = rec["path"]
        blob = " ".join([rec["filename"], relpath, text or ""])

        cat_id, scores = classify(rec["filename"], relpath, text or "")
        cat = T.CATEGORY_BY_ID[cat_id]
        flags = detect_flags(blob)
        doc_date = find_date(rec["filename"], text or "")
        contradictions = detect_contradictions(blob, doc_date, flags)
        priority = assign_priority(cat_id, blob, flags)

        # OCR companion for image-only documents.
        companion, companion_kind = None, None
        orig_ocr = "ORIGINAL"
        if mode == "OCR":
            orig_ocr = "ORIGINAL + OCR companion"
            if not args.dry_run and backends.can_ocr():
                companion, companion_kind = X.make_searchable_companion(
                    rec["path"], os.path.join(companions, cat["name"]),
                    "%s__%s" % (rec["doc_id"], sanitize(rec["filename"])), backends)
                if companion is None:
                    orig_ocr = "ORIGINAL (image-only, OCR failed)"
        elif mode == "NONE":
            orig_ocr = "ORIGINAL (no text layer)"

        # Copy into the organized tree. Never move, never modify the source.
        dest_rel = os.path.join(cat["name"],
                                "%s__%s" % (rec["doc_id"], sanitize(rec["filename"])))
        dest_path = os.path.join(organized, dest_rel)
        if not args.dry_run:
            os.makedirs(os.path.dirname(dest_path), exist_ok=True)
            if not os.path.exists(dest_path):
                try:
                    shutil.copy2(rec["path"], dest_path)
                except OSError as exc:
                    print("    ! copy failed for %s: %s" % (rec["path"], exc))

        # Version detection: same normalized name, different hash.
        dupe_status = "PRIMARY"
        if rec["dupe_paths"]:
            dupe_status = "PRIMARY (%d exact duplicate%s)" % (
                len(rec["dupe_paths"]), "s" if len(rec["dupe_paths"]) != 1 else "")

        rows.append({
            "Document ID": rec["doc_id"],
            "Date": doc_date or ("[file mtime] " + dt.date.fromtimestamp(rec["mtime"]).isoformat()),
            "Filename": rec["filename"],
            "Category": "%s %s" % (cat["id"], cat["title"]),
            "Source Path": rec["path"],
            "Account": find_account(blob),
            "Amount": find_amount(blob),
            "Key Fact": key_fact(blob, flags, cat_id),
            "Contradiction": " | ".join(contradictions),
            "Legal Relevance": LEGAL_RELEVANCE.get(cat_id, ""),
            "CRA": find_cra(blob),
            "Dispute Date": doc_date if cat_id in ("06", "07", "08", "09", "11") else "",
            "Produced by Chase?": produced_by_chase(blob, cat_id),
            "Original/OCR": orig_ocr,
            "Duplicate Status": dupe_status,
            "SHA-256": rec["sha"],
            "Priority": priority,
            "Notes": build_notes(rec, cat_id, flags, companion, companion_kind, mode),
        })

        if text:
            reference_corpus.append(text[:200_000])

        # P0 probe evaluation.
        for probe in T.P0_PROBES:
            if cat_id in probe["categories"]:
                for rx in probe["patterns"]:
                    if rx.search(blob):
                        found_probes[probe["key"]].append(rec["doc_id"])
                        break

    # Duplicate rows, so every copy on disk is accounted for.
    for rec in dupes:
        primary = by_sha_primary[rec["sha"]]
        base = next((r for r in rows if r["Document ID"] == primary["doc_id"]), None)
        rows.append({
            "Document ID": "%s-D%d" % (primary["doc_id"],
                                       primary["dupe_paths"].index(rec["path"]) + 1),
            "Date": base["Date"] if base else "",
            "Filename": rec["filename"],
            "Category": base["Category"] if base else "",
            "Source Path": rec["path"],
            "Account": base["Account"] if base else "",
            "Amount": base["Amount"] if base else "",
            "Key Fact": "Exact duplicate of %s" % primary["doc_id"],
            "Contradiction": "",
            "Legal Relevance": base["Legal Relevance"] if base else "",
            "CRA": base["CRA"] if base else "",
            "Dispute Date": "",
            "Produced by Chase?": base["Produced by Chase?"] if base else "",
            "Original/OCR": "ORIGINAL (duplicate copy, not re-filed)",
            "Duplicate Status": "EXACT DUPLICATE of %s (SHA-256 match)" % primary["doc_id"],
            "SHA-256": rec["sha"],
            "Priority": base["Priority"] if base else "P3",
            "Notes": "Left in place at source. Not copied into the organized tree.",
        })

    print("  %d rows in the master index" % len(rows))

    if args.dry_run:
        print("\nDRY RUN - no files copied, no reports written.")
        R.print_dry_run_summary(rows, found_probes, placeholders)
        return 0

    print("\nPass 3: writing reports...")
    R.write_master_csv(os.path.join(reports, "MASTER_INDEX.csv"), rows)
    R.write_master_xlsx(os.path.join(reports, "MASTER_INDEX.xlsx"), rows)
    R.write_coverage_report(
        os.path.join(reports, "P0_COVERAGE_REPORT.md"),
        rows, found_probes, reference_corpus, placeholders, roots)
    R.write_flag_report(os.path.join(reports, "CONTRADICTIONS_AND_FLAGS.md"), rows)
    R.write_placeholder_report(
        os.path.join(reports, "ICLOUD_NOT_DOWNLOADED.md"), placeholders)
    R.write_category_readmes(organized)
    R.write_hash_manifest(os.path.join(reports, "SHA256_MANIFEST.txt"), rows)

    print("\nDone.")
    print("  Organized tree : %s" % organized)
    print("  OCR companions : %s" % companions)
    print("  Reports        : %s" % reports)
    print("\nRead REPORTS/P0_COVERAGE_REPORT.md first - it tells you what is still missing.")
    return 0


def build_notes(rec, cat_id, flags, companion, companion_kind, mode):
    notes = []
    if cat_id == "00":
        notes.append("UNCLASSIFIED - manual review required")
    if cat_id == "19":
        notes.append("QUARANTINED: separate JPMCB tradeline, provenance not established")
    if flags:
        notes.append("Flags: " + ", ".join(flags))
    if companion:
        notes.append("Searchable companion: %s (%s)" % (os.path.basename(companion),
                                                        companion_kind))
    if mode == "NONE":
        notes.append("No text extracted - review manually")
    if rec["dupe_paths"]:
        notes.append("Duplicate source paths: " + " ; ".join(rec["dupe_paths"][:5]))
    notes.append("ctime=%s mtime=%s size=%d" % (
        dt.datetime.fromtimestamp(rec["ctime"]).isoformat(timespec="seconds"),
        dt.datetime.fromtimestamp(rec["mtime"]).isoformat(timespec="seconds"),
        rec["size"]))
    return " | ".join(notes)


def main():
    ap = argparse.ArgumentParser(
        description="Organize the Chase forensic evidence master folder.")
    ap.add_argument("--source", action="append",
                    help="Source tree to scan. Repeatable. "
                         "Defaults to ~/Library/Mobile Documents (all of iCloud Drive).")
    ap.add_argument("--dest", required=True,
                    help="Destination for the organized tree and reports.")
    ap.add_argument("--no-ocr", action="store_true",
                    help="Skip OCR (much faster; image-only docs stay unsearchable).")
    ap.add_argument("--download-icloud", action="store_true",
                    help="Ask iCloud to download evicted files before indexing (macOS).")
    ap.add_argument("--dry-run", action="store_true",
                    help="Classify and report without copying anything.")
    ap.add_argument("--limit", type=int, default=0,
                    help="Stop after N files. Useful for a first look.")
    args = ap.parse_args()

    dest = os.path.abspath(os.path.expanduser(args.dest))
    for src in (args.source or [DEFAULT_ICLOUD]):
        src_abs = os.path.abspath(os.path.expanduser(src))
        if dest == src_abs or dest.startswith(src_abs + os.sep):
            print("ERROR: --dest is inside a --source tree. Choose a destination "
                  "outside the folders being scanned.")
            return 2

    return build(args)


if __name__ == "__main__":
    sys.exit(main())
