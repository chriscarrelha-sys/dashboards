# MASTER PROMPT

Copy everything in the fenced block into Claude Code with this directory as the project
root. It runs all phases. It does not stop at an outline.

```
Run the full litigation operations workflow for cases/carrelha.

PHASE 0 — RECORD FREEZE. Dispatch record-custodian. Inventory every document in the
record source. Assign each exactly one status: OPERATIVE, SUPERSEDED, MOOT, HISTORICAL,
EXHIBIT, MISSING. Walk the docket numbers in sequence and name every gap. Resolve the
open question of which docket number is the operative pleading — Doc 34 treats the
Verified Complaint as operative, but Doc 37 is captioned as a motion to dismiss a First
Amended Complaint. Do not proceed past this phase with that unresolved; report it as the
top blocker if it cannot be resolved from the record.

PHASE 1 — PROCEDURE. Dispatch docket-deadline-clerk and local-rules-procedure in
parallel. Recompute every deadline from first principles showing the full chain. First
resolve whether Plaintiffs are CM/ECF filers, because that decides whether Rule 6(d)
adds three days to every deadline. Determine today whether a response to Doc 37 was
filed or an extension granted. Verify the current N.D. Ga. local rules and Judge Story's
standing order against the court's own site — not against any cached PDF in this folder.

PHASE 2 — MOTION MAPPING. Dispatch motion-argument-mapper on Doc 40. If Doc 40 is not in
the record, return BLOCKED BY MISSING OPERATIVE RECORD and do not guess its contents.
When it is available, map every argument and run the delta against McCalla's first-round
motion (Dkt. 5, filed 2026-03-30 in state court): REPEATED / MODIFIED / NEW / ABANDONED.
An abandoned argument is evidence the amendment worked — flag it prominently.

PHASE 3 — MERITS, IN PARALLEL. Dispatch claim-element-matrix, rule12-pleading-specialist,
incorporation-judicial-notice, fdcpa-specialist, respa-regx-specialist, fcra-specialist,
georgia-foreclosure-specialist, contract-equity-remedies, and accounting-forensics. Build
one element matrix per count. Keep each defendant's conduct separate — never write
"Defendants." Pay particular attention to whether McCalla, as foreclosure counsel, is a
debt collector, and to 15 U.S.C. § 1692f(6) as a distinct theory. Have
incorporation-judicial-notice rule on Doc 37-4 (the defense loan history): a servicer
attaching its own ledger to prove the ledger is correct is asking the court to resolve
the case's central factual dispute on a Rule 12 motion.

PHASE 4 — SPECIAL PROCEEDINGS, IN PARALLEL.
  discovery-stay-rule72 on Doc 39. Determine the vehicle before the argument. Doc 38 was
  granted, so an opposition is wrong. Rule 72(a) deferential review applies to the stay;
  Rule 72(b) de novo applies to the R&R on the motions to dismiss under Standing Order
  18-01 per Doc 34. Do not blend them. Test the changed-circumstances theory: the stay
  was entered 2026-09-09; the foreclosure sale notice is dated 2026-09-15.
  emergency-injunction on Doc 41. Run the 60-day computation under Doc 34 FIRST. If the
  noticed sale is earlier than the 60-day condition permits, the correct filing is a
  motion to enforce Doc 34, not a new injunction motion. If the condition is satisfied,
  analyze renewed Rule 65 relief on the ground that Doc 34 denied the PI as MOOT — not on
  the merits — because no sale was then scheduled, and a scheduled sale negates that
  premise.

PHASE 5 — DRAFTING. litigation-chief assigns exactly one writer per deliverable and
records it in 05_drafts/OWNERSHIP.md. Specialists do not edit drafts. Every deliverable
that reaches a draft must include a specific request for leave to amend stating what an
amendment would allege, where dismissal is a realistic outcome.

PHASE 6 — ADVERSARIAL, IN SEQUENCE. defense-red-team, then magistrate-howard-bench, then
judge-story-review, then appellate-preservation. Resolve or expressly overrule every
finding. Then citation-authority-checker: delete every citation that cannot be verified
against a retrievable source. Not softened — deleted.

PHASE 7 — GATES AND RELEASE. filing-format-service-qc re-verifies the format rule today.
final-editor integrates and writes 06_redteam/GATE-<document>.md for each deliverable,
then assigns exactly one release state: FILE, FILE AFTER SPECIFIED CORRECTION,
DO NOT FILE, or BLOCKED BY MISSING OPERATIVE RECORD — plus one sentence naming what
would change that state.

PHASE 8 — BLIND-SPOT SCAN. Read the full docket once more and ask what filing is needed
that nobody assigned. Report anything found.

OUTPUT cases/carrelha/EXECUTION_SHEET.md: every workstream, its owner, its controlling
deadline, its release state, and the single most urgent open item. Short enough to read
standing up.

Rules that are never waived: never draft against a motion the system has not read; never
cite an authority that has not been verified; never argue facts the operative pleading
does not contain; never oppose a motion already granted; one writer per filing. You
recommend — the user decides and signs.
```
