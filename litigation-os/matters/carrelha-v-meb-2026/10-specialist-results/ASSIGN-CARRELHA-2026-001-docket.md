---
doc_type: assignment
schema_version: "1.1"
assignment_id: ASSIGN-CARRELHA-2026-001
matter_id: CARRELHA-2026
issued_by: litigation-matter-orchestrator
issued_to: docket-deadline-paralegal
issued_date: 2026-09-21
objective: >
  Establish the case's verified procedural posture and every deadline now
  running, so the attorney can determine what is owed to the court and when.
scope_included:
  - "Every docket entry referenced on the face of Doc. 34 and Doc. 35 (SRC-010, SRC-011)"
  - "Every deadline and compliance obligation stated in Doc. 34 and Doc. 35"
  - "The CourtListener docket record (SRC-014) and what it does and does not establish"
  - "Pre-removal state-court orders described in Doc. 34, to the extent they impose surviving obligations"
scope_excluded:
  - "Do not assess the merits of any claim or the sufficiency of any pleading"
  - "Do not compute any deadline running from the filing of an amended complaint until that filing is established"
  - "Do not attempt to access PACER; this session has no PACER credentials"
source_locations:
  - "03-sources/source-manifest.csv"
  - "03-sources/raw/SRC-010-extract-doc34-order.txt"
  - "03-sources/raw/SRC-011-extract-doc35-order.txt"
  - "03-sources/raw/SRC-014-extract-courtlistener-docket.txt"
  - "00-control/matter-control.yaml"
jurisdiction:
  court: "U.S. District Court, N.D. Ga., Gainesville Division (2:26-cv-00110-RWS-AWH)"
  governing_procedure: "Fed. R. Civ. P.; N.D. Ga. Local Rules; N.D. Ga. Standing Order No. 18-01"
  governing_substantive_law: "Federal (RESPA/FCRA/FDCPA) and Georgia state law"
assumptions:
  - "The extracts SRC-010, SRC-011 and SRC-014 faithfully reproduce their originals; test this against the manifest rather than accepting it"
  - "No docket material beyond these sources is available to this session"
prohibited_actions:
  - "No filing, serving, sending, or transmitting anything to any court or party"
  - "No modifying, renaming, moving, or deleting anything under 03-sources/raw"
  - "No stating any date as a confirmed deadline without a quoted source or a fully shown computation"
required_output:
  - "04-docket/docket-register.csv"
  - "08-deadlines/deadline-register.csv"
  - "02-court/procedural-posture.md"
  - "RESULT-CARRELHA-2026-001-docket.md"
completion_standard: >
  Every row in the deadline register is either express with a quotation, or
  calculated with rule, trigger, trigger date, method and calendar basis shown,
  or typed conditional/estimated with date NOT-COMPUTABLE. Every docket row
  carries a verification_status that honestly reflects whether the underlying
  document was read. The result states plainly whether the 2026-08-21 amendment
  deadline was met and, if that cannot be established, says so as a blocking
  human decision rather than assuming either answer.
due: 2026-09-21
---

## Context

The deadline in Doc. 35 has passed as of today's date. Everything else in this
matter depends on whether it was met, and this session cannot see the docket.
Do not resolve that uncertainty by inference in either direction.
