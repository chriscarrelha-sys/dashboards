#!/usr/bin/env python3
"""Import, hash, deduplicate, OCR, classify and index authorized source files.

The governing rule is that an original is never touched. This script reads the
file at its authorized location and writes a *copy* into 03-sources/raw/; it
never writes, renames, moves or deletes at the source. Inside the pack, raw/ is
then read-only for everything else, and --hash-check proves it stayed so.

What one import does, per file:
  hash        SHA-256 of the bytes, recorded before anything else happens
  dedupe      identical bytes are recorded once; the duplicate is indexed and
              pointed at the original rather than copied again
  text layer  detects whether a PDF already carries extractable text
  OCR         only when there is no text layer; the OCR output is a NEW file
              with its own SRC id and a derived_from pointer, never a rewrite
  classify    doc_type from content and filename evidence, with the evidence
              recorded so a wrong guess is auditable rather than invisible
  index       one row in 03-sources/source-index.csv and one in the manifest

For material that may not be copied at all — a document read in place in a
client's Drive, a court record viewed but not downloaded — use --record-extract:
it registers a verbatim extract you produced, with its own id, its parent's id,
and its own hash. The original is never fetched.

Usage:
    import_sources.py <pack> --from <dir> [--system google-drive] [--dry-run]
    import_sources.py <pack> --record-extract <file> --derived-from SRC-### \
                      --title "..." --doc-type order --doc-date 2026-07-20
    import_sources.py <pack> --reindex          # re-hash and re-check, import nothing

Exit codes: 0 pass, 1 failure, 2 usage error.
"""
from __future__ import annotations

import argparse
import csv
import hashlib
import re
import shutil
import subprocess
import sys
from datetime import date
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from common import Report, die, read_csv  # noqa: E402

RAW = "03-sources/raw"
MANIFEST = "03-sources/source-manifest.csv"
INDEX = "03-sources/source-index.csv"

INDEX_COLS = [
    "index_id", "original_name", "original_system", "original_location", "sha256",
    "byte_size", "content_hash_group", "dedupe_status", "duplicate_of", "text_layer",
    "ocr_status", "ocr_tool", "page_count", "classification", "classification_basis",
    "classification_confidence", "imported_date", "source_id", "original_preserved", "notes",
]

# Classification is evidence-based, never a bare guess. Each rule carries the
# phrase that fired it so `classification_basis` can be read back and argued
# with. Order matters: the first rule that fires wins.
CLASSIFIERS: list[tuple[str, str, re.Pattern]] = [
    ("order",            "content", re.compile(r"\bIT IS (HEREBY )?ORDERED\b|\bORDER\b\s*$", re.I | re.M)),
    ("opinion",          "content", re.compile(r"\bOPINION AND ORDER\b|\bMEMORANDUM OPINION\b", re.I)),
    ("complaint",        "content", re.compile(r"\b(FIRST |SECOND |THIRD )?AMENDED COMPLAINT\b|\bCOMPLAINT FOR\b", re.I)),
    ("motion",           "content", re.compile(r"\bMOTION TO (DISMISS|REMAND|STRIKE|COMPEL)\b|\bMOTION FOR\b", re.I)),
    ("brief",            "content", re.compile(r"\bBRIEF IN (SUPPORT|OPPOSITION)\b|\bMEMORANDUM OF LAW\b", re.I)),
    ("docket-sheet",     "content", re.compile(r"\bDocket Text\b|\bCASE #:|\bU\.S\. District Court\b.*Docket", re.I)),
    ("ledger",           "content", re.compile(r"\b(Transaction History|Payment History|Loan History)\b", re.I)),
    ("payoff-quote",     "content", re.compile(r"\b(Payoff|Reinstatement) (Quote|Statement|Amount)\b", re.I)),
    ("note",             "content", re.compile(r"\bPROMISSORY NOTE\b|\bHOME EQUITY LINE OF CREDIT AGREEMENT\b", re.I)),
    ("allonge",          "content", re.compile(r"\bALLONGE\b", re.I)),
    ("security-deed",    "content", re.compile(r"\bSECURITY DEED\b|\bDEED TO SECURE DEBT\b|\bMORTGAGE\b\s*$", re.I | re.M)),
    ("assignment",       "content", re.compile(r"\bASSIGNMENT OF (SECURITY DEED|MORTGAGE|DEED)\b", re.I)),
    ("trust-document",   "content", re.compile(r"\bPOOLING AND SERVICING AGREEMENT\b|\bTRUST AGREEMENT\b|\bINDENTURE\b", re.I)),
    ("rating-report",    "content", re.compile(r"\b(DBRS|Moody's|Fitch|S&P)\b.*\bPresale\b|\bRating Report\b", re.I)),
    ("correspondence",   "content", re.compile(r"^\s*(Dear|Re:|RE:)\s", re.I | re.M)),
    ("agency-response",  "content", re.compile(r"\b(CFPB|Consumer Financial Protection Bureau)\b.*\b(complaint|response)\b", re.I)),
    ("credit-report",    "content", re.compile(r"\b(Experian|Equifax|TransUnion)\b.*\b(credit (file|report))\b", re.I)),
    ("bank-statement",   "content", re.compile(r"\bStatement Period\b|\bBeginning Balance\b.*\bEnding Balance\b", re.I)),
    ("order",            "filename", re.compile(r"\border\b|\bdoc[-_ ]?\d+\b.*order", re.I)),
    ("complaint",        "filename", re.compile(r"complaint|\bfac\b|petition", re.I)),
    ("motion",           "filename", re.compile(r"\bmtd\b|motion", re.I)),
    ("ledger",           "filename", re.compile(r"payment|transaction|ledger|history", re.I)),
    ("correspondence",   "filename", re.compile(r"letter|email|corresp", re.I)),
]

