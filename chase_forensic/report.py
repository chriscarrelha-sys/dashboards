"""
Report writers for the Chase forensic retrieval pipeline.

Produces the master spreadsheet, the P0 completion report that defines when
retrieval is finished, the contradiction/flag report, the iCloud
not-downloaded report, and the SHA-256 manifest.
"""

import csv
import datetime as dt
import os

import taxonomy as T


def _stamp():
    return dt.datetime.now().strftime("%Y-%m-%d %H:%M:%S")


# --------------------------------------------------------------------------
# Master spreadsheet
# --------------------------------------------------------------------------

def write_master_csv(path, rows):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "w", newline="", encoding="utf-8-sig") as fh:
        w = csv.DictWriter(fh, fieldnames=T.MASTER_COLUMNS,
                           extrasaction="ignore", quoting=csv.QUOTE_ALL)
        w.writeheader()
        for r in _sorted(rows):
            w.writerow(r)
    print("  wrote %s (%d rows)" % (path, len(rows)))


def write_master_xlsx(path, rows):
    """Optional .xlsx with frozen header, filters and priority shading."""
    try:
        from openpyxl import Workbook
        from openpyxl.styles import Font, PatternFill, Alignment
        from openpyxl.utils import get_column_letter
    except ImportError:
        print("  (openpyxl not installed - skipping .xlsx; the .csv opens in "
              "Excel and Numbers)")
        return

    wb = Workbook()
    ws = wb.active
    ws.title = "Master Index"
    ws.append(T.MASTER_COLUMNS)

    header_fill = PatternFill("solid", fgColor="1F3864")
    for cell in ws[1]:
        cell.font = Font(bold=True, color="FFFFFF")
        cell.fill = header_fill
        cell.alignment = Alignment(vertical="center")

    shades = {"P0": "FFC7CE", "P1": "FFEB9C", "P2": "DDEBF7", "P3": "F2F2F2"}
    pri_idx = T.MASTER_COLUMNS.index("Priority") + 1

    for r in _sorted(rows):
        ws.append([r.get(c, "") for c in T.MASTER_COLUMNS])
        fill = shades.get(r.get("Priority", ""))
        if fill:
            ws.cell(row=ws.max_row, column=pri_idx).fill = PatternFill("solid", fgColor=fill)

    widths = {"Document ID": 14, "Date": 12, "Filename": 42, "Category": 34,
              "Source Path": 60, "Account": 14, "Amount": 16, "Key Fact": 40,
              "Contradiction": 46, "Legal Relevance": 40, "CRA": 18,
              "Dispute Date": 12, "Produced by Chase?": 20, "Original/OCR": 24,
              "Duplicate Status": 28, "SHA-256": 26, "Priority": 9, "Notes": 60}
    for i, col in enumerate(T.MASTER_COLUMNS, 1):
        ws.column_dimensions[get_column_letter(i)].width = widths.get(col, 18)

    ws.freeze_panes = "A2"
    ws.auto_filter.ref = ws.dimensions
    wb.save(path)
    print("  wrote %s" % path)


_PRI_ORDER = {"P0": 0, "P1": 1, "P2": 2, "P3": 3}


def _sorted(rows):
    return sorted(rows, key=lambda r: (_PRI_ORDER.get(r.get("Priority", "P3"), 9),
                                       r.get("Category", ""),
                                       r.get("Date", ""),
                                       r.get("Document ID", "")))


# --------------------------------------------------------------------------
# P0 completion report
# --------------------------------------------------------------------------

