# Consolidated Attorney Work-Product Report — Template

Reproduce this structure exactly. The order is deliberate: a reader who stops
after section 1 must not have absorbed an allegation as a fact.

---

> **ATTORNEY WORK PRODUCT — PREPARED AT THE DIRECTION OF COUNSEL**
> **NOT LEGAL ADVICE · NOT FOR FILING OR SERVICE · NO ORIGINAL SOURCE ALTERED**
> Prepared by an AI litigation-support system. Every citation, date, quotation,
> and legal conclusion requires verification by a licensed attorney in the
> controlling jurisdiction before any use.

# <Matter name> — <Report title>

| | |
|---|---|
| **Matter ID** | |
| **Court / case no.** | |
| **Posture as of** | |
| **Objective(s) addressed** | |
| **Specialist results consolidated** | RESULT-… (list) |
| **Sources relied on** | SRC-… (count and range) |
| **Prepared** | YYYY-MM-DD |
| **Source integrity** | SHA-256 verified / baseline created — N files unchanged |

## 0. Bottom line

Three to six sentences. The answer to the objective, the single biggest risk,
and the one thing that most needs a human decision. No citations here.

## 1. What is established

Facts a court could find on this record, or has already found. Each item:

`[VERIFIED]` or `[COURT-FOUND]` · statement · **source**: SRC-### at pinpoint

Nothing enters this section on the strength of a pleading. If the only support
is that a party said it, it belongs in section 2.

## 2. What is alleged

Assertions by any party — ours included — not yet established. Each item:

`[ALLEGED]` · statement · **asserted by**: party · **where**: SRC-### at pinpoint
· **corroboration**: what exists, or *none in the reviewed record*

Treat our own client's assertions with the same discipline as the opponent's.

## 3. What can reasonably be inferred

Each inference states its premises and the step:

`[INFERENCE]` · **from**: (a) …, (b) … · **therefore**: … · **strength**:
strong / moderate / weak · **what would break it**: …

An inference with no stated premises is an assertion wearing a costume; cut it.

## 4. What remains unverified

`[UNRESOLVED]` items: conflicts between sources, silences in the record,
authority not yet checked, deadlines not yet confirmed. Each with **what would
resolve it**.

| ID | Unresolved question | Why it matters | What resolves it | Owner |
|---|---|---|---|---|

## 5. What additional evidence is needed

From `07-evidence/missing-evidence.csv`, ranked by what it unblocks.

| Gap | Why believed to exist | What it would prove | Route | Priority | Blocking? |
|---|---|---|---|---|---|

## 6. Which arguments appear viable

For each: the argument, the elements, where each element stands, the best
authority found, the best authority against, and the honest odds.

| Argument | Elements at risk | Support | Adverse authority | Assessment |
|---|---|---|---|---|

"Viable" means the elements are pleadable and the authority is not against you —
not that it wins.

## 7. Which arguments appear weak or foreclosed

Keep the two apart:

- **Weak** — authority runs against it on balance, but it is not decided.
- **Foreclosed** — controlling authority, or a ruling already entered in this
  case, has decided it. Cite the ruling.

| Argument | Weak or foreclosed | Why | Citation | Salvageable? |
|---|---|---|---|---|

## 8. What should be investigated next

Ordered. Each with owner, the decision it supports, and any deadline that makes
it urgent.

| # | Next step | Owner | Supports which decision | By when | Why this order |
|---|---|---|---|---|---|

## 9. Human decisions required

Nothing in this system acts without one of these being answered by a person.

| ID | Decision | Why it cannot be decided from the record | Blocking? | Deadline pressure |
|---|---|---|---|---|

## 10. Reconciliations performed

Where specialists disagreed and how it was resolved, including the rejected view.

| Conflict | Level | Resolution | Rejected view retained |
|---|---|---|---|

## 11. Limits of this report

State plainly: which sources were not available; which were OCR-uncertain; which
authorities could not be verified and why; what scope was excluded; and the fact
that no filing, service, or transmission has occurred or is authorized.
