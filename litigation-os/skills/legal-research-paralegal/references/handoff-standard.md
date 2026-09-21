# Litigation OS — Agent Handoff Standard v1.1

This is the single contract that the managing-attorney skill
(`litigation-matter-orchestrator`) and every specialist skill
(`legal-research-paralegal`, `evidence-chronology-paralegal`,
`docket-deadline-paralegal`) use to pass work back and forth.

Two artifacts exist: an **Assignment** (orchestrator → specialist) and a
**Result** (specialist → orchestrator). Both are Markdown documents with a
YAML front-matter block. The YAML carries the machine-checkable fields; the
Markdown body carries the analysis. `tools/validate_handoff.py` checks the YAML.

Why YAML front matter plus prose: the routing fields have to be checkable by a
script so an assignment can never reach a specialist without a jurisdiction or a
source location, but the substance of legal work does not fit in key/value pairs.

---

## 1. Assignment format

File name: `ASSIGN-<matter_id>-<NNN>-<specialist-short>.md`
(e.g. `ASSIGN-CARRELHA-2026-003-docket.md`). Store in
`09-research/` for research assignments, otherwise `10-specialist-results/`
alongside the result it will produce.

```yaml
---
doc_type: assignment
schema_version: "1.1"
assignment_id: ASSIGN-CARRELHA-2026-003
matter_id: CARRELHA-2026
issued_by: litigation-matter-orchestrator
issued_to: docket-deadline-paralegal      # exactly one specialist skill name
issued_date: 2026-09-21
objective: >
  One sentence. The decision this work must support, not the activity.
scope_included:                            # bounded; each item independently checkable
  - "Docket entries 1-35 only"
  - "Deadlines stated on the face of Doc. 34 and Doc. 35"
scope_excluded:                            # say what NOT to do; prevents scope drift
  - "Do not compute deadlines under FRCP 6 for events after Doc. 35"
source_locations:                          # every place the specialist may read
  - "03-sources/SRC-manifest.csv"
  - "03-sources/raw/DKT-034-order-2026-07-20.txt"
jurisdiction:                              # required even for pure fact work; drives rules
  court: "U.S. District Court, N.D. Ga., Gainesville Division"
  governing_procedure: "Fed. R. Civ. P.; N.D. Ga. Local Rules; Standing Order 18-01"
  governing_substantive_law: "Federal (RESPA/FCRA/FDCPA); Georgia state law"
assumptions:                               # orchestrator's stated premises; specialist must test
  - "Doc. 34 and Doc. 35 texts in 03-sources/raw are complete and unaltered"
prohibited_actions:                        # always includes the matter-control prohibitions
  - "No filing, serving, sending, or transmitting anything to any person or court"
  - "No modifying, renaming, moving, or deleting any file under 03-sources/raw"
  - "No asserting a deadline as confirmed without the governing rule and trigger"
required_output:                           # concrete artifacts, by filename
  - "04-docket/docket-register.csv"
  - "08-deadlines/deadline-register.csv"
  - "RESULT-CARRELHA-2026-003-docket.md"
completion_standard: >
  What "done" means, stated so a reviewer can falsify it. E.g. "Every row in
  deadline-register.csv is either express (quoting the order) or calculated with
  rule, trigger, and method shown; no row is left implied."
due: 2026-09-21
---
```

### Field definitions (assignment)

| Field | Meaning | Rule |
|---|---|---|
| `assignment_id` | Stable unique ID | `ASSIGN-<matter_id>-<3-digit seq>` |
| `matter_id` | Matter this belongs to | Must equal `matter_id` in `00-control/matter-control.yaml` |
| `issued_to` | Specialist skill name | One of the four installed skill names |
| `objective` | The decision supported | One sentence, outcome-phrased |
| `scope_included` | Work in bounds | ≥1 item; each a checkable unit of work |
| `scope_excluded` | Work out of bounds | May be empty only if nothing adjacent could be confused |
| `source_locations` | Readable paths/IDs | ≥1; a specialist may not read outside this list plus published law |
| `jurisdiction` | Controlling forum & law | All three sub-keys required; `"UNDETERMINED"` is a permitted value and must then appear as an open question |
| `assumptions` | Premises the specialist inherits | May be empty list; never omitted |
| `prohibited_actions` | Hard stops | Must include the three standing prohibitions above |
| `required_output` | Deliverable files | ≥1; the result file is always one of them |
| `completion_standard` | Falsifiable "done" | Must be testable by reading the outputs |

---

## 2. Result format

File name: `RESULT-<matter_id>-<NNN>-<specialist-short>.md`, stored in
`10-specialist-results/`.

```yaml
---
doc_type: result
schema_version: "1.1"
assignment_id: ASSIGN-CARRELHA-2026-003
matter_id: CARRELHA-2026
produced_by: docket-deadline-paralegal
produced_date: 2026-09-21
assignment_answered: full                  # full | partial | not_answered
short_conclusion: >
  Two sentences maximum. The answer, not the method.
confidence: medium                         # high | medium | low  (see scale below)
confidence_basis: >
  Why that level, in one sentence, tied to source quality.
human_decisions_required:                  # empty list allowed, never omitted
  - id: HD-1
    question: "Confirm whether the amended complaint was actually filed by 8/21/26."
    why_human: "Requires PACER/ECF access the specialist does not have."
    blocking: true
recommended_next_action: >
  One concrete next step, naming who does it.
---
```

