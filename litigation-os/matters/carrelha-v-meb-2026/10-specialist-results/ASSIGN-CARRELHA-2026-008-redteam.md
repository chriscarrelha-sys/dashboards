---
doc_type: assignment
schema_version: "1.1"
assignment_id: ASSIGN-CARRELHA-2026-008
matter_id: CARRELHA-2026
issued_by: litigation-matter-orchestrator
issued_to: adversarial-redteam-analyst
issued_date: 2026-09-21
objective: >
  Attack this matter from all five seats and tell the attorney, in one sentence,
  whether the strongest theory survives - and what the three most urgent corrective
  actions are.
scope_included:
  - "The 16-count pleading at SRC-020/SRC-021 and the defect scan at 07-evidence/pleading-defects.csv"
  - "Every returned specialist result and register in the pack"
  - "Our own prior filings and the two orders, for positions that conflict with positions taken now"
  - "Rule 11 exposure paragraph by paragraph on the allegations analysed"
scope_excluded:
  - "Do not soften an attack because it is uncomfortable"
  - "Do not invent a weakness - every attack names its support"
  - "Do not decide the law; mark any attack resting on your own reading as analyst-reading"
source_locations:
  - "07-evidence/pleading-defects.csv"
  - "07-evidence/claim-survival-matrix.csv"
  - "07-evidence/pleading-support-table.csv"
  - "07-evidence/disputed-amounts.csv"
  - "07-evidence/authority-matrix.csv"
  - "03-sources/raw/SRC-021-extract-fac-v2.txt"
  - "03-sources/raw/SRC-010-extract-doc34-order.txt"
  - "03-sources/raw/SRC-011-extract-doc35-order.txt"
jurisdiction:
  court: "U.S. District Court, N.D. Ga., Gainesville Division (2:26-cv-00110-RWS-AWH)"
  governing_procedure: "Fed. R. Civ. P.; Fed. R. Evid.; N.D. Ga. Local Rules; N.D. Ga. Standing Order No. 18-01"
  governing_substantive_law: "Federal (RESPA/FCRA/FDCPA/TILA); Georgia substantive law on the state counts"
assumptions:
  - "The pleading analysed is SRC-021; whether it was filed is not established"
  - "Element lists in the claim-survival matrix are marked UNRESEARCHED and may be wrong"
prohibited_actions:
  - "No filing, serving, sending, or transmitting anything to any court, agency, party or third party"
  - "No modifying, renaming, moving, or deleting anything under 03-sources/raw"
  - "No fact, date, figure, citation or holding that no source in the manifest supports"
required_output:
  - "07-evidence/attack-surface.csv"
  - "RESULT-CARRELHA-2026-008-redteam.md"
completion_standard: >
  Every attack is written in the opponent's voice with its best support and our
  honest answer. Every attack ranked in the top five carries a corrective action.
  The result states plainly whether the strongest theory survives all five seats.
due: 2026-09-21
---

## Context

This is the last pass before the attorney acts. Its value is entirely in its honesty:
an attack you soften here is one the other side makes later, for free.
