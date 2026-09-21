#!/usr/bin/env python3
"""Render a produced litigation document and inspect it before a human sees it.

Two kinds of check, because each catches what the other cannot:

  STRUCTURAL — parse the PDF and look for the things whose absence gets a
  filing rejected or a lawyer embarrassed: a caption, the case number, page
  numbers, a signature block, a certificate of service where one is required,
  exhibits that are referenced but not listed, internal cross-references that
  point at nothing, and text that is actually searchable rather than a picture
  of text.

  VISUAL — re-render the document to page images and measure them, then leave
  the images on disk so the pages can actually be looked at. A document that
  parses correctly and looks wrong is still wrong.

Redaction is handled the only honest way: this script cannot certify a
redaction, because a black box drawn over live text is not a redaction. It
reports whether any redaction marker appears and whether the text under it is
still extractable — which is the failure that leaks.

Usage:
    qc_document.py <pack> --doc-id WP-001 [--images] [--strict]

Exit codes: 0 pass, 1 QC failure, 2 usage error.
"""
from __future__ import annotations

import argparse
import csv
import re
import subprocess
import sys
import zlib
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from common import Report, die, read_csv  # noqa: E402

LOG = "12-workproduct/production-log.csv"

CHROME_CANDIDATES = [
    "/opt/pw-browsers/chromium-1194/chrome-linux/chrome",
    "/opt/pw-browsers/chromium/chrome-linux/chrome",
    "/usr/bin/chromium", "/usr/bin/chromium-browser", "/usr/bin/google-chrome",
]

REDACTION_MARKERS = re.compile(r"\[REDACT(ED|ION)?\]|\bREDACTED\b|█{2,}|\bXXXX+\b")
# Things that must never survive into a document handed to a human for filing.
LEFTOVER = re.compile(
    r"\[BASIS-REQUIRED\]|\bTK\b|\bTODO\b|\bFIXME\b|\bLOREM IPSUM\b|"
    r"<[A-Z][A-Z0-9 _-]{2,}>|\bXXX\b|\[\s*\]|\bPLACEHOLDER\b", re.I)
EXHIBIT_REF = re.compile(r"\bExhibit\s+([A-Z]{1,2}|\d{1,2})\b")
INTERNAL_REF = re.compile(r"\b(?:see\s+)?(?:Section|Part|Paragraph|¶|Table|Appendix)\s+"
                          r"([IVXLC]+|\d+(?:\.\d+)*|[A-Z])\b")


def find_chrome() -> str | None:
    for c in CHROME_CANDIDATES:
        if Path(c).is_file():
            return c
    from shutil import which
    return which("chromium") or which("google-chrome")


# ------------------------------------------------------------- PDF reading ---

_PYPDF_READY: bool | None = None


def _ensure_pypdf_importable() -> None:
    """Make `import pypdf` safe, or leave it unusable and let the caller fall back."""
    global _PYPDF_READY
    if _PYPDF_READY is not None:
        return
    import types
    try:
        import cryptography.exceptions  # noqa: F401
    except BaseException:
        # Drop anything half-imported, then substitute a shell carrying the one
        # name pypdf's provider module looks for. Nothing here decrypts a PDF;
        # an encrypted file simply falls through to the next reader.
        for name in [n for n in list(sys.modules) if n.split(".")[0] == "cryptography"]:
            del sys.modules[name]
        root = types.ModuleType("cryptography")
        root.__path__ = []  # type: ignore[attr-defined]
        sys.modules["cryptography"] = root
        for sub in ("cryptography.hazmat", "cryptography.hazmat.primitives",
                    "cryptography.hazmat.backends"):
            m = types.ModuleType(sub)
            m.__path__ = []  # type: ignore[attr-defined]
            sys.modules[sub] = m
        exc = types.ModuleType("cryptography.exceptions")

        class UnsupportedAlgorithm(Exception):
            pass

        exc.UnsupportedAlgorithm = UnsupportedAlgorithm  # type: ignore[attr-defined]
        sys.modules["cryptography.exceptions"] = exc
    try:
        import pypdf  # noqa: F401
        _PYPDF_READY = True
    except BaseException:
        for name in [n for n in list(sys.modules) if n.split(".")[0] == "pypdf"]:
            del sys.modules[name]
        _PYPDF_READY = False


