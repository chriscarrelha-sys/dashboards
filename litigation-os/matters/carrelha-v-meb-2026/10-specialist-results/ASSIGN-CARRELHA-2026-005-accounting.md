---
doc_type: assignment
schema_version: "1.1"
assignment_id: ASSIGN-CARRELHA-2026-005
matter_id: CARRELHA-2026
issued_by: litigation-matter-orchestrator
issued_to: loan-accounting-analyst
issued_date: 2026-09-21
objective: >
  Reconcile the servicer's ledger transaction by transaction so the attorney can
  state what the record supports about the September 2023 reinstatement, the
  $10,000 and $855 reversals, the asserted December 19 2023 $5,200 wire, the 2025
  trial payments, suspense, and the fees charged against a frozen principal.
scope_included:
  - "Every row of SRC-013 (all 5 pages), classified and paired"
  - "The September 2023 reinstatement: what came in on 09/13/23 and what went out on 09/14/23"
  - "The $10,000 payment of 09/15/23 and its 09/26/23 reversal; the $855 of 09/26/23 and its 10/11/23 reversal"
  - "Whether any entry or combination of entries corresponds to a $5,200.00 remittance asserted to have been wired on December 19, 2023"
  - "The four 2025 payments of $1,899.56, their reversals, and the NSF entries"
  - "Total fees charged, by era and payee"
  - "Comparison of the 01/16/2026 print (SRC-024/SRC-025) against the 03/10/2026 print (SRC-013)"
scope_excluded:
  - "Do not recompute interest - the rate basis, day count and compounding are not in the sources"
  - "Do not opine on whether any fee was authorised; that is a contract and regulation question"
  - "Do not characterise any variance as an overcharge or a violation"
source_locations:
  - "03-sources/source-manifest.csv"
  - "03-sources/raw/SRC-013-extract-loan-history.txt"
  - "03-sources/raw/SRC-025-extract-5200-named-file.txt"
  - "03-sources/raw/SRC-012-extract-cfpb-response.txt"
  - "03-sources/raw/SRC-021-extract-fac-v2.txt"
  - "05-chronology/chronology.csv"
jurisdiction:
  court: "U.S. District Court, N.D. Ga., Gainesville Division (2:26-cv-00110-RWS-AWH)"
  governing_procedure: "Fed. R. Civ. P.; Fed. R. Evid.; N.D. Ga. Local Rules; N.D. Ga. Standing Order No. 18-01"
  governing_substantive_law: "Federal (RESPA/FCRA/FDCPA/TILA); Georgia substantive law on the state counts"
assumptions:
  - "SRC-013 is a faithful transcription of SRC-006; rows marked [COL?] are unverified"
  - "The December 19 2023 wire date is asserted by the client and is NOT established by any source in the manifest - treat it as an input to test, not a fact"
prohibited_actions:
  - "No filing, serving, sending, or transmitting anything to any court, agency, party or third party"
  - "No modifying, renaming, moving, or deleting anything under 03-sources/raw"
  - "No fact, date, figure, citation or holding that no source in the manifest supports"
required_output:
  - "07-evidence/transaction-reconciliation.csv"
  - "07-evidence/disputed-amounts.csv"
  - "RESULT-CARRELHA-2026-005-accounting.md"
completion_standard: >
  Every reversal names its pair. Every stated difference shows its arithmetic and
  its assumptions. No [COL?] figure appears in any computation. Where the inputs are
  ambiguous, competing computations are shown rather than one chosen silently. No
  variance is characterised as wrongdoing.
due: 2026-09-21
---

## Context

Phase 1 found no $5,200.00 entry anywhere in the ledger. The client has since supplied
a date - December 19, 2023 - which points at the 12/21/23 cluster. Test that against the
arithmetic and report what it does and does not support. Do not resolve it by assumption
in either direction.
