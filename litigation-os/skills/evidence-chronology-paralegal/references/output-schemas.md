# Evidence Specialist — Output Schemas

Seven deliverables. Six are CSV registers living in the matter pack; the seventh
is the factual findings report. Column definitions are in the matter pack's
`FIELD-DEFINITIONS.md` — this file covers shape, ordering, and the judgment calls
the column definitions cannot capture.

## 1. Source manifest → `03-sources/source-manifest.csv`

One row per source. `source_id` is assigned once and is permanent: renumbering it
silently rewrites the meaning of every citation in the matter.

Derived files (OCR extracts, conversions, split PDFs) get their **own** ID and
point at the parent through `derived_from`. The parent is never edited.

Order rows by `source_id`. Do not re-sort by date — stable row order makes diffs
between runs readable.

## 2. Master chronology → `05-chronology/chronology.csv`

One row per dated event, sorted ascending by `event_date`, then by `event_id`.

- `event_id` — `EV-###`, stable.
- Each row needs `source_id` **and** `pinpoint`. The validator enforces both.
- `date_precision` records how firm the date is: `exact`, `month`, `year`,
  `on-or-about`, `range`.
- Where two sources put one event on different dates, create **one** event row
  with the better-sourced date, list the other in `conflicting_source_ids`, and
  open a contradiction-register row. Do not create two events.

## 3. Party and entity map → `01-parties/parties.csv` + `07-evidence/entity-index.csv`

`parties.csv` covers entities *in the case*. `entity-index.csv` covers everyone
who appears anywhere in the record — signatories, custodians, third parties,
notaries, agency staff — because the person who signed the notice may matter long
before anyone decides whether to depose them.

`aliases` links names to one entity, with the source that establishes the link.

## 4. Proposition/evidence matrix → `07-evidence/proposition-evidence.csv`

One row per proposition someone needs to prove. Derive propositions from
`02-court/claims-defenses.csv` elements where possible, so the matrix maps to the
claims rather than floating free.

The three-column discipline —
`what_the_document_actually_shows` / `what_is_claimed_from_it` /
`gap_between_the_two` — is the point of the file. All three are required on every
row; write `none` for no gap.

## 5. Contradiction register → `07-evidence/contradiction-register.csv`

One row per tested conflict. `innocent_explanations` is required whenever
`is_genuine_conflict` is `yes`.

Rate `materiality` honestly. A register of three dispositive conflicts is worth
more than thirty candidates, because an attorney can carry three into a
deposition and cannot carry thirty.

## 6. Missing-evidence list → `07-evidence/missing-evidence.csv`

One row per gap, each with `why_believed_to_exist`. Ordered by `priority`, with
`blocking: yes` rows first.

## 7. Factual findings report

Short — one to three pages. Written for an attorney who will read it once before
a call.

```markdown
> ATTORNEY WORK PRODUCT — NOT LEGAL ADVICE — NOT FOR FILING OR SERVICE
> No original source document was modified. SHA-256 integrity: <result>

# Factual Findings — <matter> — <scope>

**Assignment:** <id>   **Sources reviewed:** SRC-### … (n)
**Sources supplied but not reviewed:** <list, with why>
**Prepared:** YYYY-MM-DD

## Scope and limits
What was reviewed, what was not, and why. Any OCR-uncertain, partial, or
unavailable source that bears on a finding below.

## Findings
Numbered. Each: statement · `[LABEL]` · SRC-### at pinpoint · confidence.
Group by subject, not by document — the attorney thinks in subjects.

## Contradictions identified
The tested ones only, most material first. Each with both statements, both
sources, the innocent explanation considered, and why it was or was not
sufficient.

## What the record does not establish
Equal prominence to the findings. The propositions the attorney may believe are
proved that are not, and the gaps that block them.

## Recommended next factual steps
Ordered, each naming the document or witness that would close the gap.
```

## Consistency rules across all seven

- One event, one `EV-###`; one source, one `SRC-###`; permanent, never reused.
- Every ID referenced in one file resolves in another. Dangling IDs are worse
  than blanks because they look like provenance.
- Confidence never exceeds the weakest source it rests on. An `ocr-uncertain`
  or `partial` source caps a finding at `medium`.
- `[INFERENCE]` and `[UNRESOLVED]` rows may not carry `confidence: high`.
- Where you disagree with a characterization in another register, do not edit
  the other register — raise it in the result's *Contrary information* section
  and let the orchestrator reconcile it.