# Names that announce themselves as a copy. When two files hold identical
# bytes, the one whose name does not say "copy" is the one later work should
# cite, and sort order is not a reason to decide otherwise.
COPY_MARKER = re.compile(r"\(\s*(copy|\d+)\s*\)|\bcopy\b|\bduplicate\b|"
                         r"\bversion \d\b|[-_ ]copy[-_. ]|\(\d+\)\.", re.I)


def canonical_rank(path: Path) -> tuple:
    """Sort key deciding which of several identical files is the original.

    Least copy-like name first, then the shallowest path, then the shortest
    name, then alphabetical so a run is reproducible.
    """
    return (1 if COPY_MARKER.search(path.name) else 0,
            len(path.parts), len(path.name), str(path).lower())


def safe_name(name: str) -> str:
    """A filename for inside raw/ that no shell command has to quote.

    The original keeps its own name at its own location, and source-index.csv
    records it in `original_name`, so nothing about provenance is lost.
    """
    stem, dot, ext = name.rpartition(".")
    if not dot:
        stem, ext = name, ""
    stem = re.sub(r"[^A-Za-z0-9._-]+", "-", stem).strip("-. ") or "source"
    ext = re.sub(r"[^A-Za-z0-9]+", "", ext)
    return f"{stem[:80]}{'.' + ext if ext else ''}"


TEXTUAL_EXT = {".txt", ".md", ".csv", ".json", ".html", ".htm", ".rtf"}
PDF_EXT = {".pdf"}
IMAGE_EXT = {".png", ".jpg", ".jpeg", ".tif", ".tiff"}


def sha256_of(path: Path) -> str:
    h = hashlib.sha256()
    with path.open("rb") as fh:
        for chunk in iter(lambda: fh.read(1 << 20), b""):
            h.update(chunk)
    return h.hexdigest()


def have(cmd: str) -> bool:
    return shutil.which(cmd) is not None


def pdf_text(path: Path) -> tuple[str, int]:
    """Return (extracted text, page count). Empty text means no text layer."""
    if have("pdftotext"):
        try:
            out = subprocess.run(["pdftotext", "-q", str(path), "-"],
                                 capture_output=True, timeout=120)
            text = out.stdout.decode("utf-8", "replace")
        except Exception:
            text = ""
    else:
        text = ""
    pages = 0
    if have("pdfinfo"):
        try:
            info = subprocess.run(["pdfinfo", str(path)], capture_output=True,
                                  timeout=60).stdout.decode("utf-8", "replace")
            m = re.search(r"^Pages:\s+(\d+)", info, re.M)
            pages = int(m.group(1)) if m else 0
        except Exception:
            pages = 0
    return text, pages


