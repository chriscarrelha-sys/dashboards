#!/usr/bin/env python3
"""Check that every internal identifier in a matter pack resolves.

Source IDs are checked by validate_matter_pack.py. This checks the other five
families, which are just as capable of going stale and are just as misleading
when they do: a proposition citing CLM-014 that does not exist looks like a
mapped element and is not one.

  ENT-###   entities        01-parties/parties.csv + 07-evidence/entity-index.csv
  CLM-/DEF- claims/defenses 02-court/claims-defenses.csv
  PROP-###  propositions    07-evidence/proposition-evidence.csv
  GAP-###   evidence gaps   07-evidence/missing-evidence.csv
  DL-###    deadlines       08-deadlines/deadline-register.csv
  EV-###    events          05-chronology/chronology.csv
  OFQ-/OLQ- open questions  00-control/matter-control.yaml + 06-issues/issue-register.csv

Usage: validate_crossrefs.py <matter-pack-dir>
"""
from __future__ import annotations

import re
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from common import Report, die, read_csv, split_ids  # noqa: E402

try:
    import yaml
except ImportError:  # pragma: no cover
    die("PyYAML is required: pip install pyyaml")

# Values that legitimately appear in an ID column without being an ID.
SENTINELS = {"", "n/a", "none", "UNVERIFIED", "UNDETERMINED", "self", "unknown",
             "none-found", "pending"}

ID_PATTERNS = {
    "ENT": re.compile(r"^ENT-\d{3}$"),
    "CLM": re.compile(r"^CLM-\d{3}$"),
    "DEF": re.compile(r"^DEF-\d{3}$"),
    "PROP": re.compile(r"^PROP-\d{3}$"),
    "GAP": re.compile(r"^GAP-\d{3}$"),
    "DL": re.compile(r"^DL-\d{3}$"),
    "EV": re.compile(r"^EV-\d{3}$"),
    "OFQ": re.compile(r"^OFQ-\d+$"),
    "OLQ": re.compile(r"^OLQ-\d+$"),
    "ISS": re.compile(r"^ISS-\d{3}$"),
    "CON": re.compile(r"^CON-\d{3}$"),
    "PD": re.compile(r"^PD-\d{2}$"),
    "ALG": re.compile(r"^ALG-\d{3}$"),
    "ATK": re.compile(r"^ATK-\d{3}$"),
    "CA": re.compile(r"^CA-\d{2}$"),
    "TXN": re.compile(r"^TXN-\d{3}$"),
    "DISP": re.compile(r"^DISP-\d{3}$"),
    "TRF": re.compile(r"^TRF-\d{3}$"),
    "AUTH": re.compile(r"^AUTH-\d{3}$"),
    "ERM": re.compile(r"^ERM-\d{3}$"),
    "CUS": re.compile(r"^CUS-\d{3}$"),
    "HD": re.compile(r"^HD-\d{1,3}$"),
    # Phase 3 operating layer.
    "IDX": re.compile(r"^IDX-\d{3}$"),     # source-intake record
    "CV": re.compile(r"^CV-\d{3}$"),       # citation verification
    "APR": re.compile(r"^APR-\d{3}$"),     # human approval request
    "WP": re.compile(r"^WP-\d{3}$"),       # produced work product
    "TSK": re.compile(r"^TSK-\d{3}$"),     # task board
    # Phase 4: who is opposite, and who is on the bench.
    "OC": re.compile(r"^OC-\d{3}$"),       # opposing-counsel record
    "JR": re.compile(r"^JR-\d{3}$"),       # judicial record
}

# Anything shaped like an identifier — UPPERCASE, a hyphen, digits — is treated as
# one. Before this check existed, a token whose prefix was not a registered family
# was skipped in silence, so a typo ('CLMM-001' for 'CLM-001') validated clean
# while pointing at nothing. Silence on a malformed identifier is the worst
# outcome available: it looks like provenance and resolves to nothing.
ID_SHAPED = re.compile(r"^[A-Z]{2,6}-\d{1,4}$")

