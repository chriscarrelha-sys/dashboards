# Reconciliation Protocol

## Sign conventions are a fact to be established, not assumed

A servicing ledger's signs mean whatever that system means by them, and systems
differ. In one, a negative amount is money leaving the borrower's favour; in
another it is a credit to principal; in a third it is a reversal marker.

Establish the convention **from the document's own behaviour** before reading any
sign as meaningful:

1. Find entries whose economic meaning is unambiguous — a regular monthly payment
   that reduces principal.
2. Note the sign it carries.
3. Test that convention against the balance column across several rows.
4. State the convention you derived and the rows you derived it from.

Where the convention is inconsistent within one document, that inconsistency is
itself a finding — and it caps every downstream reading at `medium` confidence.

## Pairing: the core operation

Most apparent irregularities are one economic event recorded across two or more
rows. Before classifying anything as unexplained:

**Search for the pair.** For a negative entry of $X on date D, look for a positive
$X within a plausible window (same day, a few days, occasionally months for a
correction). Look in *both* directions — the reversal sometimes precedes the
re-post.

**Confirm the balance moves consistently.** If the negative reverses the positive,
the balance should return to roughly where it was, net of anything else in
between.

**Record both rows and the pairing**, then treat the pair as one event in the
chronology with a net effect.

When no pair exists, say what window you searched. "No matching credit appears
anywhere in the 42-month ledger" is a strong finding; "unpaired" without a stated
search is not.

## Lines of credit change the analysis

On a HELOC or any revolving line, principal can legitimately **increase** for
reasons that would be anomalous on an amortising loan:

- A **draw** increases principal and is not a payment at all.
- Systems without a distinct draw code often post draws through whatever
  principal code exists, producing rows labelled as payments that increase the
  balance.
- The **opening-balance booking** at origination may appear as a large negative
  "payment" that establishes the balance. This is a `booking`, not a transaction,
  and treating it as an anomalous negative payment is a serious misreading that
  will be corrected by the other side in one sentence.

Before flagging any balance-increasing entry, ask in this order: is it the
origination booking? is it a reversal with a pair? is it a draw? Only then is it
unexplained.

## Suspense and unapplied funds

The most common locus of servicing disputes, and the place where careful tracing
pays.

Trace money **into** and **out of** suspense line by line, maintaining a running
suspense balance independent of the principal balance. For each entry record: what
went in, what came out, what remains, and what the servicer applied it to.

Three findings worth separating:

- **Money in suspense that was never applied.** Strong, and provable from the
  ledger's own ending balance.
- **Money applied from suspense to fees rather than principal and interest.** An
  application dispute, resolved by the contract and any governing regulation.
- **Money that entered suspense and left without a destination.** Usually a
  transcription or pairing problem on your side — look again before reporting it.

A servicer's ending "Unapplied Balance" is a self-authenticating admission that it
holds the borrower's money. It is worth more than most reconstructions.

## Reversals paired with NSF entries

A reversal accompanied by an NSF or returned-payment entry has an obvious innocent
explanation: the payment failed. **State that explanation.** Then test it:

- Does the NSF entry carry an actual fee amount, or $0.00? A $0.00 NSF fee is
  odd and worth noting — without asserting what it means.
- Does the borrower's own bank record show the payment clearing and not being
  returned? If so, there is a genuine conflict between two records, which is a
  real finding — and it needs the bank record, not an assertion about it.
- Were some payments in a series reversed and others not? The unreversed ones are
  the stronger facts.

Never present a reversal as wrongful without addressing the NSF entry. The other
side will lead with it.

## Fees

For each fee: the date, the amount, the description verbatim, the payee if shown,
and whether the ledger states the authority for it. Then group by type and total.

Record what you can prove (a fee of $X was charged on date D, payable to P) apart
from what you cannot without the loan documents (whether the security instrument
authorised it). The second question belongs to the pleading and research
specialists; supply them the schedule, not a conclusion.

Watch for a fee balance that exists **before any fee could have accrued** — a
late-charge balance on an origination-date row, for instance. What that shows is
that the balance was carried in from somewhere the ledger does not display.
Usually that is a data conversion from a prior servicer. Say that; it is the
leading explanation and it points at the right discovery request.

## Interest

Do not recompute interest unless you have: the rate and how it is stated, the day
count convention, the compounding frequency, the balance the rate applies to, and
every rate change in the period. Missing any one of these makes a recomputation
worthless and dangerous — a wrong interest figure discredits every correct figure
around it.

Where interest is claimed but the ledger posts none in the period, that is a
finding: the ledger does not show the accrual supporting the claim. It is not, by
itself, proof the accrual did not happen.

## Frozen fields

A due date that does not advance, or a principal balance unchanged across many
months, is worth recording precisely — what value, from what date, across how
many entries.

Innocent explanations exist and must be stated: once a loan is treated as in
default and payments stop being applied to scheduled instalments, the "next due"
date has nothing to advance to. A frozen field is evidence of how the servicer
was treating the account, which is often exactly what matters — it is not itself
evidence of an accounting error.

## What the ledger cannot tell you

State these limits in every reconciliation:

- Whether a payment was **tendered** — the ledger shows receipt, not tender.
- Whether a payment was **returned by the borrower's bank** — only the bank
  record shows that.
- What the servicer **should** have done — that is contract and regulation.
- What happened **before** the earliest row, or after the print date.
- Whether entries were **deleted** before printing.

Two prints of the same statement with different print dates are the cheapest way
to test that last point. Compare them row by row and report any difference.
