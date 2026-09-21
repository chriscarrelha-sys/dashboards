# Authority Hierarchy and Binding Status

## Why order matters

Climbing the hierarchy from the bottom — starting with a case that sounds
on-point — is how researchers end up citing a court of appeals gloss on a statute
that was amended three years later. Start at the top and stop when the question
is answered.

## The ranks

**1. Constitutions.** Federal first, then the state's. Relevant when a
constitutional right, a jurisdictional limit, or a preemption question is in
play. Rarely the answer in commercial or consumer litigation, but when it is, it
ends the inquiry.

**2. Statutes.** Read the operative text yourself. Three things trip people up:

- *Definitions sections.* Whether a party is a "servicer," "debt collector,"
  "furnisher," or "consumer" is usually decided by a definition, not by a case.
- *Effective dates and amendments.* The version in force when the conduct
  occurred is the version that governs. A case interpreting the prior version may
  be dead on the point without ever being overruled.
- *Private right of action.* Many statutes create duties without creating a
  private remedy, or create one only against certain actors. Check this before
  building a claim on the duty.

**3. Regulations.** In administratively dense areas the regulation, not the
statute, supplies the operative test, and the agency's official commentary often
supplies the test's content. Check whether the regulation was in force at the
relevant time and whether it has been amended or stayed.

**4. Procedural rules.** Three layers, all of which bind:

- The national rules (e.g. Federal Rules of Civil Procedure/Evidence).
- The district's or court's **local rules**.
- **Standing orders** of the court or the individual judge.

The last two are the ones most often missed and are frequently dispositive: page
limits, conferral requirements, chambers copies, which judge decides what,
whether a matter is automatically referred to a magistrate.

In federal court sitting in diversity or supplemental jurisdiction, procedure is
federal and substance is state. A state procedural rule generally does not travel
with a removed case; an order the state court entered before removal generally
does remain in effect until modified. Check both propositions against current
authority rather than assuming them.

**5. Controlling appellate opinions.** "Controlling" is a relationship between
two specific courts, not a property of an opinion:

| Deciding court | Bound by |
|---|---|
| U.S. district court | Supreme Court; its own circuit's published opinions |
| U.S. court of appeals panel | Supreme Court; its own circuit's prior published panel decisions (until en banc) |
| State trial court | That state's supreme court; its intermediate appellate courts per state rule |
| Any court on state-law questions | That state's highest court; federal decisions on state law are predictions, not authority |

Two traps:

- **Unpublished / non-precedential dispositions.** Every circuit and state has
  its own rule. Some permit citation as persuasive authority; none make them
  binding. Record the status in `binding_status` and never call one
  `controlling`.
- **Federal courts on state law.** An Eleventh Circuit case predicting Georgia
  law does not bind Georgia courts and is superseded the moment the Georgia
  Supreme Court speaks. Cite the state authority if it exists.

**6. Trial-court decisions in the same court.** Not binding, sometimes the most
practically useful thing you can find — especially a decision by the same judge
on the same question. Say clearly that it is persuasive.

**7. Other courts' appellate decisions.** Persuasive. Weight depends on the
court's reputation on the issue, whether the controlling court has cited it
approvingly, and whether the reasoning transfers.

**8. Agency guidance and official commentary.** Weight is itself a legal
question, and the doctrine governing how much deference courts owe agency
interpretations has moved significantly in recent years. Do not assert a
deference standard from memory; find current authority in the controlling court,
and if you cannot, say so and mark it unresolved.

**9. Secondary sources.** Treatises, practice guides, law reviews, and
annotations are for orientation and for finding primary authority. They are not
the authority. A proposition supported only by a treatise is `[UNRESOLVED]` until
you find what the treatise is citing and read that.

## Split authority

When the controlling court has not decided the question:

1. Say so explicitly — this is itself the most important finding.
2. Map the split: which courts hold what, and on what reasoning.
3. Identify which side the controlling court's related reasoning points toward.
4. Give the attorney the honest assessment, including the risk of being the test
   case.

Do not present one side of a split as settled law because it is the side that
helps.

## Recording binding status

| Value | Use when |
|---|---|
| `controlling` | The deciding court is bound by it — confirmed against the forum |
| `persuasive-in-circuit` | Same circuit/state system, not binding (district court, unpublished) |
| `persuasive-out-of-circuit` | Different system entirely |
| `non-precedential` | Expressly designated unpublished/non-precedential |
| `superseded` | Overruled, abrogated, or legislatively displaced on this point |
| `unknown` | You could not determine it — say why in `notes` |