# (file, column, which ID families that column may reference)
REFERENCES = [
    ("01-parties/counsel.csv", "represents_entity_ids", {"ENT"}),
    ("02-court/claims-defenses.csv", "asserted_by", {"ENT"}),
    ("02-court/claims-defenses.csv", "asserted_against", {"ENT"}),
    ("02-court/claims-defenses.csv", "supporting_proposition_ids", {"PROP"}),
    ("05-chronology/chronology.csv", "actor", {"ENT"}),
    ("05-chronology/chronology.csv", "recipient", {"ENT"}),
    ("05-chronology/chronology.csv", "issue_ids", {"OFQ", "OLQ", "ISS"}),
    ("06-issues/issue-register.csv", "related_claim_ids", {"CLM", "DEF"}),
    ("07-evidence/proposition-evidence.csv", "related_claim_ids", {"CLM", "DEF"}),
    ("07-evidence/proposition-evidence.csv", "related_issue_ids", {"OFQ", "OLQ", "ISS"}),
    ("07-evidence/contradiction-register.csv", "related_claim_ids", {"CLM", "DEF"}),
    ("07-evidence/missing-evidence.csv", "related_proposition_ids", {"PROP"}),
    ("07-evidence/missing-evidence.csv", "related_claim_ids", {"CLM", "DEF"}),
    ("04-docket/docket-register.csv", "affects_deadline_ids", {"DL"}),
    ("08-deadlines/deadline-register.csv", "conflicts_with", {"DL"}),
    ("11-decisions/attorney-decision-log.csv", "related_deadline_ids", {"DL"}),
    # Phase 2 registers
    ("07-evidence/entity-role-map.csv", "entity_id", {"ENT"}),
    ("07-evidence/authority-matrix.csv", "entity_id", {"ENT"}),
    ("07-evidence/claim-survival-matrix.csv", "claim_id", {"CLM", "DEF"}),
    ("07-evidence/claim-survival-matrix.csv", "defendant", {"ENT"}),
    ("07-evidence/claim-survival-matrix.csv", "defect_ids", {"PD"}),
    ("07-evidence/pleading-support-table.csv", "claim_ids", {"CLM", "DEF"}),
    ("07-evidence/pleading-support-table.csv", "defendant", {"ENT"}),
    ("07-evidence/disputed-amounts.csv", "related_claim_ids", {"CLM", "DEF"}),
    ("07-evidence/disputed-amounts.csv", "evidence_needed_ids", {"GAP"}),
    ("07-evidence/custodian-map.csv", "entity_id", {"ENT"}),
    ("09-research/discovery/request-to-issue.csv", "directed_to", {"ENT"}),
    ("09-research/discovery/request-to-issue.csv", "serves_claim_ids", {"CLM", "DEF"}),
    ("09-research/discovery/request-to-issue.csv", "closes_gap_ids", {"GAP"}),
    ("09-research/discovery/request-to-issue.csv", "resolves_contradiction_ids", {"CON"}),
    ("07-evidence/attack-surface.csv", "target", {"CLM", "DEF", "PROP", "ENT", "ALG", "PD"}),
    ("07-evidence/attack-surface.csv", "corrective_action_id", {"CA"}),
    ("07-evidence/transaction-reconciliation.csv", "pairs_with", {"TXN"}),
    ("07-evidence/disputed-amounts.csv", "related_claim_ids", {"CLM", "DEF"}),
    ("07-evidence/corrective-actions.csv", "prevents_attack_ids", {"ATK"}),
    ("07-evidence/corrective-actions.csv", "addresses_defect_ids", {"PD"}),
    # Phase 3 operating layer
    ("00-control/task-board.csv", "depends_on", {"TSK"}),
    ("00-control/task-board.csv", "blocks", {"TSK"}),
    ("00-control/task-board.csv", "unresolved_questions", {"OFQ", "OLQ", "ISS", "HD"}),
    ("03-sources/source-index.csv", "duplicate_of", {"IDX"}),
    ("09-research/citation-verification.csv", "used_in",
     {"CLM", "DEF", "ISS", "AUTH", "WP", "ATK", "DL", "PROP", "GAP", "PD", "OLQ",
      "OFQ", "OC", "JR", "CON"}),
    ("12-workproduct/production-log.csv", "approval_id", {"APR"}),
    ("07-evidence/opposing-counsel-record.csv", "related_ids",
     {"CON", "GAP", "OC", "CV", "ENT", "CLM", "ATK", "ISS"}),
    ("07-evidence/judicial-record.csv", "related_ids",
     {"CON", "GAP", "JR", "CV", "DL", "ISS", "PD"}),
]

