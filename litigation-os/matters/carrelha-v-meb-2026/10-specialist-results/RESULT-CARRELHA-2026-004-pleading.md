---
doc_type: result
schema_version: "1.1"
assignment_id: ASSIGN-CARRELHA-2026-004
matter_id: CARRELHA-2026
produced_by: pleading-amendment-analyst
produced_date: 2026-09-21
assignment_answered: partial
short_conclusion: >
  The 16-count pleading cures the defect Doc. 35 identified - no count incorporates a
  preceding count, numbering is continuous, and Lendage is out of the caption. Seven of
  fourteen defect tests still return findings, but every one is curable and three are
  curable by redraft alone. The pleading's most serious problem is that it understates
  its own best evidence.
confidence: medium
confidence_basis: >
  High on the structural analysis, which was performed against the pleading's own text
  and the verified Weiland holding. Medium overall because the Counts section was read
  only at heading level, element lists are UNRESEARCHED, and it is not established that
  this document - rather than SRC-001 or a third version - was filed.
human_decisions_required:
  - id: HD-12
    question: "Confirm which document was filed on or before 2026-08-21: SRC-001, SRC-020, or neither."
    why_human: "Two materially different candidate pleadings exist in the client's Drive and no docket is available. Every conclusion in this result describes SRC-020."
    blocking: true
  - id: HD-13
    question: "Confirm whether Section J of SRC-020 contains executed signatures or unfilled placeholders."
    why_human: "Section J was not read. SRC-001 carried template placeholders; whether this document does is unknown."
    blocking: true
  - id: HD-14
    question: "Decide whether to limit Count IX to MEB Loan Trust VIII and reattribute paragraph 31 to SLS."
    why_human: "Litigation judgments about which defendants to pursue on which counts."
    blocking: false
recommended_next_action: >
  Before anything is filed or any response deadline runs, make the four redraft-only
  corrections - P 3 count numbers, P 29 reversal count, P 31 defendant, and Count IX
  defendants. None requires a new fact and all four remove free points for the defense.
---

## 1. Assignment answered

The objective was to determine whether SRC-020/SRC-021 cures the Doc. 35 defects, what
new defects it introduces, and what must be corrected. **Answered in part.**

Answered: the delta between the two candidate pleadings; the full 14-item defect scan;
the claim-survival matrix for the counts the record supports; the amendment route.

Not answered: element lists are marked `UNRESEARCHED` throughout and were taken from the
pleading's own recitals rather than from controlling authority; the Counts section was
read only at heading level; Section J was not read. And it is **not established** that
this document was the one filed.

## 2. Short conclusion

The defect Doc. 35 identified is cured. The structure now matches what *Weiland*
expressly approves. Seven of fourteen defect tests still return findings — four curable
by redraft alone, three needing evidence. The most valuable finding is not a defect in
the usual sense: **paragraph 29 understates the pleading's own strongest fact**, pleading
that all four 2025 payments were reversed when the ledger it relies on shows one was not.

## 3. Verified findings

### The delta first: SRC-001 against SRC-020

Both are called "First Amended Complaint." They are different documents, and the
difference is the most useful thing in this result.

| | SRC-001 (Google Doc) | SRC-020 (markdown, 2026-08-19) |
|---|---|---|
| Counts | 9 | **16** |
| Incorporation | "Paragraphs 1 through 46" in every count | Specific paragraph lists per count |
| Numbering | Restarts in each Roman-numeral section — **ambiguous** | Continuous — unambiguous |
| Lendage in caption | **Yes**, with no count against it | **No** |
| $5,200 wire | Central to three counts | **Absent entirely** |
| TILA | Not pleaded | Count IV |
| Failure of consideration | Not pleaded | **Count IX** |
| *Ames* | Not addressed | Addressed expressly at ¶ 3 |
| Signature | Unfilled placeholders | Not read |

SRC-020 is a materially better pleading on every axis that Doc. 35 and Doc. 34 put in
issue. Three specific improvements track this matter's known problems exactly: dropping
Lendage answers Doc. 34 at 21 and 22 n.11; continuous numbering answers the ambiguity in
SRC-001; and dropping the $5,200 wire answers the Phase 1 finding that the servicer's own
ledger does not contain it.

