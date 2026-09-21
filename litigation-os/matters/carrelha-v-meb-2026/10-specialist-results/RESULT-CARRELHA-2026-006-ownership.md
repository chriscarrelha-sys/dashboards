---
doc_type: result
schema_version: "1.1"
assignment_id: ASSIGN-CARRELHA-2026-006
matter_id: CARRELHA-2026
produced_by: securitization-ownership-analyst
produced_date: 2026-09-21
assignment_answered: partial
short_conclusion: >
  The defendants' own records name two different entities in connection with ownership of
  this loan - FREED Mortgage Trust 2022-HE1 in the MERS registry, MEB Loan Trust VIII in
  the servicer's letter and the recorded assignment - and give MEB two different entity
  types. That is a genuine records-reliability finding available without any standing
  problem. It is NOT a title defect and must not be pleaded as one.
confidence: low
confidence_basis: >
  Low deliberately. Not one primary ownership document was read: no note, no allonge, no
  endorsement, no assignment instrument, no trust agreement, no loan schedule. Every
  finding rests on a pleading's quotation of exhibits nobody has opened. The Georgia
  standing rule that governs what any of this is worth is UNRESEARCHED.
human_decisions_required:
  - id: HD-17
    question: "Authorize retrieval of the recorded Security Deed (DB 10835 pp.740-754) and the recorded Assignment (DB 11187 p.717) from the Forsyth County Clerk."
    why_human: "Public-record retrieval is an outward-facing act requiring authorization. Every ownership finding here currently rests on a quotation rather than an instrument."
    blocking: true
  - id: HD-18
    question: "Route to legal-research-paralegal: what Ames v. JP Morgan Chase Bank, 298 Ga. 732 (2016) holds about borrower standing to challenge an assignment, and what its carveouts are."
    why_human: "This analyst does not decide the law, and the answer determines whether several findings here are worth anything at all."
    blocking: true
recommended_next_action: >
  Pull the two recorded instruments from the county clerk this week. They cost a nominal
  fee, they are obtainable today, and they would convert the matter's entire ownership
  analysis from quotation to document.
---

## 1. Assignment answered

The objective was to establish who claims what, on which documents and as of when, and to
separate inconsistencies that plausibly matter from theories courts reject.
**Answered in part.**

Answered: the entity and role map (14 rows), the transfer chronology with all eight date
types (6 rows), the authority matrix (6 rows), and the rejected-theory list.

**Not answered, and this is the dominant limitation:** no primary ownership document was
read. The note, any allonge or endorsement, the assignment instrument, the security deed,
the trust agreement, the mortgage loan schedule and the custodial records are all absent.
What was read is a pleading that quotes some of them.

## 2. Short conclusion

Three sources maintained or populated by the defendants give three different accounts
touching ownership. That inconsistency is real, documentary, and usable — as evidence that
the defendants' records are unreliable, which raises no standing question because it does
not challenge the assignment. Pleaded as a chain-of-title attack it would likely fail on
standing and would cost credibility.

## 3. Verified findings

### The five concepts, kept apart

| Concept | What the record says | Source |
|---|---|---|
| Ownership of the debt | "MEB Loan Trust VIII Trust" | Witt Letter, quoted at SRC-021 ¶ 22 |
| Security-interest assignment | MEB, recited as "a[n] CORPORATION organized under the laws of NEW YORK" | Recorded Assignment, quoted at ¶ 19 |
| Investor / reporting | "FREED Mortgage Trust 2022-HE1" | MERS ServicerID, described at ¶ 20 |
| Servicing authority | SLS 08/2022–07/2024, then Shellpoint | ¶ 24; SRC-013 "New Loan" 07/07/24 |
| Holder / right to enforce | **NOTHING IN THE RECORD SPEAKS TO THIS** | — |

The last row is the most important. Georgia follows the debt: an assignment of the deed
alone does not establish a right to enforce the obligation. **No source reviewed says who
holds the note, whether it is endorsed, or whether an allonge exists.**

### CON-008 — the ownership inconsistency, correctly framed

First test: *do these sources answer the same question?* Partly. "Investor" in a registry
lookup and "current owner" in a servicer letter are not identical questions, and registry
fields are servicer-populated and frequently stale. So this is `unresolved`, not a proven
contradiction.

