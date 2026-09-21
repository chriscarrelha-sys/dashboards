#!/usr/bin/env python3
"""Validate the deadline, research, and evidence registers of a matter pack.

This script deliberately does NOT compute any legal deadline. Computing a
deadline requires the governing rule, the triggering event, the jurisdiction,
the service method, and the court's calendar (including local holidays and
clerk closures) — inputs a script cannot reliably supply. A tool that produced
dates from partial inputs would manufacture false confidence, which is the exact
failure this system exists to prevent.

What it does instead is enforce the discipline that makes a human-computed
deadline auditable:

  * a deadline typed `calculated` must show its rule, trigger, trigger date,
    computation method, and calendar basis;
  * a deadline typed `express` must quote a source;
  * a deadline typed `estimated` or flagged ambiguous must NOT carry a date that
    looks confirmed;
  * a `conditional` deadline whose trigger has not occurred must read
    NOT-COMPUTABLE rather than a guessed date.

Usage:
    validate_registers.py <matter-pack-dir> [--which deadlines|research|evidence|all]
"""
from __future__ import annotations

import argparse
import re
import sys
from datetime import date
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from common import (  # noqa: E402
    CONFIDENCE_LEVELS, EPISTEMIC_LABELS, UNVERIFIED, Report,
    check_enum, die, read_csv, require_columns, split_ids,
)

ISO_DATE = re.compile(r"^\d{4}-\d{2}-\d{2}$")
NOT_COMPUTABLE = "NOT-COMPUTABLE"

DEADLINE_COLS = [
    "deadline_id", "description", "deadline_type", "date", "date_status",
    "triggering_event", "triggering_event_date", "governing_rule",
    "computation_method", "calendar_basis", "consequence_of_missing",
    "ambiguity_flag", "source_id", "pinpoint", "confidence",
]
DEADLINE_TYPES = {"express", "calculated", "estimated", "conditional"}
DATE_STATUSES = {"confirmed", "needs-verification", "ambiguous", "superseded"}
CALENDAR_BASES = {"calendar-days", "business-days", "court-days", "n/a"}

RESEARCH_COLS = [
    "row_id", "proposition", "jurisdiction", "authority_full_citation",
    "authority_type", "binding_status", "pinpoint", "quotation",
    "holding_or_dicta", "factual_comparison", "adverse_authority",
    "still_good_law", "verification_method", "verified_fields",
    "unverified_fields", "confidence", "unresolved_research",
]
BINDING = {"controlling", "persuasive-in-circuit", "persuasive-out-of-circuit",
           "non-precedential", "superseded", "unknown"}
GOODLAW = {"yes", "no", "questioned", "unchecked"}
HOLDING = {"holding", "dicta", "mixed", "unclear"}


