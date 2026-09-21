# Red-Team Analyst — Output Formats

## 1. Attack-surface report → `07-evidence/attack-surface.csv` + narrative

One row per attack. The narrative in the result groups them by seat.

| Column | Rule |
|---|---|
| `seat` | `defense` / `magistrate` / `district-judge` / `rule11` / `appellate` |
| `target` | What it attacks — a claim id, a paragraph, a defendant, a theory |
| `attack_argument` | Written **as the opponent would write it**, in their voice |
| `best_support_for_them` | Their best support, with `source_ids`. **Required** — an attack with no support is speculation |
| `basis_type` | `researched-authority` / `record-based` / `analyst-reading` — so the attorney knows what stands behind it |
| `likelihood` | `high` / `medium` / `low` — that a court accepts it |
| `damage_if_successful` | `case-dispositive` / `claim-dispositive` / `defendant-dispositive` / `partial` / `cosmetic` |
| `our_best_answer` | Our response, honestly assessed |
| `answer_strength` | `strong` / `adequate` / `weak` / `none` |
| `credibility_risk` | `yes`/`no` — whether this attack, if made, damages our standing beyond the point itself |
| `rank` | Integer, 1 = most urgent |
| `corrective_action_id` | `CA-##`, required for every attack ranked in the top five |

## 2. Argument ranking → in the result

```markdown
### The three that matter this month
1. **[Attack]** — likelihood, damage, our answer, what to do, by when.
2. …
3. …

### Full ranking
| Rank | Attack | Seat | Likelihood | Damage | Our answer | Curable |
|---|---|---|---|---|---|---|
```

Ranking is by expected damage × likelihood, adjusted for curability: a moderate
attack that is cheap to eliminate outranks a severe one nothing can be done about.

## 3. Credibility-risk list → in the result

Separate from the ranking because the harm is diffuse. These are arguments or
allegations that cost standing with the court even when technically available.

```markdown
| # | Item | Why it costs credibility | Spillover onto | Recommended action |
|---|---|---|---|---|
```

Typical entries: a theory the forum has repeatedly rejected; a damages figure with
no document; an inflammatory characterisation of routine conduct; an allegation
contradicted by our own exhibit; a filing that ignores part of a court order.

`Recommended action` is required on every row. A credibility risk with no proposed
action is a complaint.

## 4. Curability analysis → in the result

```markdown
| Defect | Kind | Curable? | How | By when | Cost of not curing |
|---|---|---|---|---|---|
```

`Curable?` uses the same four values as the pleading analyst, deliberately, so the
two outputs can be read together: `curable-by-redraft`,
`curable-with-new-facts`, `curable-only-with-evidence`, `incurable`.

Where this analysis disagrees with the pleading analyst's, **say so explicitly**
and let the orchestrator reconcile it. Do not silently adopt the other skill's
rating; the disagreement is information.

## 5. Corrective-action plan → in the result

```markdown
| CA-## | Action | Prevents which attack | Owner | Effort | Deadline pressure | Done when |
|---|---|---|---|---|---|---|
```

Ordered by what it prevents, not by ease. `Done when` states a checkable
completion test.

## Cross-cutting rules

- Every attack is written in the opponent's voice, with their best support.
- Every attack has our answer, or an explicit `none` — and `none` is a finding
  that belongs in the short conclusion.
- The report says plainly whether the matter's strongest theory survives all five
  seats. That sentence is the deliverable.
- Nothing here is a recommendation to file anything. The plan is corrective work;
  filing is a human decision.
