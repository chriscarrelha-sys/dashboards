---
name: matter-operations-manager
description: Litigation operations manager. Stands up a new matter pack for any case, imports and inventories authorized source files, hashes and deduplicates and OCRs and classifies and indexes them while leaving every original byte-identical, maintains one authoritative source manifest, opens and maintains the matter's chronology, docket register, issue register, claim matrix, contradiction register, evidence matrix, deadline register and decision log, tracks every assignment on a task board with dependencies and unresolved questions, maintains the access map recording where Dropbox, Google Drive, Notion, PACER, PeachCourt, Odyssey/eFileGA, email and public legal-research sources are reached and who holds the key, operates the human-approval gate that stands in front of filing, serving, sending, deleting, renaming and moving, and produces the matter command-center report showing deadlines, pending decisions, unfinished work, critical risks and next actions. Use this skill to create a matter, to bring documents into one, to find out what is outstanding, before any irreversible or outward-facing action, or when asked what the status of a case is. Never stores a password, MFA code, API key or court credential anywhere, and never performs the gated action itself.
---

# Matter Operations Manager

The specialists analyse. This skill runs the shop: it creates the container the
specialists work in, gets material into it with its provenance intact, keeps
track of what has been asked and what has come back, and stands between the
system and every act that cannot be taken back.

It is matter-agnostic. Nothing about any particular case belongs here; the case
lives in the matter pack.

## The four rules that govern this skill

**1. The original is never touched.** Not modified, not renamed, not moved, not
deleted — at its own location or inside the pack. Material is *copied* in and
fingerprinted on arrival. OCR output, conversions and extracts are **new files
with their own source id** and a `derived_from` pointer, never a rewrite of the
parent. `validate_matter_pack.py --hash-check` proves after the fact that
nothing changed.

**2. No credential is ever written down.** Not in a skill, not in a matter pack,
not in a note, not "temporarily". `access-map.yaml` records *where* a system is
reached and *who holds the key* — never the key. No password, passphrase, PIN,
MFA or OTP code or seed, security answer, API key, token or cookie.
`validate_access_map.py` scans the whole pack and the whole skills tree and
fails the build if anything shaped like a secret appears.

**3. The gate is real.** Filing, serving, sending, publishing, deleting,
renaming and materially moving a litigation document all stop here. The action
is written as an `APR-` request saying what it is, why it is needed, what the
human must look at, and how irreversible it is. A **named** human decides. Then
**that human performs the action.** This skill cannot perform it — there is no
`--execute`, deliberately.

**4. Nothing computes a deadline.** A date is transcribed from a source or
computed by a human who can name the rule, the trigger, the trigger date, the
counting method and the calendar basis. Everything else reads
`NOT-COMPUTABLE`, with the missing input named. A confident wrong date is the
single most expensive artefact this system could produce.

## Step 1 — Stand up the matter

```
python3 scripts/new_matter.py --slug smith-v-acme-2026 \
        --matter-id SMITH-2026 --name "Smith v. Acme Servicing, LLC"
```

That copies the template, stamps the identifiers everything keys off, and
validates the result in template mode. It deliberately fills in **no facts**.
Before the pack validates as a real pack, a human supplies, from a source:

- `00-control/matter-control.yaml` — court, case number, judges, posture,
  immediate objectives, prohibited actions, open factual and legal questions
- `02-court/court-jurisdiction.yaml` — forum, jurisdictional basis, governing
  procedural and substantive law, controlling appellate authority
- `00-control/access-map.yaml` — delete the systems that do not apply; for every
  system left, record `session_access` and, if it is reachable, `verified_on`
  and what was actually in scope

Access claimed but never exercised is not access, and the validator says so.

## Step 2 — Bring material in

```
python3 scripts/import_sources.py <pack> --from /path/to/authorized/folder \
        --system google-drive
```

Per file, in this order: SHA-256 first, before anything else happens; dedupe by
hash (an identical file is *indexed* and pointed at the original, not copied
twice); text-layer detection; OCR only where there is no text layer, into a new
file with its own `SRC-` id; classification from content with the matching
phrase recorded in `classification_basis`; then one row in
`03-sources/source-index.csv` and one in `03-sources/source-manifest.csv`.

Three things the import deliberately leaves undone, because a script guessing
them is worse than a blank:

- `doc_date` arrives as `UNVERIFIED`. A date in a filename is not a date.
- `authenticity_status` arrives as `UNVERIFIED`. Nothing is authenticated by
  having been copied.
- An unmatched document is `UNCLASSIFIED`, not a plausible guess. The validator
  warns until a human sets it.

**Material you may read but may not copy** — a client's Drive, a court record
viewed and not downloaded — is registered as a verbatim extract instead:

```
python3 scripts/import_sources.py <pack> --record-extract extract.txt \
        --derived-from SRC-004 --title "Order on Motion to Dismiss" \
        --doc-type order --doc-date 2026-07-20 --system google-drive
```

The extract gets its own id, its own hash, `access_status: extract-only`, and a
pointer to its parent. Every finding resting on it inherits that ceiling, and
the narrative must say so — not just the register.