But the innocent explanations do not dissolve it. The registry value was retrieved
**2026-03-24**, more than two years after the February 2024 assignment — so "not yet
updated" requires a two-year lag. And MEB is described as a New York *corporation* in one
instrument and as a *trust* at a Delaware corporate-trust-services address in another.

**What this is worth:** evidence that the defendants' own records disagree about a basic
fact, going to the reliability of the records underlying every figure in the case, and
supporting a document request and a 30(b)(6) topic. **What it is not worth:** a
chain-of-title attack.

### The FREED trust — what the DBRS release does and does not establish

`[VERIFIED]` from SRC-023: FREED Mortgage Trust 2022-HE1 exists; Cut-Off Date
**September 30, 2022**; **3,292** HELOCs, $174,776,710 UPB; **Lendage originated all of
them**; sponsor is Series B of Freedom Consumer Credit Fund, LLC.

`[UNRESOLVED]`: whether *this* loan is in that pool. A July 2022 Lendage HELOC fits the
originator and the window and would fall before the cut-off. **Fitting a profile is not
membership.** A rating-agency press release identifies no individual loan. Only the
mortgage loan schedule, the custodian or the trustee can establish it.

### Transfer chronology — anomalies with their ordinary explanations

| ID | Anomaly | Ordinary explanation | Materiality |
|---|---|---|---|
| TRF-002 | Assignment recorded 2024-02-19, ~19 months after origination and in the same month SLS wrote about the default; recites MEB as a NY corporation | Assignments are routinely prepared only when needed, in practice at default; recording lag is normal; the entity-type recital is most likely a form-field error | unknown-pending-research |
| TRF-004 | Registry names FREED as investor 2026-03-24 while the assignment and letter name MEB | Different questions; registry fields are stale and servicer-populated | **material** |
| TRF-005 | Doc. 34 says servicing transferred "on or about June 20, 2024"; the ledger boards on 07/07/24 | Transfer, effective and boarding dates are three different events | **immaterial — recorded and dismissed** |
| TRF-006 | Doc. 34 recites McCalla retained July 2025; the ledger pays McCalla from 08/12/2024 | The 2024 payments likely relate to the earlier SLS-era foreclosure, with a fresh 2025 retention | **material** |

**Execution and notarization dates are `UNVERIFIED` for every instrument** — they are
precisely what the instruments would show, and no instrument was read.

### Rejected-theory warning list — required output

| Theory | Why it fails | Do not plead |
|---|---|---|
| Securitization split the note from the deed, voiding the lien | Courts overwhelmingly reject the split-the-note theory; the security follows the debt | **No** |
| The transfer breached the trust's own agreement, so it is void | The borrower is not a party to that agreement; many courts hold such a breach voidable, not void | **No** |
| A defective assignment means nobody can foreclose | The obligation survives; at most a different party enforces | **No** |
| No recorded assignment between owners, so no transfer occurred | Registry structures exist precisely to avoid recording each transfer | **No** |
| The FREED/MEB inconsistency proves MEB owns nothing | Two records answering different questions; and standing | **No — but see CON-008 for the framing that does work** |
| MEB is recited as a corporation, so the assignment is void | A form-field error in a recital is not a defect in the conveyance | **No** |

**The forum-specific rule for every row above is `UNRESEARCHED`.** SRC-021 ¶ 3 is drafted
around *Ames v. JP Morgan Chase Bank*, 298 Ga. 732 (2016), which has not been read in this
matter. HD-18.

### The road that avoids the standing problem entirely

Theories attacking the *chain* mostly fail on standing. Theories attacking the
*underlying obligation* belong to the borrower and raise no standing question at all —
which is exactly what Count IX (failure of consideration) does, and exactly the question
Judge Bagley identified as controlling many claims. **On this record that is the stronger
road**, and it depends on the origination and disbursement file (GAP-001), not on the
securitization.

## 4. Source citations

| Source | Used for | Pinpoints |
|---|---|---|
| SRC-021 | ¶¶ 17–25: origination, assignment recital, registry lookup, Witt Letter quotation, servicing dates | as cited |
| SRC-023 | The FREED trust's existence, cut-off date, pool composition, sponsor and originator | pool and sponsor paragraphs |
| SRC-012 | Shellpoint's debt-collector admission and designated address | notices page |
| SRC-010 | Origination, assignment, servicing and foreclosure-counsel background | Doc. 34 at 3 n.4 |
| SRC-013 | The 07/07/24 boarding entry; McCalla payee entries from 08/12/2024 | p.3 |