# (file, column) pairs that DEFINE ids
DEFINITIONS = [
    ("01-parties/parties.csv", "entity_id"),
    ("07-evidence/entity-index.csv", "entity_id"),
    ("02-court/claims-defenses.csv", "claim_id"),
    ("07-evidence/proposition-evidence.csv", "proposition_id"),
    ("07-evidence/missing-evidence.csv", "gap_id"),
    ("08-deadlines/deadline-register.csv", "deadline_id"),
    ("05-chronology/chronology.csv", "event_id"),
    ("06-issues/issue-register.csv", "issue_id"),
    ("07-evidence/contradiction-register.csv", "contradiction_id"),
    ("07-evidence/attack-surface.csv", "attack_id"),
    ("07-evidence/transaction-reconciliation.csv", "txn_id"),
    ("07-evidence/disputed-amounts.csv", "dispute_id"),
    ("07-evidence/entity-role-map.csv", "row_id"),
    ("07-evidence/transfer-chronology.csv", "transfer_id"),
    ("07-evidence/authority-matrix.csv", "row_id"),
    ("07-evidence/custodian-map.csv", "custodian_id"),
    ("07-evidence/pleading-support-table.csv", "allegation_id"),
    ("07-evidence/pleading-defects.csv", "defect_id"),
    ("07-evidence/corrective-actions.csv", "action_id"),
    # Phase 3 operating layer
    ("00-control/task-board.csv", "task_id"),
    ("03-sources/source-index.csv", "index_id"),
    ("09-research/citation-verification.csv", "cv_id"),
    ("11-decisions/approval-requests.csv", "approval_id"),
    ("11-decisions/attorney-decision-log.csv", "decision_id"),
    ("12-workproduct/production-log.csv", "doc_id"),
    ("07-evidence/opposing-counsel-record.csv", "oc_id"),
    ("07-evidence/judicial-record.csv", "jr_id"),
]


def collect_defined(root: Path, rep: Report) -> set[str]:
    defined: set[str] = set()
    seen_in: dict[str, str] = {}
    for rel, col in DEFINITIONS:
        _, rows = read_csv(root / rel)
        for row in rows:
            val = (row.get(col) or "").strip()
            if not val or val in SENTINELS:
                continue
            # The same ENT- id may legitimately appear in both parties.csv and
            # entity-index.csv; anything else defined twice is a collision.
            if val in defined and not val.startswith("ENT-"):
                rep.error(f"identifier {val} is defined twice: in {seen_in[val]} "
                          f"and in {rel}")
            defined.add(val)
            seen_in.setdefault(val, rel)
    return defined


def collect_questions(root: Path) -> set[str]:
    out: set[str] = set()
    ctrl = root / "00-control/matter-control.yaml"
    if ctrl.is_file():
        data = yaml.safe_load(ctrl.read_text(encoding="utf-8")) or {}
        for key in ("open_factual_questions", "open_legal_questions"):
            for item in (data.get(key) or []):
                if isinstance(item, dict) and item.get("id"):
                    out.add(str(item["id"]).strip())
    return out