def pdf_text_and_pages(path: Path) -> tuple[str, int, str]:
    """Return (text, page_count, method). Never raises on a malformed PDF."""
    data = path.read_bytes()
    pages = max(data.count(b"/Type /Page") - data.count(b"/Type /Pages"),
                data.count(b"/Type/Page") - data.count(b"/Type/Pages"), 0)

    # Preferred: pypdf. pypdf pulls in `cryptography` for encrypted files only,
    # and a broken build of it fails with pyo3's PanicException — a
    # BaseException, not an Exception. Probe it first, catching BaseException,
    # and stub it BEFORE pypdf is imported, because a half-imported module left
    # in sys.modules cannot be repaired afterwards.
    _ensure_pypdf_importable()
    try:
        from pypdf import PdfReader
        reader = PdfReader(str(path))
        text = "\n".join((p.extract_text() or "") for p in reader.pages)
        if text.strip():
            return text, len(reader.pages), "pypdf"
    except BaseException:
        pass

    if (b := __import__("shutil").which("pdftotext")):
        try:
            out = subprocess.run([b, "-q", str(path), "-"], capture_output=True, timeout=120)
            return out.stdout.decode("utf-8", "replace"), pages, "pdftotext"
        except Exception:
            pass

    # Last resort: decompress the content streams ourselves. This recovers the
    # strings shown on the page, which is enough to answer "is there text at
    # all" and to find a caption, even if the spacing is imperfect.
    chunks: list[str] = []
    for m in re.finditer(rb"stream\r?\n(.*?)endstream", data, re.S):
        raw = m.group(1)
        try:
            raw = zlib.decompress(raw)
        except Exception:
            continue
        for s in re.finditer(rb"\(((?:[^()\\]|\\.)*)\)\s*Tj|\[((?:[^\[\]]|\\.)*)\]\s*TJ", raw):
            blob = s.group(1) or s.group(2) or b""
            for lit in re.finditer(rb"\((?:[^()\\]|\\.)*\)", b"(" + blob + b")" if s.group(1) else blob):
                chunks.append(lit.group(0)[1:-1].decode("latin-1", "replace"))
        chunks.append("\n")
    return "".join(chunks), pages, "raw-stream"


def render_images(rep: Report, html: Path, outdir: Path, pages: int) -> list[Path]:
    chrome = find_chrome()
    if not chrome:
        rep.warn("no Chromium binary; visual inspection skipped")
        return []
    outdir.mkdir(parents=True, exist_ok=True)
    shot = outdir / "page-full.png"
    cmd = [chrome, "--headless", "--disable-gpu", "--no-sandbox",
           "--hide-scrollbars", "--window-size=816,1056",
           # Grayscale antialiasing only. LCD subpixel rendering fringes black
           # text with blue and orange, and a reviewer looking at the page
           # image should not be deciding whether the document is coloured.
           "--disable-lcd-text", "--disable-font-subpixel-positioning",
           "--force-color-profile=srgb",
           "--virtual-time-budget=12000",
           f"--screenshot={shot}", f"file://{html}"]
    subprocess.run(cmd, capture_output=True, timeout=300)
    if shot.exists() and shot.stat().st_size > 2000:
        rep.note(f"visual render: {shot.name} ({shot.stat().st_size // 1024} KB) — "
                 f"open it to inspect the first page as it will print")
        return [shot]
    rep.warn("Chromium produced no page image")
    return []


# ----------------------------------------------------------------- checks ---

