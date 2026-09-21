---
doc_type: assignment
schema_version: "1.1"
assignment_id: ASSIGN-CARRELHA-2026-002
matter_id: CARRELHA-2026
issued_by: litigation-matter-orchestrator
issued_to: evidence-chronology-paralegal
issued_date: 2026-09-21
objective: >
  Establish what the available record actually proves about initial loan funding,
  ownership and transfer of the note and security deed, and the payment-application
  and uncredited-payment allegations, so the attorney can see which pleaded facts
  are supported and which are not.
scope_included:
  - "Build the source manifest entries for SRC-001 through SRC-014 (already drafted; verify and correct)"
  - "Build a source-linked chronology from SRC-010, SRC-011, SRC-012 and SRC-013"
  - "Test the First Amended Complaint's central factual allegations (SRC-001) against the servicer's own ledger (SRC-013)"
  - "Identify contradictions and evidentiary gaps bearing on funding, ownership/transfer, and payment application"
scope_excluded:
  - "Do not assess the legal sufficiency of any claim - that is a research question"
  - "Do not compute or opine on any procedural deadline"
  - "Do not reconstruct the origination/funding trail from the annotated spreadsheet SRC-007; it is not a servicer record"
source_locations:
  - "03-sources/source-manifest.csv"
  - "03-sources/raw/ (all extracts)"
  - "00-control/matter-control.yaml"
  - "02-court/claims-defenses.csv"
jurisdiction:
  court: "U.S. District Court, N.D. Ga., Gainesville Division (2:26-cv-00110-RWS-AWH)"
  governing_procedure: "Fed. R. Civ. P.; Fed. R. Evid."
  governing_substantive_law: "Federal (RESPA/FCRA/FDCPA) and Georgia state law"
assumptions:
  - "SRC-013 is a faithful transcription of SRC-006; rows marked [COL?] are not verified"
  - "The manifest's characterization of SRC-007 as annotated litigant work product, not a servicer record, is correct; verify it"
prohibited_actions:
  - "No filing, serving, sending, or transmitting anything to any court or party"
  - "No modifying, renaming, moving, or deleting anything under 03-sources/raw"
  - "No supplying any date, amount, actor, or figure that no source states"
required_output:
  - "05-chronology/chronology.csv"
  - "07-evidence/proposition-evidence.csv"
  - "07-evidence/contradiction-register.csv"
  - "07-evidence/missing-evidence.csv"
  - "07-evidence/entity-index.csv"
  - "RESULT-CARRELHA-2026-002-evidence.md"
completion_standard: >
  Every chronology row carries a source ID, a pinpoint, an epistemic label and a
  confidence. Every proposition row states what the document actually shows, what
  is claimed from it, and the gap. Every contradiction marked genuine carries the
  innocent explanation that was considered and rejected. The result states
  explicitly whether the ledger supports or fails to support the $5,200.00 wire
  allegation, without softening either answer.
due: 2026-09-21
---

## Context

Judge Bagley found that many of the claims turn on whether HELOC proceeds were
actually delivered (SRC-010 at 7). Treat that as the organizing question for the
funding half of this assignment. Apply the same scrutiny to our own side's
allegations as to the defendants' documents.
