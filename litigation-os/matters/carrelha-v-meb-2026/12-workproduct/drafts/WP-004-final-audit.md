---
title: FINAL QUALITY GATE — TWO INDEPENDENT AUDITS
document_kind: work-product
court: |
  IN THE UNITED STATES DISTRICT COURT
  FOR THE NORTHERN DISTRICT OF GEORGIA
  GAINESVILLE DIVISION
case_number: 2:26-cv-00110-RWS-AWH
caption_plaintiff: CHRISTOPHER CARRELHA, et al.
caption_defendant: MEB LOAN TRUST VIII, et al.
plaintiffs_plural: true
defendants_plural: true
judge: Richard W. Story
magistrate_judge: Anna W. Howard
format:
  paper: Letter
  font_size: 11.5pt
  line_spacing: 1.4
  first_line_indent: 0in
  certificate_page_break: auto
signature_block:
  closing: Prepared for attorney review,
  date: 21st day of September, 2026
  lines:
    - "Litigation OS — Final Quality Gate"
    - "Matter CARRELHA-2026"
    - "Not for filing. Not served. Not sent."
---

## Audit A — source, citation, factual, accounting and procedural accuracy

Run by `audit_accuracy.py`, which is deliberately independent of the validators.
The validators ask whether each register is internally well formed. This asks
whether the **prose and the registers still agree**, which is where a matter
pack drifts once the registers stop changing. It recomputes rather than
re-reads.

### What it found, and what happened next

**Three broken transaction pairings.** TXN-010 pointed at TXN-008 and TXN-009
without either pointing back; TXN-023 held the $855 that entered suspense and
never pointed at the row recording it leaving. A relationship recorded from one
end only is one a reader traces in the wrong direction and abandons. The data
was repaired and `validate_registers.py` now enforces mutuality, which it never
had.

**A fourth gap the new rule immediately caught.** TXN-050 — the May 17, 2025
tender of $1,899.56 that was never reversed — had no counterpart and no
explanation, because there genuinely is no counterpart. That absence is the most
significant thing in the ledger, and it was being carried as a blank. The rule
was corrected to demand either a named counterpart **or** the word NONE with a
stated basis, and the row now records its own absence affirmatively.

**A discrepancy that turned out to be the audit's.** The first version of this
audit recomputed the fee total as $9,003.42 against the register's $8,408.74 —
same row count, $594.68 apart. Tracing it showed the audit was wrong twice: it
used its own regex rather than DISP-006's explicitly stated set definition, and
it summed **absolute** values, so two fee waivers totalling $832.52 were added
to the charges instead of subtracted from them.

Corrected to sum signed amounts by the ledger's own classification codes, it now
**independently confirms** DISP-006:

| Classification | Signed total |
|---|---|
| fee-disbursed | −$6,968.74 |
| fee-assessed | −$1,750.90 |
| fee-waived | +$832.52 |
| **Net effect on the account** | **−$7,887.12** |

DISP-006 states $1,440.00 in SLS-era assessments plus $6,968.74 in Shellpoint-era
disbursements. The disbursement figure reproduces exactly. The assessment figure
reproduces exactly once the three late charges ($103.39 + $103.39 + $104.12 =
$310.90) are removed, which is what DISP-006's stated assumptions exclude:
$1,750.90 − $310.90 = $1,440.00. Both halves of $8,408.74 are now confirmed by a
computation that did not exist when the figure was written.

The net figure of −$7,887.12 is a different and equally true number, on a
different definition. Both belong in the record; neither should be quoted
without its definition.

**Two work products asserting a court's finding without naming the order.**
Corrected in WP-001 and WP-002; both now cite Doc. 34 or Doc. 35 inline.

### Audit A result

PASS. Zero errors, zero warnings, after four data repairs, two validator
corrections and two corrections to the audit itself.

Standing measurements: nineteen sources cited across twenty-one documents, six
carrying a reduced access ceiling that every citing document inherits;
twenty-three citation records, seven asserting good law, none above medium;
seventy-two transactions with thirteen mutual pairings and one movement
affirmatively recorded as having no counterpart; four deadlines marked not
computable, with no prose anywhere supplying a date for any of them.

## Audit B — defence counsel and a sceptical magistrate

Read adversarially, from two seats, against the work product as it now stands.

### Seat one — defence counsel

**"Your own file says two different things about who owns this loan, and you
have read neither instrument."** This is the strongest attack available and it
lands. The ownership conflict rests on a MERS lookup and a servicer letter.
No note, no allonge, no security deed, no assignment instrument, no trust
agreement, no loan schedule has been read. `[UNRESOLVED]` is the honest label
and it is the label the register carries — but a jury instruction cannot be
built on it, and neither can a claim.