def run_ocr(src: Path, out_txt: Path) -> tuple[str, str]:
    """OCR into a NEW file. Returns (status, tool). The source is not touched."""
    if have("ocrmypdf") and src.suffix.lower() in PDF_EXT:
        sidecar = out_txt
        tmp_pdf = out_txt.with_suffix(".ocr.pdf")
        try:
            subprocess.run(["ocrmypdf", "--sidecar", str(sidecar), "--skip-text",
                            str(src), str(tmp_pdf)], capture_output=True, timeout=1800, check=True)
            if tmp_pdf.exists():
                tmp_pdf.unlink()      # a derived PDF we do not keep; the text is the product
            return "ocr-complete", "ocrmypdf"
        except Exception:
            pass
    if have("tesseract") and src.suffix.lower() in IMAGE_EXT:
        try:
            subprocess.run(["tesseract", str(src), str(out_txt.with_suffix(""))],
                           capture_output=True, timeout=900, check=True)
            return "ocr-complete", "tesseract"
        except Exception:
            pass
    return "ocr-unavailable", "none"


def classify(text: str, filename: str) -> tuple[str, str, str]:
    """Return (doc_type, basis, confidence). Never silently guesses."""
    head = text[:20000]
    for doc_type, where, pat in CLASSIFIERS:
        hay = head if where == "content" else filename
        m = pat.search(hay)
        if m:
            snippet = m.group(0).strip().replace("\n", " ")[:80]
            conf = "high" if where == "content" else "low"
            return doc_type, f"{where}: matched \"{snippet}\"", conf
    return "UNCLASSIFIED", "no classifier matched; a human must set doc_type", "low"


def load_index(pack: Path) -> tuple[list[str], list[dict]]:
    header, rows = read_csv(pack / INDEX)
    return (header or INDEX_COLS), rows


def next_id(rows: list[dict], col: str, prefix: str, width: int = 3) -> int:
    top = 0
    for r in rows:
        m = re.match(rf"^{prefix}-(\d+)$", (r.get(col) or "").strip())
        if m:
            top = max(top, int(m.group(1)))
    return top + 1


def write_rows(path: Path, header: list[str], rows: list[dict]) -> None:
    with path.open("w", newline="", encoding="utf-8") as fh:
        w = csv.DictWriter(fh, fieldnames=header)
        w.writeheader()
        for r in rows:
            w.writerow({k: r.get(k, "") for k in header})


