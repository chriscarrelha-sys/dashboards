---
doc_type: result
schema_version: "1.1"
assignment_id: ASSIGN-CARRELHA-2026-008
matter_id: CARRELHA-2026
produced_by: adversarial-redteam-analyst
produced_date: 2026-09-21
assignment_answered: full
short_conclusion: >
  The matter's strongest theory - that Shellpoint is a debt collector that took a payment
  it never applied while charging $8,408.74 in fees against a frozen balance - survives all
  five seats. Almost nothing else does in its current form. Ten attacks are ranked; the top
  three are curable, and two of those are curable by redraft alone, today, at no cost.
confidence: medium
confidence_basis: >
  High on the six record-based attacks, each of which rests on a document already in the
  manifest and several of which use Plaintiffs' own exhibits. Medium overall because four
  attacks rest on my own reading rather than researched authority, the element lists I am
  attacking are themselves UNRESEARCHED, and the pleading I attacked may not be the one
  that was filed.
human_decisions_required:
  - id: HD-21
    question: "Decide whether to make the four redraft-only corrections before any filing or response deadline."
    why_human: "A litigation judgment about timing and about how much attention to draw to curable defects."
    blocking: true
  - id: HD-22
    question: "Decide whether to narrow the FDCPA count to conduct on or after 2026-03-02 rather than plead a tolling theory."
    why_human: "A strategic choice between two defensible routes, with different downside profiles."
    blocking: false
recommended_next_action: >
  Make the four redraft-only corrections. They cost nothing, they remove the three cheapest
  points the defense has, and one of them - the paragraph 29 correction - makes our best
  allegation stronger rather than weaker.
---

## 1. Assignment answered

The objective was to attack from all five seats and say whether the strongest theory
survives. **Answered in full.**

Ten attacks in `07-evidence/attack-surface.csv`, ranked, each written in the opponent's
voice with its best support and our honest answer. Every attack ranked in the top five
carries a corrective action. Coverage across all five seats: defense (4), Rule 11 (2),
magistrate (1), district judge (1), appellate (1), with one attack counted in two seats.

## 2. Short conclusion

**Yes — the strongest theory survives all five seats.** Shellpoint's debt-collector
status is a party admission; it boarded the loan after its own reckoning of default; it
received $1,899.56 on 2025-05-17 that it never reversed and never applied; and it charged
$8,408.74 in default fees against a principal that has not moved since December 2023.
Every element of that is documented in the defendants' own records.

Almost everything else is currently vulnerable, and most of it is curable.

## 3. Verified findings

### The three that matter this month

**1. ATK-001 — Counts I–III die on the RESPA notice element.** *(defense, likelihood
high, claim-dispositive)*

> "Plaintiffs plead ten written inquiries and thirteen acknowledgments and produce none.
> The only channel they identify is the CFPB complaint portal. Shellpoint's own
> correspondence — which Plaintiffs rely on for other purposes — states the designated
> error-resolution address is 'SLS Default - SMS P.O. Box 10826 Greenville, SC
> 29603-0826.' A complaint to a regulator is not a notice of error to that address."

**Our answer is weak on the present record and strong if the documents exist.** If the
thirteen acknowledgments exist, Shellpoint treated the submissions as triggering its
duties — powerful evidence they were qualifying. **Corrective action CA-01: ask the client
for their own sent file this week.** This is the single highest-value hour available.

**2. ATK-002 — our own exhibit contradicts ¶ 29.** *(Rule 11, likelihood high, credibility
risk)*

> "Paragraph 29 states each of the four trial payments was reversed. The ledger Plaintiffs
> attach shows the May 17, 2025 payment was never reversed and remains the ending
> unapplied balance."

Legal risk is low — the error *understates* our own case. Credibility cost is real and it
is **free to fix**. **CA-02: plead three reversals and one retained-but-unapplied tender.**
The corrected allegation is stronger than the current one.

**3. ATK-003 — the FDCPA count is facially time-barred in part.** *(defense, likelihood
high)*

Suit filed 2026-03-02; conduct pleaded from 2023 and 2024; no tolling theory pleaded.
**CA-03: narrow to conduct on or after 2026-03-02**, which retains the entire 2025
trial-payment sequence and the whole December 2025 – January 2026 four-letter sequence.
**The one-year period at § 1692k(d) is `UNRESEARCHED` — confirm before acting.**

### Full ranking

