---
doc_type: assignment
schema_version: "1.1"
assignment_id: ASSIGN-CARRELHA-2026-007
matter_id: CARRELHA-2026
issued_by: litigation-matter-orchestrator
issued_to: discovery-planning-analyst
issued_date: 2026-09-21
objective: >
  Convert the gaps, contradictions and at-risk elements now on the record into a
  sequenced, defendant-specific discovery plan, so the attorney can see what to ask
  for, from whom, and in what order - and what can be obtained without discovery at all.
scope_included:
  - "Every row of 07-evidence/missing-evidence.csv (21 gaps)"
  - "Every element marked gap or pleaded-only in the claim-survival matrix"
  - "The contradictions in the contradiction register that a document could resolve"
  - "A Phase 0 list of what is obtainable with no discovery at all"
scope_excluded:
  - "Do not serve, send, file or transmit anything"
  - "Do not assert that the discovery window is open - record the gate status as GATE-UNVERIFIED until docket confirms it"
  - "Do not draft requests for gaps that Phase 0 self-help would close more cheaply"
source_locations:
  - "07-evidence/missing-evidence.csv"
  - "07-evidence/claim-survival-matrix.csv"
  - "07-evidence/contradiction-register.csv"
  - "07-evidence/disputed-amounts.csv"
  - "07-evidence/entity-role-map.csv"
  - "02-court/procedural-posture.md"
jurisdiction:
  court: "U.S. District Court, N.D. Ga., Gainesville Division (2:26-cv-00110-RWS-AWH)"
  governing_procedure: "Fed. R. Civ. P.; Fed. R. Evid.; N.D. Ga. Local Rules; N.D. Ga. Standing Order No. 18-01"
  governing_substantive_law: "Federal (RESPA/FCRA/FDCPA/TILA); Georgia substantive law on the state counts"
assumptions:
  - "No Rule 26(f) conference is shown to have occurred; SRC-004 refers to it in the future tense as of 2026-08-19"
  - "No scheduling order appears among the sources"
prohibited_actions:
  - "No filing, serving, sending, or transmitting anything to any court, agency, party or third party"
  - "No modifying, renaming, moving, or deleting anything under 03-sources/raw"
  - "No fact, date, figure, citation or holding that no source in the manifest supports"
  - "No service of any discovery request - drafting only, pending express human authorization logged in 11-decisions"
required_output:
  - "09-research/discovery/request-to-issue.csv"
  - "07-evidence/custodian-map.csv"
  - "RESULT-CARRELHA-2026-007-discovery.md"
completion_standard: >
  Every request traces to a gap and an element, names one defendant by ENT-###, and
  states why that party has the material. The gate status appears in the first lines
  of the roadmap. Nothing is served, and the result says so.
due: 2026-09-21
---

## Context

Five of the matter's blocking gaps are in the client's own files or in public records.
A discovery plan that leads with party discovery when the answer is a phone call to a bank
is a plan that wastes six months. Put Phase 0 first.
