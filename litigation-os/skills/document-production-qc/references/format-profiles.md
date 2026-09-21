# Format Profiles

Format is an input. These are starting points, verified against the source
named in each — not defaults to apply blind. **Confirm against the current
local rules and the judge's standing order before any filing.** Local rules and
standing orders change, and neither is in the general databases.

## N.D. Ga. — general civil filing

```yaml
format:
  paper: Letter
  margin_top: 1in
  margin_bottom: 1in
  margin_left: 1in
  margin_right: 1in
  font_size: 13pt          # see the type note below
  line_spacing: 2.0
  first_line_indent: 0.5in
  certificate_page_break: always
```

**Type note.** N.D. Ga. LR 5.1C restricts the fonts and sizes for documents
filed in that court, and the permitted size differs by typeface. Read the
current rule text and set `font_size` from it; do not rely on this note or on
memory. `verify_citations.py` requires the version and date of any local rule
before it may be cited.

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
