---
doc_type: result
schema_version: "1.1"
assignment_id: ASSIGN-CARRELHA-2026-007
matter_id: CARRELHA-2026
produced_by: discovery-planning-analyst
produced_date: 2026-09-21
assignment_answered: full
short_conclusion: >
  Nine requests across five instruments, every one traced to a gap and an element. The
  plan's most important finding is that five of the matter's blocking gaps need no
  discovery at all: two are public records and three are in the client's own files or
  their bank's. Nothing may be served - the discovery gate is unverified.
confidence: medium
confidence_basis: >
  High on the traceability: every request closes a named gap and serves a named element,
  and every one is directed to a single party with a stated basis. Medium overall because
  the discovery gate is unverified, numerical limits are unknown, and local rules have
  not been obtained - all of which could change sequencing and scope.
human_decisions_required:
  - id: HD-19
    question: "Authorize Phase 0: request the client's bank records, and retrieve the recorded instruments and the published foreclosure notices."
    why_human: "Each is an outward-facing act - a request to a bank, a county clerk, or a newspaper archive - and requires authorization even though none is discovery."
    blocking: true
  - id: HD-20
    question: "Confirm from the docket whether the Rule 26(f) conference has occurred, whether a scheduling order exists, and what numerical limits apply."
    why_human: "Requires PACER. Nothing in this plan may be served until this is answered."
    blocking: true
recommended_next_action: >
  Do Phase 0 this week. It requires no discovery gate, costs almost nothing, and closes
  more blocking gaps than the entire party-discovery plan.
---

## 1. Assignment answered

The objective was to convert gaps, contradictions and at-risk elements into a sequenced,
defendant-specific plan. **Answered in full.**

Nine requests across five instruments in
`09-research/discovery/request-to-issue.csv`; seven custodians in
`07-evidence/custodian-map.csv`; a six-phase roadmap below.

Every request traces to at least one `GAP-###` and one element. None is directed to
"all Defendants." Nothing is served.

## 2. Short conclusion

**Phase 0 is the finding.** Five blocking gaps — the bank records, the two recorded
instruments, the published foreclosure notices, and the employment documents — need no
discovery at all. A plan that leads with party discovery when the answer is a request to
the client's own bank wastes six months.

## 3. Verified findings

### Discovery gate status — read this first

| | |
|---|---|
| Rule 26(f) conference | **UNVERIFIED.** SRC-004, dated 2026-08-19, refers to it in the future tense |
| Scheduling order | **None among the sources** |
| Discovery period | **UNVERIFIED** |
| Numerical limits | **UNVERIFIED** |
| Stay in effect | **UNVERIFIED** |

**Nothing in this plan may be served until the gate is confirmed.** Every row in the
matrix carries `gate_status: GATE-UNVERIFIED`. Discovery served before the rules permit
it is objectionable on that ground alone, however well targeted.

### The roadmap

| Phase | What | Gate needed | Why this order |
|---|---|---|---|
| **0** | **Self-help: bank records; recorded instruments; published notices; client's own sent file** | **None** | Closes five blocking gaps with no discovery, no objections, and no waiting |
| 1 | Core document requests to Shellpoint and SLS | Yes | Documents before testimony |
| 2 | Interrogatories on what documents cannot answer | Yes | Sworn answers where no document may exist |
| 3 | Third-party subpoena to the employer and screening vendor | Yes | Non-parties are slow — start early |
| 4 | Requests for admission | Yes | Needs to know what is genuinely disputed |
| 5 | 30(b)(6) and individual depositions | Yes | Needs a complete document set |

### Phase 0 in detail — no discovery required

| Item | Custodian | Closes | Why no discovery |
|---|---|---|---|
| Depositary records, Apr–Jul 2025 and Dec 2023 | Plaintiffs' own bank (CUS-003) | GAP-014, GAP-002 | The client can request their own records |
| Recorded Security Deed (DB 10835 pp.740–754) and Assignment (DB 11187 p.717) | Forsyth County Clerk (CUS-005) | GAP-020 | Public records, nominal fee |
| Published notices of sale and publication affidavits | County legal organ (CUS-004 for the affidavits) | GAP-007 | Newspaper legal notices are public |
| The client's own sent NOE/RFI file and the thirteen acknowledgments | Plaintiffs | GAP-003 | Plaintiffs sent and received them |
| MERS ServicerID lookup for MIN 1015066-5000019200-2 | Public | GAP-020 | Re-runnable today |

**GAP-003 deserves emphasis.** It is the element on which Counts I–III currently fail, and
the documents are said to be in the client's possession. No request in Phase 1 matters as
much as asking the client for their own file.

### The nine requests, by priority

| ID | Instrument | To | Closes | Why it matters |
|---|---|---|---|---|
| RFP-01 | Document request | Shellpoint | GAP-014 | The four 2025 tenders — targets the strongest documented fact |
| ROG-01 | Interrogatory | Shellpoint | GAP-014 | Why three NSF entries were recorded at **$0.00** and whether anything was actually returned |
| RFP-03 | Document request | Shellpoint | GAP-003 | The NOE/RFI file and the designated-address policy — the element Counts I–III fail on |
| RFP-02 | Document request | Shellpoint | GAP-019, GAP-020 | Ownership records and the MERS investor-field audit trail |
| TOPIC-01 | 30(b)(6) | Shellpoint | GAP-010, GAP-015 | What the ledger's own codes mean |
| SUBP-02 | Subpoena | Mercer Advisors / screening vendor | GAP-008 | The largest damages figure in the case |
| SUBP-01 | Subpoena (fallback) | Plaintiffs' bank | GAP-014 | Phase 0 should make this unnecessary |
| RFP-04 | Document request | SLS | GAP-015, GAP-016 | The $10,000 reversal and the $855 — **SLS-era events** |
| RFA-01 | Request for admission | Shellpoint | GAP-014 | Single fact: the 05/17/25 tender was not returned |

