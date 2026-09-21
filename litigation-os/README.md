# Litigation OS — Phase 1

A multi-agent litigation-support system built from **reusable specialist skills**
organised by legal function. The specialists hold no facts about any case. Each
lawsuit is a **matter pack** — a fixed folder of facts, parties, sources, docket,
deadlines, issues and evidence — and the specialists operate on whichever pack
they are pointed at.

## Install

```bash
./install.sh            # sync, validate, install to ~/.claude/skills/
./install.sh --build-only
```

The validators live once, in `tools/`. `install.sh` syncs them into each skill's
`scripts/` and the matter-pack template into each skill's `assets/`, so every
skill still works when copied somewhere with no repo around it. **Edit `tools/`
and re-run; never edit a skill's `scripts/` copy.**

## The four skills

| Skill | Function |
|---|---|
| `litigation-matter-orchestrator` | Managing attorney: scopes, routes, stress-tests, reconciles, signs one report |
| `legal-research-paralegal` | Legal authority: jurisdiction first, then the hierarchy; verifies eight fields separately; hunts adverse authority |
| `evidence-chronology-paralegal` | Factual record: manifest, chronology, entity map, proposition/evidence matrix, contradictions, gaps, witnesses |
| `docket-deadline-paralegal` | Procedural control: docket register, deadline register, posture, unresolved questions, critical dates |

## Layout

```
skills/            the four skills (source of truth)
standards/         the agent handoff standard, shared by all four
matter-pack-template/   blank pack; FIELD-DEFINITIONS.md defines every column
tools/             six validators (edit here)
matters/           populated matter packs
test-log/          defects found by forward testing and their corrections
install.sh
```

## Start a new matter

```bash
cp -r matter-pack-template matters/<slug>
# fill matters/<slug>/00-control/matter-control.yaml first
python3 tools/validate_matter_pack.py matters/<slug> --hash-check
```

## Validate

```bash
python3 tools/validate_skill.py        skills/*
python3 tools/validate_matter_pack.py  matters/<slug> --hash-check
python3 tools/validate_registers.py    matters/<slug>
python3 tools/validate_crossrefs.py    matters/<slug>
python3 tools/validate_handoff.py --dir matters/<slug>/10-specialist-results
```

`--hash-check` records and re-verifies SHA-256 for everything under
`03-sources/raw/`, so any alteration of a source is detectable between runs.

## Two things this system deliberately will not do

**It will not compute a legal deadline.** That requires the governing rule, the
triggering event and its date, the jurisdiction, the service method, and the
court's calendar including local closures. A tool producing dates from partial
inputs would manufacture false confidence. The validator instead enforces the
discipline that makes a human-computed deadline auditable: a `calculated` row
must show rule, trigger, trigger date, method and calendar basis, or it is
rejected; an `estimated` or ambiguous row must read `NOT-COMPUTABLE`.

**It will not act outward.** No filing, serving, sending, or transmitting to any
court, agency, party or third party, and no modification of any original source.
Drafting is permitted; transmission requires an express human authorization
logged in `11-decisions/attorney-decision-log.csv`.

## Known limits

See `test-log/defects.md`. In short: no validator can confirm a quotation is
accurate or that an epistemic label is correctly applied (both are human checks);
the system has no PACER or citator access; and everything so far has been
exercised against a single matter.
