# Pleading Analyst — Output Formats

## 1. Claim-survival matrix → `07-evidence/claim-survival-matrix.csv`

One row per **claim × defendant × element**. That granularity is the point: a
claim can survive against one defendant and fail against another on the identical
element, and a matrix that collapses defendants hides exactly the finding that
matters.

| Column | Meaning |
|---|---|
| `claim_id` | `CLM-###`, matching `02-court/claims-defenses.csv` |
| `count_no` | Count number in the operative pleading |
| `defendant` | `ENT-###`. **Never a collective noun.** A row that cannot name one defendant is itself the finding |
| `element` | As the controlling authority states it |
| `element_source` | Where the element list came from — a research row id or an authority cite. Never blank |
| `pleaded_paragraphs` | The ¶¶ pleading this element against this defendant |
| `against_whom_explicit` | `yes` / `no` — does the pleading actually say this claim runs against this defendant? |
| `evidentiary_support` | `SRC-###` list, or `none-in-record` |
| `element_status` | `proved` / `supported` / `pleaded-only` / `conclusory` / `gap` / `foreclosed` |
| `strongest_attack` | The best motion-to-dismiss argument against this element, in the opponent's words |
| `defect_ids` | `PD-##` rows from the defect scan |
| `survival_assessment` | `likely-survives` / `contested` / `likely-dismissed` / `foreclosed` |
| `curability` | `curable-by-redraft` / `curable-with-new-facts` / `curable-only-with-evidence` / `incurable` |

The validator rejects `likely-survives` on a row whose `element_status` is `gap`
or `foreclosed`, and rejects a `defendant` value that is not an `ENT-###`.

## 2. Pleading-support table → `07-evidence/pleading-support-table.csv`

One row per material allegation.

| Column | Meaning |
|---|---|
| `paragraph` | The ¶ number |
| `fact_type` | `documented` / `personal-knowledge` / `information-and-belief` / `inference` / `legal-conclusion` |
| `source_ids` + `pinpoints` | What supports it |
| `what_source_shows` | Read as a hostile reader would |
| `gap_between_allegation_and_source` | The distance. `none` when there is none |
| `basis_if_unsupported` | For an unsupported allegation: the witness, the document to be obtained, or `[BASIS-REQUIRED]` |
| `rule11_risk` | `none` / `low` / `material` / `high` — the risk that this allegation cannot be supported if challenged |

`rule11_risk: high` on any row is reported in the result's short conclusion, not
buried in a CSV.

## 3. Proposed correction list → in the result

```markdown
| # | Defect | ¶¶ affected | Correction | Basis | Effort | If not fixed |
|---|---|---|---|---|---|---|
```

**Basis** is mandatory on every row and is one of: a `SRC-###` + pinpoint; a named
witness and what they know; or `[BASIS-REQUIRED]` with what the client must
confirm. A correction row whose basis column is empty is a defect in your own
output.

Order by severity, not by paragraph number. The reader wants the fatal ones first.

## 4. Amendment decision memo → in the result

```markdown
### Amendment analysis
**Authority to amend:** as of right / by consent / by leave / by court order
directing repleading — with the rule or order quoted.
**Scope that authority gives:** repleading existing claims? adding claims?
adding parties? Quote the words.
**Timing:** scheduling-order deadline, whether passed, and whether the
good-cause standard for modifying the schedule applies before the leave standard.
**Futility:** what the claim-survival matrix says the amended pleading would do
against a renewed motion.
**Prejudice and delay:** what has changed since the case began.
**Relation back:** for any new claim or party, whether limitations is in play.
**Required motion practice:** what must be filed, and what must accompany it.
**Recommendation:** one paragraph.
**If this recommendation is wrong:** the cost, stated concretely.
```

The last line is not decoration. An amendment recommendation that does not state
its own downside has not been stress-tested.

## Cross-cutting rules

- Every output states, in its first line, **which document was analysed** and
  whether it is confirmed to be the operative pleading.
- Where two candidate versions of a pleading exist, the delta between them is
  reported before anything else.
- Element lists always carry their source. An element recited from memory is a
  silent corruption of every row that depends on it.
