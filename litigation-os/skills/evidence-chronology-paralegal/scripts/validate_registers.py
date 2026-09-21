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


def main() -> int:
    ap = argparse.ArgumentParser(description="Validate matter-pack registers")
    ap.add_argument("pack", type=Path)
    ap.add_argument("--which", default="all",
                    choices=["all", "deadlines", "research", "evidence"])
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
    return rep.emit()


if __name__ == "__main__":
    raise SystemExit(main())