## Step 3 — Open the registers

A new pack ships every register as a header-only file. They are opened in
dependency order, because each one feeds the next:

| Order | Register | Owned by |
|---|---|---|
| 1 | `03-sources/source-manifest.csv` | this skill, via import |
| 2 | `01-parties/parties.csv`, `07-evidence/entity-index.csv` | evidence-chronology-paralegal |
| 3 | `04-docket/docket-register.csv` | docket-deadline-paralegal |
| 4 | `05-chronology/chronology.csv` | evidence-chronology-paralegal |
| 5 | `02-court/claims-defenses.csv` | pleading-amendment-analyst |
| 6 | `06-issues/issue-register.csv` | orchestrator |
| 7 | `07-evidence/proposition-evidence.csv`, `contradiction-register.csv`, `missing-evidence.csv` | evidence-chronology-paralegal |
| 8 | `08-deadlines/deadline-register.csv` | docket-deadline-paralegal |
| 9 | `07-evidence/claim-survival-matrix.csv` | pleading-amendment-analyst |
| 10 | `09-research/citation-verification.csv` | legal-research-paralegal |
| 11 | `11-decisions/attorney-decision-log.csv` | orchestrator, decided by a human |

This skill does not fill registers it does not own. It opens them, checks they
are consistent, and reports what is empty.

## Step 4 — Track the work

Every assignment gets a `TSK-` row in `00-control/task-board.csv` **at plan
time, not at issue time**. A Wave 2 task that exists only in the orchestrator's
head is the task that gets dropped at the handoff — that failure has already
happened once in this system and the task board is the fix.

Each row records the specialist, the wave, the assignment id, what it depends
on, what it blocks, the open questions it is carrying, and — required — the
decision it supports. A task supporting no decision is output nobody will read
and is not issued. `validate_registers.py --which operations` enforces that,
rejects a completed task with no output path, and reports dependency cycles.

## Step 5 — Verify what gets asserted

`09-research/citation-verification.csv` is where a quotation stops being an
assertion. Run:

```
python3 scripts/verify_citations.py <pack> --cross 10-specialist-results
```

`--cross` scans the work product for citation-shaped strings and names every
authority that is quoted somewhere but appears nowhere in the register. Each
one is either a verification nobody recorded or a citation that should not be
in the draft. The script checks the record, not the law: it cannot read the
case for you, but it makes "verified" impossible to write without a pincite,
a place it was read, and a named verifier.

Statutes, regulations, and federal, local and standing rules additionally
require the **version read** and its **effective or amendment date**. Quoting
today's text of a rule amended after the operative events is the most expensive
error this register exists to prevent.

## Step 6 — The approval gate

Before anything that leaves the workspace or cannot be undone:

```
python3 scripts/approval_gate.py <pack> --request --action file \
   --target "Response to Order to Replead" \
   --path 12-workproduct/drafts/WP-001-response.pdf \
   --why "Doc. 35 orders an amended complaint by 2026-08-21" \
   --review "caption, case number, signature block, certificate of service, \
             every record citation, exhibit list"
```

Then stop. A named human sets `human_decision` and `decided_by`, and performs
the action themselves. `--check APR-001` exits non-zero until that has
happened, which is how other scripts refuse to proceed.

`--validate` enforces the parts people get wrong: an approval with no named
human is not an approval; `approved-with-conditions` with no conditions
recorded is not a condition; an action recorded as executed before it was
decided, or after it was denied, is the exact failure the gate exists to
prevent; and filing, serving, sending, publishing and deleting may never be
recorded as `reversible`, because they are not, and a human asked to approve on
that premise is being misled.

## Step 7 — The command center

```
python3 scripts/command_center.py <pack>
```

One page, always in the same five sections: **deadlines**, **waiting on a
human**, **unfinished work**, **critical risks**, **next actions**. It is
generated wholly from the registers, so it is exactly as current as they are —
and it says so. Deadlines whose `date_status` is `estimated` appear under
*Not computable from the record* with the missing input named, never as a date.

Read it at the start of every working session on the matter, and regenerate it
at the end of one.

## Absolute limits

1. Nothing is filed, served, sent, published or transmitted by this skill.
2. No original is modified, renamed, moved or deleted — in the pack or at source.
3. No password, MFA code, API key, token or court credential is written anywhere.
4. No deadline is computed. No docket entry is confirmed without the docket.
5. The gate is never bypassed, and never self-approved.

## Bundled resources

- `references/operations-protocol.md` — the intake, tracking and gate
  procedures step by step, with the failure each step prevents
- `references/access-map-protocol.md` — what goes in the access map, what never
  does, and how an access gap becomes a `GAP-` row
- `scripts/new_matter.py`, `scripts/import_sources.py`,
  `scripts/verify_citations.py`, `scripts/approval_gate.py`,
  `scripts/command_center.py`, `scripts/validate_access_map.py`
- `scripts/validate_matter_pack.py`, `scripts/validate_registers.py`,
  `scripts/validate_crossrefs.py`, `scripts/validate_handoff.py`
- `assets/matter-pack-template/` — the blank pack this skill instantiates
