# Access Map Protocol

## What the file is for

Three questions, answered once, in a place every specialist can read:

1. **Where does this kind of material live?** Which system holds the servicing
   records, the docket, the correspondence.
2. **Who can actually get to it?** The client, the attorney of record, nobody.
3. **What did this session actually have?** Not what exists — what was reached.

The third is the one that matters most, because it is the one that turns into a
false claim. A specialist that writes "the note was not produced" when nobody
could open the folder the note is in has stated a fact about the case from a
fact about the session.

## What never goes in it

No password. No passphrase. No PIN. No MFA, OTP or TOTP code or seed. No
security-question answer. No API key, secret key, access token, bearer token,
session cookie or client secret. No PACER, PeachCourt, eFileGA/Odyssey or email
login of any kind. Not in this file, not in any other file in the pack, not in
a skill, not in a comment, not "temporarily while testing".

`credential_holder` names a **person or role**. `credential_location` names a
**place** — "client password manager", "attorney of record's keychain". If
either reads like a value rather than a place, the validator warns, and it is
right to.

`validate_access_map.py <pack> --also <skills-dir>` scans every text file in
both trees for eleven secret shapes and fails the build on any of them. Run it
in the build, not on request.

## Per-system fields

| Field | What it means |
|---|---|
| `key` | short stable name used in prose and registers |
| `kind` | cloud-storage, workspace, court-record, court-efiling, correspondence, legal-research |
| `purpose` | what material of this matter is in it |
| `reached_via` | connector, URL or "human login" — the route, not the key |
| `credential_holder` | who holds it |
| `credential_location` | where they keep it |
| `session_access` | `none`, `read`, `read-write` — what THIS session had |
| `verified_on` | the date access was actually exercised. Required whenever access is claimed. |
| `scope_note` | what was in scope, and what the source's nature limits |
| `write_permitted` | always `no` for court systems and for anything holding originals |
| `cost_note` | where access costs money per use (PACER) and a human authorises it |

## The limitations that must be written down

Some systems carry a limitation that silently corrupts every finding drawn from
them unless it is recorded at the source:

- **RECAP** mirrors only what somebody already purchased. Absence from RECAP is
  not absence from the docket. Any docket fact from RECAP carries that into
  every register that cites it.
- **Public legal research without a commercial citator** cannot establish
  good-law status. The ceiling is **CITATOR-LIMITED MEDIUM**, never high.
- **A client-side cloud folder** shows what the client kept, not what exists.
  A document's absence there is not evidence it was never sent.
- **A county records portal** typically shows recorded instruments only. An
  unrecorded assignment is invisible there and is not thereby non-existent.

## Access gaps

Every system under `known_inaccessible` needs a `gap_ids` pointer into
`07-evidence/missing-evidence.csv`, saying what is in it, why it cannot be
reached, and how a human would get it. An access gap with no `GAP-` row is a
gap nobody will close; the validator treats it as an error.

An access gap never stops work that can be done from other sources. It bounds
the work, is stated where the conclusion is stated, and becomes a discovery
target.

## Court systems are read-only, always

`write_permitted` on a `court-record` or `court-efiling` system may never be
`yes`. No skill and no script in this system submits anything to a court. A
filing is prepared, QC'd, gated, and handed to a human who files it.
