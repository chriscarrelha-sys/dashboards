# Reconciliation Protocol

Two specialists disagree. Resolve it in this order; stop at the first level that
settles it. Never average two findings, and never prefer the one written with
more confidence — stated confidence is an input to be audited, not evidence.

## Level 0 — Is it actually a conflict?

Most apparent conflicts are not. Check these before doing anything else:

- **Different questions.** One answered what the document says, the other what it
  proves. Both can be right.
- **Different dates for the same thing.** A transfer's *effective* date, *notice*
  date, and *recording* date are three different facts. So are a payment's
  tender, clearance, receipt, and posting dates.
- **Different names for one entity.** d/b/a, n/k/a, and post-merger names make
  one party look like two. Check `01-parties/parties.csv` `aliases`.
- **Different identifiers for one thing.** Loans, accounts, and claims are often
  renumbered on transfer. Two numbers is not two obligations.
- **Different scopes.** One specialist read entries 1–35; the other read the
  whole docket. The "missing" entry may simply be out of the first one's scope.

If it resolves here, record it in the report as a clarified ambiguity, not as a
contradiction, and fix the underlying register so it does not recur.

## Level 1 — Source-level conflict

The specialists relied on different documents, or on different versions of one
document.

**Resolve by going back to the source.** Open both, compare the manifest entries
(`sha256`, `derived_from`, `ocr_status`, `access_status`, `pages`), and decide:

- A native-text source beats an OCR extraction of the same document.
- A complete source beats one marked `partial` or `missing-pages`.
- The original beats a derived summary, always.
- A court's own docket entry beats another filing's description of it.

Then reissue the losing assignment with the correct source named, and record in
the report which source controlled and why.

## Level 2 — Reading-level conflict

Both read the same document and took different meanings from it.

**Do not resolve this yourself by picking.** Produce a side-by-side:

| | Reading A | Reading B |
|---|---|---|
| Who | specialist | specialist |
| Text relied on | exact quote + pinpoint | exact quote + pinpoint |
| Reading | | |
| What follows if true | | |
| What would settle it | | |

Then apply two tests:

1. **Does the text bear the reading?** Read the surrounding sentences. A phrase
   pulled from a court's recitation of a party's argument does not mean the court
   adopted it.
2. **Is one reading merely more useful to our side?** If the reading that favors
   the client requires the strained construction, say so explicitly. The point of
   this system is to find that out before opposing counsel does.

If the text supports one reading plainly, adopt it and note the rejected one. If
both survive, it goes to the report as `[UNRESOLVED]` with both readings intact
and a named human decision.

## Level 3 — Significance-level conflict

Both agree on the facts and disagree about what they mean under the law.

This is not an error to fix; it is an open legal question. Convert it into an
`OLQ-` entry in `06-issues/issue-register.csv` and issue a research assignment
framed on the precise disagreement, with instructions to find authority on
**both** sides. Until that comes back, the report carries it under *Unresolved*
with both positions stated fairly.

## Level 4 — Confidence conflict

The same proposition comes back `high` from one specialist and `low` from
another. Confidence is derivative: rebuild it from the sources rather than
debating it.

- Find the weakest link in the chain supporting the proposition.
- The proposition's confidence is the confidence of that link, never higher.
- If the weak link is an OCR-uncertain figure, a paywalled opinion, or an
  unavailable docket, the proposition is `medium` at best, whatever either
  specialist wrote.

## Recording the outcome

Every reconciliation produces a row somewhere. Nothing is resolved silently:

| Outcome | Where it goes |
|---|---|
| Not a real conflict | Report §*Established*, with the clarification; fix the source register |
| Source-level, resolved | Report §*Established*; note which source controlled |
| Reading-level, resolved | Report §*Established* or §*Inferred*; note the rejected reading |
| Reading-level, open | Report §*Unverified*; `06-issues` entry; human decision |
| Significance-level | Report §*Unverified*; `OLQ-` entry; research assignment |
| Confidence rebuilt | Report at the rebuilt level; say which link capped it |

The losing view is never deleted. An attorney who later hears the rejected
reading from the other side must be able to find, in this report, that it was
considered and why it was set aside.
