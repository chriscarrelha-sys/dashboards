# Litigation OS — Defects found by forward testing, and their corrections

Recorded as found. Every entry states how it surfaced, why it mattered, and what
changed. Defects left uncorrected are listed at the end with the reason.

## D-01 — Prohibition check in `validate_handoff.py` was too brittle (CORRECTED)

**Surfaced:** Test 1, validating `ASSIGN-CARRELHA-2026-003-research.md`.

**Symptom:** The assignment carried a substantively complete prohibition — "no
case, quotation, citation, docket entry or holding that was not opened and read;
no unverified good-law assertion" — and the validator reported
`prohibited_actions does not cover unsupported assertion / deadline without
inputs`.

**Why it mattered:** A validator that fails correct input teaches the author to
paste boilerplate to satisfy the checker instead of writing a prohibition that
fits the task. That is worse than no check at all, because it converts a
substantive safeguard into a ritual.

**Correction:** Two changes.
1. `validate_handoff.py` — broadened the third prohibition's vocabulary from
   `("without", "not supported", "unsupported", "no source", "fabricat",
   "invent", "confirmed")` to also recognize `verif`, `unverified`, `guess`,
   `assume`, `made up`, `read`. The error message now names the three standing
   prohibitions so an author who trips it knows what concept is missing rather
   than what word is.
2. `ASSIGN-CARRELHA-2026-003-research.md` — the prohibition was also genuinely
   incomplete as written: it barred inventing authority but did not bar asserting
   an unsupported *fact* about the matter. Reworded to cover both.

**Lesson carried into the standard:** the handoff standard now says explicitly
that the three standing prohibitions are checked by concept and may be worded to
fit the task.

## D-02 — No validator checked internal identifier cross-references (CORRECTED)

**Surfaced:** Improvement pass during Test 3. `validate_matter_pack.py` checked
`SRC-###` references against the manifest, but nothing checked the other six
identifier families. A proposition row citing `CLM-014`, or a deadline declaring
a conflict with a `DL-###` that does not exist, would pass every check.

**Why it mattered:** A dangling identifier looks like provenance. An attorney
reading "PROP-007 → CLM-003" reasonably assumes the mapping was made; if CLM-003
does not exist, the element was never mapped and nobody can tell.

**Correction:** Added `tools/validate_crossrefs.py`, which resolves every
`ENT-`, `CLM-`, `DEF-`, `PROP-`, `GAP-`, `DL-`, `EV-`, `OFQ-`, `OLQ-` and `ISS-`
reference against its definition, rejects malformed ids, rejects an id of the
wrong family for its column, and catches duplicate definitions. On the test
matter it checks 230 references against 110 definitions. Negative-tested by
injecting `CLM-999`, which it caught.

## D-03 — The confidence rule made `high` unreachable whenever no citator exists (CORRECTED)

**Surfaced:** Test 2. Four research rows built on opinions that were opened,
read, and quoted with verified star pagination were rejected for reporting
`confidence: high` while `unverified_fields` listed "good-law (no citator
available in this session)."

**Why it mattered — and why the validator was right and the rows were wrong.**
This session has no Shepard's/KeyCite-equivalent, so good-law status can *never*
be confirmed here. Under the rule as written, no row in any matter could ever
reach `high`, which quietly collapses a three-level scale to two and erases the
distinction between "I read the opinion and quoted it at the page" and "I found
the citation in a treatise." But the fix is not to loosen the rule: an attorney
who sees `high` is entitled to assume the citator pass is done, and here it is
not.

**Correction:** Three changes.
1. The four research rows were downgraded to `medium`, which is what they
   honestly are. The distinction they represent is preserved in the
   `verified_fields` column, which lists citation, court, date, quotation,
   pinpoint, posture and history as confirmed against the opinion itself.
2. `references/verification-protocol.md` now names this situation explicitly as
   **citator-limited medium** and requires the row to say so in
   `unresolved_research`, so the attorney can see at a glance that what is owed
   is a citator pass and not more reading.
