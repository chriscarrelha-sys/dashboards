# Accounting Analyst — Output Formats

## 1. Transaction reconciliation → `07-evidence/transaction-reconciliation.csv`

One row per ledger line, in the ledger's own order. The `*_verbatim` columns are
reproduced exactly; your reading goes in the analysis columns beside them.

| Column | Rule |
|---|---|
| `description_verbatim`, `code_verbatim`, `amount_verbatim`, … | Character for character, including a label that contradicts the entry's effect |
| `classification` | One of the twelve values in SKILL.md Step 3 |
| `pairs_with` | The `txn_id` this reverses or is reversed by. Required whenever classification is `reversed`, `reversal-of`, or `reapplied` |
| `net_effect` | The economic effect of the pair, on the row that completes it |
| `reading` | What you conclude, kept apart from what the ledger says |
| `col_ambiguous` | `yes` where the printed column assignment is unclear |
| `used_in_computation` | `no` whenever `col_ambiguous` is `yes` — enforced by the validator |
| `basis` | Why you classified it this way, especially for `draw`, `booking` and `unexplained` |

## 2. Disputed-amount schedule → `07-evidence/disputed-amounts.csv`

| Column | Rule |
|---|---|
| `amount_claimed_by_servicer` + `claimed_source_id` + `claimed_pinpoint` | Never a figure without its source |
| `amount_supported_by_records` | What the documents support, or `NOT-COMPUTABLE` |
| `category` | `arithmetic-error` / `application-dispute` / `unexplained-variance` / `characterization-dispute` |
| `computation_shown` | The arithmetic in full. Required whenever a difference is stated |
| `assumptions` | Every assumption, listed. `none` if there are none |
| `competing_computation` | Where inputs are ambiguous, the other reasonable calculation and its result |
| `what_would_resolve` | The document or answer that settles it |

`category: arithmetic-error` requires `computation_shown` to demonstrate the
servicer's own figures failing to add up. Anything else is one of the other three.

## 3. Unexplained-variance report → in the result

```markdown
| # | Variance | Amount | What the record shows | What it does NOT show | Innocent explanations | Resolves with |
|---|---|---|---|---|---|---|
```

The fourth and fifth columns are mandatory. A variance report that omits what the
record fails to show, and the benign reading, is advocacy rather than
reconciliation — and it will not survive contact with the other side.

## 4. Payment chronology → rows for `05-chronology/chronology.csv`

One row per economic event, not per ledger line: a posted-then-reversed payment is
**one** event with a net effect, sourced to both rows. Use the matter pack's
existing chronology columns and epistemic labels.

## 5. Accounting questions → in the result

Questions only the servicer can answer, each phrased so it could be served as an
interrogatory without rewriting, and each naming what turns on it.

```markdown
| # | Question | Why it matters | Who can answer | Feeds which discovery request |
|---|---|---|---|---|
```

## 6. Evidence-needed list → rows for `07-evidence/missing-evidence.csv`

Standard columns. Typical entries: the servicer's transaction-code key; the
borrower's depositary records for tendered payments; the prior servicer's
complete history; the fee schedule and the authority for each fee; every print of
the statement; the reinstatement or payoff quote and its supporting breakdown.

## Presentation rules

- **Never round.** Carry cents everywhere.
- **Never restate a description.** Quote it and add your reading beside it.
- **Never present a variance as a loss.** A variance is a difference; whether it
  is a loss depends on facts and law you were not asked to decide.
- Where the analysis rests on an OCR-degraded source, say so in the same sentence
  as the figure, not in a footnote.
