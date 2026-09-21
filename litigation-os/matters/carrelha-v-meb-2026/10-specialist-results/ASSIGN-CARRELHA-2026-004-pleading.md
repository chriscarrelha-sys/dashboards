---
doc_type: assignment
schema_version: "1.1"
assignment_id: ASSIGN-CARRELHA-2026-004
matter_id: CARRELHA-2026
issued_by: litigation-matter-orchestrator
issued_to: pleading-amendment-analyst
issued_date: 2026-09-21
objective: >
  Determine whether the 16-count First Amended Complaint at SRC-020/SRC-021 cures
  the defects Doc. 35 identified, what new defects it introduces, and what must be
  corrected before it is filed or, if already filed, before Defendants respond.
scope_included:
  - "Compare SRC-001 (9-count Google Doc draft) against SRC-020/SRC-021 (16-count markdown) and report the delta"
  - "Run the full 14-item defect scan on SRC-021 as the better candidate for the operative pleading"
  - "Build the claim-survival matrix for the counts the available record can support"
  - "Analyse the Rule 15 / Doc. 35 amendment route and what it authorises"
scope_excluded:
  - "Do not state element lists from memory - route any element list you lack to legal-research-paralegal and mark it UNRESEARCHED"
  - "Do not analyse ledger arithmetic; that is ASSIGN-005"
  - "Do not analyse the ownership chain; that is ASSIGN-006"
  - "Do not assume either candidate pleading was filed"
source_locations:
  - "03-sources/source-manifest.csv"
  - "03-sources/raw/SRC-021-extract-fac-v2.txt"
  - "03-sources/raw/SRC-011-extract-doc35-order.txt"
  - "03-sources/raw/SRC-010-extract-doc34-order.txt"
  - "02-court/claims-defenses.csv"
  - "10-specialist-results/RESULT-CARRELHA-2026-003-research.md"
jurisdiction:
  court: "U.S. District Court, N.D. Ga., Gainesville Division (2:26-cv-00110-RWS-AWH)"
  governing_procedure: "Fed. R. Civ. P.; Fed. R. Evid.; N.D. Ga. Local Rules; N.D. Ga. Standing Order No. 18-01"
  governing_substantive_law: "Federal (RESPA/FCRA/FDCPA/TILA); Georgia substantive law on the state counts"
assumptions:
  - "SRC-021 is a faithful extract of SRC-020; SRC-020 was read in full"
  - "The Weiland and Vibe Micro holdings in RESULT-003 were verified against the opinions and may be relied on"
prohibited_actions:
  - "No filing, serving, sending, or transmitting anything to any court, agency, party or third party"
  - "No modifying, renaming, moving, or deleting anything under 03-sources/raw"
  - "No fact, date, figure, citation or holding that no source in the manifest supports"
  - "No proposed allegation without a stated evidentiary or good-faith basis"
required_output:
  - "07-evidence/claim-survival-matrix.csv"
  - "07-evidence/pleading-support-table.csv"
  - "RESULT-CARRELHA-2026-004-pleading.md"
completion_standard: >
  Every correction carries a source-and-pinpoint basis, a named witness, or an
  explicit [BASIS-REQUIRED] flag. Every matrix row names one defendant by ENT-###
  and carries its element_source. The delta between the two candidate pleadings is
  reported before any analysis of either.
due: 2026-09-21
---

## Context

Phase 1 analysed SRC-001 and flagged as HD-2 the risk that it was not the operative
document. That risk has materialised: a later, structurally different pleading exists.
Report the delta first; it is likely the most useful thing you produce.
