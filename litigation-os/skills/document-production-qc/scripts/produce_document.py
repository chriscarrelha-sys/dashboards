#!/usr/bin/env python3
"""Render a litigation document to PDF and Word from one Markdown source.

One source, two outputs, so the Word file and the PDF can never say different
things. The Markdown carries YAML front matter describing the caption, the
signature block and the certificate of service; the body is ordinary Markdown.

Court formatting is applied from the front matter, not guessed: paper, margins,
line spacing, font, and whether page numbers start on page 1 or 2 are all
inputs, because they differ by court and a wrong default is a rejected filing.

    produce_document.py <pack> --source 12-workproduct/drafts/response.md \
                        --doc-id WP-001 [--pdf-only|--docx-only]

The output lands in 12-workproduct/drafts/ and is logged in production-log.csv
with status `draft`. Nothing here files, serves or sends anything; moving a
document to final/ requires an approved APR- entry — see approval_gate.py.

Exit codes: 0 pass, 1 failure, 2 usage error.
"""
from __future__ import annotations

import argparse
import csv
import html
import re
import subprocess
import sys
from datetime import date
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from common import Report, die, read_csv  # noqa: E402

try:
    import yaml
except ImportError:  # pragma: no cover
    die("PyYAML is required: pip install pyyaml")

LOG = "12-workproduct/production-log.csv"
DRAFTS = "12-workproduct/drafts"

CHROME_CANDIDATES = [
    "/opt/pw-browsers/chromium-1194/chrome-linux/chrome",
    "/opt/pw-browsers/chromium/chrome-linux/chrome",
    "/usr/bin/chromium", "/usr/bin/chromium-browser", "/usr/bin/google-chrome",
]

FM_REQUIRED = ["title", "court", "case_number", "caption_plaintiff",
               "caption_defendant", "document_kind"]

# Type requirements for courts whose rule has been read and recorded in the
# matter's citation-verification register. A profile is asserted by the source,
# not guessed from the caption: a document that does not name a profile is not
# checked, because a wrong assumption here is worse than none.
#
# Each entry: profile key -> (citation, {font family (lowercased) -> minimum pt},
#                             minimum margin inches, required line spacing or None)
COURT_TYPE_RULES: dict[str, tuple] = {
    "ndga": (
        "N.D. Ga. LR 5.1",
        {"times new roman": 14.0, "courier new": 12.0,
         "century schoolbook": 13.0, "book antiqua": 13.0, "book antigua": 13.0},
        1.0, 2.0,
    ),
}

# Document kinds that are filed with a court, and so must satisfy its type rule.
FILED_KINDS = {"motion", "brief", "response", "reply", "complaint", "petition",
               "notice", "objection", "answer"}


def _pt(value, default: float) -> float:
    try:
        return float(str(value).lower().replace("pt", "").strip())
    except Exception:
        return default


def _inches(value, default: float) -> float:
    try:
        return float(str(value).lower().replace("in", "").strip())
    except Exception:
        return default


