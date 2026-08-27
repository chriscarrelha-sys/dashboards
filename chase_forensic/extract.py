"""
Text extraction and OCR for the Chase forensic retrieval pipeline.

Every backend is optional and auto-detected, so the pipeline runs on a stock
macOS install with no pip packages. Originals are never modified: OCR output
is written to a separate companion tree.

iCloud note: files that have been evicted from local storage appear either as
zero-length dataless stubs or as `.name.ext.icloud` placeholders. Both are
detected here so they can be downloaded rather than silently indexed as empty.
"""

import os
import re
import shutil
import subprocess
import zipfile

# Extensions we attempt to read text out of directly.
TEXT_EXT = {".txt", ".md", ".csv", ".tsv", ".json", ".xml", ".html", ".htm",
            ".eml", ".log", ".rtf", ".vcf", ".ics"}
PDF_EXT = {".pdf"}
IMAGE_EXT = {".png", ".jpg", ".jpeg", ".tif", ".tiff", ".gif", ".bmp", ".heic", ".webp"}
OFFICE_ZIP_EXT = {".docx", ".xlsx", ".pptx"}
LEGACY_OFFICE_EXT = {".doc", ".xls", ".ppt"}
APPLE_BUNDLE_EXT = {".pages", ".numbers", ".key"}
AUDIO_EXT = {".mp3", ".m4a", ".wav", ".aiff", ".aac"}

# Cap extracted text so a 900-page statement dump cannot blow up memory.
MAX_TEXT_CHARS = 400_000
# Files larger than this are hashed and indexed but not text-extracted.
MAX_EXTRACT_BYTES = 300 * 1024 * 1024


def _have(cmd):
    return shutil.which(cmd) is not None


class Backends:
    """Detected once per run and reported to the user."""

    def __init__(self):
        self.pdftotext = _have("pdftotext")
        self.tesseract = _have("tesseract")
        self.ocrmypdf = _have("ocrmypdf")
        self.textutil = _have("textutil")      # macOS built-in: .doc/.rtf
        self.sips = _have("sips")              # macOS built-in: HEIC conversion
        self.brctl = _have("brctl")            # macOS built-in: iCloud download
        try:
            import fitz  # noqa: F401
            self.pymupdf = True
        except Exception:
            self.pymupdf = False
        try:
            import pdfminer  # noqa: F401
            self.pdfminer = True
        except Exception:
            self.pdfminer = False

    def summary(self):
        rows = [
            ("pdftotext (poppler)", self.pdftotext, "PDF text layer"),
            ("PyMuPDF", self.pymupdf, "PDF text layer (fallback)"),
            ("pdfminer.six", self.pdfminer, "PDF text layer (fallback)"),
            ("tesseract", self.tesseract, "OCR for images and image-only PDFs"),
            ("ocrmypdf", self.ocrmypdf, "searchable-PDF companion copies"),
            ("textutil", self.textutil, "legacy .doc / .rtf (macOS)"),
            ("sips", self.sips, "HEIC conversion (macOS)"),
            ("brctl", self.brctl, "iCloud dataless-file download (macOS)"),
        ]
        out = []
        for name, present, why in rows:
            out.append("  [%s] %-22s %s" % ("x" if present else " ", name, why))
        return "\n".join(out)

    def can_ocr(self):
        return self.tesseract or self.ocrmypdf


def _run(cmd, timeout=300):
    """Run a command, returning stdout or None. Never raises."""
    try:
        r = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.DEVNULL,
                           timeout=timeout)
        if r.returncode == 0:
            return r.stdout.decode("utf-8", "replace")
    except Exception:
        pass
    return None


# --------------------------------------------------------------------------
# iCloud placeholder handling
# --------------------------------------------------------------------------

def icloud_placeholder_target(path):
    """
    If `path` is an iCloud placeholder, return the real filename it stands for.
    Placeholders are named `.Original Name.pdf.icloud`.
    """
    base = os.path.basename(path)
    if base.startswith(".") and base.endswith(".icloud"):
        return base[1:-len(".icloud")]
    return None