### The defect scan — 14 tests, 7 findings

Full results in `07-evidence/pleading-defects.csv`. Summary:

**Not present (6):** incorporation of preceding counts (PD-01); conclusory/vague facts
(PD-02); claims not separated (PD-03); ambiguous cross-reference (PD-05); caption/body
mismatch (PD-06); jurisdictional defect (PD-09).

**Present and curable by redraft alone (4):**

| ID | Finding | Cure |
|---|---|---|
| PD-13 | ¶ 3 cites "Count X" and "Count XI" for failure of consideration and deed unenforceability; the headings place them at **Count IX and Count X**. Off by one. | Renumber the cross-reference |
| PD-08 | ¶ 29 pleads that **each** of four TPP payments was reversed; the ledger shows **three of four**, with the 05/17/2025 tender never reversed and standing as the Ending Unapplied Balance | Plead three reversals and one retained-but-unapplied tender |
| PD-07 | ¶ 31 attributes the $855 rejection to **Shellpoint**; the ledger marks both rows `PriorServicer` and dates them ten months before Shellpoint's own 07/07/2024 boarding, which ¶ 27 itself pleads | Reattribute to SLS |
| PD-04 | Count IX (failure of consideration) is asserted against Shellpoint and SLS, who are pleaded as servicers and not as parties to the contract | Limit Count IX to MEB |

**Present and needing evidence (3):** PD-11 GFBPA ante litem notice not shown as pleaded
(low confidence — Count XI body not read); PD-10 per-plaintiff standing not traced count
by count (low confidence — same reason); PD-12 FDCPA limitations, below.

**Not assessed (1):** PD-14 verification and signature — Section J was not read.

### The limitations exposure (PD-12)

Suit was filed 2026-03-02. The FDCPA count pleads communications from 2023 and 2024 and
pleads no tolling theory. On the pleading's own dates, conduct before 2026-03-02 is
facially outside a one-year period. **The one-year period at 15 U.S.C. § 1692k(d) is
`UNRESEARCHED` in this matter** and must be confirmed. If it holds, the cure costs
nothing: the 2025 trial-payment sequence and the entire December 2025 – January 2026
four-letter sequence are inside the period and are the strongest FDCPA conduct pleaded.

### Claim survival

Thirteen rows in `07-evidence/claim-survival-matrix.csv`, one per claim × defendant ×
element. The pattern:

- **Strongest element in the matter:** Shellpoint's debt-collector status (Count VII).
  `proved` — a party admission in SRC-012 plus its own boarding record showing it took
  the loan after its own reckoning of default.
- **Decisive gap:** the RESPA notice element. `gap`. Ten inquiries pleaded, none in the
  record, and SRC-012 shows the designated address is a PO Box while the only documented
  channel is the CFPB portal.
- **Strategically most important:** Count IX. `contested`, and it is the one count that
  avoids the *Ames* standing bar because it attacks the obligation rather than the
  assignment — which is also the question Judge Bagley said many claims turn on.

## 4. Source citations

| Source | Used for | Pinpoints |
|---|---|---|
| SRC-021 (extract of SRC-020, read in full as SRC-020) | The pleading analysed: caption, ¶¶ 2–3, 17–32, 37, 42, 116–117, count headings, incorporation samples | as cited |
| SRC-001 | The comparison document | caption, counts, signature block |
| SRC-011 (Doc. 35) | What the repleading order required | Doc. 35 at 7, 8, 9 |
| SRC-010 (Doc. 34) | Lendage's party status; loss-mitigation history | Doc. 34 at 3 n.4, 21, 22 n.11 |
| SRC-013 | Testing ¶¶ 27–32 against the ledger | pp.1–5 |
| SRC-012 | The designated error-resolution address | notices page |
| RESULT-003 | The verified *Weiland* holding at 792 F.3d 1324 | R-002 |

Registers produced: `07-evidence/claim-survival-matrix.csv` (13 rows),
`07-evidence/pleading-support-table.csv` (13 rows),
`07-evidence/pleading-defects.csv` (14 rows).

