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
}

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
                # which may legitimately name a person who is not a party.
                if fam not in ID_PATTERNS:
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
    return rep.emit()


if __name__ == "__main__":
    raise SystemExit(main())