3. `validate_registers.py`'s error message now explains the rule rather than
   just reporting it, and points at citator-limited medium as the correct
   resolution.

**Lesson:** the scale is only useful if `high` is genuinely reachable and
genuinely means something. Making it unreachable by accident is as damaging as
handing it out too freely.

## D-04 — Register confidence caps did not propagate into narrative prose (CORRECTED)

**Surfaced:** Test 5, during the orchestrator's cross-result audit. A script
compared every source cited in a specialist result against that source's
`access_status` and `ocr_confidence` in the manifest.

**Symptom:** The evidence result's finding 15 stated flatly that the annotated
spreadsheet SRC-007 mischaracterises the ledger. SRC-007 is marked
`access_status: partial` — only preview rows were read. The corresponding
register row (CON-003) had correctly capped itself at `confidence: medium` and
scoped itself to the two annotations actually read. **The CSV discipline held;
the prose did not.**

**Why it mattered:** An attorney reads the prose, not the CSV. A register that is
scrupulous about its limits, feeding a narrative that drops them, produces
exactly the over-claim the system exists to prevent — and does so invisibly,
because the underlying data looks rigorous.

**Correction:** Three changes.
1. The handoff standard's confidence section now states that **a narrative
   finding inherits the confidence ceiling of the register row it summarises**,
   and that a statement about a `partial`-access source may describe only the
   part actually read.
2. `evidence-chronology-paralegal/SKILL.md` Step 8 now requires a readback pass:
   before returning a result, check every source named in the prose against its
   manifest row and carry any `partial`, `paywalled`, `ocr-uncertain` or
   `missing-pages` limit into the sentence itself.
3. The finding was restated in the consolidated report (reconciliation R-3):
   two annotations were checked, one is wrong, the rest are unreviewed.

**Lesson:** machine-checkable discipline in structured fields does not
automatically transfer to prose, and prose is what gets read. The gap has to be
closed by an explicit instruction, because no validator can check it.

## D-05 — The orchestrator planned one wave and never recorded the dependent wave (CORRECTED)

**Surfaced:** Test 5, reconciliation R-5. The evidence specialist recommended
replacing the unsupported $5,200.00 theory with the documented $1,899.56
retained-unapplied payment. No result assessed whether that states a claim,
because no assignment paired the evidence finding with the legal standard.

**Why it mattered:** This was the orchestrator's error, not a specialist's. Its
own SKILL.md says to state the plan as waves, but nothing required the dependent
wave to be *written down* at plan time. A dependent task that exists only in the
planner's head is a task that goes missing the moment the wave-one results come
back and attention moves to reconciliation.

**Correction:** `litigation-matter-orchestrator/SKILL.md` Step 3 now requires the
Wave 2+ tasks to be recorded at plan time — with their triggering dependency
named — even though they cannot be issued yet, and Step 7 requires the
consolidated report to account for every planned task as issued, superseded, or
still queued. The missing task was queued as step 6 of §8 in the test report, and
the omission was disclosed in the report's reconciliation table rather than
quietly filled in.

---

# Defects identified and NOT corrected

## N-01 — No validator can confirm that a quotation is accurate

`validate_registers.py` enforces that a quotation carries a pinpoint and that
confidence is consistent with what is claimed to be verified. It cannot confirm
that the quoted words actually appear in the cited source, because it has no
access to the source. Mitigated by requiring `verification_method` to name the
tool used and by the skill's rule against quoting anything not opened; not
eliminated. **A human still has to check quotations.**

## N-02 — Epistemic labels are enforced for membership, not for correctness

A validator can reject `[COURT-FOUND]` as a value only if it is misspelled. It
cannot tell that a passage labelled `[COURT-FOUND]` is in fact a court's
recitation of a party's allegation. This is the highest-frequency substantive
error in chronology work, and it is addressed only by instruction — prominently,
in three separate skill files and in the handoff standard.

## N-03 — The system cannot see PACER