def check_court_type_rule(rep: Report, fm: dict) -> bool:
    """Refuse to produce a filing that violates a court type rule we have read.

    Returns False when the document must not be produced as declared.
    """
    fmt = fm.get("format", {}) or {}
    profile = str(fmt.get("court_profile", "")).strip().lower()
    kind = str(fm.get("document_kind", "")).strip().lower()
    if not profile:
        if kind in FILED_KINDS:
            rep.warn(f"document_kind '{kind}' is filed with a court but the source "
                     f"declares no format.court_profile, so no type rule was "
                     f"checked. Known profiles: {', '.join(sorted(COURT_TYPE_RULES))}.")
        return True
    if profile not in COURT_TYPE_RULES:
        rep.error(f"format.court_profile '{profile}' is not a profile this system "
                  f"has read a rule for. Known: {', '.join(sorted(COURT_TYPE_RULES))}. "
                  f"Read the rule, record it in the citation-verification register, "
                  f"and add it here — do not guess.")
        return False

    cite, fonts, min_margin, spacing = COURT_TYPE_RULES[profile]
    ok = True
    family = str(fmt.get("docx_font", "Times New Roman")).strip().lower()
    size = _pt(fmt.get("font_size", "12pt"), 12.0)
    if family not in fonts:
        rep.error(f"{cite} does not permit '{family}'. Permitted: "
                  f"{', '.join(sorted(set(fonts) - {'book antigua'}))}.")
        ok = False
    elif size < fonts[family]:
        rep.error(f"{cite} requires {family.title()} at no less than "
                  f"{fonts[family]:g} point; this document declares {size:g}pt. "
                  f"A filing in the wrong type is a filing the clerk can reject.")
        ok = False
    else:
        rep.note(f"{cite}: {family.title()} {size:g}pt is compliant")

    for side in ("margin_top", "margin_bottom", "margin_left", "margin_right"):
        m = _inches(fmt.get(side, "1in"), 1.0)
        if m < min_margin:
            rep.error(f"{cite} requires margins of at least {min_margin:g} inch; "
                      f"{side} is {m:g}in")
            ok = False
    if spacing is not None:
        ls = _pt(fmt.get("line_spacing", spacing), spacing)
        if ls < spacing:
            rep.error(f"{cite} requires double spacing; line_spacing is {ls:g}")
            ok = False
    return ok


def find_chrome() -> str | None:
    for c in CHROME_CANDIDATES:
        if Path(c).is_file():
            return c
    from shutil import which
    return which("chromium") or which("google-chrome")


def split_front_matter(text: str) -> tuple[dict, str]:
    if not text.startswith("---"):
        return {}, text
    end = text.find("\n---", 3)
    if end == -1:
        return {}, text
    fm = yaml.safe_load(text[3:end]) or {}
    return fm, text[end + 4:].lstrip("\n")


# ---------------------------------------------------------------- markdown ---

def md_inline(s: str) -> str:
    s = html.escape(s)
    s = re.sub(r"\*\*(.+?)\*\*", r"<strong>\1</strong>", s)
    s = re.sub(r"(?<!\*)\*([^*\n]+?)\*(?!\*)", r"<em>\1</em>", s)
    s = re.sub(r"__(.+?)__", r"<u>\1</u>", s)
    s = re.sub(r"`(.+?)`", r"<code>\1</code>", s)
    return s


def md_to_blocks(md: str) -> list[tuple[str, str]]:
    """Return a flat list of (kind, text). Kinds: h1 h2 h3 p li quote hr table."""
    blocks: list[tuple[str, str]] = []
    buf: list[str] = []

    def flush():
        if buf:
            blocks.append(("p", " ".join(x.strip() for x in buf).strip()))
            buf.clear()

    lines = md.splitlines()
    i = 0
    while i < len(lines):
        ln = lines[i]
        s = ln.strip()
        if not s:
            flush()
        elif s.startswith("|") and i + 1 < len(lines) and re.match(r"^\|[\s:\-|]+\|$", lines[i + 1].strip()):
            flush()
            tbl = [s]
            i += 1
            while i < len(lines) and lines[i].strip().startswith("|"):
                tbl.append(lines[i].strip())
                i += 1
            blocks.append(("table", "\n".join(tbl)))
            continue
        elif re.match(r"^#{1,6}\s", s):
            flush()
            level = min(len(s) - len(s.lstrip("#")), 3)
            blocks.append((f"h{level}", s.lstrip("#").strip()))
        elif re.match(r"^(\*\*\*|---|___)$", s):
            flush()
            blocks.append(("hr", ""))
        elif re.match(r"^[-*+]\s+", s):
            flush()
            blocks.append(("li", re.sub(r"^[-*+]\s+", "", s)))
        elif re.match(r"^\d+[.)]\s+", s):
            flush()
            blocks.append(("li", re.sub(r"^\d+[.)]\s+", "", s)))
        elif s.startswith(">"):
            flush()
            blocks.append(("quote", s.lstrip("> ").strip()))
        else:
            buf.append(ln)
        i += 1
    flush()
    return blocks


def parse_table(raw: str) -> tuple[list[str], list[list[str]]]:
    rows = [r for r in raw.splitlines() if r.strip().startswith("|")]
    cells = [[c.strip() for c in r.strip().strip("|").split("|")] for r in rows]
    header = cells[0] if cells else []
    body = [c for c in cells[2:]] if len(cells) > 2 else []
    return header, body