def write_coverage_report(path, rows, found_probes, reference_corpus,
                          placeholders, roots):
    """
    Retrieval is complete only when every P0 category is FOUND,
    CONFIRMED NOT PRESENT, or REFERENCED BUT SOURCE COPY NOT LOCATED.
    """
    corpus = "\n".join(reference_corpus)
    lines = []
    a = lines.append

    a("# Chase Forensic Retrieval - P0 Completion Report")
    a("")
    a("Generated: %s" % _stamp())
    a("")
    a("Sources scanned:")
    for r in roots:
        a("- `%s`" % os.path.abspath(os.path.expanduser(r)))
    a("")
    a("Retrieval is complete only when every P0 item below reads **FOUND**, ")
    a("**CONFIRMED NOT PRESENT**, or **REFERENCED BUT SOURCE COPY NOT LOCATED**.")
    a("")

    complete = True
    a("## P0 status")
    a("")
    a("| P0 item | Status | Documents |")
    a("|---|---|---|")

    for probe in T.P0_PROBES:
        docs = found_probes.get(probe["key"], [])
        if docs:
            status = "**FOUND** (%d)" % len(docs)
            shown = ", ".join(docs[:6]) + (" ..." if len(docs) > 6 else "")
        else:
            referenced = any(rx.search(corpus) for rx in probe["reference_patterns"])
            if referenced:
                status = "**REFERENCED BUT SOURCE COPY NOT LOCATED**"
                shown = "referenced in the corpus; no source file matched"
                complete = False
            else:
                status = "**CONFIRMED NOT PRESENT**"
                shown = "no file and no reference found in any scanned source"
            docs = []
        a("| %s | %s | %s |" % (probe["label"], status, shown))

    a("")
    if placeholders:
        complete = False
        a("> **%d iCloud files were not downloaded locally** and could not be "
          "read. Until they are materialized, no P0 status above is final. "
          "See `ICLOUD_NOT_DOWNLOADED.md` and re-run with `--download-icloud`."
          % len(placeholders))
        a("")

    a("## Verdict")
    a("")
    if complete:
        a("**RETRIEVAL COMPLETE** by the standard in the checklist: every P0 item "
          "is resolved and every scanned file was readable.")
    else:
        a("**RETRIEVAL INCOMPLETE.** Resolve the items above before treating this "
          "index as the evidentiary record.")
    a("")

    # Per-category inventory across all 23 categories.
    a("## Inventory by category")
    a("")
    a("| # | Category | Docs | P0 | P1 | P2 | P3 |")
    a("|---|---|---|---|---|---|---|")
    counts = {}
    for r in rows:
        cat = r.get("Category", "")
        cid = cat.split(" ", 1)[0] if cat else "00"
        bucket = counts.setdefault(cid, {"n": 0, "P0": 0, "P1": 0, "P2": 0, "P3": 0})
        bucket["n"] += 1
        pri = r.get("Priority", "P3")
        if pri in bucket:
            bucket[pri] += 1

    for cat in T.CATEGORIES + [T.UNCLASSIFIED]:
        c = counts.get(cat["id"], {"n": 0, "P0": 0, "P1": 0, "P2": 0, "P3": 0})
        marker = "" if c["n"] else "  <- EMPTY"
        a("| %s | %s | %d | %d | %d | %d | %d |%s" % (
            cat["id"], cat["title"], c["n"], c["P0"], c["P1"], c["P2"], c["P3"],
            marker))
    a("")

    empty = [c["title"] for c in T.CATEGORIES if not counts.get(c["id"], {}).get("n")]
    if empty:
        a("### Categories with zero documents")
        a("")
        a("Each of these is either genuinely absent from your files or is filed "
          "under language the classifier did not recognize. Confirm each one "
          "before relying on its absence:")
        a("")
        for t in empty:
            a("- %s" % t)
        a("")

    _write(path, lines)


# --------------------------------------------------------------------------
# Contradiction / flag report
# --------------------------------------------------------------------------

def write_flag_report(path, rows):
    lines = []
    a = lines.append
    a("# Contradictions and Key-Issue Flags")
    a("")
    a("Generated: %s" % _stamp())
    a("")
    a("Flag heuristics are review prompts, not conclusions. Read the underlying "
      "document before relying on any entry here.")
    a("")

    contra = [r for r in rows if r.get("Contradiction")]
    a("## Documents flagged as contradictions (%d)" % len(contra))
    a("")
    if contra:
        for r in _sorted(contra):
            a("### %s - %s" % (r["Document ID"], r["Filename"]))
            a("")
            a("- **Priority:** %s" % r.get("Priority", ""))
            a("- **Category:** %s" % r.get("Category", ""))
            a("- **Date:** %s" % r.get("Date", ""))
            a("- **Contradiction:** %s" % r["Contradiction"])
            a("- **Source:** `%s`" % r.get("Source Path", ""))
            a("")
    else:
        a("None detected by the automated heuristics.")
        a("")

    a("## Documents touching each key issue")
    a("")
    for key, label in T.FLAGS.items():
        hits = [r for r in rows if key in r.get("Notes", "")]
        a("### %s - %s (%d)" % (key, label, len(hits)))
        a("")
        for r in _sorted(hits)[:40]:
            a("- `%s` %s [%s] - %s" % (r["Document ID"], r["Filename"],
                                       r.get("Priority", ""), r.get("Key Fact", "")))
        if len(hits) > 40:
            a("- ... and %d more (see the master index)" % (len(hits) - 40))
        a("")

    _write(path, lines)


