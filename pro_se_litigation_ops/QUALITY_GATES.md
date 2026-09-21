# Quality Gates

No document reaches `07_final/` without a completed gate sheet. The gate sheet is a file
in `06_redteam/` named `GATE-<document>.md`. `final-editor` refuses to release without it.

## The seven gates

### 1. Record gate
- Every document the draft relies on is in `01_record/` with status `OPERATIVE`.
- The paper being responded to has been **read in full**, not summarized.
- No `SUPERSEDED`, `MOOT`, or `HISTORICAL` document is cited as current.
- Every record citation resolves to a real page of a real document.

**Fails to:** `BLOCKED BY MISSING OPERATIVE RECORD`

### 2. Procedure gate
- The deadline is computed, not copied from PACER, and the full chain is shown.
- Where the computation and PACER disagree, the earliest date governs and the conflict
  is recorded.
- The vehicle is correct: opposition vs. Rule 72(a) objection vs. motion to
  reconsider/modify vs. new motion. An already-granted motion is never "opposed."
- Page limits, and whether leave is needed, are checked against the current local rule.

### 3. Merits gate
- Every claim addressed has a completed element matrix in `04_analysis/`.
- Every argument actually raised in the opposing paper is answered or an express,
  reasoned decision not to answer it is recorded.
- No argument is made that the operative pleading does not support.
- Defendant-specific conduct is kept separate. Servicer conduct and foreclosure-counsel
  conduct are never lumped together.

### 4. Evidence gate
- Every factual assertion traces to the operative pleading, a declaration, or an exhibit.
- Extrinsic material is separately justified (incorporation by reference, judicial notice,
  central-and-undisputed) with the purpose stated.
- Declarations rest on personal knowledge and are signed under penalty of perjury.
- Exhibits are indexed, numbered consistently, and actually attached.

### 5. Authority gate
- Every citation verified by `citation-authority-checker` against a retrievable source.
- Pin cites checked. Quotations checked character-for-character. Parentheticals checked
  against what the case held.
- Subsequent history checked — nothing reversed, abrogated, or superseded.
- Adverse controlling authority identified and addressed, not omitted.
- **Any citation that cannot be verified is deleted.** Not softened, not hedged.

### 6. Adversarial gate
- `defense-red-team` has attacked the draft and its findings are resolved.
- `magistrate-howard-bench` and `judge-story-review` have reviewed it.
- `appellate-preservation` has confirmed nothing needed for appeal is waived.
- Each unresolved criticism is either fixed or has a recorded reason it stands.

### 7. Document gate
- Caption, case number, judge, and division correct.
- Format verified against the **current** local rule, re-checked today.
- Signature block, pro se designation, address, phone, email correct.
- Certificate of compliance and certificate of service present, accurate, and correctly
  dated.
- Page numbers consecutive. No tracked changes, no comments, no metadata leakage.
- The PDF is text-searchable and opens cleanly.

## Release states

| State | Meaning |
|---|---|
| `FILE` | All seven gates passed. Ready for the user's review and signature. |
| `FILE AFTER SPECIFIED CORRECTION` | Substantively sound; the listed corrections are mechanical and enumerated. |
| `DO NOT FILE` | A gate failed on the merits. The reason is stated and an alternative is proposed. |
| `BLOCKED BY MISSING OPERATIVE RECORD` | Gate 1 failed. The exact missing document is named. No draft is produced. |

A deliverable that ends in any state other than `FILE` must say, in one sentence, what
would change the state.

## What the gates do not decide

The gates decide whether a document is **ready**. They do not decide whether to file it.
That is the user's decision, and the user signs it.