| Rank | Attack | Seat | Likelihood | Damage | Our answer | Curable |
|---|---|---|---|---|---|---|
| 1 | ATK-001 RESPA notice element | defense | high | claim-dispositive | weak | with evidence |
| 2 | ATK-002 ¶ 29 vs our own exhibit | rule11 | high | partial | adequate | **by redraft** |
| 3 | ATK-003 FDCPA limitations | defense | high | partial | strong | **by redraft** |
| 4 | ATK-004 Count IX — debt-consolidation loan | defense | high | claim-dispositive | adequate | with evidence |
| 5 | ATK-005 wrongful foreclosure — no publication, no special damages | defense | high | claim-dispositive | weak | with evidence |
| 6 | ATK-006 ¶ 31 sues the wrong defendant | defense | high | partial | strong | **by redraft** |
| 7 | ATK-007 "longer than the pleading I struck" | magistrate | medium | partial | strong | **by redraft** |
| 8 | ATK-009 "what is actually triable here?" | district-judge | medium | partial | adequate | with facts |
| 9 | ATK-008 preservation of the remand arguments | appellate | medium | partial | strong | n/a |
| 10 | ATK-010 specificity of "ten" and "thirteen" | rule11 | low | partial | adequate | with evidence |

### ATK-004, stated properly, because it is the one people will underrate

Count IX (failure of consideration) matters more than its rank suggests: it is the one
count that avoids the *Ames* standing bar, and Judge Bagley has already said many claims
turn on whether proceeds were delivered. But the defense answer is strong and uses our own
paragraph:

> "This is a debt-consolidation HELOC. Plaintiffs plead that $51,409.50 reached their
> account and themselves describe it as a cash-out consistent with a $50,000 cap. The
> product is designed to pay creditors directly. The disbursement schedule will show where
> the balance went."

**Do not plead Count IX as though GAP-001 were already closed.** It is the count most
exposed to a single document.

### Credibility-risk list

| # | Item | Why it costs credibility | Spillover | Action |
|---|---|---|---|---|
| 1 | ¶ 29 contradicted by our own Exhibit 15 | The cheapest point a defendant can make | Every other ledger-based allegation | **CA-02** |
| 2 | ¶ 31 sues Shellpoint for SLS-era conduct our own ¶ 27 dates | Shows the pleading was not checked against its own exhibit | Every defendant-specific allegation | **CA-06** |
| 3 | ¶ 3 miscites its own count numbers | In a pleading filed under an order to replead carefully, self-inconsistency invites a harsh reading | The magistrate's whole reading | **CA-07** |
| 4 | SRC-007's "RED FLAG" annotation on the origination-booking row | Advancing it would be refuted in one sentence | Every accounting argument | **CA-09 — do not use SRC-007** |
| 5 | Any securitization theory from the rejected list | A theory the forum rejects makes the rest look weaker | The whole pleading | **CA-10 — keep them out** |

### Curability

| Defect | Curable? | By when |
|---|---|---|
| ¶ 3 count miscite (PD-13) | **curable-by-redraft** | today |
| ¶ 29 reversal count (PD-08) | **curable-by-redraft** | today |
| ¶ 31 defendant (PD-07) | **curable-by-redraft** | today |
| Count IX defendants (PD-04) | **curable-by-redraft** | today |
| FDCPA limitations (PD-12) | **curable-by-redraft** | before filing |
| RESPA notice element | curable-only-with-evidence | client's file |
| Special damages | curable-only-with-evidence | client + subpoena |
| Publication element | curable-only-with-evidence | public records |
| Count IX consideration | curable-only-with-evidence | GAP-001 |
| GFBPA ante litem (PD-11) | **possibly incurable** if notice was never given | check now |

**Nothing in this matter is currently identified as incurable except possibly the GFBPA
ante litem requirement** — and that is at `low` confidence because Count XI was not read.

### Corrective-action plan

| ID | Action | Prevents | Owner | Effort | Done when |
|---|---|---|---|---|---|
| CA-01 | Ask the client for the NOE/RFI file and the thirteen acknowledgments | ATK-001, ATK-010 | attorney | 1 hour | Documents in hand or absence confirmed |
| CA-02 | Correct ¶ 29 to three reversals + one retained tender | ATK-002 | drafter | 10 min | Text matches SRC-013 |
| CA-03 | Narrow the FDCPA count to post-2026-03-02 conduct | ATK-003 | drafter | 30 min | No pre-period conduct pleaded, or tolling pleaded with basis |
| CA-04 | Obtain the origination and disbursement file | ATK-004 | attorney | days | GAP-001 closed |
| CA-05 | Retrieve published notices and the employment documents | ATK-005 | attorney | days | GAP-007, GAP-008 closed |
| CA-06 | Reattribute ¶ 31 to SLS | ATK-006 | drafter | 5 min | Text matches the ledger's PriorServicer marker |
| CA-07 | Renumber ¶ 3's count references | ATK-007 | drafter | 5 min | ¶ 3 matches the headings |
| CA-08 | Prepare a one-page narrowing statement for the court | ATK-009 | attorney | 1 hour | Ready if asked |
| CA-09 | Remove SRC-007 from the working set | credibility risk 4 | attorney | 5 min | Not cited anywhere |
| CA-10 | Keep the rejected-theory list out of every draft | credibility risk 5 | drafter | ongoing | No listed theory appears |