# --------------------------------------------------------------------- PDF ---

CSS = """
@page {{ size: {paper}; margin: {mt} {mr} {mb} {ml};
  @bottom-center {{ content: counter(page); }} }}
* {{ box-sizing: border-box; }}
html {{ -webkit-print-color-adjust: exact; }}
body {{ font-family: "Times New Roman", Times, Georgia, serif; font-size: {fs};
  line-height: {ls}; color: #000; margin: 0; }}
.caption {{ margin-bottom: 1.5em; }}
.court {{ text-align: center; font-weight: bold; text-transform: uppercase;
  letter-spacing: .04em; line-height: 1.4; margin-bottom: 1.2em; }}
table.cap {{ width: 100%; border-collapse: collapse; line-height: 1.35; }}
table.cap td {{ vertical-align: top; padding: 0; }}
td.parties {{ width: 58%; border-right: 1.2pt solid #000; padding-right: 10pt; }}
td.docket {{ width: 42%; padding-left: 14pt; }}
.vs {{ padding-left: 2em; }}
.vs em {{ font-style: italic; }}
.rule {{ border-top: 1.2pt solid #000; margin: .6em 0 1.4em; }}
h1.doctitle {{ text-align: center; font-size: {fs}; font-weight: bold;
  text-transform: uppercase; margin: 1.6em 0 1.4em; line-height: 1.4; }}
h2 {{ font-size: {fs}; font-weight: bold; margin: 1.4em 0 .5em;
  text-transform: uppercase; page-break-after: avoid; }}
h3 {{ font-size: {fs}; font-weight: bold; font-style: italic; margin: 1.1em 0 .4em;
  text-transform: none; page-break-after: avoid; }}
p {{ margin: 0 0 {pgap}; text-align: left; text-indent: {indent}; }}
ul {{ margin: 0 0 {pgap} 0; padding-left: 2.2em; }}
li {{ margin-bottom: .35em; }}
blockquote {{ margin: .8em 2.5em; line-height: 1.25; font-size: {qfs}; }}
table.data {{ width: 100%; border-collapse: collapse; font-size: 9.5pt;
  line-height: 1.25; margin: .6em 0 1em; page-break-inside: auto; }}
table.data th {{ background: #e8e8e8; border: .6pt solid #555; padding: 3pt 4pt;
  text-align: left; font-weight: bold; }}
table.data td {{ border: .6pt solid #777; padding: 3pt 4pt; vertical-align: top; }}
table.data tr {{ page-break-inside: avoid; }}
.sigblock {{ margin-top: 2.2em; page-break-inside: avoid; }}
.sigblock .respect {{ margin-bottom: 2.6em; }}
.sigline {{ width: 3.2in; margin-bottom: .2em; letter-spacing: -0.5pt;
  font-family: "Times New Roman", Times, serif; line-height: 1.1; }}
.certificate {{ page-break-before: {certbreak}; margin-top: 2em; }}
.certificate h2 {{ text-align: center; }}
hr.sep {{ border: 0; border-top: .8pt solid #000; margin: 1.4em 0; }}
.draftmark {{ text-align: center; font-weight: bold; letter-spacing: .12em;
  border: 1.5pt solid #000; padding: 5pt; margin-bottom: 1.2em; font-size: 10pt; }}
"""