def check_deadlines(rep: Report, root: Path) -> None:
    path = root / "08-deadlines/deadline-register.csv"
    header, rows = read_csv(path)
    if not header:
        rep.error("deadline-register.csv missing or unreadable")
        return
    require_columns(rep, path, header, DEADLINE_COLS)
    if not rows:
        rep.note("deadline-register.csv has no rows")
        return

    check_enum(rep, path, rows, "deadline_type", DEADLINE_TYPES)
    check_enum(rep, path, rows, "date_status", DATE_STATUSES)
    check_enum(rep, path, rows, "calendar_basis", CALENDAR_BASES)
    check_enum(rep, path, rows, "confidence", CONFIDENCE_LEVELS)

    seen = set()
    for i, row in enumerate(rows, start=2):
        did = (row.get("deadline_id") or "").strip()
        if not re.match(r"^DL-\d{3}$", did):
            rep.error(f"deadline-register.csv line {i}: deadline_id '{did}' must match DL-###")
        elif did in seen:
            rep.error(f"deadline-register.csv line {i}: duplicate deadline_id {did}")
        seen.add(did)

        dtype = (row.get("deadline_type") or "").strip()
        dval = (row.get("date") or "").strip()
        dstatus = (row.get("date_status") or "").strip()
        ambiguous = (row.get("ambiguity_flag") or "").strip().lower() == "yes"

        if dval and dval != NOT_COMPUTABLE and not ISO_DATE.match(dval):
            rep.error(f"deadline-register.csv line {i} ({did}): date '{dval}' must be "
                      f"YYYY-MM-DD or the literal {NOT_COMPUTABLE}")

        if dtype == "express":
            if not (row.get("source_id") or "").strip():
                rep.error(f"{did}: express deadline carries no source_id — an express "
                          "deadline must be quoted from an order, rule, or notice")
            if not (row.get("pinpoint") or "").strip():
                rep.error(f"{did}: express deadline carries no pinpoint")

        if dtype == "calculated":
            for col, why in [
                ("governing_rule", "the rule that sets the period"),
                ("triggering_event", "the event that starts the clock"),
                ("triggering_event_date", "the date that event occurred"),
                ("computation_method", "the arithmetic, shown step by step"),
                ("calendar_basis", "calendar vs business vs court days"),
            ]:
                if not (row.get(col) or "").strip() or (row.get(col) or "").strip() == UNVERIFIED:
                    rep.error(f"{did}: deadline_type=calculated but '{col}' is missing "
                              f"({why}). A calculated deadline without its inputs is not a "
                              "deadline — retype it as 'estimated' and set date "
                              f"{NOT_COMPUTABLE}.")
            method = (row.get("computation_method") or "")
            if method and len(method.strip()) < 25:
                rep.warn(f"{did}: computation_method is very short; it must show the "
                         "counting, not just name a rule")

        if dtype == "estimated":
            if dval and dval != NOT_COMPUTABLE:
                rep.error(f"{did}: deadline_type=estimated but date is '{dval}'. An "
                          f"estimated deadline must read {NOT_COMPUTABLE} so it can never "
                          "be mistaken for a real date; the estimate belongs in notes.")
            if dstatus == "confirmed":
                rep.error(f"{did}: estimated deadline cannot have date_status=confirmed")

        if dtype == "conditional":
            trig = (row.get("triggering_event_date") or "").strip()
            if trig in ("", UNVERIFIED, "pending", "not-yet-occurred") and \
                    dval not in (NOT_COMPUTABLE, ""):
                rep.error(f"{did}: conditional deadline whose triggering event has not "
                          f"occurred must read {NOT_COMPUTABLE}, not '{dval}'")

        if ambiguous and dstatus == "confirmed":
            rep.error(f"{did}: ambiguity_flag=yes but date_status=confirmed. An ambiguous "
                      "deadline is a high-priority verification item, never a confirmed date.")
        if ambiguous and not (row.get("ambiguity_description") or "").strip():
            rep.error(f"{did}: ambiguity_flag=yes but ambiguity_description is empty")

        if dstatus == "confirmed" and dtype not in {"express", "calculated"}:
            rep.error(f"{did}: date_status=confirmed requires deadline_type express or "
                      f"calculated, not '{dtype}'")

        if not (row.get("consequence_of_missing") or "").strip():
            rep.error(f"{did}: consequence_of_missing is empty — a deadline whose "
                      "consequence is unstated cannot be triaged")

        conflicts = split_ids(row.get("conflicts_with", ""))
        for c in conflicts:
            if c not in ("n/a", "none") and not re.match(r"^DL-\d{3}$", c):
                rep.error(f"{did}: conflicts_with '{c}' is not a DL-### id")

    # Second pass: conflicts must point at rows that exist, and be mutual.
    for row in rows:
        did = (row.get("deadline_id") or "").strip()
        for c in split_ids(row.get("conflicts_with", "")):
            if c in ("n/a", "none"):
                continue
            if c not in seen:
                rep.error(f"{did}: conflicts_with {c} which is not in the register")
            else:
                back = next((r for r in rows
                             if (r.get("deadline_id") or "").strip() == c), None)
                if back and did not in split_ids(back.get("conflicts_with", "")):
                    rep.warn(f"{did} declares a conflict with {c} but {c} does not "
                             "declare it back; conflicts should be recorded on both rows")


