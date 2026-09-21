# Verification Protocol

Verification is not one act. Eight things can be wrong independently, so they are
checked and recorded independently. A row claiming "verified" without naming
which of the eight were checked tells the attorney nothing.

## The eight fields

| # | Field | How to verify | Fails when |
|---|---|---|---|
| 1 | citation | Open the opinion at that reporter cite | Parallel cites confused; volume or page transposed; wrong year |
| 2 | court | Read the caption of the opinion you opened | Court of appeals confused with the district court below; state intermediate court confused with the high court |
| 3 | date | Decision date on the opinion | Filed vs. amended vs. rehearing-denied dates differ |
| 4 | quotation | Read the words in the opinion | Quote is from the syllabus, headnote, a dissent, or the court quoting a party |
| 5 | pinpoint | Locate the page/¶ containing those words | Star pagination differs between reporters and databases |
| 6 | posture | What was before the court | A 12(b)(6) reversal read as a merits holding |
| 7 | history | Subsequent treatment | Reversed, vacated, superseded, cert. granted, later abrogated |
| 8 | good law | Whether it still stands on *this point* | Still cited for point A while abrogated on point B |

Record them as `verified_fields` and `unverified_fields`, semicolon-separated, in
the research table. Every authority you rely on has both columns filled; if
`unverified_fields` is empty, write `none`.

## Quotation discipline

A quotation is reproduced character-for-character from the opinion, with
alterations marked (`[ ]` for changes, `…` for omissions). Three specific
hazards:

- **Headnotes and syllabi are not the opinion.** They are editorial and are not
  authority. Never quote them as the court's words.
- **Dissents and concurrences are not the holding.** Label them when you use
  them.
- **A court quoting a party is not the court speaking.** "Plaintiffs contend
  that…" followed by a sentence is the plaintiff's sentence, not the court's.
  This is the single most common quotation error and produces citations that
  collapse the moment the other side reads the case.

If you cannot open the opinion and read the words, you do not have a quotation.
You have a paraphrase from a secondary source, and it goes in `notes` with the
secondary source named, with `quotation` left empty.

## Good-law checking without a citator

Where no Shepard's/KeyCite-equivalent is available, say so plainly — this is the
honest answer and the attorney can act on it. Then do what you can:

- Search for later decisions citing the case and read how they treat it.
- Check whether the statute or rule it construed has since been amended.
- Check whether the Supreme Court or the controlling appellate court has since
  addressed the same question.
- Look for en banc or rehearing activity.

Record the result as `still_good_law: unchecked` with `verification_method`
describing what you did do. Never write `yes` on the strength of "nothing turned
up," because nothing turning up is also what an unsearched database looks like.

## Recording access barriers

| Barrier | Effect on the row |
|---|---|
| `paywall` | Confidence capped at `medium`; quotation only if the free preview shows the actual text |
| `no-full-text` | No quotation, no pinpoint; the proposition is `[UNRESOLVED]` |
| `docket-unavailable` | Procedural posture and subsequent history are `unverified` |
| `unpublished` | `binding_status: non-precedential`; check the court's citation rule |

## Confidence, derived

Confidence follows the weakest verified link, never the strongest:

- **high** — citation, court, date, quotation, pinpoint, posture, and history all
  verified against the opinion, **and** good-law status confirmed with a citator.
  `high` is an assertion that the attorney need check nothing further before
  relying on the row.
- **medium** — the proposition is sourced, but something remains open: posture,
  history, or good-law status unchecked; the source reached only through a
  paywall preview; or a quotation taken from another court's parenthetical
  rather than from the opinion itself.
- **low** — the quotation could not be verified, the full text was unavailable,
  or the binding status could not be determined.

### Citator-limited medium

Sessions frequently have full-text access to opinions but no
Shepard's/KeyCite-equivalent. In that situation good-law status can never be
confirmed, so **no row can honestly reach `high`** — and that is the correct
outcome, not a defect to route around. Report **`medium`**, and make the row say
precisely why:

- list everything you *did* confirm in `verified_fields` — citation, court, date,
  quotation, pinpoint, posture, history;
- put `good-law (no citator available)` in `unverified_fields`;
- open `unresolved_research` with **"CITATOR-LIMITED MEDIUM"** and state that a
  citator pass is owed.

The point of the convention is that an attorney reading a `medium` row can tell
in one glance whether it needs *more reading* or only a *citator pass*. Those are
very different amounts of work, and collapsing them wastes the reviewer's time.

Do not resolve the tension the other way by claiming `high` anyway. The validator
will reject it, and more importantly an attorney who sees `high` will skip the
citator check that the row still needs.

A row can be genuinely useful at `low` confidence. What is never acceptable is a
`high` that the `unverified_fields` column contradicts — the validator will
reject it, and it would mislead the attorney about what still needs checking.
