#!/usr/bin/env python3
"""Render a court document from HTML fragment to a Letter/LR 5.1 PDF."""
import subprocess, sys
from pathlib import Path

CHROME = "/opt/pw-browsers/chromium-1194/chrome-linux/chrome"
BUILD = Path(__file__).resolve().parent

CAPTION_FILE = BUILD / "caption.html"


def caption() -> str:
    """The court and party caption block, kept out of this script so the
    renderer is matter-agnostic. See caption.example.html for the shape."""
    if not CAPTION_FILE.exists():
        raise SystemExit(f"missing {CAPTION_FILE}; copy caption.example.html and fill it in")
    return CAPTION_FILE.read_text(encoding="utf-8")

def render(fragment_path: str, out_pdf: str, title: str) -> int:
    frag = Path(fragment_path).read_text(encoding="utf-8")
    css = (BUILD / "court.css").read_text(encoding="utf-8")
    html = (f'<!DOCTYPE html><html><head><meta charset="utf-8">'
            f'<title>{title}</title><style>{css}</style></head><body>'
            f'{caption()}{frag}</body></html>')
    tmp = BUILD / (Path(out_pdf).stem + ".html")
    tmp.write_text(html, encoding="utf-8")
    out = Path(out_pdf)
    out.parent.mkdir(parents=True, exist_ok=True)
    subprocess.run([CHROME, "--headless", "--disable-gpu", "--no-sandbox",
                    "--no-pdf-header-footer", "--run-all-compositor-stages-before-draw",
                    "--virtual-time-budget=20000", f"--print-to-pdf={out}",
                    f"file://{tmp}"], capture_output=True, timeout=300)
    if not out.exists() or out.stat().st_size < 1000:
        print(f"FAILED to render {out}", file=sys.stderr); return 1
    data = out.read_bytes()
    pages = data.count(b"/Type /Page") - data.count(b"/Type /Pages")
    print(f"{out.name}: {out.stat().st_size//1024} KB, ~{pages} pages")
    return 0

if __name__ == "__main__":
    raise SystemExit(render(sys.argv[1], sys.argv[2], sys.argv[3] if len(sys.argv) > 3 else "Document"))