Registers: `07-evidence/entity-role-map.csv` (14), `transfer-chronology.csv` (6),
`authority-matrix.csv` (6). CON-008 added to the contradiction register.

**Documents relied on but NOT read: Ex. 1 (Witt Letter), Ex. 5 (recorded assignment),
Ex. 6 (MERS lookup).** Every ownership finding is at one remove.

## 5. Contrary information

1. **The strongest point against everything here is standing.** Georgia law sharply
   limits a borrower's ability to challenge an assignment to which they are not a party.
   If that bar applies as Defendants will argue, most of this analysis supports discovery
   and impeachment rather than a claim.
2. **Every innocent explanation in the transfer chronology is a real one.** Recording lag
   is normal. Assignments prepared at default are normal. Form-field errors in recitals
   are common. A judge who has seen many of these will start there.
3. **The FREED connection is consistency, not membership.** Nothing identifies this loan
   in that pool, and saying otherwise would be an overstatement a single document could
   refute.
4. **TRF-005 is not a conflict at all** and is recorded as immaterial so it is not argued.
5. **MERS asserts nothing against Plaintiffs on this record.** It is a defendant holding a
   nominee role with no beneficial interest.

## 6. Uncertainty

| # | Unresolved | What resolves it |
|---|---|---|
| U-1 | Who holds the note, and whether it is endorsed or bears an allonge | The note itself; the custodian |
| U-2 | Whether this loan is in the FREED pool | The mortgage loan schedule or custodial certification |
| U-3 | Execution, notarization and effective dates for the assignment | The instrument |
| U-4 | Whether Plaintiffs may challenge the assignment at all | *Ames* — UNRESEARCHED |
| U-5 | Whether US Bank Trust N.A. has any role beyond a mailing address | Trust documents. **No source states it is trustee or custodian; do not infer it** |
| U-6 | Whether there were two distinct foreclosure processes | The 2024 SLS foreclosure file |

## 7. Missing material

**Everything.** Stated precisely, because the absence is the finding:

1. **The Note**, with all endorsements and any allonge (GAP-019).
2. **The recorded Assignment and the recorded Security Deed** — both public records,
   obtainable today (GAP-020).
3. **The MERS ServicerID lookup itself** (Ex. 6) — re-runnable today.
4. **The trust's governing agreement and the mortgage loan schedule** (GAP-021).
5. **The custodian's certification and exception report.**
6. **Purchase and sale agreements** by which MEB acquired any interest.
7. **The servicing agreement and any power of attorney.**

None of these is in the manifest. **Their absence from these sources is not evidence of
their absence from the world** — nobody has looked in a loan file.

## 8. Confidence

**Low**, and deliberately so. Not one primary ownership document was read. The
entity-role map, the transfer chronology and the authority matrix are built from a
pleading's quotations of exhibits that were not opened, from a rating-agency press
release that identifies no individual loan, and from a servicer letter quoted at second
hand.

The findings are honest about this — every authority row states what the document does
**not** establish, and every anomaly carries its ordinary explanation — but no amount of
care compensates for not having read the instruments. **Two of them are public records
obtainable today for a nominal fee.** Until they are pulled, this analysis should not be
relied on in any filing.

## 9. Recommended next action

Pull the recorded Security Deed (DB 10835, pp. 740–754) and the recorded Assignment
(DB 11187, p. 717) from the Forsyth County Clerk, and re-run the MERS ServicerID lookup
for MIN 1015066-5000019200-2. All three are obtainable this week without discovery, and
together they would move the matter's entire ownership analysis from quotation to
document. In parallel, route *Ames* to research — it determines what any of this is
worth.

## 10. Human decisions required

| ID | Decision | Why it cannot be decided from the record | Blocking |
|---|---|---|---|
| HD-17 | Authorize retrieval of the two recorded instruments | Public-record retrieval is an outward-facing act; every finding here is at one remove without them | **Yes** |
| HD-18 | Route *Ames* to legal research | This analyst does not decide the law, and the answer governs what these findings are worth | **Yes** |

