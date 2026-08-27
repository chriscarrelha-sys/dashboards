# Dashboards

## Legal Document Audit (`index.html`)

A self-contained, **100% client-side** tool that reviews court filings and contracts for
structural and completeness problems before you file. Paste (or upload `.txt`/`.md`) a
document and it runs a rule-based audit, then scores it and lists findings by severity.

**Nothing is uploaded** — all parsing and analysis happen in your browser. No network calls,
no dependencies, no build step.

### What it checks
- **Structure** — court name in caption, case/docket number, document title/type
- **Signature & verification** — signature block; sworn/perjury clause & notary for affidavits
- **Service & parties** — certificate of service, party designations
- **Dates & deadlines** — parses dates, flags any within 21 days, highlights deadline phrases
- **Citations** — case names, reporter cites, statute/rule cites; flags case names with no reporter
- **Red flags** — unfilled `[BRACKETS]`, `TODO`/`TBD`/`DRAFT` stubs, blank date lines
- **Consistency** — multiple case numbers, mismatched dollar figures, unused defined terms (contracts)
- **Readability** — average sentence length

Output can be downloaded as Markdown or HTML, or copied as a summary.

### Run it
Open `index.html` in any browser, or serve the folder (e.g. GitHub Pages / `python3 -m http.server`).

> **Not legal advice.** These are automated, pattern-based checks that can produce false
> positives or miss issues. Always review against the applicable court rules and, where
> possible, have a licensed attorney review your documents.