def build_html(fm: dict, blocks: list[tuple[str, str]], draft: bool) -> str:
    fmt = fm.get("format", {}) or {}
    css = CSS.format(
        paper=fmt.get("paper", "Letter"),
        mt=fmt.get("margin_top", "1in"), mr=fmt.get("margin_right", "1in"),
        mb=fmt.get("margin_bottom", "1in"), ml=fmt.get("margin_left", "1in"),
        fs=fmt.get("font_size", "12pt"), ls=fmt.get("line_spacing", "2.0"),
        qfs=fmt.get("quote_font_size", "12pt"),
        pgap=fmt.get("paragraph_gap", "0.35em"),
        indent=fmt.get("first_line_indent", "0.5in"),
        certbreak=fmt.get("certificate_page_break", "auto"),
    )
    out: list[str] = []
    a = out.append
    a("<!DOCTYPE html><html><head><meta charset='utf-8'>")
    a(f"<title>{html.escape(str(fm.get('title', 'Document')))}</title>")
    a(f"<style>{css}</style></head><body>")

    if draft:
        a("<div class='draftmark'>DRAFT &mdash; FOR ATTORNEY REVIEW &mdash; NOT FILED</div>")

    a("<div class='caption'>")
    a(f"<div class='court'>{md_inline(str(fm.get('court', ''))).replace(chr(10), '<br>')}</div>")
    a("<table class='cap'><tr><td class='parties'>")
    a(f"{md_inline(str(fm.get('caption_plaintiff', '')))},<br><br>")
    a(f"<span class='vs'>Plaintiff{'s' if fm.get('plaintiffs_plural') else ''},</span><br><br>")
    a("<span class='vs'><em>v.</em></span><br><br>")
    a(f"{md_inline(str(fm.get('caption_defendant', '')))},<br><br>")
    a(f"<span class='vs'>Defendant{'s' if fm.get('defendants_plural') else ''}.</span>")
    a("</td><td class='docket'>")
    a(f"<br>CIVIL ACTION FILE<br>NO. {md_inline(str(fm.get('case_number', '')))}")
    if fm.get("judge"):
        a(f"<br><br>Judge {md_inline(str(fm['judge']))}")
    if fm.get("magistrate_judge"):
        a(f"<br>Magistrate Judge {md_inline(str(fm['magistrate_judge']))}")
    a("</td></tr></table><div class='rule'></div></div>")
    a(f"<h1 class='doctitle'>{md_inline(str(fm.get('title', '')))}</h1>")

    in_list = False
    for kind, text in blocks:
        if kind == "li" and not in_list:
            a("<ul>")
            in_list = True
        elif kind != "li" and in_list:
            a("</ul>")
            in_list = False
        if kind == "li":
            a(f"<li>{md_inline(text)}</li>")
        elif kind in ("h1", "h2"):
            a(f"<h2>{md_inline(text)}</h2>")
        elif kind == "h3":
            a(f"<h3>{md_inline(text)}</h3>")
        elif kind == "quote":
            a(f"<blockquote>{md_inline(text)}</blockquote>")
        elif kind == "hr":
            a("<hr class='sep'>")
        elif kind == "table":
            hdr, body = parse_table(text)
            a("<table class='data'><thead><tr>")
            for h in hdr:
                a(f"<th>{md_inline(h)}</th>")
            a("</tr></thead><tbody>")
            for row in body:
                a("<tr>" + "".join(f"<td>{md_inline(c)}</td>" for c in row) + "</tr>")
            a("</tbody></table>")
        else:
            a(f"<p>{md_inline(text)}</p>")
    if in_list:
        a("</ul>")

    sig = fm.get("signature_block") or {}
    if sig:
        a("<div class='sigblock'>")
        a(f"<p class='respect' style='text-indent:0'>{md_inline(str(sig.get('closing', 'Respectfully submitted,')))}</p>")
        a(f"<p style='text-indent:0'>This {md_inline(str(sig.get('date', '___ day of _______, 20__')))}.</p>")
        a(f"<p class='sigline' style='text-indent:0;margin:0'>{'_' * 40}</p>")
        for line in (sig.get("lines") or []):
            a(f"<p style='text-indent:0;margin:0;line-height:1.3'>{md_inline(str(line))}</p>")
        a("</div>")

    cert = fm.get("certificate_of_service")
    if cert:
        a("<div class='certificate'><h2>Certificate of Service</h2>")
        a(f"<p>{md_inline(str(cert.get('text', '')))}</p>")
        for who in (cert.get("served_on") or []):
            a(f"<p style='text-indent:0;margin:.2em 0 .2em 2em;line-height:1.3'>{md_inline(str(who))}</p>")
        a(f"<p class='sigline' style='text-indent:0;margin:2em 0 0'>{'_' * 40}</p>")
        for line in (cert.get("lines") or (fm.get("signature_block", {}) or {}).get("lines") or []):
            a(f"<p style='text-indent:0;margin:0;line-height:1.3'>{md_inline(str(line))}</p>")
        a("</div>")

    a("</body></html>")
    return "\n".join(out)