def check_research(rep: Report, root: Path) -> None:
    tables = sorted((root / "09-research/research-tables").glob("*.csv"))
    tables = [t for t in tables if "TEMPLATE" not in t.name]
    if not tables:
        rep.note("no research tables present")
        return
    for path in tables:
        header, rows = read_csv(path)
        require_columns(rep, path, header, RESEARCH_COLS)
        if not rows:
            rep.warn(f"{path.name}: no rows")
            continue
        check_enum(rep, path, rows, "binding_status", BINDING)
        check_enum(rep, path, rows, "still_good_law", GOODLAW)
        check_enum(rep, path, rows, "holding_or_dicta", HOLDING)
        check_enum(rep, path, rows, "confidence", CONFIDENCE_LEVELS)

        for i, row in enumerate(rows, start=2):
            rid = (row.get("row_id") or f"line {i}").strip()
            quote = (row.get("quotation") or "").strip()
            pin = (row.get("pinpoint") or "").strip()
            if quote and quote not in ("n/a", UNVERIFIED, "") and not pin:
                rep.error(f"{path.name} {rid}: a quotation is given with no pinpoint. "
                          "An unpinpointed quotation cannot be checked and must not be "
                          "relied on.")
            vm = (row.get("verification_method") or "").strip()
            if (row.get("still_good_law") or "").strip() == "yes" and \
                    (not vm or vm == UNVERIFIED):
                rep.error(f"{path.name} {rid}: still_good_law=yes with no "
                          "verification_method. Write 'unchecked' rather than an "
                          "unverified 'yes'.")
            if not (row.get("jurisdiction") or "").strip():
                rep.error(f"{path.name} {rid}: jurisdiction is empty; controlling status "
                          "cannot be assessed without it")
            if (row.get("binding_status") or "").strip() == "controlling" and \
                    not (row.get("jurisdiction") or "").strip():
                rep.error(f"{path.name} {rid}: marked controlling without a jurisdiction")
            adv = (row.get("adverse_authority") or "").strip()
            if not adv:
                rep.error(f"{path.name} {rid}: adverse_authority is empty. Write "
                          "'none-found' plus where you searched, in notes — silence "
                          "reads as 'no adverse authority exists'.")
            uf = (row.get("unverified_fields") or "").strip()
            if (row.get("confidence") or "").strip() == "high" and uf and \
                    uf not in ("none", "n/a", ""):
                rep.error(
                    f"{path.name} {rid}: confidence=high while unverified_fields "
                    f"lists '{uf}'. `high` asserts that a reader need check nothing "
                    "further. If the only gap is good-law status because no citator "
                    "is available, that is CITATOR-LIMITED MEDIUM: report `medium`, "
                    "list what WAS confirmed in verified_fields, and say in "
                    "unresolved_research that a Shepard's/KeyCite pass is owed.")


def check_evidence(rep: Report, root: Path) -> None:
    prop = root / "07-evidence/proposition-evidence.csv"
    _, rows = read_csv(prop)
    if rows:
        check_enum(rep, prop, rows, "epistemic_label", EPISTEMIC_LABELS)
        check_enum(rep, prop, rows, "confidence", CONFIDENCE_LEVELS)
        for i, row in enumerate(rows, start=2):
            pid = (row.get("proposition_id") or f"line {i}").strip()
            for col in ("what_the_document_actually_shows", "what_is_claimed_from_it",
                        "gap_between_the_two"):
                if not (row.get(col) or "").strip():
                    rep.error(f"proposition-evidence.csv {pid}: '{col}' is empty. This "
                              "column is the guard against over-claiming and is never "
                              "optional; write 'none' when there is no gap.")
            if (row.get("proof_status") or "").strip() == "proved-by-document" and \
                    not split_ids(row.get("supporting_source_ids", "")):
                rep.error(f"proposition-evidence.csv {pid}: proof_status="
                          "proved-by-document with no supporting_source_ids")

    contra = root / "07-evidence/contradiction-register.csv"
    _, crows = read_csv(contra)
    if crows:
        check_enum(rep, contra, crows, "is_genuine_conflict",
                   {"yes", "no", "unresolved"})
        check_enum(rep, contra, crows, "materiality",
                   {"dispositive", "material", "impeachment-only", "immaterial"})
        for i, row in enumerate(crows, start=2):
            cid = (row.get("contradiction_id") or f"line {i}").strip()
            if (row.get("is_genuine_conflict") or "").strip() == "yes" and \
                    not (row.get("innocent_explanations") or "").strip():
                rep.error(f"contradiction-register.csv {cid}: is_genuine_conflict=yes "
                          "with no innocent_explanations. If you cannot state the benign "
                          "reading, the finding has not been tested.")
            for a, b in (("source_id_a", "pinpoint_a"), ("source_id_b", "pinpoint_b")):
                if (row.get(a) or "").strip() and not (row.get(b) or "").strip():
                    rep.error(f"contradiction-register.csv {cid}: {a} given without {b}")

    chron = root / "05-chronology/chronology.csv"
    _, hrows = read_csv(chron)
    if hrows:
        check_enum(rep, chron, hrows, "epistemic_label", EPISTEMIC_LABELS)
        check_enum(rep, chron, hrows, "confidence", CONFIDENCE_LEVELS)
        check_enum(rep, chron, hrows, "date_precision",
                   {"exact", "month", "year", "on-or-about", "range"})
        for i, row in enumerate(hrows, start=2):
            eid = (row.get("event_id") or f"line {i}").strip()
            if not (row.get("source_id") or "").strip():
                rep.error(f"chronology.csv {eid}: every event needs a source_id")
            if not (row.get("pinpoint") or "").strip():
                rep.error(f"chronology.csv {eid}: every event needs a pinpoint")
            if (row.get("confidence") or "").strip() == "high" and \
                    (row.get("epistemic_label") or "").strip() in ("[INFERENCE]", "[UNRESOLVED]"):
                rep.error(f"chronology.csv {eid}: confidence=high is not available for "
                          f"{row.get('epistemic_label')} events")

    gaps = root / "07-evidence/missing-evidence.csv"
    _, grows = read_csv(gaps)
    if grows:
        for i, row in enumerate(grows, start=2):
            gid = (row.get("gap_id") or f"line {i}").strip()
            if not (row.get("why_believed_to_exist") or "").strip():
                rep.error(f"missing-evidence.csv {gid}: why_believed_to_exist is empty; "
                          "without it the row is speculation, not a gap")




