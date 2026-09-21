#!/usr/bin/env python3
"""Turn a purchased docket sheet into register rows, without inventing anything.

The gap this closes: a human buys the docket on PACER, reads it, and the answer
lives in their head. The next session starts from the same blank. This parses
the sheet into `04-docket/docket-register.csv`, registers the sheet itself as a
source with its own hash, and opens a candidate deadline row for every entry
whose text sets a date — as `UNVERIFIED`, for a human to confirm.

Three things it refuses to do, because each would be worse than the gap:

  * It never computes a deadline. It extracts a date only when the entry text
    states one in words, and marks it `express`. Anything that would require
    counting from a rule lands as `NOT-COMPUTABLE` with the trigger named.
  * It never decides what an entry means. `entry_type` comes from the words the
    clerk used, and the words are kept verbatim beside it.
  * It never overwrites an existing row. A docket sheet purchased twice is two
    prints of one record; re-running merges by document number and reports what
    changed rather than silently replacing a human's edits.

Usage:
    ingest_docket.py <pack> --sheet <file.txt|file.pdf> --case 2:26-cv-00110
                     [--court gand] [--dry-run] [--no-source]

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
from datetime import date, datetime
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from common import Report, die, read_csv  # noqa: E402

RAW = "03-sources/raw"
MANIFEST = "03-sources/source-manifest.csv"
DOCKET = "04-docket/docket-register.csv"
DEADLINES = "08-deadlines/deadline-register.csv"
NOT_COMPUTABLE = "NOT-COMPUTABLE"

# A docket line usually opens with a date and a document number. Both PACER's
# HTML-to-text and its PDF print use this shape, with the entry text running on
# until the next such line.
ENTRY_RE = re.compile(
    r"^\s*(?P<date>\d{2}/\d{2}/\d{4})\s+(?P<num>\d{1,4})\s+(?P<text>\S.*)$")
CONT_RE = re.compile(r"^\s{4,}(?P<text>\S.*)$")
FILED_BY_RE = re.compile(r"\(\s*(?:Entered|Attachments)[^)]*\)\s*$", re.I)

# What the clerk called it. Order matters; first match wins. The verbatim text
# is always kept, so a wrong bucket is visible rather than lossy.
ENTRY_TYPES: list[tuple[str, re.Pattern]] = [
    ("order",        re.compile(r"^\s*ORDER\b|\bORDER (?:granting|denying|on|adopting|of)\b", re.I)),
    ("report-recommendation", re.compile(r"REPORT AND RECOMMENDATION|FINAL REPORT", re.I)),
    ("opinion",      re.compile(r"\bOPINION\b", re.I)),
    ("removal",      re.compile(r"\bNOTICE OF REMOVAL\b", re.I)),
    ("remand",       re.compile(r"\bMOTION TO REMAND\b", re.I)),
    ("motion",       re.compile(r"\bMOTION\b|\bMOTIONS\b", re.I)),
    ("brief",        re.compile(r"\bBRIEF\b|\bMEMORANDUM (?:OF LAW|IN)\b", re.I)),
    ("response",     re.compile(r"\bRESPONSE\b|\bOPPOSITION\b", re.I)),
    ("reply",        re.compile(r"\bREPLY\b", re.I)),
    ("complaint",    re.compile(r"\bCOMPLAINT\b|\bPETITION\b", re.I)),
    ("answer",       re.compile(r"\bANSWER\b", re.I)),
    ("notice",       re.compile(r"\bNOTICE\b", re.I)),
    ("appearance",   re.compile(r"\bAPPEARANCE\b|\bAttorney .* added\b", re.I)),
    ("certificate",  re.compile(r"\bCERTIFICATE\b", re.I)),
    ("transcript",   re.compile(r"\bTRANSCRIPT\b", re.I)),
    ("minute-entry", re.compile(r"\bMINUTE ENTRY\b|\bClerk'?s? Entry\b", re.I)),
    ("scheduling",   re.compile(r"\bSCHEDULING\b|\bRules 16/26\b|\bDISCOVERY ORDER\b", re.I)),
]

# Language that states a date rather than implying one that must be counted.
# Only these produce a deadline row with an express date.
EXPRESS_DATE = re.compile(
    r"(?:no later than|on or before|due (?:on|by)?|by|deadline of|set for|"
    r"returnable on|shall (?:file|respond|answer|submit)[^.]{0,60}?by)\s+"
    r"(?P<d>(?:\d{1,2}/\d{1,2}/\d{2,4})|"
    r"(?:January|February|March|April|May|June|July|August|September|October|"
    r"November|December)\s+\d{1,2},?\s+\d{4})", re.I)

# Language that sets a period rather than a date. These are recorded as
# NOT-COMPUTABLE with the trigger named — never counted.
PERIOD_SET = re.compile(
    r"within\s+(?P<n>\w+|\d{1,3})\s+(?P<unit>calendar days|business days|days|weeks|months)"
    r"(?P<of>[^.]{0,80})", re.I)


def sha256_of(path: Path) -> str:
    h = hashlib.sha256()
    with path.open("rb") as fh:
        for chunk in iter(lambda: fh.read(1 << 20), b""):
            h.update(chunk)
    return h.hexdigest()


def read_sheet(path: Path) -> str:
    if path.suffix.lower() != ".pdf":
        return path.read_text(encoding="utf-8", errors="replace")
    if shutil.which("pdftotext"):
        out = subprocess.run(["pdftotext", "-layout", "-q", str(path), "-"],
                             capture_output=True, timeout=180)
        text = out.stdout.decode("utf-8", "replace")
        if text.strip():
            return text
    try:
        import types
        for n in ("cryptography", "cryptography.hazmat", "cryptography.exceptions"):
            if n not in sys.modules:
                m = types.ModuleType(n)
                m.__path__ = []  # type: ignore[attr-defined]
                sys.modules[n] = m
        sys.modules["cryptography.exceptions"].UnsupportedAlgorithm = type(  # type: ignore[attr-defined]
            "UnsupportedAlgorithm", (Exception,), {})
        from pypdf import PdfReader
        return "\n".join((pg.extract_text() or "") for pg in PdfReader(str(path)).pages)
    except BaseException:
        return ""


def iso(d: str) -> str:
    for fmt in ("%m/%d/%Y", "%m/%d/%y", "%B %d, %Y", "%B %d %Y"):
        try:
            return datetime.strptime(d.strip().rstrip(","), fmt).date().isoformat()
        except ValueError:
            continue
    return ""


def classify(text: str) -> str:
    """Name the filing from how the clerk opened the entry.

    The opening words are the clerk's own label; everything after is
    description, and description routinely names other document types — an
    attachment list, the motion an order resolves. Reading the whole entry
    equally made a notice of removal into a complaint.
    """
    head = text[:90]
    for name, pat in ENTRY_TYPES:
        if pat.search(head):
            return name
    for name, pat in ENTRY_TYPES:
        if pat.search(text):
            return name
    return "UNCLASSIFIED"


def parse(text: str) -> list[dict]:
    entries: list[dict] = []
    cur: dict | None = None
    for line in text.splitlines():
        m = ENTRY_RE.match(line)
        if m:
            if cur:
                entries.append(cur)
            cur = {"date": m.group("date"), "num": m.group("num"),
                   "text": m.group("text").strip()}
            continue
        if cur is not None:
            c = CONT_RE.match(line)
            if c:
                cur["text"] += " " + c.group("text").strip()
            elif not line.strip():
                continue
    if cur:
        entries.append(cur)
    for e in entries:
        e["text"] = re.sub(r"\s{2,}", " ", e["text"]).strip()
    return entries


def write(rep: Report, path: Path, header: list[str], rows: list[dict]) -> bool:
    """Write rows, refusing to silently drop a populated column.

    `{k: r.get(k) for k in header}` quietly discards any key the header does
    not carry. That turned a mis-remembered column name into six blank docket
    rows that the tool reported as a success. Anything populated and unwritable
    is a failure, not a rounding error.
    """
    unknown: dict[str, str] = {}
    for r in rows:
        for k, v in r.items():
            if k not in header and str(v).strip():
                unknown.setdefault(k, str(v)[:60])
    if unknown:
        for k, sample in sorted(unknown.items()):
            rep.error(f"{path.name}: column '{k}' is not in this register's header "
                      f"but carries data ({sample!r}). Refusing to write and drop "
                      f"it. Read the header; do not guess column names.")
        return False
    with path.open("w", newline="", encoding="utf-8") as fh:
        w = csv.DictWriter(fh, fieldnames=header)
        w.writeheader()
        for r in rows:
            w.writerow({k: r.get(k, "") for k in header})
    return True


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__,
                                 formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("pack")
    ap.add_argument("--sheet", required=True)
    ap.add_argument("--case", required=True)
    ap.add_argument("--court", default="")
    ap.add_argument("--dry-run", action="store_true")
    ap.add_argument("--no-source", action="store_true",
                    help="parse only; do not register the sheet as a source")
    args = ap.parse_args()

    pack = Path(args.pack).resolve()
    sheet = Path(args.sheet).resolve()
    if not pack.is_dir():
        die(f"not a directory: {pack}")
    if not sheet.is_file():
        die(f"docket sheet not found: {sheet}")

    rep = Report(f"docket ingest: {pack.name}")
    text = read_sheet(sheet)
    if not text.strip():
        rep.error(f"no text could be extracted from {sheet.name}. A scanned "
                  f"docket print needs OCR first — run it through "
                  f"import_sources.py, which will produce a text derivative.")
        return rep.emit()

    entries = parse(text)
    if not entries:
        rep.error("no docket entries matched. This parser expects a line opening "
                  "with MM/DD/YYYY then a document number. If the sheet is in "
                  "another layout, say so rather than half-parsing it.")
        return rep.emit()
    rep.note(f"{len(entries)} docket entr(y/ies) parsed from {sheet.name}")

    # ---- register the sheet itself, hashed, before anything derived from it --
    src_id = ""
    if not args.no_source and not args.dry_run:
        man_header, man_rows = read_csv(pack / MANIFEST)
        top = 0
        for r in man_rows:
            m = re.match(r"^SRC-(\d+)$", (r.get("source_id") or "").strip())
            if m:
                top = max(top, int(m.group(1)))
        src_id = f"SRC-{top + 1:03d}"
        dest = pack / RAW / f"{src_id}-docket-sheet-{args.case.replace(':', '-')}.txt"
        if dest.exists():
            rep.error(f"{dest.name} already exists; raw/ is never overwritten")
            return rep.emit()
        dest.write_text(text, encoding="utf-8")
        row = {c: "" for c in man_header}
        row.update(source_id=src_id,
                   title=f"Docket sheet, {args.case}"
                         + (f" ({args.court})" if args.court else ""),
                   doc_type="docket-sheet", doc_date=date.today().isoformat(),
                   file_path=f"{RAW}/{dest.name}", sha256=sha256_of(dest),
                   ocr_status="n/a", access_status="full",
                   authenticity_status="verified-public-record",
                   notes=f"Purchased docket print ingested by ingest_docket.py on "
                         f"{date.today().isoformat()}. Every docket row below traces "
                         f"here. A docket print is current only to the moment it was "
                         f"bought.")
        man_rows.append(row)
        if not write(rep, pack / MANIFEST, man_header, man_rows):
            return rep.emit()
        rep.note(f"docket sheet registered as {src_id}, hashed and read-only")

    # ---- docket register: merge by document number, never overwrite ----------
    dk_header, dk_rows = read_csv(pack / DOCKET)
    if not dk_header:
        rep.error(f"{DOCKET} is missing or has no header")
        return rep.emit()
    by_num = {(r.get("docket_no") or "").strip(): r for r in dk_rows}
    added = changed = same = 0
    dl_candidates: list[dict] = []

    for e in entries:
        num, filed, body = e["num"], iso(e["date"]), e["text"]
        etype = classify(body)
        existing = by_num.get(num)
        new = {c: "" for c in dk_header}
        new.update(docket_no=num, date_filed=filed, date_entered=filed,
                   event_type=etype, title=body[:120],
                   operative_language=body,
                   filed_by="UNVERIFIED", issuing_judge="UNVERIFIED",
                   disposition="UNVERIFIED", attachments="UNVERIFIED",
                   source_id=src_id or "UNVERIFIED",
                   pinpoint=f"docket entry {num}",
                   verification_status="UNVERIFIED",
                   notes="ingested from the docket sheet by ingest_docket.py. "
                         "filed_by, issuing_judge and disposition require a human "
                         "against the entry itself; the entry text is verbatim.")
        if existing is None:
            dk_rows.append(new)
            by_num[num] = new
            added += 1
        else:
            prior = (existing.get("operative_language") or "").strip()
            if prior and prior != body:
                rep.warn(f"docket entry {num} already present with different text. "
                         f"Kept the existing row; the sheet says: {body[:110]}")
                changed += 1
            else:
                for k, v in (("date_filed", filed), ("event_type", etype),
                             ("title", body[:120]), ("operative_language", body)):
                    if not (existing.get(k) or "").strip():
                        existing[k] = v
                same += 1

        # ---- deadlines stated, never deadlines counted ----------------------
        for m in EXPRESS_DATE.finditer(body):
            d = iso(m.group("d"))
            if d:
                dl_candidates.append({
                    "date": d, "type": "express", "docket_no": num,
                    "trigger": f"Doc. {num} ({filed})",
                    "phrase": body[max(0, m.start() - 70):m.end() + 30].strip()})
        for m in PERIOD_SET.finditer(body):
            dl_candidates.append({
                "date": NOT_COMPUTABLE, "type": "conditional", "docket_no": num,
                "trigger": f"Doc. {num} ({filed})",
                "phrase": f"within {m.group('n')} {m.group('unit')}{m.group('of')}".strip()})

    if not args.dry_run and not write(rep, pack / DOCKET, dk_header, dk_rows):
        return rep.emit()
    rep.note(f"docket register: {added} row(s) added, {same} already present, "
             f"{changed} conflict(s) reported and left alone")

    # ---- candidate deadlines, all UNVERIFIED --------------------------------
    if dl_candidates:
        dl_header, dl_rows = read_csv(pack / DEADLINES)
        top = 0
        for r in dl_rows:
            m = re.match(r"^DL-(\d+)$", (r.get("deadline_id") or "").strip())
            if m:
                top = max(top, int(m.group(1)))
        seen = {((r.get("date") or "").strip(),
                 (r.get("description") or "")[:60]) for r in dl_rows}
        opened = 0
        for c in dl_candidates:
            key = (c["date"], c["phrase"][:60])
            if key in seen:
                continue
            top += 1
            opened += 1
            row = {col: "" for col in dl_header}
            express = c["type"] == "express"
            row.update(
                deadline_id=f"DL-{top:03d}", description=c["phrase"][:240],
                deadline_type=c["type"], date=c["date"],
                # needs-verification, always. A date lifted out of docket text
                # by a regex is a candidate, never a confirmed deadline.
                date_status="needs-verification",
                triggering_event=c["trigger"],
                triggering_event_date=c["trigger"].split("(")[-1].rstrip(")"),
                governing_rule="UNVERIFIED — stated in the docket entry; the rule "
                               "or order behind it has not been read",
                computation_method=("transcribed verbatim from the entry text; "
                                    "nothing was computed") if express else NOT_COMPUTABLE,
                calendar_basis="UNVERIFIED", owner="UNVERIFIED",
                ambiguity_flag="yes", verification_required="yes",
                ambiguity_description="opened by ingest_docket.py from docket text. "
                                      "No date here is confirmed until a human reads "
                                      "the underlying entry.",
                consequence_of_missing="UNVERIFIED", source_id=src_id or "UNVERIFIED",
                pinpoint=f"docket entry {c['docket_no']}",
                confidence="low",
                notes=f"candidate from Doc. {c['docket_no']}")
            dl_rows.append(row)
            seen.add(key)
        if not args.dry_run and not write(rep, pack / DEADLINES, dl_header, dl_rows):
            return rep.emit()
        express = sum(1 for c in dl_candidates if c["type"] == "express")
        rep.note(f"{opened} candidate deadline(s) opened "
                 f"({express} with a date stated in the entry, "
                 f"{len(dl_candidates) - express} recorded {NOT_COMPUTABLE})")
        rep.note("every one is ambiguity_flag=yes and verification_required=yes. "
                 "None is a deadline until a human says so.")

    if args.dry_run:
        rep.note("[dry-run] nothing was written")
    else:
        rep.note("next: validate_matter_pack.py --hash-check, then "
                 "validate_registers.py --which deadlines")
    return rep.emit()


if __name__ == "__main__":
    raise SystemExit(main())