def render_pdf(rep: Report, html_path: Path, pdf_path: Path) -> bool:
    chrome = find_chrome()
    if not chrome:
        rep.error("no Chromium binary found; cannot render PDF")
        return False
    cmd = [chrome, "--headless", "--disable-gpu", "--no-sandbox",
           "--no-pdf-header-footer", "--run-all-compositor-stages-before-draw",
           "--virtual-time-budget=12000",
           f"--print-to-pdf={pdf_path}", f"file://{html_path}"]
    r = subprocess.run(cmd, capture_output=True, timeout=300)
    if not pdf_path.exists() or pdf_path.stat().st_size < 1000:
        rep.error(f"Chromium produced no usable PDF: "
                  f"{r.stderr.decode('utf-8', 'replace')[-400:]}")
        return False
    return True


# -------------------------------------------------------------------- DOCX ---

def render_docx(rep: Report, fm: dict, blocks: list[tuple[str, str]],
                out: Path, draft: bool) -> bool:
    try:
        from docx import Document
        from docx.shared import Pt, Inches
        from docx.enum.text import WD_ALIGN_PARAGRAPH
        from docx.enum.table import WD_TABLE_ALIGNMENT
    except ImportError:
        rep.warn("python-docx is not installed; Word output skipped "
                 "(pip install python-docx). The PDF is unaffected.")
        return False

    fmt = fm.get("format", {}) or {}
    doc = Document()
    sec = doc.sections[0]
    inches = lambda v, d: Inches(float(str(v).replace("in", "") or d))  # noqa: E731
    sec.top_margin = inches(fmt.get("margin_top", "1in"), 1)
    sec.bottom_margin = inches(fmt.get("margin_bottom", "1in"), 1)
    sec.left_margin = inches(fmt.get("margin_left", "1in"), 1)
    sec.right_margin = inches(fmt.get("margin_right", "1in"), 1)

    normal = doc.styles["Normal"]
    normal.font.name = fmt.get("docx_font", "Times New Roman")
    normal.font.size = Pt(float(str(fmt.get("font_size", "12pt")).replace("pt", "")))
    normal.paragraph_format.line_spacing = float(fmt.get("line_spacing", 2.0))
    normal.paragraph_format.space_after = Pt(6)

    def para(text="", *, bold=False, italic=False, center=False, indent=None,
             spacing=None, caps=False):
        p = doc.add_paragraph()
        if center:
            p.alignment = WD_ALIGN_PARAGRAPH.CENTER
        if indent is not None:
            p.paragraph_format.first_line_indent = Inches(indent)
        if spacing is not None:
            p.paragraph_format.line_spacing = spacing
        run = p.add_run(text.upper() if caps else text)
        run.bold, run.italic = bold, italic
        return p

    if draft:
        para("DRAFT — FOR ATTORNEY REVIEW — NOT FILED", bold=True, center=True, spacing=1.0)

    for line in str(fm.get("court", "")).splitlines():
        para(line, bold=True, center=True, spacing=1.0, caps=True)
    para("", spacing=1.0)

    cap = doc.add_table(rows=1, cols=2)
    cap.alignment = WD_TABLE_ALIGNMENT.CENTER
    left, right = cap.rows[0].cells
    pl = "s" if fm.get("plaintiffs_plural") else ""
    dl = "s" if fm.get("defendants_plural") else ""
    left.text = (f"{fm.get('caption_plaintiff', '')},\n\n     Plaintiff{pl},\n\n"
                 f"     v.\n\n{fm.get('caption_defendant', '')},\n\n     Defendant{dl}.")
    rtxt = f"\nCIVIL ACTION FILE\nNO. {fm.get('case_number', '')}"
    if fm.get("judge"):
        rtxt += f"\n\nJudge {fm['judge']}"
    if fm.get("magistrate_judge"):
        rtxt += f"\nMagistrate Judge {fm['magistrate_judge']}"
    right.text = rtxt
    for cell in (left, right):
        for p in cell.paragraphs:
            p.paragraph_format.line_spacing = 1.0
            p.paragraph_format.space_after = Pt(0)

    para("", spacing=1.0)
    para(str(fm.get("title", "")), bold=True, center=True, caps=True, spacing=1.0)
    para("", spacing=1.0)

    indent = float(str(fmt.get("first_line_indent", "0.5in")).replace("in", "") or 0.5)
    for kind, text in blocks:
        if kind in ("h1", "h2"):
            para(text, bold=True, caps=True, spacing=1.0)
        elif kind == "h3":
            para(text, bold=True, italic=True, spacing=1.0)
        elif kind == "li":
            p = doc.add_paragraph(text, style="List Bullet")
            p.paragraph_format.line_spacing = 1.15
        elif kind == "quote":
            para(text, indent=0, spacing=1.0).paragraph_format.left_indent = Inches(1.0)
        elif kind == "hr":
            para("_" * 60, center=True, spacing=1.0)
        elif kind == "table":
            hdr, body = parse_table(text)
            if not hdr:
                continue
            t = doc.add_table(rows=1, cols=len(hdr))
            t.style = "Table Grid"
            for j, h in enumerate(hdr):
                c = t.rows[0].cells[j]
                c.text = ""
                r = c.paragraphs[0].add_run(re.sub(r"\*\*", "", h))
                r.bold = True
                r.font.size = Pt(9)
            for row in body:
                cells = t.add_row().cells
                for j, val in enumerate(row[:len(hdr)]):
                    cells[j].text = ""
                    r = cells[j].paragraphs[0].add_run(re.sub(r"\*\*|`", "", val))
                    r.font.size = Pt(9)
            for r_ in t.rows:
                for c_ in r_.cells:
                    for p_ in c_.paragraphs:
                        p_.paragraph_format.line_spacing = 1.0
                        p_.paragraph_format.space_after = Pt(0)
            para("", spacing=1.0)
        else:
            para(text, indent=indent)

    sig = fm.get("signature_block") or {}
    if sig:
        para("", spacing=1.0)
        para(str(sig.get("closing", "Respectfully submitted,")), spacing=1.0)
        para("", spacing=1.0)
        para(f"This {sig.get('date', '___ day of _______, 20__')}.", spacing=1.0)
        para("", spacing=1.0)
        para("_" * 40, spacing=1.0)
        for line in (sig.get("lines") or []):
            para(str(line), spacing=1.0)

    cert = fm.get("certificate_of_service")
    if cert:
        doc.add_page_break()
        para("CERTIFICATE OF SERVICE", bold=True, center=True, spacing=1.0)
        para("", spacing=1.0)
        para(str(cert.get("text", "")), indent=indent)
        for who in (cert.get("served_on") or []):
            para(str(who), spacing=1.0).paragraph_format.left_indent = Inches(1.0)
        para("", spacing=1.0)
        para("_" * 40, spacing=1.0)
        for line in (cert.get("lines") or sig.get("lines") or []):
            para(str(line), spacing=1.0)

    doc.save(out)
    return True