### Two design choices worth stating

**ROG-01 is paired with RFP-01 deliberately.** A document request for return notices
produces nothing if no return notice exists — which is precisely what we suspect. A sworn
interrogatory answer cannot dodge that way.

**TOPIC-01 rather than a document request for the code key.** If no code-key document
exists, the request fails. A 30(b)(6) topic binds the company to an answer either way, and
an unprepared witness on a properly noticed topic is its own remedy.

### Anticipated objections

| Objection | Requests | Force | Narrowing applied |
|---|---|---|---|
| Relevance — ownership is irrelevant because Plaintiffs lack standing to challenge the assignment | RFP-02 | **Moderate** | Reframed as a records-reliability request: it asks Defendants to reconcile two of their **own** inconsistent records, not to defend the assignment |
| Party status — SLS merged into NewRez | RFP-04 | **Moderate** | Directed to SLS and, in the alternative, to NewRez as successor. The merger is Defendants' own assertion; a successor holds the predecessor's records |
| Overbreadth | TOPIC-01, RFP-03 | Weak as narrowed | Bounded to one loan, three identified code behaviours, and the designated-address policy only |
| Burden | RFP-01 | Weak | Four identified transactions over eight weeks against the party that generated them |
| Third-party burden / confidentiality | SUBP-02 | Moderate | Single-candidate scope; offer a protective order |
| Privilege | RFP-04, CUS-004 | Strong as to counsel communications | Target the non-privileged publication records first |

## 4. Source citations

| Source | Used for |
|---|---|
| `07-evidence/missing-evidence.csv` (21 gaps) | The input set — every request traces to one |
| `07-evidence/claim-survival-matrix.csv` | Elements marked `gap` and `pleaded-only` |
| `07-evidence/contradiction-register.csv` | CON-003, CON-008 — conflicts a document could resolve |
| `07-evidence/disputed-amounts.csv` | The seven accounting questions |
| `07-evidence/entity-role-map.csv` | Who holds what |
| SRC-004 | The Rule 26(f) timing signal |
| SRC-013 | Transaction dates and payee names for the requests |

Registers: `09-research/discovery/request-to-issue.csv` (9),
`07-evidence/custodian-map.csv` (7).

## 5. Contrary information

1. **The gate may be closed.** If no Rule 26(f) conference has occurred, everything in
   Phases 1–5 is premature and serving it would draw an objection that taints the
   well-targeted requests along with the rest.
2. **SRC-004 suggests requests may already have been served prematurely.** Plaintiffs'
   First Requests for Production are dated 2026-08-19 and refer to the Rule 26(f)
   conference in the future tense. If they were served, that is a live problem this plan
   does not solve. **ISS-009.**
3. **RFP-02 will draw the standing objection**, and it has moderate force. The reframing
   helps; it does not eliminate it.
4. **Most of this plan may be unnecessary.** If Phase 0 produces the bank records, the
   client's NOE file and the recorded instruments, the highest-value questions in the
   matter are answered without serving anything.
5. **SLS's party status is contested**, so RFP-04 may need to go to NewRez as successor.

## 6. Uncertainty

| # | Unresolved | Effect |
|---|---|---|
| U-1 | Whether the discovery window is open | Nothing may be served |
| U-2 | Numerical limits on interrogatories and depositions | ROG-01 is one of a limited number; the budget is unknown |
| U-3 | Whether SRC-004 was actually served | If it was, a Rule 26(d)(1) problem exists now |
| U-4 | Local rules and standing orders | May impose conferral requirements and change sequencing |
| U-5 | Whether SLS must be served separately or through NewRez | Affects RFP-04's addressee |

## 7. Missing material

1. **The docket and any scheduling order** — without them the gate cannot be confirmed.
2. **N.D. Ga. Local Rules 16 and 26** and both judges' standing orders.
3. **Whether SRC-004 was served, and on whom.**
4. **Any discovery already served or responded to**, to avoid duplication.
5. **A protective order**, if one exists or is needed before SUBP-02.

## 8. Confidence

**Medium.** The traceability is high-confidence: every request closes a named gap and
serves a named element, every one is directed to a single party with a stated basis for
believing that party holds the material, and every priority-1 request has been narrowed
against its anticipated objection.

The cap is entirely procedural. The gate is unverified, numerical limits are unknown, and
local rules have not been obtained. Those do not change *what* to ask for; they change
*when* and *how much*, and until they are known this is a plan rather than a schedule.

## 9. Recommended next action

Do Phase 0 this week: request the client's bank records for April–July 2025 and December
2023, pull the two recorded instruments from the Forsyth County Clerk, retrieve the
published foreclosure notices, re-run the MERS lookup, and ask the client for their own
NOE/RFI file and the thirteen acknowledgments. None requires the discovery gate to be
open. Together they close five blocking gaps, including the one on which Counts I–III
currently fail.

## 10. Human decisions required

| ID | Decision | Why it cannot be decided from the record | Blocking |
|---|---|---|---|
| HD-19 | Authorize Phase 0 retrievals | Each is an outward-facing act requiring authorization, even though none is discovery | **Yes** |
| HD-20 | Confirm the discovery gate from the docket | Requires PACER. Nothing may be served until answered | **Yes** |

**Nothing in this plan has been served, sent, filed or transmitted, and nothing may be
without an express authorization logged in `11-decisions/attorney-decision-log.csv`.**

