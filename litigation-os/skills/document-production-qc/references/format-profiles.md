# Format Profiles

Format is an input. These are starting points, verified against the source
named in each — not defaults to apply blind. **Confirm against the current
local rules and the judge's standing order before any filing.** Local rules and
standing orders change, and neither is in the general databases.

## N.D. Ga. — general civil filing

```yaml
format:
  court_profile: ndga      # enforced by produce_document.py — see below
  paper: Letter
  margin_top: 1in
  margin_bottom: 1in
  margin_left: 1in
  margin_right: 1in
  docx_font: Times New Roman
  font_size: 14pt          # LR 5.1 minimum for this typeface
  line_spacing: 2.0
  first_line_indent: 0.5in
  certificate_page_break: always
```

**The type rule, read and verified** (CV-031). N.D. Ga. LR 5.1 permits
computer-prepared documents in:

| Typeface | Minimum |
|---|---|
| Times New Roman | **14 point** |
| Courier New | 12 point |
| Century Schoolbook | 13 point |
| Book Antiqua | 13 point |

Also required: double spacing between lines (footnotes, headings and indented
citations may be single-spaced), margins of at least one inch on all four
sides, and 8½ × 11 white opaque paper.

**This is enforced, not advised.** `format.court_profile: ndga` makes
`produce_document.py` refuse to render a filed document that violates the rule.
The previous version of this file carried a note saying "read the current rule
and set `font_size` from it" — and the first filing this system produced went
out at 13pt Times New Roman, which the rule does not permit. A note is not a
check.

Two cautions a profile cannot carry for you. There is an announced proposed
amendment to **LR 5.1(D) governing margins**; confirm the current text before
filing. And a profile covers only what the type rule says — page limits,
certificates and judge-specific standing orders are separate.

**To add a court:** read its rule, record it in
`09-research/citation-verification.csv` with the version and date, then add it
to `COURT_TYPE_RULES` in `produce_document.py`. A profile that is not backed by
a read rule is refused by name.

## Georgia superior court — general civil filing

```yaml
format:
  paper: Letter
  margin_top: 1in
  margin_bottom: 1in
  margin_left: 1in
  margin_right: 1in
  font_size: 12pt
  line_spacing: 2.0
  first_line_indent: 0.5in
  certificate_page_break: always
```

Uniform Superior Court Rule 5 governs format; county standing orders vary.
Confirm both.

## Internal work product (not filed)

```yaml
format:
  paper: Letter
  margin_top: 0.9in
  margin_bottom: 0.9in
  margin_left: 0.9in
  margin_right: 0.9in
  font_size: 11pt
  line_spacing: 1.45
  first_line_indent: 0in
  certificate_page_break: auto
```

Use `document_kind: work-product` (or `report`, `analysis`, `internal-memo`) so
QC does not demand a certificate of service.

## Letter / correspondence

```yaml
format:
  paper: Letter
  margin_top: 1in
  margin_bottom: 1in
  font_size: 12pt
  line_spacing: 1.15
  first_line_indent: 0in
```

A letter still passes through the approval gate before it is sent. Producing it
is not sending it.

## Exhibit index

Use `document_kind: work-product`, single spacing, and a table. Each row:
exhibit letter, description, source id, page count, and where the original is.
An exhibit index whose rows do not resolve to `SRC-` ids is an index of
documents nobody can produce.

## Fields QC reads

| Front matter | What QC does with it |
|---|---|
| `document_kind` | decides whether a certificate of service is required |
| `case_number` | must appear in the rendered text |
| `court` | must render a recognisable court name |
| `caption_plaintiff` / `caption_defendant` | must produce party designations |
| `signature_block` | absence fails QC — Rule 11(a) |
| `certificate_of_service.served_on` | each served party appears in the output |
| `format.*` | applied to both PDF and Word so they cannot disagree |
