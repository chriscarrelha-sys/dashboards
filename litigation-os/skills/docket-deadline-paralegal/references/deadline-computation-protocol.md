# Deadline Computation Protocol

## The gate

Before computing anything, confirm all seven inputs are in hand. Write them out;
do not hold them in your head.

| # | Input | If missing |
|---|---|---|
| 1 | **Governing rule** — the specific rule, statute, order, or local rule setting the period | Find it and read it. Do not proceed on a remembered rule number. |
| 2 | **Triggering event** — what starts the clock | The deadline is `conditional`; date `NOT-COMPUTABLE`. |
| 3 | **Triggering event date** — when it happened | The deadline is `estimated`; date `NOT-COMPUTABLE`; the date becomes a verification task. |
| 4 | **Jurisdiction** — which system's counting rules apply | Stop. You cannot count without this. |
| 5 | **Service method** — how the triggering paper was served | Whether extra days are added turns on this. Missing method → `ambiguity_flag: yes`. |
| 6 | **Calendar basis** — calendar days, business days, or court days | Stop. Getting this wrong is the classic malpractice trap. |
| 7 | **Court calendar** — weekends, legal holidays, clerk closures | If you cannot confirm, compute and mark `date_status: needs-verification`, stating which roll you could not confirm. |

Any gap produces `deadline_type: estimated`, `date: NOT-COMPUTABLE`, and a row on
the verification list. The validator enforces this.

## Read the rule; do not recall it

Day-counting rules differ by system and have been amended. The federal civil
rules were substantially restyled and their counting method changed in 2009;
state systems vary among themselves and from the federal model; some periods run
from service and some from filing or entry; some local rules shorten or lengthen
national periods. Open the governing text for the version in force at the
relevant time, quote the operative sentence into `computation_method`, and count
from the words in front of you.

## The general shape of a computation

Most systems follow a broadly similar pattern, but the details that differ are
exactly the details that change the answer. Work through each question
explicitly and record your answer to each:

1. **Is the trigger day counted?** Most systems exclude the day of the event.
   Confirm for this system and this rule.
2. **Are intermediate weekends and holidays counted?** Many systems count all
   days for longer periods and exclude weekends/holidays for short ones, with a
   threshold. Find the threshold; do not assume it.
3. **Does the last day roll?** If the period ends on a weekend, legal holiday, or
   day the clerk's office is inaccessible, most systems roll forward to the next
   accessible day. Identify the holiday list that applies — federal and state
   lists differ, and individual courts close for local reasons.
4. **Are days added for the method of service?** Several systems add days when
   service was by mail and not when it was electronic. Determine the method from
   the record, not from what is usual.
5. **Does a specific rule or order override the general rule?** A scheduling
   order, a local rule, or a standing order routinely displaces the default. The
   more specific instrument controls.
6. **When does the period end on the day?** Filing cutoffs (midnight, close of
   business, clerk's hours) vary and matter on the last day.

## Show the work

`computation_method` must let a reader check the result without redoing it:

> Rule: [cite the rule and quote its period].
> Trigger: [event] on [date], established by SRC-### at [pinpoint].
> Counting: [trigger day excluded/included]; [intermediate weekends and holidays
> counted/excluded]; day 1 = [date] … day N = [date].
> Last-day roll: [date] is a [day/holiday] → rolls to [date] / no roll required.
> Service: [method]; [N additional days added under [rule] / none added].
> Result: [date]. Calendar basis: [calendar/business/court] days.

A `computation_method` that names a rule without showing the counting has not
shown the work. The validator warns on suspiciously short entries; fix the
substance.

## Conditional and cascading deadlines

A **conditional** deadline runs from an event that has not yet occurred —
"respond within N days after the amended pleading is filed." It gets
`deadline_type: conditional`, `date: NOT-COMPUTABLE`, and a fully specified rule
and trigger so it converts the instant the trigger fires.

These are the most commonly lost deadlines, precisely because they have no date
to sort by. In the critical-date warning list, give them their own section rather
than burying them below the dated rows.

A **cascade** is a chain: the amended pleading triggers a response, which
triggers a reply, which may trigger a hearing. Record the whole chain with each
link's rule, so that when the first domino falls the rest are already specified.

## Deadlines that are not dates

Some obligations have no single date and are easy to miss entirely:

- A court-imposed notice requirement on future conduct ("shall provide N days'
  advance notice before proceeding") — a live compliance obligation that binds
  until modified.
- A continuing duty to supplement.
- An obligation triggered by a party's own election.
- A conferral requirement that must be satisfied *before* a motion is filed, so
  the real deadline is earlier than the filing deadline.

Record each as `deadline_type: conditional` with the obligation in `description`
and the trigger stated, so it is tracked rather than forgotten.

## Standard traps

| Trap | Guard |
|---|---|
| Filing date vs. entry date | Record both; read the rule to see which it runs from |
| Service date vs. receipt date | Determine from the record; if unclear, flag ambiguous |
| Removed case: which rules now apply | Federal procedure governs after removal; pre-removal orders generally survive. Confirm both against current authority. |
| Pre-removal state-court deadlines | They do not vanish. Sweep the state-court record. |
| Local rules and standing orders | Always check; they routinely displace the national period |
| Multiple amended pleadings | "The amended complaint" is ambiguous when there are two. Flag it. |
| Holiday lists | Federal, state, and local court closures differ |
| Stay or extension | Check whether anything tolled the period; a stay may or may not toll |
| Deadline stated in an order vs. computed from a rule | The order controls; record the rule-derived date only as a cross-check |
| Weekend roll applied twice | Roll once, at the end |

## When you cannot compute

Say so, precisely: which input is missing, where it would come from, and what the
deadline would be once supplied. That is a complete and useful answer.

What is never acceptable is a plausible date with no method behind it. The
attorney cannot tell, from looking at a date, whether it was computed or guessed
— which is why the register makes you write down which it was.