# --------------------------------------------------------------------- log ---

def log_production(pack: Path, doc_id: str, fm: dict, src: Path,
                   pdf: Path | None, docx: Path | None, pages: int) -> None:
    path = pack / LOG
    header, rows = read_csv(path)
    header = header or ["doc_id", "title", "doc_kind", "source_markdown", "output_pdf",
                        "output_docx", "produced_date", "page_count", "searchable_text",
                        "qc_status", "qc_findings_open", "approval_id", "status", "notes"]
    rel = lambda p: str(p.relative_to(pack)) if p else ""  # noqa: E731
    rows = [r for r in rows if (r.get("doc_id") or "").strip() != doc_id]
    rows.append({
        "doc_id": doc_id, "title": str(fm.get("title", "")),
        "doc_kind": str(fm.get("document_kind", "")),
        "source_markdown": rel(src), "output_pdf": rel(pdf), "output_docx": rel(docx),
        "produced_date": date.today().isoformat(), "page_count": str(pages or ""),
        "searchable_text": "UNVERIFIED", "qc_status": "not-run",
        "qc_findings_open": "", "approval_id": "", "status": "draft",
        "notes": "produced by produce_document.py; run qc_document.py before "
                 "any human review is requested",
    })
    rows.sort(key=lambda r: r.get("doc_id", ""))
    with path.open("w", newline="", encoding="utf-8") as fh:
        w = csv.DictWriter(fh, fieldnames=header)
        w.writeheader()
        for r in rows:
            w.writerow({k: r.get(k, "") for k in header})


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__,
                                 formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("pack")
    ap.add_argument("--source", required=True)
    ap.add_argument("--doc-id", required=True)
    ap.add_argument("--pdf-only", action="store_true")
    ap.add_argument("--docx-only", action="store_true")
    ap.add_argument("--final", action="store_true",
                    help="omit the DRAFT overlay. Requires an approved APR- entry; "
                         "the gate is checked, not assumed.")
    ap.add_argument("--approval", default="", metavar="APR-###")
    args = ap.parse_args()

    pack = Path(args.pack).resolve()
    src = (pack / args.source) if not Path(args.source).is_absolute() else Path(args.source)
    if not src.is_file():
        die(f"source not found: {src}")
    rep = Report(f"produce: {args.doc_id}")

    if args.final:
        if not args.approval:
            die("--final requires --approval APR-### . A document without the "
                "DRAFT overlay looks filed; that needs a human's approval on record.")
        gate = Path(__file__).resolve().parent / "approval_gate.py"
        chk = subprocess.run([sys.executable, str(gate), str(pack), "--check", args.approval],
                             capture_output=True)
        if chk.returncode != 0:
            print(chk.stdout.decode("utf-8", "replace"))
            die(f"{args.approval} is not approved; refusing to produce a final-form "
                f"document")

    fm, body = split_front_matter(src.read_text(encoding="utf-8"))
    missing = [k for k in FM_REQUIRED if not str(fm.get(k, "")).strip()]
    if missing:
        rep.error(f"{src.name}: front matter is missing {', '.join(missing)}. A "
                  f"litigation document without a caption is not a litigation "
                  f"document.")
        return rep.emit()

    if not check_court_type_rule(rep, fm):
        rep.error("refusing to produce a document that violates a court rule this "
                  "system has read. Correct the source and re-run.")
        return rep.emit()

    blocks = md_to_blocks(body)
    outdir = pack / DRAFTS
    outdir.mkdir(parents=True, exist_ok=True)
    stem = f"{args.doc_id}-{re.sub(r'[^a-z0-9]+', '-', str(fm['title']).lower()).strip('-')[:48]}"
    pdf = docx = None
    pages = 0

    if not args.docx_only:
        html_path = outdir / f".{stem}.html"
        html_path.write_text(build_html(fm, blocks, draft=not args.final), encoding="utf-8")
        pdf = outdir / f"{stem}.pdf"
        if render_pdf(rep, html_path, pdf):
            data = pdf.read_bytes()
            pages = data.count(b"/Type /Page") - data.count(b"/Type /Pages")
            rep.note(f"PDF: {pdf.relative_to(pack)} ({pdf.stat().st_size // 1024} KB, "
                     f"~{max(pages, 1)} page(s))")
        else:
            pdf = None
        # The HTML is kept, not deleted: qc_document.py re-renders it to page
        # images so a human (or this system) can look at the document rather
        # than only parse it.

    if not args.pdf_only:
        d = outdir / f"{stem}.docx"
        if render_docx(rep, fm, blocks, d, draft=not args.final):
            docx = d
            rep.note(f"DOCX: {d.relative_to(pack)} ({d.stat().st_size // 1024} KB)")

    if pdf or docx:
        log_production(pack, args.doc_id, fm, src, pdf, docx, max(pages, 0))
        rep.note(f"logged in {LOG} with status 'draft', qc_status 'not-run'")
        rep.note("next: qc_document.py — nothing goes to a human until QC has run")
    return rep.emit()


if __name__ == "__main__":
    raise SystemExit(main())