The most important fact in the test matter — whether the amended complaint was
filed — was unobtainable. The system reported this correctly as a blocking human
decision rather than inferring an answer, which is the designed behaviour. But it
is a standing capability limit, not a defect that can be corrected from inside
Phase 1.

## N-04 — `validate_registers.py` does not require registers to be non-empty

A matter pack whose evidence registers contain only headers passes validation. It
was left this way deliberately: a matter legitimately has no contradictions until
someone looks for them, and an emptiness check would force placeholder rows,
which are worse than no rows. The orchestrator's completion standard, not the
validator, is what requires the registers to be populated for a given assignment.

---

# Phase 2 intake audit — Phase 1 defects found by inspection

Found by auditing the Phase 1 deliverables directly rather than trusting the
Phase 1 summary. All five are repaired before any Phase 2 work begins.

## P1-R01 — Stale repo paths inside bundled resources (CORRECTED)

`skills/litigation-matter-orchestrator/scripts/README.md` and the bundled
`assets/matter-pack-template/README.md` in all four skills still gave commands as
`python3 litigation-os/tools/...`. The SKILL.md files were repointed to
`scripts/` during Phase 1; these two files were missed. A skill copied to a
machine with no repo would hand the user four commands that cannot run.
Repaired and added to the install-time check so it cannot recur.

## P1-R02 — The handoff validator hardcoded three specialist names (CORRECTED)

`validate_handoff.py` carried `SPECIALISTS = {three names}` as a literal. Every
Phase 2 assignment would have been rejected as "not an installed specialist,"
and the natural workaround — editing the set in six copies of the file — is
exactly the drift Phase 1 built `install.sh` to prevent.

Replaced with a single registry, `standards/specialists.yaml`, which names every
specialist, its function, its routing trigger, and its dependencies. The
validator reads it; the orchestrator reads it; `install.sh` syncs it. Adding a
tenth specialist is now a one-file change.

## P1-R03 — Eleven human decisions were raised and none was logged (CORRECTED)

The three Phase 1 results raised eleven `HD-` items, five of them blocking. The
attorney decision log held **zero rows**. The orchestrator's own Step 8 requires
logging them, and the log is the gate on outward action: if it is empty, there is
no record of what a human authorised and no way to tell an approved act from an
unapproved one.

This is the most substantive of the five. The failure was that Step 8 stated the
requirement in prose and nothing checked it. Repaired three ways: the eleven
decisions were logged with `decided_by` blank pending a human; a new check in
`validate_crossrefs.py` reconciles every `HD-` raised in a result against the
decision log and fails on any that is missing; and the orchestrator's Step 8 now
points at that check by name.

## P1-R04 — Byte-compiled Python committed (CORRECTED)

`tools/__pycache__/*.pyc` was tracked. Removed and added a `.gitignore`.

## P1-R05 — Template artefact copied into a live matter (ACCEPTED, NOT CHANGED)

`research-table-TEMPLATE.csv` is copied into every new matter because the matter
pack is created by copying the template wholesale. `validate_registers.py`
already skips any filename containing `TEMPLATE`. Leaving it is deliberate: the
header row is genuinely useful next to the live tables, and the alternative —
special-casing the copy — adds a moving part to prevent a non-problem.

---

# Phase 2 — defects found by forward testing, and corrections

## P2-D01 — A reversal was declared with no pairing row (CORRECTED)

**Surfaced:** building the transaction reconciliation. `validate_registers.py`
rejected TXN-022, classified `reversal-of`, because `pairs_with` was empty.

**Cause:** the row it reverses — a 03/14/23 "Principal Only Payment" of $103.38 —
had simply not been transcribed. The classification was right; the ledger was
incompletely transcribed.

**Correction:** TXN-072 added and the pair recorded in both directions. The
validator caught an incomplete transcription that a reader would not have
noticed, which is exactly what the pairing rule is for.

## P2-D02 — An ID-shaped token with an unregistered family validated clean (CORRECTED — improvement pass 1)

**Surfaced:** a deliberate probe. `CLMM-001` (a typo for `CLM-001`) was injected
into the attack-surface register. `validate_crossrefs.py` returned PASS.