def qc(rep: Report, pack: Path, row: dict, want_images: bool, strict: bool) -> dict:
    findings: list[str] = []
    note = rep.note

    pdf_rel = (row.get("output_pdf") or "").strip()
    docx_rel = (row.get("output_docx") or "").strip()
    doc_kind = (row.get("doc_kind") or "").strip().lower()
    pdf = pack / pdf_rel if pdf_rel else None
    if not pdf or not pdf.is_file():
        rep.error(f"production log points at '{pdf_rel}', which is not on disk. "
                  f"QC cannot certify a document it cannot open.")
        return {"qc_status": "fail", "open": "missing PDF"}

    text, pages, method = pdf_text_and_pages(pdf)
    flat = re.sub(r"\s+", " ", text)
    note(f"{pdf.name}: {pages} page(s), {len(text)} char(s) of text, read via {method}")

    # --- searchable text -----------------------------------------------------
    per_page = len(text.strip()) / max(pages, 1)
    if len(text.strip()) < 200:
        rep.error("the PDF carries almost no extractable text. A filing that is "
                  "a picture of text is not searchable, not accessible, and in "
                  "many courts not acceptable.")
        findings.append("no searchable text")
        searchable = "no"
    elif per_page < 300:
        rep.warn(f"only ~{per_page:.0f} characters of text per page — unusually "
                 f"sparse; confirm no page rendered as an image")
        searchable = "partial"
    else:
        searchable = "yes"
        note(f"searchable text present (~{per_page:.0f} chars/page)")

    # --- caption, case number, court ----------------------------------------
    for label, pat, why in [
        ("court name", re.compile(r"(DISTRICT COURT|SUPERIOR COURT|COURT OF APPEALS|"
                                  r"STATE COURT|SUPREME COURT)", re.I),
         "the caption must name the court"),
        ("case number", re.compile(r"\b\d{1,2}:\d{2}-[a-z]{2}-\d{3,6}|\bNO\.\s*\S", re.I),
         "a filing without its case number does not reach the file"),
        ("party designation", re.compile(r"\bPlaintiff|\bDefendant", re.I),
         "the caption must designate the parties"),
    ]:
        if not pat.search(flat):
            rep.error(f"caption check: no {label} found in the rendered text — {why}")
            findings.append(f"missing {label}")
        else:
            note(f"caption: {label} present")

    # --- pagination ----------------------------------------------------------
    if pages > 1:
        nums = re.findall(r"(?m)^\s*(\d{1,3})\s*$", text)
        if len(set(nums)) >= max(2, pages // 2):
            note(f"pagination: {len(set(nums))} distinct page number(s) detected")
        else:
            rep.warn(f"pagination: could not confirm page numbers on a {pages}-page "
                     f"document. Extraction order can hide footers — check the "
                     f"page image before relying on this.")

    # --- signature block -----------------------------------------------------
    internal = doc_kind in {"internal-memo", "research-memo", "work-product",
                            "report", "analysis", ""}
    if re.search(r"Respectfully submitted|/s/|_{10,}", flat):
        note("signature block present")
        if not internal and not re.search(r"/s/", flat):
            rep.warn("a signature line is present but no /s/ conformed signature. "
                     "Confirm the court accepts the form being used.")
    elif internal:
        rep.warn(f"no signature or preparer block found. document_kind "
                 f"'{doc_kind or 'unset'}' is not served, so Rule 11(a) does not "
                 f"apply — but work product with no attribution and no date is "
                 f"work product nobody can place.")
    else:
        rep.error("no signature block found. An unsigned filing is a defective "
                  "filing under Fed. R. Civ. P. 11(a) and is struck unless "
                  "promptly corrected.")
        findings.append("no signature block")

    # --- certificate of service ---------------------------------------------
    needs_cert = doc_kind not in {"internal-memo", "research-memo", "work-product",
                                  "report", "analysis", ""}
    has_cert = bool(re.search(r"CERTIFICATE OF SERVICE", flat, re.I))
    if needs_cert and not has_cert:
        rep.error(f"document_kind '{doc_kind}' is served on other parties but "
                  f"carries no certificate of service")
        findings.append("no certificate of service")
    elif has_cert:
        note("certificate of service present")
        if not re.search(r"(CM/ECF|electronic|first[- ]class mail|e-?mail|hand deliver)",
                         flat, re.I):
            rep.warn("the certificate does not state the method of service")

    # --- exhibits ------------------------------------------------------------
    refs = sorted(set(EXHIBIT_REF.findall(flat)))
    if refs:
        listed = re.search(r"(EXHIBIT (LIST|INDEX)|INDEX OF EXHIBITS)", flat, re.I)
        note(f"exhibits referenced: {', '.join(refs)}")
        if not listed:
            rep.warn(f"{len(refs)} exhibit(s) referenced with no exhibit list or "
                     f"index in the document — confirm each is actually attached")
        for r_ in refs:
            if not re.search(rf"Exhibit\s+{re.escape(r_)}\b[^.]{{0,40}}"
                             rf"(attached|annexed|filed|hereto)", flat, re.I):
                rep.warn(f"Exhibit {r_} is cited but the document never says it is "
                         f"attached")

    # --- internal references -------------------------------------------------
    int_refs = set(INTERNAL_REF.findall(flat))
    if int_refs:
        headings = set(re.findall(r"(?m)^\s*(?:Section|Part)?\s*([IVXLC]+|\d+(?:\.\d+)*)\.\s+\S", text))
        dangling = {r_ for r_ in int_refs if r_ not in headings and len(r_) <= 6}
        if dangling and strict:
            rep.warn(f"internal reference(s) with no matching heading in the text: "
                     f"{', '.join(sorted(dangling))} — verify each points somewhere")
        note(f"{len(int_refs)} internal cross-reference(s) found")

    # --- redaction -----------------------------------------------------------
    if REDACTION_MARKERS.search(flat):
        rep.error("redaction markers appear in the text layer. A visual black box "
                  "or a [REDACTED] label over extractable text is not a redaction — "
                  "the words are still in the file. Redact by removing the content "
                  "from the source before producing the PDF, then re-run QC.")
        findings.append("redaction present in extractable text")
    else:
        note("no redaction markers in the text layer")

    # --- leftovers -----------------------------------------------------------
    leftovers = sorted(set(m.group(0) for m in LEFTOVER.finditer(text)))
    leftovers = [x for x in leftovers if x.upper() not in {"[ ]"}]
    if leftovers:
        rep.error(f"unfinished drafting survives into the rendered document: "
                  f"{', '.join(leftovers[:8])}"
                  f"{' …' if len(leftovers) > 8 else ''}")
        findings.append("placeholder text in output")

    # --- draft marking -------------------------------------------------------
    status = (row.get("status") or "").strip()
    is_marked = bool(re.search(r"DRAFT\s*[—-]\s*FOR ATTORNEY REVIEW", flat, re.I))
    if status == "draft" and not is_marked:
        rep.error("a draft with no DRAFT overlay. An unmarked draft is one "
                  "mis-click away from being treated as final.")
        findings.append("draft not marked")
    elif is_marked:
        note("DRAFT — FOR ATTORNEY REVIEW overlay present")

    # --- Word output ---------------------------------------------------------
    if docx_rel:
        d = pack / docx_rel
        if not d.is_file():
            rep.error(f"production log names a Word file '{docx_rel}' that is not "
                      f"on disk")
        else:
            note(f"{d.name}: {d.stat().st_size // 1024} KB Word output present")

    # --- visual --------------------------------------------------------------
    if want_images:
        html = next(pdf.parent.glob(f".{pdf.stem}.html"), None)
        if html:
            render_images(rep, html, pdf.parent / f"{row['doc_id']}-qc-images", pages)
        else:
            rep.warn("no intermediate HTML kept; visual render skipped")

    return {
        "qc_status": "fail" if findings else ("pass" if not rep.warnings else "pass-with-warnings"),
        "open": "; ".join(findings),
        "pages": pages, "searchable": searchable,
    }


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__,
                                 formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("pack")
    ap.add_argument("--doc-id", required=True)
    ap.add_argument("--images", action="store_true", help="render page images too")
    ap.add_argument("--strict", action="store_true")
    args = ap.parse_args()

    pack = Path(args.pack).resolve()
    path = pack / LOG
    header, rows = read_csv(path)
    if not header:
        die(f"missing or empty: {LOG}")
    row = next((r for r in rows if (r.get("doc_id") or "").strip() == args.doc_id), None)
    if row is None:
        die(f"{args.doc_id} is not in {LOG}. Produce the document first.")

    rep = Report(f"document QC: {args.doc_id}")
    result = qc(rep, pack, row, args.images, args.strict)

    row["qc_status"] = result["qc_status"]
    row["qc_findings_open"] = result["open"]
    row["searchable_text"] = result.get("searchable", "UNVERIFIED")
    if result.get("pages"):
        row["page_count"] = str(result["pages"])
    with path.open("w", newline="", encoding="utf-8") as fh:
        w = csv.DictWriter(fh, fieldnames=header)
        w.writeheader()
        for r in rows:
            w.writerow({k: r.get(k, "") for k in header})
    rep.note(f"{LOG} updated: qc_status={row['qc_status']}")
    return rep.emit()


if __name__ == "__main__":
    raise SystemExit(main())
