---
doc_type: assignment
schema_version: "1.1"
assignment_id: ASSIGN-CARRELHA-2026-006
matter_id: CARRELHA-2026
issued_by: litigation-matter-orchestrator
issued_to: securitization-ownership-analyst
issued_date: 2026-09-21
objective: >
  Establish who claims to own, hold, service and report this loan, on which
  documents and as of when, and separate the inconsistencies that plausibly matter
  in Georgia from the securitization theories that do not.
scope_included:
  - "The asserted chain: Lendage origination, MERS as nominee, the 2024 recorded assignment to MEB, servicing SLS to Shellpoint"
  - "The three unreconciled ownership statements pleaded at SRC-021 PP 19-23"
  - "What the DBRS FREED 2022-HE1 press release (SRC-023) does and does not establish"
  - "The entity-type recital on the recorded assignment"
  - "A rejected-theory warning list for this matter"
scope_excluded:
  - "Do not opine on whether Plaintiffs have standing to challenge the assignment - route that to legal-research-paralegal and record the answer as UNRESEARCHED until it returns"
  - "Do not analyse ledger arithmetic"
  - "Do not treat the absence of a document from these sources as evidence it does not exist"
source_locations:
  - "03-sources/source-manifest.csv"
  - "03-sources/raw/SRC-021-extract-fac-v2.txt"
  - "03-sources/raw/SRC-023-extract-dbrs-freed-2022he1.txt"
  - "03-sources/raw/SRC-012-extract-cfpb-response.txt"
  - "03-sources/raw/SRC-010-extract-doc34-order.txt"
  - "01-parties/parties.csv"
jurisdiction:
  court: "U.S. District Court, N.D. Ga., Gainesville Division (2:26-cv-00110-RWS-AWH)"
  governing_procedure: "Fed. R. Civ. P.; Fed. R. Evid.; N.D. Ga. Local Rules; N.D. Ga. Standing Order No. 18-01"
  governing_substantive_law: "Federal (RESPA/FCRA/FDCPA/TILA); Georgia substantive law on the state counts"
assumptions:
  - "No note, allonge, endorsement, assignment instrument, trust agreement or mortgage loan schedule is among the sources - only descriptions of some of them"
  - "SRC-021 quotes the recorded assignment and the Witt Letter; the underlying documents were NOT read"
prohibited_actions:
  - "No filing, serving, sending, or transmitting anything to any court, agency, party or third party"
  - "No modifying, renaming, moving, or deleting anything under 03-sources/raw"
  - "No fact, date, figure, citation or holding that no source in the manifest supports"
required_output:
  - "07-evidence/entity-role-map.csv"
  - "07-evidence/transfer-chronology.csv"
  - "07-evidence/authority-matrix.csv"
  - "RESULT-CARRELHA-2026-006-ownership.md"
completion_standard: >
  Every authority row states what the document does NOT establish. Every sequence
  anomaly carries its innocent explanation. The rejected-theory list is present and
  non-empty. Every conflict is first tested against whether the two sources answer
  the same question.
due: 2026-09-21
---

## Context

Ames v. JP Morgan Chase Bank, 298 Ga. 732 (2016) is cited in SRC-021 P3 as the standing
constraint the pleading is drafted around. You are not to decide what Ames holds; you are
to flag every theory that depends on the answer, so research can resolve it once.
