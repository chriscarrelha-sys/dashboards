# Pleading Defect Catalog

Fourteen defects, each with what it looks like, how to detect it, what cures it,
and what leaving it costs. Run the whole list; the expensive ones are rarely the
ones that look worst on a first read.

---

## 1–4. The four shotgun categories

Courts of appeals have grouped defective pleadings into recurring types. The four
that recur most:

**1. Each count adopts the allegations of all preceding counts.** The classic and
most common. Detect by reading the first sentence of every count: if it says "re-
alleges and incorporates each and every preceding paragraph," and preceding
*counts* fall within that range, you have it.

*The distinction that decides most cases:* incorporating a block of **general
factual allegations** is not this defect. Incorporating preceding **counts** is.
A pleading may reallege "¶¶ 1–49" at the head of every count and be fine, if
¶¶ 1–49 are facts and not counts. Verify what falls inside the range before
calling it a defect — and before assuming a redraft cured it.

*Cure:* renumber so each count incorporates only identified factual paragraphs.
Cheap. `curable-by-redraft`.

**2. Conclusory, vague, and immaterial facts not connected to any cause of
action.** Detect by picking three random factual paragraphs and asking which
count each supports. If you cannot tell, neither can the defendant.

*Cure:* delete the immaterial, and attach the material to specific counts.
`curable-by-redraft`, but it shrinks the pleading, which clients resist.

**3. Not separating each cause of action into its own count.** Detect by reading
each count's heading against its body: does one count plead both a statutory
violation and a common-law tort?

*Cure:* split. `curable-by-redraft`.

**4. Group pleading — multiple claims against multiple defendants without
specifying which defendant did what.** Detect by taking each count and each
defendant and asking: what does this count say *this* defendant did? If the
answer is only "Defendants," it is group pleading.

*Cure:* requires defendant-specific facts, which may not exist. Often
`curable-with-new-facts` rather than by redraft — and where the facts do not
exist for a particular defendant, the honest cure is dropping that defendant from
that count.

---

## 5. Ambiguous cross-reference

A count incorporates "¶¶ 1 through 46" in a pleading whose paragraph numbering
restarts in each section, so several paragraphs bear each number and none is
uniquely 46.

*Detect:* count the paragraphs. If numbering restarts, the reference is ambiguous
regardless of how obvious the drafter's intent was. Also check whether the
arithmetic works under continuous numbering — if it does, intent is clear and the
fix is purely mechanical, which is worth saying.

*Cure:* renumber continuously. The cheapest fix in this catalog and one of the
easier defects for an opponent to make sound damning.

---

## 6. Caption / body mismatch

An entity in the caption against whom no count is asserted, or an entity targeted
in the body but absent from the caption.

*Detect:* build two lists — captioned parties and parties named in a count's
"against" line — and diff them.

*Why it matters:* a party named only in the body is frequently held not to be a
party at all. A party in the caption with no count against it gets no notice of
any claim, which is the fourth shotgun category in miniature and an easy motion
for the other side.

*Cure:* plead a count, or remove from the caption. Note that **adding** a party
by amendment usually needs more than a repleading order — check the order's
words and the rule.

---

## 7. Missing defendant-specific facts

Distinct from group pleading: the count may name one defendant cleanly and still
plead no facts about what that defendant did.

*Detect:* for each defendant, collect every factual paragraph naming it. If the
collection is empty or purely structural ("X is a Delaware LLC"), the defect is
present.

*Cure:* `curable-with-new-facts`, and the facts must come from somewhere. This is
where the `[BASIS-REQUIRED]` discipline earns its keep.

---

## 8. Exhibit conflict

An exhibit attached to or incorporated in the pleading contradicts an allegation.

*Detect:* for every allegation citing an exhibit, open the exhibit and read the
cited page. Then read the exhibit's *other* pages — conflicts usually live where
the drafter did not look.

*Why it matters disproportionately:* an exhibit is generally treated as part of
the pleading, and where it contradicts an allegation the exhibit usually
controls. A defendant who finds this gets to use the plaintiff's own attachment
to defeat the plaintiff's own allegation, at the pleading stage, without
discovery.