*Holds?* Yes. The answer is discovery, not argument. Nothing in the work product
overstates this, which is the only reason it is survivable.

**"Ames forecloses your assignment theory, and your own materials cite it for
the opposite."** Verified and correct. *Ames* holds borrowers lack standing to
challenge an assignment of their security deed. The materials in the client's
repository cite it as reserving a void-assignment attack. It does not.

*Holds?* Yes, completely, as to the assignment theory. The corrective action is
already taken: the citation is withdrawn in WP-003 on the filer's own
initiative, which is the only posture in which this costs credibility once
rather than twice.

**"You cited Racette for a holding it does not contain."** Verified. Zero
occurrences of "assignment" in the opinion.

*Holds?* Yes — and it is the more dangerous of the two, because a real case
cited for a fictional holding is the fact pattern behind Rule 11 citation
inquiries. Withdrawn in WP-003. The recovery is that *Racette* is live authority
for a defective-advertisement claim, which is a different and better use of it.

**"Your fee complaint is an accounting exercise, not a claim."** Partly right.
The amounts are the servicer's own and they foot; what is disputed is whether
they were authorised, which is a contract and regulation question. The register
already classifies DISP-006 as a characterisation dispute rather than an
arithmetic one, which is correct and is also the concession.

*Holds?* Partly. It defeats an overcharge framing and does not defeat a
fee-authority framing. GAP-017 — the note and deed provisions authorising each
fee type — is what converts one into the other.

**"Your limitations problem is unexamined."** 15 U.S.C. § 1692k(d) has not been
read. The FDCPA count rests on it.

*Holds?* Yes, and this is the cheapest unfixed exposure in the matter.

**"Your client's own strategy documents contain a trust from a different case."**
Fannie Mae REMIC Trust 2024-91 is a *Caudell* entity. If it reached a filed
pleading it is a self-inflicted wound requiring no work from the other side.

*Holds?* Unknown, and unknowable without the docket. That is itself the finding.

### Seat two — a sceptical magistrate

**"You were given specific instructions in July. Did you follow them?"** The
system cannot answer. That is the correct answer for the system to give, and it
is also the reason nothing here is ready to file. Against *Vibe Micro* at 1309,
this is the question that decides the matter.

**"You are asking me to infer wrongdoing from a balance that did not move."**
The work product does not do this. The unreversed tender is labelled
`[INFERENCE]` and paired with the express statement that it is consistent with
non-application but does not establish it. That discipline is what keeps the
strongest fact usable.

**"Why are twenty-two attorney decisions unanswered?"** Because no human has
worked the file. Seventeen of them are marked blocking. A matter in which
seventeen blocking questions are open is not a matter ready for a dispositive
filing.

**"Your deadline register says the repleading deadline passed a month ago and
you do not know what happened."** Correct, and stated on the face of every
document. No date has been invented to fill the hole, which is the one thing
that would make it worse.

### What Audit B could not test

Whether the substantive Georgia elements are correctly stated, because they
remain unresearched (OLQ-7). Whether *Haynes* forecloses the § 44-14-162(b)
theory, because it has not been read. Whether any of this survives contact with
the actual motion to dismiss, because that motion has not been located.

### Audit B result

The work product does not overstate the record anywhere the audit could reach.
Its weakest points are weak because the evidence is missing, not because the
analysis is wrong — with one exception, now cured: two citations that came into
the matter from the client's own repository and would have failed on contact
with an opponent.

## Defects corrected during this gate

| # | Defect | Correction |
|---|---|---|
| 1 | Three non-mutual transaction pairings | Data repaired; mutuality now enforced |
| 2 | TXN-050's missing counterpart carried as a blank | Recorded as NONE with a stated basis |
| 3 | Fee total recomputed wrongly by this audit | Audit corrected to signed sums by classification; register independently confirmed |
| 4 | Two court-found assertions with no order named | Both now cite Doc. 34 or Doc. 35 |
| 5 | *Ames* cited for a reservation it does not contain | Withdrawn; CON-012 and CV-018 opened |
| 6 | *Racette* cited for a holding it does not contain | Withdrawn; CON-013 and CV-019 opened; correct use identified |
| 7 | A trust from a different case in the strategy materials | CON-009 opened; excluded expressly in WP-003 |
| 8 | Contradictory case number and firm history in the repository | CON-010 and CON-011 opened |

## Validations re-run after correction

All registers; cross-references (422 identifiers defined, 614 references
checked, 22 decisions raised and 22 logged); the matter-pack structure with
hash-check confirming every original source byte-identical; the access map and
credential scan; citation verification with cross-check against the work
product; the approval gate; every handoff document; all eleven skills in both
source and installed form; and document QC on every produced document.
