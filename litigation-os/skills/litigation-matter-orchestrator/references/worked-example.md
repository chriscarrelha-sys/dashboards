# Worked Example — One Full Cycle

A real cycle on a real matter, kept because the useful thing about an example is
the granularity, not the subject. Names and figures come from the Phase 1 test
matter; nothing here is a template to copy literally.

**The matter.** A removed federal consumer-finance and foreclosure case. Two
orders in hand: one denying remand and denying injunctive relief, one holding the
complaint a shotgun pleading and ordering repleading by a date certain. A
servicer's payment ledger. A servicer letter responding to a regulator complaint.
A draft amended complaint. No PACER access.

**The ask, as the user phrased it.** "Create a bounded work plan for evaluating
the existing complaint, potential amendment issues, initial loan-funding evidence,
ownership and transfer assertions, and the procedural posture."

---

## Step 2 — Reframing the objective

The ask names five *activities*. Restated as *decisions*:

1. Is the case still alive — was the amended complaint filed by the ordered date?
2. Would the draft amended complaint, as written, cure the defect the court
   identified, and what new defects does it introduce?
3. What does the record actually establish about loan funding and about ownership
   and transfer?
4. What does the servicer's own ledger establish, and fail to establish, about
   the payment-application allegations?

Restating it this way immediately reordered the work. "Evaluating the existing
complaint" sounds like the centre of the job. It is not: if the repleading
deadline was missed, the existing complaint is not the operative pleading and may
not matter at all. Objective 1 was not in the user's list and became priority one.

That is the point of the restatement. Do it before anything else.

---

## Step 3 — The wave plan

**Wave 1 — parallel, no interdependencies:**

| Assignment | To | Why it can run now |
|---|---|---|
| 001 | docket-deadline-paralegal | The two orders are self-contained |
| 002 | evidence-chronology-paralegal | The ledger and letters are self-contained |
| 003 | legal-research-paralegal | The pleading-standard question needs only the order and published law |

**Wave 2 — recorded at plan time, issuable only after Wave 1:**

| Task | Blocked on | Why it cannot run yet |
|---|---|---|
| Does the retained-unapplied payment state a payment-application error? | 002 | Nobody knows the payment exists until the ledger is read |
| Is the FDCPA limitations period a bar, and does a continuing-violation theory apply? | 002 | Needs the dated conduct from the chronology |
| Does regulator-portal routing satisfy the designated-address requirement? | 002 | Needs the designated address from the letters |

Writing Wave 2 down was not optional and I initially failed to do it — the first
of those three tasks went missing until reconciliation caught it, and it had to be
disclosed in the report rather than quietly performed. Record them when you plan
them.

**Routing that needed splitting.** "Does the amended complaint cure the defect?"
looks like one question. It is two: what the pleading *says* (evidence) and what
the standard *requires* (research). Sent to one specialist, it comes back as
half an answer with a confident tone.

---

## Step 4 — What made the assignments bounded

The docket assignment's `scope_excluded` carried this line:

> "Do not compute any deadline running from the filing of an amended complaint
> until that filing is established."

Without it, a specialist facing an order that says "14 days after it is filed"
and a plausible filing date will produce a date. The date will look like every
other date in the register. Excluding it in the assignment is cheaper than
catching it in review.

Each assignment's `completion_standard` was written so a reviewer could mark it
wrong. The docket one:

> "…The result states plainly whether the deadline was met and, if that cannot be
> established, says so as a blocking human decision rather than assuming either
> answer."

---

## Step 5 — What review caught

Nothing was rejected outright. One thing was caught by an audit rather than by
reading: a script compared every source named in each result's prose against its
`access_status` in the manifest. One evidence finding made a flat statement about
a document the manifest marks `partial`. The register row had correctly capped
itself; the paragraph had not.

**Run that audit.** The structured fields get checked; prose does not, and prose
is what the attorney reads.

---

## Step 6 — The four reconciliations, by level

**Level 0 — not a conflict at all.** Evidence flagged the pleading's
"Paragraphs 1 through 46" cross-reference as a defect. Research concluded the
same cross-reference method is the structure the controlling case expressly
approves. Read quickly, these contradict. They do not: research answered whether
*incorporating a factual block* is the condemned category (it is not); evidence
answered whether *this document's numbering* makes "46" identifiable (it does
not, because numbering restarts by section). Both correct, and together they gave
the precise fix — keep the method, renumber continuously.

Most apparent conflicts resolve here. Check Level 0 first, every time.

**Level 1 — source-level.** Two specialists treated the draft pleading as the
operative one; the docket specialist had established that no source shows it was
filed. The docket specialist's limit governs both other results. Rather than
rewriting their analyses, I stated at the head of the unresolved section that
those findings are conditional, and recorded the assumption as an open question.

**Level 3 — significance.** Evidence rated a servicer's representation as
"impeachment-only." Whether the same statement is actionable under a statute is a
different question, and not one the evidence specialist is positioned to answer.
Converted to an open legal question and queued; both positions carried into the
report.

**Level 4 — confidence.** The over-claim above. Rebuilt from the weakest link:
the *specific* correction was sound (verified against a document read in full);
the *general* implication was not (only two annotations of the document had been
read). Restated to the scope actually supported.

---

## Step 7 — What the report did with the disagreement

Nothing was dropped. The reconciliation table names each conflict, its level, the
resolution, and whether a rejected view was retained. The one task I failed to
plan appears there as my own omission.

That table is worth more than it looks. An attorney who later hears the rejected
reading from the other side needs to find, in this report, that it was considered
and why it was set aside. "It isn't in the report" and "we thought about it and
rejected it" are very different answers to a judge.

---

## What this cycle produced

Two findings that reframed the matter, neither of which was in the original ask:

1. The pleading's central factual allegation — an uncredited payment — appears
   nowhere in the servicer's own ledger, which records credits an order of
   magnitude smaller. Not an unproven allegation: the document a factfinder
   consults first affirmatively omits it.
2. The same ledger documents a different payment that *was* received, never
   reversed, and never applied — sitting in suspense for ten months while fees
   accrued. Weaker in dollars, far stronger in proof, and unused by the pleading.

Neither came from cleverness. Both came from reading the defendants' own document
line by line and asking what it actually shows, as against what someone says it
shows. That is the whole method.