*Cure:* depends. If the allegation overstated what the exhibit shows, narrow the
allegation. If the exhibit genuinely refutes the claim, the defect may be
`incurable` — and it is better to know now.

---

## 9. Jurisdictional defects

*Detect:* is the basis for subject-matter jurisdiction pleaded, and does it hold
on the face of the pleading? For supplemental jurisdiction, is the common nucleus
pleaded? For diversity, is citizenship pleaded for every party — including the
citizenship of every member of an LLC, and of a trust under the rule that applies
to its form?

*Cure:* often `curable-by-redraft` if the facts exist. Jurisdiction can be raised
at any time and is never waived, so an unpleaded basis is a standing risk rather
than a one-time hurdle.

---

## 10. Standing

*Detect:* for each plaintiff and each claim, is a concrete particularised injury
pleaded, traceable to that defendant, redressable by the relief sought? Statutory
violations do not automatically supply concrete injury.

*Watch for:* a plaintiff who is on the loan but not on the title, or on the title
but not the loan; a claim whose injury belongs to someone else; relief that would
not redress the pleaded injury.

*Cure:* varies from `curable-by-redraft` to `incurable`.

---

## 11. Conditions precedent

Pre-suit notice, exhaustion, statutory demand, a contractual notice-and-cure
period, ante litem notice under a consumer statute.

*Detect:* identify every claim whose statute or contract imposes a precondition,
then find the paragraph pleading satisfaction. A general averment that all
conditions precedent have been performed may suffice under the rules — but where
a specific statute requires specific notice, plead the specific notice.

*Cure:* if the condition was satisfied, `curable-by-redraft`. If it was not,
`incurable` for that claim, and sometimes time-barred to fix.

---

## 12. Limitations on the face

A pleading that dates its own claims outside the period.

*Detect:* for each claim, find the limitations period (from research) and the
earliest and latest conduct pleaded. Flag any claim whose conduct predates the
period.

*Important:* limitations is ordinarily an affirmative defense, so it supports
dismissal only when the bar appears on the face of the pleading. That makes this
partly a **drafting** question: pleading unnecessary early dates can hand the
other side a facial bar that they would otherwise have to prove.

*Cure:* plead a continuing violation, discovery rule, tolling, or relation back —
each with its own requirements, each to be researched, none to be asserted from
memory. Or narrow the pleaded conduct to the period.

---

## 13. Internal inconsistency

Count headings numbered differently from the cross-references to them; a
paragraph range that does not exist; a count "against" one list of defendants in
its heading and another in its body; a defined term used before it is defined.

*Detect:* mechanically. Build a table of count numbers from headings, a table
from cross-references, and diff. Resolve every "¶¶ X–Y" against the actual
paragraph count.

*Why it matters:* individually trivial, collectively corrosive. A pleading filed
under an order to replead *carefully* invites a harsh reading when its own
internal references do not line up.

*Cure:* `curable-by-redraft`, always.

---

## 14. Verification and signature

A pleading titled "verified" with no verification, an unsigned pleading, or
template placeholders left in the signature block.

*Detect:* read the last two pages. Look for unfilled placeholders — "this ___ day
of", "/s/", "By: Person".

*Why it matters:* verification affects what the pleading can do evidentially
(supporting or opposing certain motions). An unsigned pleading is subject to
being struck, though ordinarily after an opportunity to correct.

*Cure:* sign it. `curable-by-redraft` — but only if someone notices before filing.

---

## Applying the catalog honestly

Two failure modes to avoid:

**Over-reporting.** A catalog of fourteen defects will always find something. A
report listing fourteen cosmetic problems buries the one that is fatal. Rank by
severity and say plainly which ones actually decide anything.

**Under-reporting our own side.** The purpose of running this on our own pleading
is to find what the other side will find. Apply every test to our pleading with
the same rigour you would apply to theirs, and write the defect in the words the
opponent would use.
