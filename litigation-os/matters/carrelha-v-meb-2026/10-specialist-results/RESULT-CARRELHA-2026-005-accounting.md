---
doc_type: result
schema_version: "1.1"
assignment_id: ASSIGN-CARRELHA-2026-005
matter_id: CARRELHA-2026
produced_by: loan-accounting-analyst
produced_date: 2026-09-21
assignment_answered: full
short_conclusion: >
  All 72 ledger rows are classified and paired. No $5,200.00 entry exists; the 12/21/23
  cluster is close in time to the asserted wire date and equals none of three defensible
  totals. The $10,000 and $855 reversals are confirmed and unexplained. Three of four 2025
  trial payments were reversed with $0.00 NSF entries; the fourth was never reversed and
  still sits unapplied. $8,408.74 in fees was charged against a principal that has not
  moved since December 2023.
confidence: medium
confidence_basis: >
  High on the transcription and classification, which were performed row by row against a
  native-text rendering of the servicer's own statement. Medium overall because several
  rows in the 09/14/23 cluster carry ambiguous printed columns and were excluded from
  arithmetic, and because the December 19 2023 wire date is a client assertion with no
  source in the manifest.
human_decisions_required:
  - id: HD-15
    question: "Obtain Plaintiffs' depositary records for the four 2025 tenders of $1,899.56 and for the asserted December 19 2023 wire."
    why_human: "Only the client's bank can show whether a payment cleared and was not returned. The ledger cannot."
    blocking: true
  - id: HD-16
    question: "Decide whether to continue pleading a $5,200.00 payment at all, given that the later pleading SRC-020 omits it."
    why_human: "A litigation judgment about which factual theory to carry forward."
    blocking: true
recommended_next_action: >
  Get the bank records. Three of the matter's accounting questions - whether the 2025
  tenders cleared, whether a December 2023 wire was sent, and whether the $855 was
  returned - are answerable this week from the client's own institution and by no other
  route.
---

## 1. Assignment answered

The objective was to reconcile the ledger transaction by transaction across six specified
subjects. **Answered in full.** All 72 rows of SRC-013 are transcribed with the servicer's
own descriptions preserved, classified into the twelve categories, and paired where a
reversal exists. Six disputed amounts are scheduled with their arithmetic shown.

One limit inside the full answer: interest was **not** recomputed. The rate basis, day
count and compounding are not in the sources, and a wrong interest figure would discredit
every correct figure beside it.

## 2. Short conclusion

There is no $5,200.00 entry anywhere in the ledger. The nearest candidate — the 12/21/23
cluster, two days after the asserted wire date — equals $4,355.87, $5,085.00 or $4,980.88
depending on which entries are counted, and none of those is $5,200.00. Separately, the
defendants' own ledger documents a payment received, never reversed and never applied for
ten months, while $8,408.74 in default fees accrued against a frozen principal.

## 3. Verified findings

### DISP-001 — the asserted $5,200.00 wire of December 19, 2023

**This materially refines the Phase 1 finding.** Phase 1 reported that no $5,200.00 entry
exists, which remains literally true. Phase 1 did not have the wire date. With it, the
12/21/23 cluster becomes a candidate, and the honest answer is neither "absent" nor
"applied":

| Reading | Entries counted | Total | Variance vs $5,200.00 |
|---|---|---|---|
| (i) payment entries only | $2,081.81 + $2,082.46 + $191.60 | **$4,355.87** | $844.13 |
| (ii) all positive entries | (i) + $729.13 late-charge waive `[COL?]` | **$5,085.00** | $115.00 |
| (iii) net of all five rows | (ii) − $104.12 late-charge assessment | **$4,980.88** | $219.12 |

Reading (ii) uses a figure marked `[COL?]` at TXN-033 — the $729.13 appears in the
late-charge column on a row whose late-charge *balance* reads $519.88 — so it is shown for
completeness and **not relied on**. The two-day lag is ordinary but is an assumption.

**Note also:** SRC-020, the later pleading, contains no $5,200.00 allegation at all.

### DISP-003 — the 2025 trial payments