## 4. Source citations

| Source | Used for |
|---|---|
| `07-evidence/pleading-defects.csv` | The 14-item scan underlying ATK-002, 003, 006, 007 |
| `07-evidence/claim-survival-matrix.csv` | Element status underlying ATK-001, 004, 005, 009 |
| `07-evidence/pleading-support-table.csv` | Rule 11 ratings underlying ATK-002, 010 |
| `07-evidence/disputed-amounts.csv` | The ledger facts behind ATK-002 and ATK-006 |
| `07-evidence/authority-matrix.csv` | ATK-004's standing context |
| SRC-021, SRC-013, SRC-012, SRC-010, SRC-011 | The primary record |

Register: `07-evidence/attack-surface.csv` (10 rows, 5 seats).

**Basis type is recorded on every attack.** Six are `record-based`; four are
`analyst-reading`. **None rests on researched authority**, because the element lists and
limitations periods in this matter are themselves `UNRESEARCHED`.

## 5. Contrary information

In this skill, *contrary information* is what helps our own side. The honest list:

1. **The core theory is genuinely strong and genuinely documented.** Party admission of
   debt-collector status; a payment received, never reversed, never applied for ten
   months; $8,408.74 in fees against an unmoving balance. All from the defendants' own
   records. No seat dented it.
2. **The pleading is much better than the one the court struck.** No count incorporates a
   preceding count; numbering is continuous; Lendage is out of the caption; the $5,200
   allegation is gone. Three of those track findings from this matter's own analysis.
3. **Three of the top six attacks are curable in under an hour**, and one correction makes
   our allegation stronger.
4. **The pro se question reserved in *Vibe Micro* n.6 is genuinely open**, which cuts
   against the magistrate seat's harshest reading.
5. **The 05/17/2025 tender has no innocent explanation on the ledger's face.** The other
   three do. One clean fact is worth more than three contested ones.
6. **Count IX avoids the standing bar** that would sink a chain-of-title theory.

## 6. Uncertainty

| # | Unresolved | Effect on this analysis |
|---|---|---|
| U-1 | Which pleading was filed | I attacked SRC-020. If SRC-001 was filed, ATK-002/003/006 change and several new attacks appear |
| U-2 | Element lists are UNRESEARCHED | I attacked elements I cannot confirm are correctly stated |
| U-3 | § 1692k(d)'s period | ATK-003's severity depends on it |
| U-4 | *Ames* | ATK-004's strategic weight depends on it |
| U-5 | Counts X–XVI were not read | Six counts were not attacked at all |
| U-6 | No actual motion to dismiss is in the record | The defense case here is reconstructed, not observed |

## 7. Missing material

1. **Defendants' actual motion to dismiss**, which would replace my reconstruction.
2. **Counts X–XVI in full** — six counts unexamined.
3. **Verified element lists and limitations periods.**
4. ***Ames*, and the § 1692k(d) period.**
5. **Section J of the pleading** — whether it is executed.
6. **The docket**, for anything filed since 2026-07-31.

**Six counts of sixteen were not attacked. This is not a complete attack surface** and
should not be relied on as one.

## 8. Confidence

**Medium.** The six `record-based` attacks are high-confidence: each rests on a document
in the manifest, and three of them use Plaintiffs' own exhibits against Plaintiffs' own
allegations — the kind of attack that does not depend on judgment at all.

The cap has three sources. Four attacks are `analyst-reading` rather than researched
authority. The element lists I attacked are themselves `UNRESEARCHED`, so an element
wrongly stated would make an attack on it wrong too. And ten counts of sixteen were
analysed while six were not read — so the attack surface is incomplete by construction,
which is stated here rather than hidden.

## 9. Recommended next action

Make the four redraft-only corrections today: ¶ 3's count numbers, ¶ 29's reversal count,
¶ 31's defendant, and Count IX's defendants. Together they take under an hour, require no
new fact, and remove the three cheapest points the defense has — one of which currently
costs us our best allegation. Then ask the client for the NOE/RFI file, which is the
single highest-value hour available in this matter.

## 10. Human decisions required

| ID | Decision | Why it cannot be decided from the record | Blocking |
|---|---|---|---|
| HD-21 | Make the four redraft-only corrections before any filing or response deadline | A litigation judgment about timing and about how much attention to draw to curable defects | **Yes** |
| HD-22 | Narrow the FDCPA count, or plead a tolling theory | A strategic choice between two defensible routes | No |

