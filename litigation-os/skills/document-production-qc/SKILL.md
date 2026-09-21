---
name: document-production-qc
description: Litigation document production and quality control. Renders a court-formatted filing or work product to PDF and Word from one Markdown source so the two can never disagree, applying the caption block, paper size, margins, line spacing, font, pagination, signature block and certificate of service from the matter's own requirements rather than a default. Then inspects what was produced — extractable and searchable text, caption and case number, page numbering, signature block, certificate of service and method, exhibit references against the exhibit list, internal cross-references, leftover placeholder and drafting text, draft marking, and redaction markers over text that is still extractable. Renders page images so the document can be looked at, not only parsed. Use this skill whenever a filing, motion, brief, letter, memorandum, exhibit index or attorney-review package must be produced as a PDF or Word document, or when a produced document must be checked before a human reviews it. Produces drafts only, marked DRAFT; never files, serves, sends or transmits anything.
---

# Document Production & QC

A litigation document fails in two different ways, and each is invisible to the
check that catches the other. It can be *wrong in substance* — a citation that
does not say what the brief says it says. It can be *wrong as an artefact* — no
case number, no signature, page 7 missing, a redaction that is a black
rectangle over live text that anyone can select and copy. This skill owns the
second kind.

## The three rules that govern this skill

**1. One source, two outputs.** The PDF and the Word file are rendered from the
same Markdown. They cannot drift, because there is nothing to drift from. A
Word document edited by hand after rendering has left this system's custody and
must be re-imported before anything asserts they match.

**2. Format is an input, never a default.** Paper, margins, line spacing, font,
first-line indent, and whether the certificate starts a new page differ by
court, by judge, and sometimes by document type. They are declared in the
source's front matter. A guessed default is a rejected filing.

**3. Everything is a draft.** Output goes to `12-workproduct/drafts/` carrying a
**DRAFT — FOR ATTORNEY REVIEW — NOT FILED** overlay. Removing that overlay
requires `--final` *and* an approved `APR-` id, and the approval gate is
checked, not assumed. Nothing here files, serves, sends or transmits.

## Step 1 — Write the source

A production source is Markdown with YAML front matter:

```yaml
---
title: PLAINTIFFS' RESPONSE TO THE ORDER TO REPLEAD
document_kind: response            # drives whether a certificate is required
court: |
  IN THE UNITED STATES DISTRICT COURT
  FOR THE NORTHERN DISTRICT OF GEORGIA
  GAINESVILLE DIVISION
case_number: 2:26-cv-00110-RWS-AWH
caption_plaintiff: CHRISTOPHER CARRELHA and ...
caption_defendant: MEB LOAN TRUST VIII, et al.
plaintiffs_plural: true
defendants_plural: true
judge: Richard W. Story
magistrate_judge: Anna W. Howard
format:
  paper: Letter
  margin_top: 1in
  margin_left: 1in
  line_spacing: 2.0
  font_size: 12pt
  first_line_indent: 0.5in
  certificate_page_break: always
signature_block:
  closing: Respectfully submitted,
  date: ___ day of __________, 20__
  lines: ["/s/ ______________________", "Name", "Pro se", "Address", "Email"]
certificate_of_service:
  text: I certify that I have this day served ...
  served_on: ["Counsel, Firm, Address", "Counsel, Firm, Address"]
---
```

`document_kind` matters: a `response`, `motion`, `brief` or `letter` is served
on other parties and QC will fail it without a certificate of service. A
`work-product`, `report`, `analysis` or `internal-memo` is not served and is
not asked for one.

The body is ordinary Markdown — headings, paragraphs, lists, block quotes and
tables all render in both formats.

## Step 2 — Produce

```
python3 scripts/produce_document.py <pack> \
        --source 12-workproduct/drafts/response.md --doc-id WP-001
```

Both outputs land in `12-workproduct/drafts/` and a row is written to
`12-workproduct/production-log.csv` with `status: draft` and
`qc_status: not-run`. The intermediate HTML is kept, hidden, beside the PDF,
because that is what the visual render in Step 3 re-renders.

If `python-docx` is unavailable the PDF is still produced and the Word output is
reported as skipped — never silently omitted.

## Step 3 — QC before any human sees it

```
python3 scripts/qc_document.py <pack> --doc-id WP-001 --images
```

**Structural** — parsed out of the finished PDF, not out of the source:

| Check | Why it fails a filing |
|---|---|
| extractable, searchable text | a picture of text is not searchable and in many courts not accepted |
| court name, case number, party designations | a filing without its number does not reach the file |
| page numbering across a multi-page document | pages get separated; unnumbered pages get lost |
| signature block | Fed. R. Civ. P. 11(a) — an unsigned filing is struck unless promptly corrected |
| certificate of service, and its method | service that cannot be proved was not made |
| exhibit references against an exhibit list | an exhibit cited and not attached is the defect opposing counsel opens with |
| internal cross-references | "see Section III" pointing at nothing |
| leftover drafting text | `[BASIS-REQUIRED]`, TODO, TK, `<PLACEHOLDER>` reaching a court |
| DRAFT overlay on anything still a draft | an unmarked draft is one mis-click from being treated as final |

**Visual** — the document is re-rendered to a page image and left on disk, so
the pages can be *looked at*. A document that parses correctly and looks wrong
is still wrong, and no parser has ever caught a caption that collapsed into one
column.

**Redaction** is handled the only honest way available. This skill cannot
certify a redaction. What it can do — and does — is detect that a redaction
marker is present while the text beneath it is still extractable, which is
exactly how redactions leak. A real redaction removes the content from the
source before the PDF is produced; QC is then re-run.

The result is written back to `production-log.csv`. A document with
`qc_status: fail` is not sent to a human for review; it is fixed and re-run.

## Step 4 — Hand it over

Nothing moves out of `drafts/` on this skill's authority. To take an
irreversible or outward-facing step, open a gate request with
`matter-operations-manager`:

```
python3 scripts/approval_gate.py <pack> --request --action file \
   --target "<document>" --path 12-workproduct/drafts/WP-001-....pdf \
   --why "<the order or rule that requires it>" \
   --review "<exactly what the human must look at>"
```

Then stop. The human reviews, decides in
`11-decisions/approval-requests.csv`, and files it themselves.

`--final` re-renders without the DRAFT overlay. It requires `--approval
APR-###`, and `produce_document.py` runs the gate check before it will do it —
because a document without a DRAFT stamp looks filed, and looking filed is
itself a consequence.

## What this skill will not do

1. It will not file, serve, send, email, e-file or transmit anything.
2. It will not remove the DRAFT overlay without a recorded human approval.
3. It will not certify a redaction, and will say so rather than imply one.
4. It will not report QC as passed on a document it could not open.
5. It will not edit the substance of the document. A citation that is wrong
   renders perfectly; verification belongs to `legal-research-paralegal` and
   `verify_citations.py`, and QC does not substitute for it.

## Bundled resources

- `references/format-profiles.md` — front-matter format blocks for common
  courts and document types, and what each court actually requires
- `references/qc-checklist.md` — the full pre-handover checklist, including the
  items no script can check and a human must
- `scripts/produce_document.py`, `scripts/qc_document.py`,
  `scripts/approval_gate.py`, `scripts/command_center.py`
- `scripts/validate_matter_pack.py`, `scripts/validate_skill.py`