# ---------------------------------------------------------------- Phase 2 ----

def check_pleading(rep: Report, root: Path) -> None:
    path = root / "07-evidence/claim-survival-matrix.csv"
    header, rows = read_csv(path)
    if rows:
        check_enum(rep, path, rows, "element_status",
                   {"proved", "supported", "pleaded-only", "conclusory", "gap", "foreclosed"})
        check_enum(rep, path, rows, "survival_assessment",
                   {"likely-survives", "contested", "likely-dismissed", "foreclosed"})
        check_enum(rep, path, rows, "curability",
                   {"curable-by-redraft", "curable-with-new-facts",
                    "curable-only-with-evidence", "incurable", "n/a"})
        for i, row in enumerate(rows, start=2):
            cid = (row.get("claim_id") or f"line {i}").strip()
            dfd = (row.get("defendant") or "").strip()
            if not re.match(r"^ENT-\d{3}$", dfd):
                rep.error(f"claim-survival-matrix.csv {cid} line {i}: defendant is "
                          f"'{dfd}'. Every row names ONE defendant by ENT-### id; a "
                          "collective noun is the finding, not an answer.")
            if not (row.get("element_source") or "").strip():
                rep.error(f"claim-survival-matrix.csv {cid} line {i}: element_source "
                          "is empty. An element recited from memory silently corrupts "
                          "every row that depends on it.")
            st = (row.get("element_status") or "").strip()
            sv = (row.get("survival_assessment") or "").strip()
            if sv == "likely-survives" and st in {"gap", "foreclosed"}:
                rep.error(f"claim-survival-matrix.csv {cid} line {i}: "
                          f"survival_assessment=likely-survives with element_status="
                          f"{st}. An element that is a gap or foreclosed cannot support "
                          "a likely-survives assessment.")
            if not (row.get("strongest_attack") or "").strip():
                rep.error(f"claim-survival-matrix.csv {cid} line {i}: strongest_attack "
                          "is empty. If you cannot state the best attack on this "
                          "element, it has not been tested.")

    path = root / "07-evidence/pleading-defects.csv"
    header, rows = read_csv(path)
    if rows:
        check_enum(rep, path, rows, "present", {"yes", "no", "UNVERIFIED"})
        check_enum(rep, path, rows, "kind",
                   {"factual", "legal", "evidentiary", "procedural", "n/a", "UNVERIFIED"})
        check_enum(rep, path, rows, "severity",
                   {"fatal-to-claim", "fatal-to-defendant", "partial", "cosmetic",
                    "n/a", "UNVERIFIED"})
        check_enum(rep, path, rows, "curability",
                   {"curable-by-redraft", "curable-with-new-facts",
                    "curable-only-with-evidence", "incurable", "n/a", "UNVERIFIED"})
        seen_numbers = set()
        for i, row in enumerate(rows, start=2):
            did = (row.get("defect_id") or f"line {i}").strip()
            if not re.match(r"^PD-\d{2}$", did):
                rep.error(f"pleading-defects.csv line {i}: defect_id '{did}' must match PD-##")
            num = (row.get("defect_number") or "").strip()
            if num:
                seen_numbers.add(num)
            if not (row.get("pleading_analysed") or "").strip():
                rep.error(f"pleading-defects.csv {did}: pleading_analysed is empty. Every "
                          "defect finding names the document it was found in — matters "
                          "routinely hold several drafts of the same pleading.")
            if not (row.get("what_the_test_showed") or "").strip():
                rep.error(f"pleading-defects.csv {did}: what_the_test_showed is empty. A "
                          "defect recorded without the test that found it cannot be "
                          "re-checked.")
            if (row.get("present") or "").strip() == "yes":
                if not (row.get("cure") or "").strip():
                    rep.error(f"pleading-defects.csv {did}: present=yes with no cure. A "
                              "defect with no proposed cure is a complaint.")
                if not (row.get("cost_if_not_cured") or "").strip():
                    rep.error(f"pleading-defects.csv {did}: present=yes with no "
                              "cost_if_not_cured — the attorney cannot triage it.")
                if (row.get("curability") or "").strip() in ("", "n/a"):
                    rep.error(f"pleading-defects.csv {did}: present=yes requires a "
                              "curability rating")
        # The scan is a fourteen-item checklist; a partial run is reported as such.
        if seen_numbers and len(seen_numbers) < 14:
            rep.warn(f"pleading-defects.csv records {len(seen_numbers)} of the 14 defect "
                     "tests. A partial scan must say so in the result rather than "
                     "reading as a complete one.")

    path = root / "07-evidence/pleading-support-table.csv"
    _, rows = read_csv(path)
    if rows:
        check_enum(rep, path, rows, "rule11_risk", {"none", "low", "material", "high"})
        check_enum(rep, path, rows, "fact_type",
                   {"documented", "personal-knowledge", "information-and-belief",
                    "inference", "legal-conclusion"})
        for i, row in enumerate(rows, start=2):
            aid = (row.get("allegation_id") or f"line {i}").strip()
            if not (row.get("gap_between_allegation_and_source") or "").strip():
                rep.error(f"pleading-support-table.csv {aid}: "
                          "gap_between_allegation_and_source is empty; write 'none' "
                          "when there is no gap")
            sup = split_ids(row.get("source_ids", ""))
            basis = (row.get("basis_if_unsupported") or "").strip()
            if not sup and not basis:
                rep.error(f"pleading-support-table.csv {aid}: no source_ids and no "
                          "basis_if_unsupported. Every allegation needs a source, a "
                          "named witness, or an explicit [BASIS-REQUIRED] flag — this "
                          "is the Rule 11 guard.")