# --------------------------------------------------------------------------
# iCloud placeholders
# --------------------------------------------------------------------------

def write_placeholder_report(path, placeholders):
    lines = []
    a = lines.append
    a("# iCloud Files Not Downloaded Locally")
    a("")
    a("Generated: %s" % _stamp())
    a("")
    if not placeholders:
        a("Every file in the scanned sources had local content. Nothing was skipped "
          "for this reason.")
        _write(path, lines)
        return

    a("These %d files exist in iCloud but their contents were not on this Mac, so "
      "they could not be hashed, read, OCR'd, or classified." % len(placeholders))
    a("")
    a("**Until these are downloaded, the retrieval is not complete.**")
    a("")
    a("To download everything and re-run:")
    a("")
    a("```bash")
    a("# Force-download the whole Chase folder (adjust the path):")
    a("find ~/Library/Mobile\\ Documents -name '.*.icloud' -exec brctl download {} \;")
    a("# or re-run the pipeline with:")
    a("python3 retrieve.py --dest ~/Chase_Forensic_Master --download-icloud")
    a("```")
    a("")
    a("| File | Location |")
    a("|---|---|")
    for p in placeholders[:2000]:
        a("| %s | `%s` |" % (p["name"], os.path.dirname(p["path"])))
    if len(placeholders) > 2000:
        a("")
        a("... and %d more." % (len(placeholders) - 2000))
    _write(path, lines)


# --------------------------------------------------------------------------
# Hash manifest and per-category READMEs
# --------------------------------------------------------------------------

def write_hash_manifest(path, rows):
    lines = ["# SHA-256 manifest - generated %s" % _stamp(),
             "# Format: <sha256>  <document id>  <original source path>", ""]
    for r in _sorted(rows):
        lines.append("%s  %s  %s" % (r.get("SHA-256", ""), r.get("Document ID", ""),
                                     r.get("Source Path", "")))
    _write(path, lines)


def write_category_readmes(organized_root):
    """Drop a README in each category folder so the tree is self-explaining."""
    for cat in T.CATEGORIES + [T.UNCLASSIFIED]:
        folder = os.path.join(organized_root, cat["name"])
        if not os.path.isdir(folder):
            continue
        lines = ["# %s %s" % (cat["id"], cat["title"]), "",
                 "Default priority: **%s**" % cat["priority"], ""]
        if cat["id"] == "19":
            lines += [
                "## QUARANTINE",
                "",
                "This tradeline is kept **completely separate** until provenance is "
                "established. Nothing in this folder may be merged into the main "
                "Chase account analysis, cited as this account's history, or "
                "included in a demand or filing about the 3816 / 552475 account "
                "until you have determined:",
                "",
                "1. whether the account is actually Chris Carrelha's; and",
                "2. whether it has any relationship to the 3816 / 552475 account.",
                "",
            ]
        lines += [
            "Files here are **copies**. Originals remain untouched at the source "
            "paths recorded in `REPORTS/MASTER_INDEX.csv`.",
            "",
            "Each filename is prefixed with its Document ID so it ties back to the "
            "master index.",
            "",
        ]
        _write(os.path.join(folder, "_README.md"), lines)


def _write(path, lines):
    os.makedirs(os.path.dirname(path) or ".", exist_ok=True)
    with open(path, "w", encoding="utf-8") as fh:
        fh.write("\n".join(lines) + "\n")
    print("  wrote %s" % path)


# --------------------------------------------------------------------------
# Dry-run summary
# --------------------------------------------------------------------------

def print_dry_run_summary(rows, found_probes, placeholders):
    counts = {}
    for r in rows:
        cat = r.get("Category", "00 ?")
        counts[cat] = counts.get(cat, 0) + 1
    print("\nWould file %d documents:" % len(rows))
    for cat in sorted(counts):
        print("  %-46s %d" % (cat[:46], counts[cat]))
    print("\nP0 probe results:")
    for probe in T.P0_PROBES:
        n = len(found_probes.get(probe["key"], []))
        print("  [%s] %-62s %d" % ("FOUND" if n else "  -  ", probe["label"][:62], n))
    if placeholders:
        print("\n%d iCloud files were not downloaded locally." % len(placeholders))
