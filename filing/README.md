# Court document production pipeline (N.D. Ga.)

Renders a court filing from an HTML fragment to a print-ready PDF that
conforms to N.D. Ga. Civil Local Rule 5.1.

    python3 render.py <fragment.html> <out.pdf> "<Title>"

`court.css` encodes the rule requirements, verified against the court's
current Civil Local Rules:

| Requirement | Rule | Implementation |
|---|---|---|
| Times New Roman, at least 14 point | LR 5.1(C) | `font-size: 14pt` |
| Double-spaced between lines | LR 5.1(C) | `line-height: 2.3` (matches Word "Double" at 32.2pt) |
| Headings/footnotes may be single-spaced | LR 5.1(C) | `h2`/`h3` at 1.55 |
| Margins at least one inch, all four sides | LR 5.1(D) | `@page { margin: 1in }` |
| Pages numbered at bottom center | LR 5.1(E) | `@bottom-center { content: counter(page) }` |
| Briefs limited to 25 pages | LR 7.1(D) | verify after rendering |

## Two traps this pipeline exists to avoid

**Font substitution.** Chromium silently falls back to Liberation Serif when
Times New Roman is absent. The output looks right and embeds the wrong font,
making a LR 5.1(C) compliance certificate false. Install the real font and
verify what is embedded:

    fc-match "Times New Roman"

**Shrink-to-fit.** If any element overflows the content box, Chromium scales
the whole document down — 14pt silently becomes 13pt while the page margins
stay at exactly 1 inch, so the usual margin check does not catch it.

Always measure the rendered PDF rather than trusting the CSS:

    python3 - <<'PY'
    import fitz
    from collections import Counter
    d = fitz.open("out.pdf")
    sizes, spacing = Counter(), Counter()
    for i in range(d.page_count):
        dd = d[i].get_text("dict")
        ys = sorted({round(l["spans"][0]["origin"][1], 1)
                     for b in dd["blocks"] for l in b.get("lines", [])})
        for k in range(len(ys) - 1):
            spacing[round(ys[k+1] - ys[k], 1)] += 1
        for b in dd["blocks"]:
            for l in b.get("lines", []):
                for s in l["spans"]:
                    sizes[round(s["size"])] += len(s["text"])
    print(d.page_count, "pages", sizes.most_common(3), spacing.most_common(2))
    PY

## Case material is not in this repository

This repository is public. Filings, exhibits, evidence and rendered page
images are excluded by `.gitignore` and must stay out of it.