def check_decision_log(rep: Report, root: Path) -> None:
    """Every human decision a result raises must reach the decision log.

    The decision log is the gate on outward action: it is the only record of
    what a person authorised. A result that raises HD-7 and a log that has never
    heard of HD-7 means the request evaporated between the specialist and the
    attorney — which is how a blocking question silently stops blocking.
    """
    results = sorted((root / "10-specialist-results").glob("RESULT-*.md"))
    if not results:
        return
    raised: dict[str, str] = {}
    for f in results:
        m = re.match(r"\A---\s*\n(.*?)\n---\s*\n", f.read_text(encoding="utf-8"),
                     re.DOTALL)
        if not m:
            continue
        try:
            d = yaml.safe_load(m.group(1)) or {}
        except yaml.YAMLError:
            continue
        for hd in (d.get("human_decisions_required") or []):
            if isinstance(hd, dict) and hd.get("id"):
                raised[str(hd["id"]).strip()] = f.name

    _, rows = read_csv(root / "11-decisions/attorney-decision-log.csv")
    logged = {(r.get("decision_id") or "").strip() for r in rows}

    for hd, where in sorted(raised.items()):
        if hd not in logged:
            rep.error(f"{where} raises {hd} but it is not in "
                      "11-decisions/attorney-decision-log.csv. Every human "
                      "decision a specialist raises must be logged, or the "
                      "request has no record and cannot be tracked.")
    for r in rows:
        did = (r.get("decision_id") or "").strip()
        if did and did.startswith("HD-") and did not in raised:
            rep.warn(f"decision log carries {did}, which no current result "
                     "raises; confirm it is not stale")
        # A skill must never mark a decision as made.
        if (r.get("decision_made") or "").strip() not in ("", "PENDING") and \
                not (r.get("decided_by") or "").strip():
            rep.error(f"{did}: decision_made is '{r.get('decision_made')}' but "
                      "decided_by is empty. A decision is not made until a named "
                      "human makes it.")
    if raised:
        rep.note(f"{len(raised)} human decision(s) raised, {len(set(raised) & logged)} logged")


def main() -> int:
    if len(sys.argv) != 2:
        die("usage: validate_crossrefs.py <matter-pack-dir>")
    root = Path(sys.argv[1]).resolve()
    if not root.is_dir():
        die(f"not a directory: {root}")

    rep = Report(f"cross-references: {root.name}")
    defined = collect_defined(root, rep) | collect_questions(root)
    rep.note(f"{len(defined)} identifier(s) defined across the pack")

    checked = 0
    for rel, col, families in REFERENCES:
        path = root / rel
        header, rows = read_csv(path)
        if not header:
            continue
        if col not in header:
            continue
        for i, row in enumerate(rows, start=2):
            for token in split_ids(row.get(col, "")):
                if token in SENTINELS:
                    continue
                fam = token.split("-")[0]
                # Free-text values are allowed in columns like actor/recipient,
                # which may legitimately name a person who is not a party. But a
                # token SHAPED like an identifier whose family is unregistered is
                # almost always a typo, and skipping it silently is how a
                # dangling reference survives validation.
                if fam not in ID_PATTERNS:
                    if ID_SHAPED.match(token):
                        rep.error(
                            f"{rel} line {i} col {col}: '{token}' is shaped like an "
                            f"identifier but '{fam}-' is not a known family "
                            f"({'/'.join(sorted(ID_PATTERNS))}). If it is a typo, fix "
                            "it; if it is a new family, register it in ID_PATTERNS.")
                        checked += 1
                    continue
                checked += 1
                if not ID_PATTERNS[fam].match(token):
                    rep.error(f"{rel} line {i} col {col}: '{token}' looks like a "
                              f"{fam}- id but is malformed")
                elif fam not in families:
                    rep.error(f"{rel} line {i} col {col}: '{token}' is a {fam}- id, "
                              f"but this column may only reference "
                              f"{'/'.join(sorted(families))}- ids")
                elif token not in defined:
                    rep.error(f"{rel} line {i} col {col}: '{token}' is not defined "
                              "anywhere in the pack. A dangling identifier reads as "
                              "provenance and is worse than a blank.")
    rep.note(f"{checked} identifier reference(s) checked")
    check_decision_log(rep, root)
    return rep.emit()


if __name__ == "__main__":
    raise SystemExit(main())