| Date | Entry | Amount | Outcome |
|---|---|---|---|
| 05/02/25 | Unapplied Payment | $1,899.56 | reversed 05/08 + NSF $0.00 |
| 05/10/25 | Unapplied Payment | $1,899.56 | reversed 05/15 + NSF $0.00 |
| **05/17/25** | **Unapplied Payment** | **$1,899.56** | **never reversed** |
| 06/18/25 | Unapplied Payment | $1,899.56 | reversed 06/25 + NSF $0.00 |

Tendered: $7,598.24. Applied to principal or interest: **$0.00**. The ledger's own
"Ending Unapplied Balance" at the 03/10/26 print is **$1,899.56** — matching the
unreversed tender exactly, ten months later. Each of the three NSF Fee Assessment rows is
recorded **in the amount of $0.00**.

**This is the strongest documented payment fact in the matter and it comes from the
defendants' own record.**

### DISP-004 and DISP-005 — the $10,000 and the $855

`[VERIFIED]` 09/15/23 Principal Only Payment **+$10,000.00**, principal $142,095.76 →
$132,095.76. 09/26/23 Principal Only Payment **−$10,000.00**, principal restored exactly.
Net effect after eleven days: **$0.00**. The ledger states no reason.

`[VERIFIED]` 09/26/23 Unapplied Payment **+$855.00**; 10/11/23 Unapplied Payment
**−$855.00**. No application of $855.00 to principal, interest or fees appears anywhere.
**Both rows are marked money type `PriorServicer`** and predate Shellpoint's 07/07/2024
boarding by ten months.

### DISP-002 — the September 2023 reinstatement

$19,588.88 in on 09/13/23. Distributed 09/14/23 across due dates 02/2023–10/2023: nine
instalments totalling $18,789.75 plus a $729.13 principal-only application = **$19,518.88**.
Residual **$70.00**. Small, unexplained on the face of the document, and recorded as such
— not as evidence of anything. Competing computation: if the $729.13 is not part of this
distribution, the residual is $799.13.

### DISP-006 — fees against a frozen principal

27 entries, 05/06/2024 – 02/27/2026: SLS-era assessments $1,440.00 + Shellpoint-era
disbursements $6,968.74 = **$8,408.74**. Principal on the first of those rows:
$140,288.02. On the last: **$140,288.02**. Change: **$0.00**.

The pleading (¶ 32) claims "at least fifteen" disbursements "exceeding $3,500" in a
narrower window. Restricted to that window the ledger shows 20 entries totalling
$5,394.13. **The pleading understates the record.**

### TXN-002 — the late charge that predates any possible late payment

A Late Charge Balance of **$1,145.62** sits on the 08/05/2022 origination row with no
`Late Charge Assess` line anywhere before it. It is carried, not assessed. Excluded from
all arithmetic. Leading innocent explanation: a data-conversion artefact carried in at
boarding from a prior system.

### TXN-001, TXN-007, TXN-015 — negative "Principal Only Payment" entries

Four exist. They are **not** all the same thing:

- **TXN-001** (08/05/22, −$149,650.00) is the **opening-balance booking**. The annotated
  spreadsheet SRC-007 calls this "RED FLAG: NEGATIVE principal payment." That
  characterisation is **wrong** and must not be advanced.
- **TXN-026** (09/26/23, −$10,000.00) **is** a reversal — it has a matching credit eleven
  days earlier.
- **TXN-007** (11/16/22, −$2,900.00) and **TXN-015** (02/09/23, −$1,700.00) have **no
  matching credit anywhere in the 42-month ledger**, searched in both directions. On a
  revolving line the leading explanation is an additional draw posted through the only
  principal code the system has. `[UNRESOLVED]` without the transaction-code key.

## 4. Source citations

| Source | Used for | Pinpoints |
|---|---|---|
| SRC-013 (native-text transcription of SRC-006, all 5 pages, every row read) | Every figure in this result | pp.1–5 by transaction date; totals block p.5 |
| SRC-025 / SRC-024 | The 01/16/2026 print; the negative finding on the file named "5200 on Ledger" | whole document |
| SRC-012 | The servicer's default reckoning and designated address | letter p.1; notices page |
| SRC-021 | ¶¶ 27–32 and 42, tested against the ledger | as cited |
| SRC-007 | Identified as annotated litigant work product; its first annotation corrected | RED FLAGS column |

Registers: `07-evidence/transaction-reconciliation.csv` (72 rows, all classified, all
reversals paired), `07-evidence/disputed-amounts.csv` (7 rows).