def check_accounting(rep: Report, root: Path) -> None:
    path = root / "07-evidence/transaction-reconciliation.csv"
    header, rows = read_csv(path)
    if rows:
        check_enum(rep, path, rows, "classification",
                   {"posted", "reversed", "reversal-of", "reapplied", "suspense-in",
                    "suspense-out", "fee-assessed", "fee-waived", "fee-disbursed",
                    "adjustment", "draw", "booking", "duplicate", "misclassified",
                    "unexplained"})
        ids = {(r.get("txn_id") or "").strip() for r in rows}
        for i, row in enumerate(rows, start=2):
            tid = (row.get("txn_id") or f"line {i}").strip()
            cls = (row.get("classification") or "").strip()
            pairs = (row.get("pairs_with") or "").strip()
            if cls in {"reversed", "reversal-of", "reapplied"} and not pairs:
                rep.error(f"transaction-reconciliation.csv {tid}: classification="
                          f"{cls} with no pairs_with. A reversal is two rows and one "
                          "economic event; name the other row.")
            for pid in split_ids(pairs):
                if pid not in ("n/a", "none", "") and pid not in ids:
                    rep.error(f"transaction-reconciliation.csv {tid}: pairs_with "
                              f"'{pid}' is not a txn_id in this table")
            if not (row.get("description_verbatim") or "").strip():
                rep.error(f"transaction-reconciliation.csv {tid}: "
                          "description_verbatim is empty. The servicer's own wording "
                          "is the evidence and is never dropped.")
            amb = (row.get("col_ambiguous") or "").strip().lower()
            used = (row.get("used_in_computation") or "").strip().lower()
            if amb == "yes" and used == "yes":
                rep.error(f"transaction-reconciliation.csv {tid}: col_ambiguous=yes "
                          "but used_in_computation=yes. A figure you are not sure you "
                          "read correctly cannot appear in arithmetic.")
            if cls in {"draw", "booking", "unexplained"} and \
                    not (row.get("basis") or "").strip():
                rep.error(f"transaction-reconciliation.csv {tid}: classification="
                          f"{cls} requires a stated basis")

    path = root / "07-evidence/disputed-amounts.csv"
    _, rows = read_csv(path)
    if rows:
        check_enum(rep, path, rows, "category",
                   {"arithmetic-error", "application-dispute", "unexplained-variance",
                    "characterization-dispute"})
        for i, row in enumerate(rows, start=2):
            did = (row.get("dispute_id") or f"line {i}").strip()
            if (row.get("difference") or "").strip() and \
                    not (row.get("computation_shown") or "").strip():
                rep.error(f"disputed-amounts.csv {did}: a difference is stated with no "
                          "computation_shown. Every figure shows its arithmetic.")
            if not (row.get("assumptions") or "").strip():
                rep.error(f"disputed-amounts.csv {did}: assumptions is empty; write "
                          "'none' if there are none")
            if not (row.get("what_would_resolve") or "").strip():
                rep.error(f"disputed-amounts.csv {did}: what_would_resolve is empty")
            if (row.get("claimed_source_id") or "").strip() and \
                    not (row.get("claimed_pinpoint") or "").strip():
                rep.error(f"disputed-amounts.csv {did}: a claimed figure is given with "
                          "a source but no pinpoint")