def is_dataless(path):
    """
    A zero-length file whose extension implies content is almost certainly an
    evicted iCloud file rather than a genuinely empty document.
    """
    try:
        if os.path.getsize(path) != 0:
            return False
    except OSError:
        return False
    ext = os.path.splitext(path)[1].lower()
    return ext in (TEXT_EXT | PDF_EXT | IMAGE_EXT | OFFICE_ZIP_EXT
                   | LEGACY_OFFICE_EXT | AUDIO_EXT)


def request_download(path, backends, timeout=120):
    """Ask iCloud to materialize a file. Returns True if it now has content."""
    if not backends.brctl:
        return False
    _run(["brctl", "download", path], timeout=timeout)
    try:
        return os.path.getsize(path) > 0
    except OSError:
        return False


# --------------------------------------------------------------------------
# Format-specific extraction
# --------------------------------------------------------------------------

_TAG = re.compile(r"<[^>]+>")
_WS = re.compile(r"[ \t\r\f\v]+")
_NL = re.compile(r"\n{3,}")


def _clean(text):
    if not text:
        return ""
    text = _TAG.sub(" ", text) if "<" in text[:2000] else text
    text = _WS.sub(" ", text)
    text = _NL.sub("\n\n", text)
    return text[:MAX_TEXT_CHARS]


def _read_text_file(path):
    try:
        with open(path, "rb") as fh:
            raw = fh.read(MAX_TEXT_CHARS * 2)
        return raw.decode("utf-8", "replace")
    except Exception:
        return ""


def _read_office_zip(path):
    """docx/xlsx/pptx are zip archives of XML. Strip tags with the stdlib."""
    chunks = []
    try:
        with zipfile.ZipFile(path) as zf:
            names = [n for n in zf.namelist()
                     if n.endswith(".xml") and
                     ("word/" in n or "xl/" in n or "ppt/" in n)]
            # sharedStrings holds all xlsx cell text; put it first.
            names.sort(key=lambda n: (0 if "sharedStrings" in n else 1, n))
            for n in names[:80]:
                try:
                    chunks.append(zf.read(n).decode("utf-8", "replace"))
                except Exception:
                    continue
                if sum(len(c) for c in chunks) > MAX_TEXT_CHARS:
                    break
    except Exception:
        return ""
    return _TAG.sub(" ", " ".join(chunks))


def _read_apple_bundle(path):
    """.pages/.numbers may be zip bundles; grab any embedded plain text."""
    if os.path.isdir(path):
        return ""
    try:
        with zipfile.ZipFile(path) as zf:
            for n in zf.namelist():
                if n.endswith(".txt") or n.endswith(".xml"):
                    try:
                        return _TAG.sub(" ", zf.read(n).decode("utf-8", "replace"))
                    except Exception:
                        continue
    except Exception:
        pass
    return ""


def _pdf_text(path, backends):
    if backends.pdftotext:
        out = _run(["pdftotext", "-q", "-layout", "-enc", "UTF-8", path, "-"])
        if out and out.strip():
            return out
    if backends.pymupdf:
        try:
            import fitz
            with fitz.open(path) as doc:
                parts = []
                for page in doc:
                    parts.append(page.get_text())
                    if sum(len(p) for p in parts) > MAX_TEXT_CHARS:
                        break
                out = "\n".join(parts)
                if out.strip():
                    return out
        except Exception:
            pass
    if backends.pdfminer:
        try:
            from pdfminer.high_level import extract_text
            out = extract_text(path)
            if out and out.strip():
                return out
        except Exception:
            pass
    return ""


def _ocr_image(path, backends):
    if not backends.tesseract:
        return ""
    src = path
    if path.lower().endswith(".heic") and backends.sips:
        tmp = path + ".ocr_tmp.png"
        _run(["sips", "-s", "format", "png", path, "--out", tmp])
        if os.path.exists(tmp):
            src = tmp
    out = _run(["tesseract", src, "stdout", "--psm", "3"], timeout=180) or ""
    if src != path and os.path.exists(src):
        try:
            os.remove(src)
        except OSError:
            pass
    return out