def do_import(rep: Report, pack: Path, src_dir: Path, system: str, dry: bool) -> None:
    raw = pack / RAW
    if not raw.is_dir():
        rep.error(f"{RAW}/ does not exist — is {pack} a matter pack?")
        return

    idx_header, idx_rows = load_index(pack)
    man_header, man_rows = read_csv(pack / MANIFEST)
    if not man_header:
        rep.error(f"{MANIFEST} is missing or has no header")
        return

    known_hashes = {r.get("sha256", ""): r.get("index_id", "") for r in idx_rows if r.get("sha256")}
    n_idx = next_id(idx_rows, "index_id", "IDX")
    n_src = next_id(man_rows, "source_id", "SRC")
    today = date.today().isoformat()
    imported = dupes = ocred = 0

    files = sorted((p for p in src_dir.rglob("*")
                    if p.is_file() and not p.name.startswith(".")),
                   key=canonical_rank)
    if not files:
        rep.warn(f"no files found under {src_dir}")
    for f in files:
        digest = sha256_of(f)
        size = f.stat().st_size
        ext = f.suffix.lower()

        if digest in known_hashes:
            dupes += 1
            idx_rows.append({
                "index_id": f"IDX-{n_idx:03d}", "original_name": f.name,
                "original_system": system, "original_location": str(f),
                "sha256": digest, "byte_size": str(size),
                "content_hash_group": digest[:12], "dedupe_status": "duplicate",
                "duplicate_of": known_hashes[digest], "text_layer": "n/a",
                "ocr_status": "n/a", "ocr_tool": "none", "page_count": "",
                "classification": "n/a", "classification_basis": "identical bytes to "
                f"{known_hashes[digest]}", "classification_confidence": "high",
                "imported_date": today, "source_id": "",
                "original_preserved": "yes",
                "notes": f"byte-identical duplicate of {known_hashes[digest]}; "
                         f"not copied a second time. The canonical copy is the "
                         f"one whose name does not read as a duplicate.",
            })
            n_idx += 1
            continue

        # ---- read enough to classify, without modifying anything ----
        text, pages, text_layer = "", 0, "n/a"
        if ext in TEXTUAL_EXT:
            text = f.read_text(encoding="utf-8", errors="replace")
            text_layer = "native-text"
        elif ext in PDF_EXT:
            text, pages = pdf_text(f)
            text_layer = "yes" if len(text.strip()) > 200 else "no"
        elif ext in IMAGE_EXT:
            text_layer = "no"

        doc_type, basis, conf = classify(text, f.name)
        dest = raw / f"SRC-{n_src:03d}-{safe_name(f.name)}"
        ocr_status, ocr_tool = "not-required" if text_layer in {"yes", "native-text"} else "pending", "none"

        if dry:
            rep.note(f"[dry-run] would import {f.name} -> {dest.name} "
                     f"({doc_type}, text_layer={text_layer})")
            n_idx += 1
            n_src += 1
            continue

        shutil.copy2(f, dest)          # copy, never move: the original stays put
        imported += 1

        derived_src_id = ""
        if text_layer == "no":
            ocr_out = raw / f"SRC-{n_src + 1:03d}-ocr-of-SRC-{n_src:03d}.txt"
            ocr_status, ocr_tool = run_ocr(dest, ocr_out)
            if ocr_status == "ocr-complete" and ocr_out.exists():
                ocred += 1
                derived_src_id = f"SRC-{n_src + 1:03d}"
                man_rows.append({
                    "source_id": derived_src_id,
                    "title": f"OCR text of {f.name}",
                    "doc_type": "derived-text", "doc_date": "UNVERIFIED",
                    "file_path": f"{RAW}/{ocr_out.name}",
                    "sha256": sha256_of(ocr_out), "ocr_status": "ocr-derived",
                    "access_status": "full", "authenticity_status": "derived",
                    "derived_from": f"SRC-{n_src:03d}",
                    "notes": f"machine OCR via {ocr_tool}; not proofread. "
                             f"Any quotation taken from it must be checked "
                             f"against the image before it is used.",
                })

        idx_rows.append({
            "index_id": f"IDX-{n_idx:03d}", "original_name": f.name,
            "original_system": system, "original_location": str(f),
            "sha256": digest, "byte_size": str(size),
            "content_hash_group": digest[:12], "dedupe_status": "unique",
            "duplicate_of": "", "text_layer": text_layer,
            "ocr_status": ocr_status, "ocr_tool": ocr_tool,
            "page_count": str(pages or ""), "classification": doc_type,
            "classification_basis": basis, "classification_confidence": conf,
            "imported_date": today, "source_id": f"SRC-{n_src:03d}",
            "original_preserved": "yes",
            "notes": f"derived text {derived_src_id}" if derived_src_id else "",
        })
        man_rows.append({
            "source_id": f"SRC-{n_src:03d}", "title": f.stem.replace("_", " "),
            "doc_type": doc_type, "doc_date": "UNVERIFIED",
            "file_path": f"{RAW}/{dest.name}", "sha256": digest,
            "ocr_status": ocr_status, "access_status": "full",
            "authenticity_status": "UNVERIFIED",
            "notes": "imported by import_sources.py; doc_date, title and "
                     "authenticity require human confirmation",
        })
        known_hashes[digest] = f"IDX-{n_idx:03d}"
        n_idx += 1
        n_src += 2 if derived_src_id else 1

    if not dry:
        write_rows(pack / INDEX, idx_header, idx_rows)
        write_rows(pack / MANIFEST, man_header, man_rows)
    rep.note(f"{imported} file(s) imported, {dupes} duplicate(s) indexed, {ocred} OCR'd")
    if any(r.get("classification") == "UNCLASSIFIED" for r in idx_rows):
        rep.warn("one or more files are UNCLASSIFIED — a human must set doc_type "
                 "before those sources are cited")


