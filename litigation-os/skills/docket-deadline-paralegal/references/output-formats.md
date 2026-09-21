# Docket Specialist — Output Formats

## 1. Critical-date warning list

Goes at the top of *Verified findings* in the result. An attorney scanning this
in thirty seconds must be able to tell which dates are real.

```markdown
### CRITICAL DATES — as of YYYY-MM-DD

> Dates marked (!) are NOT confirmed. Do not calendar them without verification.

#### Passed — requires confirmation of compliance
| Date | What was due | Type | Source | Complied? | Consequence if not |
|---|---|---|---|---|---|

#### Upcoming — confirmed
| Date | Days out | What is due | Type | Source | Owner |
|---|---|---|---|---|---|

#### (!) Unverified, ambiguous, or conflicting
| Date or NOT-COMPUTABLE | What is due | Why not confirmed | What would confirm it | Priority |
|---|---|---|---|---|

#### Conditional — no date until the trigger occurs
| Obligation | Trigger | Rule | Period | Status of trigger |
|---|---|---|---|---|

#### Standing compliance obligations — no single date
| Obligation | Imposed by | Binds until | Practical effect |
|---|---|---|---|
```

Never merge the unverified table into the confirmed one. The separation is the
deliverable.

## 2. Procedural-posture summary → `02-court/procedural-posture.md`

```markdown
# Procedural Posture — <matter>
**As of:** YYYY-MM-DD   **Sources:** SRC-### …

## Current stage
One paragraph: where the case is, what the court is waiting for, and who is
under an obligation right now.

## What is pending
| Docket no. | Filing | Filed | Status | Who acts next |

## What has been decided
| Docket no. | Order | Date | Operative language (quoted) | Effect |

## Next required action
Who must do what, by when, under which order or rule.

## Unresolved procedural questions
Numbered, each with what would resolve it.
```

Keep "decided" and "pending" strictly apart, and quote operative language rather
than paraphrasing it. A motion "denied as moot" belongs under decided, with its
mootness and any leave to refile stated — it is a different animal from a denial
on the merits and the distinction changes what can be filed next.

## 3. Unresolved procedural questions

In the result's *Uncertainty* section and as `issue_type: procedural` rows in
`06-issues/issue-register.csv`.

```markdown
| # | Question | Why it matters | What would resolve it | Owner | Blocking? |
```

Typical entries: whether a filing was actually made; which of two amended
pleadings an order refers to; whether a pre-removal deadline survived; whether an
automatic referral applies; whether a period was tolled; whether the docket
supplied is complete.

## 4. Docket register → `04-docket/docket-register.csv`

Ordered by `docket_no`, then `sub_no`. Gaps in the numbering are noted as an
unresolved question, not silently passed over.

## 5. Deadline register → `08-deadlines/deadline-register.csv`

Ordered by `date`, with `NOT-COMPUTABLE` rows last. Every row carries its type,
status, rule, trigger, method, calendar basis, consequence, and source.

## Reporting convention

State the register's own limits up front: which docket entries you had, which you
did not, whether you worked from documents or only from a docket sheet, and
whether the docket you were given is complete. A deadline register built from an
incomplete docket is reliable only as to what it saw, and the attorney has to
know that to use it.