def make_searchable_companion(path, companion_dir, rel_name, backends):
    """
    Produce a searchable companion copy of an image-only document.

    Returns (companion_path, kind) where kind is 'PDF' or 'TXT', or
    (None, None) if no OCR backend is available. The original is untouched.
    """
    os.makedirs(companion_dir, exist_ok=True)
    stem = os.path.splitext(rel_name)[0]
    ext = os.path.splitext(path)[1].lower()

    if ext in PDF_EXT and backends.ocrmypdf:
        dest = os.path.join(companion_dir, stem + ".OCR.pdf")
        os.makedirs(os.path.dirname(dest), exist_ok=True)
        r = _run(["ocrmypdf", "--skip-text", "--quiet", "--output-type", "pdf",
                  path, dest], timeout=900)
        if r is not None and os.path.exists(dest):
            return dest, "PDF"

    if backends.tesseract:
        text = _ocr_image(path, backends) if ext in IMAGE_EXT else ""
        if not text and ext in PDF_EXT:
            text = _ocr_pdf_via_tesseract(path, backends)
        if text.strip():
            dest = os.path.join(companion_dir, stem + ".OCR.txt")
            os.makedirs(os.path.dirname(dest), exist_ok=True)
            with open(dest, "w", encoding="utf-8") as fh:
                fh.write(text)
            return dest, "TXT"

    return None, None


def _ocr_pdf_via_tesseract(path, backends):
    """Rasterize with PyMuPDF then OCR, when ocrmypdf is unavailable."""
    if not (backends.pymupdf and backends.tesseract):
        return ""
    try:
        import fitz
    except Exception:
        return ""
    parts = []
    try:
        with fitz.open(path) as doc:
            for i, page in enumerate(doc):
                if i >= 40:  # bound the work on very long scans
                    break
                pix = page.get_pixmap(dpi=200)
                tmp = "%s.p%d.ocr_tmp.png" % (path, i)
                pix.save(tmp)
                parts.append(_ocr_image(tmp, backends))
                try:
                    os.remove(tmp)
                except OSError:
                    pass
    except Exception:
        pass
    return "\n".join(parts)


def extract(path, backends, allow_ocr=True):
    """
    Return (text, mode) where mode is one of:
      'TEXT'      native text read
      'PDF-TEXT'  PDF with a usable text layer
      'OCR'       text recovered by OCR
      'NONE'      no text available (binary, audio, or no backend)
    """
    ext = os.path.splitext(path)[1].lower()

    try:
        size = os.path.getsize(path)
    except OSError:
        return "", "NONE"
    if size > MAX_EXTRACT_BYTES:
        return "", "NONE"

    if ext in TEXT_EXT:
        if ext == ".rtf" and backends.textutil:
            out = _run(["textutil", "-convert", "txt", "-stdout", path])
            if out:
                return _clean(out), "TEXT"
        return _clean(_read_text_file(path)), "TEXT"

    if ext in OFFICE_ZIP_EXT:
        return _clean(_read_office_zip(path)), "TEXT"

    if ext in LEGACY_OFFICE_EXT and backends.textutil:
        out = _run(["textutil", "-convert", "txt", "-stdout", path])
        if out:
            return _clean(out), "TEXT"

    if ext in APPLE_BUNDLE_EXT:
        return _clean(_read_apple_bundle(path)), "TEXT"

    if ext in PDF_EXT:
        text = _pdf_text(path, backends)
        # A PDF with almost no extractable text is a scan.
        if text and len(text.strip()) >= 120:
            return _clean(text), "PDF-TEXT"
        if allow_ocr and backends.can_ocr():
            ocr = _ocr_pdf_via_tesseract(path, backends)
            if ocr.strip():
                return _clean(ocr), "OCR"
        return _clean(text), ("PDF-TEXT" if text.strip() else "NONE")

    if ext in IMAGE_EXT:
        if allow_ocr and backends.tesseract:
            ocr = _ocr_image(path, backends)
            if ocr.strip():
                return _clean(ocr), "OCR"
        return "", "NONE"

    return "", "NONE"
