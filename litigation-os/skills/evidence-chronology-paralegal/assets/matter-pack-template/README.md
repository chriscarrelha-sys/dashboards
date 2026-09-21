# Matter Pack Template v1.1

A **matter pack** is one lawsuit's facts, parties, documents, deadlines, issues,
and procedural posture in a fixed folder layout. The four Litigation OS
specialist skills are matter-agnostic: they read whichever matter pack they are
pointed at. Nothing about any particular case belongs in a skill.

Create a new matter by copying this whole directory to
`litigation-os/matters/<matter-slug>/` and filling in `00-control/matter-control.yaml`
first. Then run:

```
python3 litigation-os/tools/validate_matter_pack.py litigation-os/matters/<matter-slug>
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
```

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