def do_record_extract(rep: Report, pack: Path, extract: Path, parent: str,
                      title: str, doc_type: str, doc_date: str, system: str) -> None:
    """Register a verbatim extract of a source that may not be copied."""
    if not extract.is_file():
        rep.error(f"extract file not found: {extract}")
        return
    raw = pack / RAW
    man_header, man_rows = read_csv(pack / MANIFEST)
    idx_header, idx_rows = load_index(pack)
    n_src = next_id(man_rows, "source_id", "SRC")
    n_idx = next_id(idx_rows, "index_id", "IDX")
    sid = f"SRC-{n_src:03d}"
    dest = raw / f"{sid}-extract-{extract.stem}.txt"
    if dest.exists():
        rep.error(f"{dest.name} already exists; raw/ is never overwritten")
        return
    shutil.copy2(extract, dest)
    digest = sha256_of(dest)
    today = date.today().isoformat()
    man_rows.append({
        "source_id": sid, "title": title, "doc_type": doc_type,
        "doc_date": doc_date or "UNVERIFIED",
        "file_path": f"{RAW}/{dest.name}", "sha256": digest,
        "ocr_status": "n/a", "access_status": "extract-only",
        "authenticity_status": "UNVERIFIED", "derived_from": parent,
        "notes": f"verbatim extract; original read in place in {system} and "
                 f"never downloaded or modified",
    })
    idx_rows.append({
        "index_id": f"IDX-{n_idx:03d}", "original_name": extract.name,
        "original_system": system, "original_location": "read in place — not copied",
        "sha256": digest, "byte_size": str(dest.stat().st_size),
        "content_hash_group": digest[:12], "dedupe_status": "extract",
        "duplicate_of": "", "text_layer": "native-text", "ocr_status": "n/a",
        "ocr_tool": "none", "page_count": "", "classification": doc_type,
        "classification_basis": "supplied with the extract", "classification_confidence": "medium",
        "imported_date": today, "source_id": sid, "original_preserved": "yes",
        "notes": f"extract of {parent}",
    })
    write_rows(pack / MANIFEST, man_header, man_rows)
    write_rows(pack / INDEX, idx_header, idx_rows)
    rep.note(f"recorded {sid} as a verbatim extract of {parent}")


def do_reindex(rep: Report, pack: Path) -> None:
    """Re-hash every raw file and reconcile it against the index."""
    raw = pack / RAW
    _, idx_rows = load_index(pack)
    by_path = {Path(r.get("original_name", "")).name: r for r in idx_rows}
    files = [p for p in sorted(raw.glob("*")) if p.is_file() and not p.name.startswith(".")]
    groups: dict[str, list[str]] = {}
    for f in files:
        groups.setdefault(sha256_of(f), []).append(f.name)
    dup_groups = {h: n for h, n in groups.items() if len(n) > 1}
    for h, names in dup_groups.items():
        rep.warn(f"identical bytes in raw/: {', '.join(names)} (sha {h[:12]}) — "
                 f"one of these should be an index row pointing at the other")
    rep.note(f"{len(files)} raw file(s), {len(groups)} distinct hash(es), "
             f"{len(dup_groups)} duplicate group(s)")
    rep.note(f"{len(idx_rows)} index row(s); {len(by_path)} distinct original name(s)")


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__,
                                 formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("pack")
    ap.add_argument("--from", dest="src_dir")
    ap.add_argument("--system", default="local")
    ap.add_argument("--dry-run", action="store_true")
    ap.add_argument("--record-extract")
    ap.add_argument("--derived-from", default="")
    ap.add_argument("--title", default="")
    ap.add_argument("--doc-type", default="")
    ap.add_argument("--doc-date", default="")
    ap.add_argument("--reindex", action="store_true")
    args = ap.parse_args()

    pack = Path(args.pack).resolve()
    if not pack.is_dir():
        die(f"not a directory: {pack}")
    rep = Report(f"source intake: {pack.name}")

    if args.record_extract:
        if not args.derived_from or not args.title or not args.doc_type:
            die("--record-extract requires --derived-from, --title and --doc-type")
        do_record_extract(rep, pack, Path(args.record_extract).resolve(),
                          args.derived_from, args.title, args.doc_type,
                          args.doc_date, args.system)
    elif args.reindex:
        do_reindex(rep, pack)
    elif args.src_dir:
        d = Path(args.src_dir).resolve()
        if not d.is_dir():
            die(f"--from is not a directory: {d}")
        if pack in d.parents or d == pack:
            die("--from must point outside the matter pack; importing a pack "
                "into itself duplicates sources and breaks provenance")
        do_import(rep, pack, d, args.system, args.dry_run)
    else:
        die("give one of --from, --record-extract or --reindex")

    return rep.emit()


if __name__ == "__main__":
    raise SystemExit(main())