def check_discovery(rep: Report, root: Path) -> None:
    path = root / "09-research/discovery/request-to-issue.csv"
    header, rows = read_csv(path)
    if not rows:
        return
    check_enum(rep, path, rows, "instrument",
               {"document-request", "interrogatory", "request-for-admission",
                "30b6-topic", "deposition", "subpoena"})
    check_enum(rep, path, rows, "gate_status",
               {"gate-open", "gate-closed", "GATE-UNVERIFIED"})
    for i, row in enumerate(rows, start=2):
        rid = (row.get("request_id") or f"line {i}").strip()
        to = (row.get("directed_to") or "").strip()
        if not re.match(r"^ENT-\d{3}$", to):
            rep.error(f"request-to-issue.csv {rid}: directed_to is '{to}'. Each "
                      "request goes to ONE party by ENT-### id; a request to 'all "
                      "Defendants' is objectionable wherever a party lacks the "
                      "documents.")
        gaps = split_ids(row.get("closes_gap_ids", ""))
        elem = (row.get("serves_element") or "").strip()
        if not gaps and not elem:
            rep.error(f"request-to-issue.csv {rid}: traces to no gap and no element. "
                      "A request that cannot be traced should not be served.")
        if not (row.get("why_this_party") or "").strip():
            rep.error(f"request-to-issue.csv {rid}: why_this_party is empty")
        try:
            pr = int((row.get("priority") or "9").strip())
        except ValueError:
            pr = 9
        if pr == 1 and not (row.get("anticipated_objections") or "").strip():
            rep.error(f"request-to-issue.csv {rid}: priority 1 with no "
                      "anticipated_objections. The highest-value requests are the "
                      "ones most worth narrowing before service.")