## 5. Contrary information

The defense case against this pleading, stated as they would state it:

1. **"Counts I–III fail on the notice element."** Strongest point available, and it uses
   Plaintiffs' own exhibit: SRC-012 identifies the designated address, and nothing in the
   record shows anything was sent there.
2. **"Their own exhibit contradicts ¶ 29."** Free, memorable, and true as written.
3. **"¶ 31 sues the wrong defendant, and their own ¶ 27 proves it."** Also free.
4. **"Count IX is a debt-consolidation loan."** ¶ 18 itself describes the $51,409.50 as a
   cash-out consistent with a $50,000 cap. The balance presumptively went to creditor
   payoffs, and the disbursement schedule will show it.
5. **"This is longer than the pleading you struck."** Presentation, not substance — but
   ¶ 3's miscited count numbers make it land harder than it should.

**Against my own conclusion that the Doc. 35 defect is cured:** one incorporation line
reads "incorporate ¶¶ 10, 48-53, and **the substantive facts of Counts VI, VIII, XII and
XIII**." That incorporates other *counts*, not just factual paragraphs. It is a single
instance and it incorporates facts rather than claims, so it is not the *Weiland*
type-one defect — but it is the only line in the pleading that goes near it, and a
hostile reader would quote it. **It should be rewritten to name paragraph numbers.**

## 6. Uncertainty

| # | Unresolved | Effect |
|---|---|---|
| U-1 | Which document was filed, if any | Everything here describes SRC-020 |
| U-2 | Element lists are UNRESEARCHED | A wrong element formulation silently corrupts every row resting on it |
| U-3 | Counts section read at heading level only | PD-10 and PD-11 are flags, not findings — both at `low` confidence |
| U-4 | Section J not read | PD-14 not assessed |
| U-5 | Whether § 1692k(d) carries a one-year period | PD-12's severity turns on it |
| U-6 | Whether the GFBPA ante litem notice was given | PD-11 is fatal to Count XI if it was not |

## 7. Missing material

1. **The full text of SRC-020's Counts section and Section J.** Read at heading level only.
2. **Verified element lists** for all sixteen counts, from controlling authority.
3. **The docket**, to establish which pleading is operative.
4. **The exhibits SRC-020 relies on** — Ex. 1 (Witt Letter), Ex. 5 (recorded assignment),
   Ex. 6 (MERS lookup), Ex. 7 (BofA screenshot), Ex. 9 (DBRS), Ex. 15 (ledger). Only the
   ledger and the DBRS release are in the manifest; the rest are known through the
   pleading's descriptions of them.
5. **Any motion to dismiss directed at this pleading**, which would replace my
   reconstruction of the defense case with the actual one.

## 8. Confidence

**Medium.** High on the structural analysis — the defect scan was run against the
pleading's own text, the *Weiland* comparison rests on an opinion that was opened and
read, and the four redraft-only findings are each checkable in under a minute against a
document already in the manifest.

The cap comes from three places: element lists are `UNRESEARCHED` and were taken from the
pleading's own recitals; the Counts section and Section J were not read, which is why
PD-10, PD-11 and PD-14 carry `low` confidence or none; and the operative-pleading
question is unresolved.

## 9. Recommended next action

Make the four redraft-only corrections before anything is filed or any response period
runs: renumber ¶ 3's count references; correct ¶ 29 to three reversals and one retained
tender; reattribute ¶ 31 to SLS; limit Count IX to MEB. Rewrite the one incorporation
line that references other counts' substantive facts. None needs a new fact, all five
remove free points, and the ¶ 29 correction makes the allegation stronger than it is now.

## 10. Human decisions required

| ID | Decision | Why it cannot be decided from the record | Blocking |
|---|---|---|---|
| HD-12 | Which document was filed — SRC-001, SRC-020, or neither | No docket access; two materially different candidates exist | **Yes** |
| HD-13 | Whether Section J is executed or carries placeholders | Section J was not read | **Yes** |
| HD-14 | Limit Count IX to MEB; reattribute ¶ 31 to SLS | Litigation judgments about which defendants to pursue | No |

