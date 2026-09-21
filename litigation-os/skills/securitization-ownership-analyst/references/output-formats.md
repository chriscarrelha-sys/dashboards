# Ownership Analyst — Output Formats

## 1. Entity and role map → `07-evidence/entity-role-map.csv`

One row per **entity × role**. An entity in two roles gets two rows.

`entity_name_verbatim` and `entity_type_verbatim` are reproduced exactly as the
source states them. "a[n] CORPORATION organized under the laws of NEW YORK" is
recorded that way, brackets and capitals included, because the wording is the
finding.

`as_of_date` is the date as of which the assertion is made — not the document's
date, when those differ.

## 2. Transfer chronology → `07-evidence/transfer-chronology.csv`

One row per instrument or asserted transfer, with all eight date columns present
and `UNVERIFIED` where a date is not shown. `UNVERIFIED` is a finding: an undated
endorsement is a fact worth recording.

`sequence_anomaly` is `yes`/`no`. Whenever `yes`, both `anomaly_description` and
`innocent_explanation` are required — the validator enforces the pair. An anomaly
whose ordinary explanation you cannot state has not been analysed.

## 3. Authority matrix → `07-evidence/authority-matrix.csv`

| Column | Rule |
|---|---|
| `right_asserted` | `foreclose` / `collect` / `own-debt` / `hold-note` / `service` / `report` — one of the five concepts, never a blend |
| `what_it_establishes` | Read narrowly: what the document actually proves |
| `what_it_does_not_establish` | **Required, never blank.** The half that keeps the matrix honest |
| `materiality` | `dispositive` requires `supporting_authority` — enforced |

## 4. Missing-document list → rows for `07-evidence/missing-evidence.csv`

Standard columns. The recurring set: the original note with all endorsements; any
allonge; the security instrument as recorded; every assignment; the servicing
agreement and any power of attorney; the trust's governing agreement; the mortgage
loan schedule; the custodian's certification and exception report; the purchase
and sale agreements; investor reporting for the account.

For each, `likely_custodian` matters more than usual — the custodian, not the
servicer, is generally the party who can say who holds the original note.

## 5. Viable-issue assessment → in the result

```markdown
| # | Issue | What the record shows | Which of the five concepts | Supporting authority | Standing to raise it | What it gets us | Confidence |
|---|---|---|---|---|---|---|---|
```

**Standing to raise it** is a required column. An issue the client has no standing
to raise is not viable however strong it looks, and belongs in the rejected list
with that explanation.

**What it gets us** must be concrete: "supports a records-reliability argument and
a 30(b)(6) topic" is useful; "undermines their position" is not.

## 6. Rejected-theory warnings → in the result

```markdown
| Theory | Why it fails | Forum-specific rule | Do not plead |
|---|---|---|---|
```

Include every theory the facts might tempt someone into, not only ones already
raised. This list prevents a later draft from reintroducing what was rejected.

Where the forum-specific rule has not been researched, say `UNRESEARCHED — route
to legal-research-paralegal before relying on either the theory or its rejection`.

## Cross-cutting rules

- Every apparent conflict is first tested with: **do these two sources answer the
  same question?** Record that test.
- Every anomaly carries its innocent explanation.
- Ownership, enforcement, servicing and reporting are never blended in one row.
- Absence from your sources is recorded as absence **from the sources reviewed**,
  never as absence from the world.
