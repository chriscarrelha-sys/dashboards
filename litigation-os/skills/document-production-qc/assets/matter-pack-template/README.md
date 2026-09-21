# Matter Pack Template v3.0

A **matter pack** is one lawsuit's facts, parties, documents, deadlines, issues,
and procedural posture in a fixed folder layout. The Litigation OS skills are
matter-agnostic: they read whichever matter pack they are pointed at. Nothing
about any particular case belongs in a skill.

Create a new matter with:

```
python3 scripts/new_matter.py --slug smith-v-acme-2026 \
        --matter-id SMITH-2026 --name "Smith v. Acme Servicing, LLC"
```

That copies this directory, stamps the identifiers everything keys off, and
validates the result. Fill `00-control/matter-control.yaml`,
`00-control/access-map.yaml` and `02-court/court-jurisdiction.yaml` before
anything else, then bring material in with `import_sources.py` — never by
copying files into `03-sources/raw/` by hand, because a file dropped in there
has no hash, no index row and no provenance.

```
python3 scripts/validate_matter_pack.py <pack> --hash-check
python3 scripts/validate_registers.py  <pack> --which all
python3 scripts/validate_crossrefs.py  <pack>
python3 scripts/validate_access_map.py <pack>
python3 scripts/verify_citations.py    <pack> --cross 10-specialist-results
python3 scripts/approval_gate.py       <pack> --validate
python3 scripts/command_center.py      <pack>
```

## Layout

```
00-control/   matter-control.yaml      the single source of truth for the matter
01-parties/   parties.csv              every party and non-party entity
              counsel.csv              lawyers, roles, contact routing
02-court/     court-jurisdiction.yaml  forum, case number, governing rules
              claims-defenses.csv      each claim/defense, elements, target
              procedural-posture.md    narrative posture, updated at each event
03-sources/   source-manifest.csv      every source document, with a stable ID
              raw/                     READ-ONLY copies of source material
04-docket/    docket-register.csv      one row per docket entry
05-chronology/chronology.csv           one row per dated material event
06-issues/    issue-register.csv       the legal and factual questions in play
07-evidence/  proposition-evidence.csv what proves what
              contradiction-register.csv
              missing-evidence.csv
              entity-index.csv         witnesses and entities
08-deadlines/ deadline-register.csv    express and calculated deadlines
09-research/  research-assignments/    outbound assignments to the research skill
              research-tables/         returned research tables
10-specialist-results/                 every ASSIGN-*.md and RESULT-*.md
11-decisions/ attorney-decision-log.csv  what the human decided and when
              approval-requests.csv    the gate in front of every irreversible act
12-workproduct/ production-log.csv     what was rendered, and whether QC passed
              drafts/                  produced PDFs and Word files, marked DRAFT
              final/                   only after an approved APR- entry
```

## The Phase 3 operating layer

Six files turn a folder of registers into something that can be operated across
sessions and across matters:

| File | What it is for |
|---|---|
| `00-control/access-map.yaml` | where each source system is reached, who holds the key, and what THIS session actually had. **Never a credential.** |
| `00-control/task-board.csv` | every task, at plan time — its wave, dependencies, open questions, and the decision it supports |
| `03-sources/source-index.csv` | the intake record behind the manifest: hash, dedupe, text layer, OCR, classification and its evidence |
| `09-research/citation-verification.csv` | where a quotation stops being an assertion: verbatim text, pincite, where it was read, history, version and date |
| `11-decisions/approval-requests.csv` | nothing is filed, served, sent, deleted, renamed or moved without an approved row here |
| `12-workproduct/production-log.csv` | what was produced, its page count, whether its text is searchable, and its QC result |

## The rule about credentials

No password, passphrase, PIN, MFA or OTP code or seed, security answer, API
key, token or court login goes anywhere in a matter pack or a skill — not in
`access-map.yaml`, not in a note, not "temporarily".
`validate_access_map.py` scans the whole pack and fails the build on eleven
secret shapes. The access map records *where* a key is held and *who* holds it.

## The rule about irreversible actions

Filing, serving, sending, publishing, deleting, renaming and materially moving
a litigation document all stop at `11-decisions/approval-requests.csv`. A
request records what it is, why it is needed, what the human must review, and
how irreversible it is. A **named** human decides, and **that human performs the
action**. No script in this system has an execute path.

## The rule about `03-sources/raw/`

Everything under `raw/` is a copy of original case material and is **read-only**.
No skill and no script may write, rename, move, or delete inside it. If a source
needs OCR or conversion, the derived text goes in a *new* file next to it with a
new source ID that records its parent (`derived_from` in the manifest). The
original stays byte-identical. `validate_matter_pack.py --hash-check` records and
re-verifies SHA-256 of every file under `raw/` so mutation is detectable.

## Field definitions

Field-by-field definitions for every file live in
[`FIELD-DEFINITIONS.md`](FIELD-DEFINITIONS.md). They are written so another
agent, with no knowledge of the matter, cannot misread a column.