**Cause:** the resolver skipped any token whose prefix was not a registered
family, because columns like `actor` legitimately hold free text. The effect was
that the one thing most likely to be wrong — a mistyped identifier — was the one
thing guaranteed not to be caught.

**Why it mattered more than it looks:** a dangling identifier that validates
clean is worse than a blank cell, because it reads as provenance. The whole point
of the cross-reference checker is to prevent exactly that, and it had a hole
shaped like its own purpose.

**Correction:** anything matching `^[A-Z]{2,6}-\d{1,4}$` is now treated as an
identifier. An unregistered family is an error naming the token, the family, and
the registered families, with instructions to fix the typo or register the
family. Ten Phase 2 families were registered at the same time.

**It immediately caught three real errors in live data** — attack-surface rows
targeting `ALG-` allegation ids in a column whose allowed families did not
include them. The right fix was to widen the column (an attack legitimately
targets an allegation), and that would never have been noticed without the check.

## P2-D03 — The pleading-defect register was completely unchecked (CORRECTED — improvement pass 2)

**Surfaced:** a second probe. `present: maybe`, `severity: catastrophic`,
`curability: someday`, and a defect marked present with no cure — all validated
clean.

**Cause:** `pleading-defects.csv` was created during Phase 2 to hold the 14-item
scan. Its ids were cross-referenced, so a dangling `PD-` was caught, but nothing
checked the file's own contents.

**Correction:** `check_pleading` now validates `present`, `kind`, `severity` and
`curability` against controlled values; requires `pleading_analysed` on every row
(matters routinely hold several drafts of the same pleading, and a defect finding
that does not say which one it examined is useless); requires
`what_the_test_showed` so a finding can be re-checked; and requires a cure, a
cost, and a curability rating on every defect marked present — because a defect
with no proposed cure is a complaint. It also warns when fewer than fourteen
tests are recorded, so a partial scan cannot read as a complete one.

## P2-D04 — The corrective-action plan existed only in prose (CORRECTED)

**Surfaced:** after improvement pass 1, ten `CA-` references in the attack-surface
register resolved to nothing.

**Cause:** the red-team skill requires a "prioritized corrective-action plan," and
one was written — as a table inside the result. Prose is not addressable. Nothing
else in the pack could point at CA-03, and no validator could check that a
top-ranked attack actually had a corrective action behind it.

**Correction:** `07-evidence/corrective-actions.csv` added to the template, the
matter pack, the red-team skill's assets, and the cross-reference resolver, with
ten rows tracing to the attacks and defects they address. The register is now the
plan; the result's table is a view of it.

**Lesson, and it generalises:** an output that only exists as prose cannot be
validated, cross-referenced, or tracked to completion. Where a deliverable is a
list of things someone must do, it belongs in a register.

---

# Phase 2 — limits documented, not corrected

## P2-N01 — A `[COL?]` figure is excluded row-locally, not globally

`used_in_computation` is enforced within the transaction register, so an
ambiguous figure cannot be marked as used there. But nothing prevents that same
figure appearing in a `computation_shown` string in the disputed-amount schedule.
In this matter it does appear — reading (ii) of DISP-001 uses the `[COL?]`
$729.13 — and it is labelled as shown for completeness and not relied on.

Not corrected because the only mechanical fix is string-matching amounts across
files, which would fire on every legitimate coincidence of figures. The guard is
the discipline of stating it, plus the `assumptions` column, which is required.

## P2-N02 — No primary ownership document was read in the test matter

The note, allonge, endorsements, assignment instrument, security deed, trust
agreement and loan schedule are all absent. The ownership result carries
`confidence: low` for this reason and says so in its first line. This is a
limitation of the available record, not of the skill — but it means the
securitization specialist has been exercised against descriptions of documents
rather than documents, and that is a weaker test than it appears.

## P2-N03 — Six of sixteen counts were not analysed

Counts X through XVI were read at heading level only. The pleading result and the
red-team result both say so. The attack surface is incomplete by construction.