## 5. Contrary information

Stated against our own side:

1. **Three of the four 2025 tenders were reversed with NSF entries.** On the ledger's
   face that is a complete explanation for their non-application, and Defendants will
   lead with it. **Only the 05/17/25 tender is unexplained** — and it is worth more than
   the other three put together.
2. **The $5,200.00 wire is not established by anything.** Three defensible readings of the
   12/21/23 cluster produce three different totals and none is $5,200.00. The later
   pleading drops the allegation entirely, which is itself informative.
3. **The $70.00 reinstatement residual is trivial** and is most likely a rounding or
   fee-application detail. It is recorded because it is unexplained, not because it
   matters.
4. **The $8,408.74 in fees is not in dispute as to amount** — these are the servicer's
   own figures and they foot. Whether the fees were *authorised* is a contract question
   this analysis cannot answer.
5. **The frozen due date and frozen principal have an ordinary explanation.** Once a loan
   is treated as in default and payments stop being applied to scheduled instalments,
   the "next due" date has nothing to advance to. That is evidence of how the servicer
   was treating the account — not, by itself, evidence of an accounting error.
6. **The two prints compared showed no substantive difference.** That is a negative
   result on a one-page sample and is reported as such.

## 6. Uncertainty

| # | Unresolved | What would resolve it |
|---|---|---|
| U-1 | Whether a $5,200.00 wire was sent on December 19, 2023 | The wire confirmation or MT-103 from the sending bank |
| U-2 | What TXN-007 and TXN-015 represent | The servicer's transaction-code key; a 30(b)(6) topic is more reliable |
| U-3 | Whether the three NSF reversals reflect actual returns | Plaintiffs' bank records |
| U-4 | Why the $10,000 curtailment was reversed | Reason code and system notes |
| U-5 | What became of the $855 | Servicer records and the bank statement |
| U-6 | The $70.00 residual | SLS cash-application detail |
| U-7 | Whether any print of the statement differs from another | Every generated print, with dates |

**Deliberately not computed:** interest, any recomputed payoff, any "true" balance. Each
needs inputs the sources do not contain.

## 7. Missing material

Rows in SRC-013 marked `[COL?]` — notably TXN-033's $729.13 — are **not verified** and
appear in no computation. Beyond those:

1. **Plaintiffs' depositary records** (GAP-014) — decisive for the strongest theory.
2. **The servicer's transaction-code key** (GAP-010).
3. **Reason codes for the 09/26/2023 reversal** (GAP-015).
4. **Disposition of the $855.00** (GAP-016).
5. **Fee authority: the note and deed provisions, the fee schedule, the invoices** (GAP-017).
6. **Every print of the account history** (GAP-018).
7. **SLS cash-application detail for 09/13–09/14/2023** (GAP-013).
8. **Any wire confirmation** for the asserted December 2023 remittance (GAP-002).

## 8. Confidence

**Medium.** The transcription and classification are high-confidence: SRC-013 is a
native-text rendering, every row was read, every reversal is paired to a named row, and
the ledger's own ending balances reconcile to the classifications (the $1,899.56 ending
unapplied balance matching the single unreversed tender is the cleanest internal check
available, and it holds).

The cap comes from the 09/14/23 cluster, where several rows omit printed columns and the
per-row running balance cannot be reconciled line by line — those are excluded from
arithmetic — and from the December 19, 2023 wire date, which is a client assertion with
no source in this manifest and which I have treated as an input to test rather than a
fact.

## 9. Recommended next action

Obtain Plaintiffs' bank records for April–July 2025 and for December 2023. They answer
three of the seven disputed amounts, they are obtainable this week from the client's own
institution without any discovery gate, and no other route reaches them. If the 2025
tenders cleared and were not returned, three $0.00 NSF entries on the servicer's ledger
become a serious problem for Shellpoint.

## 10. Human decisions required

| ID | Decision | Why it cannot be decided from the record | Blocking |
|---|---|---|---|
| HD-15 | Obtain the depositary records for the 2025 tenders and the asserted 2023 wire | Only the client's bank can show whether a payment cleared | **Yes** |
| HD-16 | Whether to keep pleading a $5,200.00 payment at all | A litigation judgment; the later pleading already omits it | **Yes** |