The Markdown body below the front matter uses these headings, in this order,
always present, never renamed:

```
## 1. Assignment answered
## 2. Short conclusion
## 3. Verified findings
## 4. Source citations
## 5. Contrary information
## 6. Uncertainty
## 7. Missing material
## 8. Confidence
## 9. Recommended next action
## 10. Human decisions required
```

### What belongs under each heading

- **1. Assignment answered** — restate the objective and state plainly whether it
  was answered in full, in part (say which part), or not at all (say why).
- **2. Short conclusion** — the bottom line. No citations here.
- **3. Verified findings** — each finding tagged with an **epistemic label**
  (§4). A finding with no source ID does not belong here; it belongs in §6.
- **4. Source citations** — every source ID used, resolved to its manifest entry,
  with pinpoint (page/¶/exhibit/docket entry/Bates/line).
- **5. Contrary information** — evidence or authority that cuts against §3.
  Writing "none" here is a claim; it means *you looked and found none*, and you
  must say where you looked.
- **6. Uncertainty** — what you could not resolve and what would resolve it.
- **7. Missing material** — documents, dockets, or authorities that should exist
  and are not in the sources, with why you believe they exist.
- **8. Confidence** — the level plus the reasoning.
- **9. Recommended next action** — one step, with an owner.
- **10. Human decisions required** — items the attorney must decide, each with
  why it cannot be decided from the record.

---

## 3. Confidence scale (shared by all four skills)

| Level | Means |
|---|---|
| **high** | Every material proposition rests on a source in the manifest, quoted or pinpointed, and nothing in the reviewed sources contradicts it. |
| **medium** | The core proposition is sourced, but a supporting step rests on inference, an unverified secondary source, an OCR-uncertain extraction, or an incomplete record. |
| **low** | A material step is unsourced, the record is known to be incomplete in a way that bears on the answer, or a source conflict is unresolved. |

Never report **high** on a proposition whose source could not be opened and read.
"The document is titled X, so it presumably says Y" is **low**, not medium.

### Narrative inherits the register's ceiling

A finding written in prose inherits the confidence ceiling of the register row it
summarises. If the row is capped at **medium** because its source is marked
`partial`, `paywalled`, `ocr-uncertain` or `missing-pages`, the sentence carries
the same cap — and may describe only the part of the source actually read.

This is a real failure mode, not a hypothetical one: structured fields get
audited and prose does not, so a scrupulous CSV can feed an over-claiming
paragraph and nobody notices. The attorney reads the paragraph. Before returning
a result, read your own prose back against the manifest and put the limit in the
sentence.


---

## 4. Epistemic labels (shared by all four skills)

Every substantive statement in a result carries exactly one label. This is the
core safety property of the system: the attorney must never have to guess
whether something is proved or merely pleaded.

| Label | Definition | Test |
|---|---|---|
| `[VERIFIED]` | A source in the manifest directly states it, and the source was read. | Quote or pinpoint exists. |
| `[ALLEGED]` | A party asserts it in a pleading, letter, complaint, declaration, or dispute. | Cite who asserts it and where. |
| `[COURT-FOUND]` | A court stated it as a finding, holding, or order. | Cite the order and page. Distinguish from a court merely reciting a party's allegation. |
| `[INFERENCE]` | Not stated by any source; follows from sourced facts. | State the premises and the inferential step. |
| `[LEGAL-CONCLUSION]` | A characterization under law ("the assignment is void"). | Must be tied to authority or flagged as untested. |
| `[UNRESOLVED]` | Sources conflict, or the record is silent on something material. | State what would resolve it. |

A court order reciting "Plaintiffs allege X" supports `[ALLEGED]`, not
`[COURT-FOUND]`. This confusion is the single most common failure mode when
building a chronology from orders, so check it deliberately.

---

## 5. Standing prohibitions (all specialists, all matters)

These apply whether or not the assignment repeats them:

1. **No outbound action.** Do not file, serve, send, mail, email, e-file,
   transmit, or submit anything to any court, agency, party, or third party.
   Drafting is permitted; transmitting is not.
2. **No source mutation.** Do not modify, rename, move, delete, re-OCR in place,
   or overwrite anything in the matter's source directory. Read-only. All work
   product goes to new files.
3. **No gap-filling.** Do not supply a fact, date, quotation, citation, holding,
   docket number, or amount that no source supports. Write `[UNVERIFIED]` and
   list it under Missing material.
4. **No unearned deadline.** Do not state a date as a deadline unless it is
   quoted from a source or computed with the rule, trigger, and method shown.
5. **Escalate rather than guess.** If the assignment is ambiguous or its sources
   do not support the objective, return `assignment_answered: partial` with the
   blocker in §10 rather than inventing an answer.