def check_ownership(rep: Report, root: Path) -> None:
    path = root / "07-evidence/authority-matrix.csv"
    _, rows = read_csv(path)
    if rows:
        check_enum(rep, path, rows, "right_asserted",
                   {"foreclose", "collect", "own-debt", "hold-note", "service", "report"})
        check_enum(rep, path, rows, "materiality",
                   {"dispositive", "material", "immaterial", "unknown-pending-research"})
        for i, row in enumerate(rows, start=2):
            rid = (row.get("row_id") or f"line {i}").strip()
            if not (row.get("what_it_does_not_establish") or "").strip():
                rep.error(f"authority-matrix.csv {rid}: what_it_does_not_establish is "
                          "empty. That column is what keeps the matrix honest — a "
                          "recorded assignment establishes recording, not the "
                          "underlying transfer.")
            if (row.get("materiality") or "").strip() == "dispositive" and \
                    not (row.get("supporting_authority") or "").strip():
                rep.error(f"authority-matrix.csv {rid}: materiality=dispositive with "
                          "no supporting_authority. Route it to research before "
                          "calling it dispositive.")

    path = root / "07-evidence/transfer-chronology.csv"
    _, rows = read_csv(path)
    if rows:
        for i, row in enumerate(rows, start=2):
            tid = (row.get("transfer_id") or f"line {i}").strip()
            if (row.get("sequence_anomaly") or "").strip().lower() == "yes":
                if not (row.get("anomaly_description") or "").strip():
                    rep.error(f"transfer-chronology.csv {tid}: sequence_anomaly=yes "
                              "with no anomaly_description")
                if not (row.get("innocent_explanation") or "").strip():
                    rep.error(f"transfer-chronology.csv {tid}: sequence_anomaly=yes "
                              "with no innocent_explanation. Recording lag and "
                              "after-the-fact assignments are normal; an anomaly you "
                              "cannot explain benignly has not been analysed.")


def check_redteam(rep: Report, root: Path) -> None:
    path = root / "07-evidence/attack-surface.csv"
    _, rows = read_csv(path)
    if not rows:
        return
    check_enum(rep, path, rows, "seat",
               {"defense", "magistrate", "district-judge", "rule11", "appellate"})
    check_enum(rep, path, rows, "likelihood", {"high", "medium", "low"})
    check_enum(rep, path, rows, "answer_strength", {"strong", "adequate", "weak", "none"})
    check_enum(rep, path, rows, "basis_type",
               {"researched-authority", "record-based", "analyst-reading"})
    for i, row in enumerate(rows, start=2):
        aid = (row.get("attack_id") or f"line {i}").strip()
        if not (row.get("best_support_for_them") or "").strip():
            rep.error(f"attack-surface.csv {aid}: best_support_for_them is empty. An "
                      "attack with no support is speculation and wastes as much time "
                      "as an invented strength.")
        if not (row.get("our_best_answer") or "").strip():
            rep.error(f"attack-surface.csv {aid}: our_best_answer is empty; write "
                      "'none' explicitly if we have no answer — that is a finding")
        if (row.get("credibility_risk") or "").strip().lower() == "yes" and \
                not (row.get("corrective_action_id") or "").strip():
            rep.error(f"attack-surface.csv {aid}: credibility_risk=yes with no "
                      "corrective_action_id. A credibility risk with no proposed "
                      "action is a complaint.")
        try:
            rank = int((row.get("rank") or "99").strip())
        except ValueError:
            rank = 99
        if rank <= 5 and not (row.get("corrective_action_id") or "").strip():
            rep.error(f"attack-surface.csv {aid}: ranked {rank} with no "
                      "corrective_action_id")


def main() -> int:
    ap = argparse.ArgumentParser(description="Validate matter-pack registers")
    ap.add_argument("pack", type=Path)
    ap.add_argument("--which", default="all",
                    choices=["all", "deadlines", "research", "evidence", "pleading",
                             "accounting", "discovery", "ownership", "redteam"])
    args = ap.parse_args()
    root = args.pack.resolve()
    if not root.is_dir():
        die(f"not a directory: {root}")

    rep = Report(f"registers: {root.name} [{args.which}]")
    if args.which in ("all", "deadlines"):
        check_deadlines(rep, root)
    if args.which in ("all", "research"):
        check_research(rep, root)
    if args.which in ("all", "evidence"):
        check_evidence(rep, root)
    if args.which in ("all", "pleading"):
        check_pleading(rep, root)
    if args.which in ("all", "accounting"):
        check_accounting(rep, root)
    if args.which in ("all", "discovery"):
        check_discovery(rep, root)
    if args.which in ("all", "ownership"):
        check_ownership(rep, root)
    if args.which in ("all", "redteam"):
        check_redteam(rep, root)
    return rep.emit()


if __name__ == "__main__":
    raise SystemExit(main())
