#!/usr/bin/env python3
"""Validate a Litigation OS matter pack.

Checks structure, required control fields, source-manifest integrity, and
cross-file source references. With --hash-check it records or re-verifies
SHA-256 for everything under 03-sources/raw/ so that any mutation of an
original case document is detectable.

Usage:
    validate_matter_pack.py <matter-pack-dir> [--hash-check] [--strict]

Exit codes: 0 pass, 1 validation failure, 2 usage error.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from common import (  # noqa: E402
    SOURCE_ID_RE, UNVERIFIED, Report, check_enum, check_source_refs,
    die, read_csv, require_columns, split_ids,
)

try:
    import yaml
except ImportError:  # pragma: no cover
    die("PyYAML is required: pip install pyyaml")

REQUIRED_DIRS = [
    "00-control", "01-parties", "02-court", "03-sources", "03-sources/raw",
    "04-docket", "05-chronology", "06-issues", "07-evidence", "08-deadlines",
    "09-research", "09-research/discovery", "10-specialist-results", "11-decisions",
    # Phase 3 operating layer.
    "12-workproduct", "12-workproduct/drafts", "12-workproduct/final",
]

REQUIRED_FILES = [
    "00-control/matter-control.yaml",
    "01-parties/parties.csv",
    "01-parties/counsel.csv",
    "02-court/court-jurisdiction.yaml",
    "02-court/claims-defenses.csv",
    "02-court/procedural-posture.md",
    "03-sources/source-manifest.csv",
    "04-docket/docket-register.csv",
    "05-chronology/chronology.csv",
    "06-issues/issue-register.csv",
    "07-evidence/proposition-evidence.csv",
    "07-evidence/contradiction-register.csv",
    "07-evidence/missing-evidence.csv",
    "07-evidence/entity-index.csv",
    "08-deadlines/deadline-register.csv",
    "11-decisions/attorney-decision-log.csv",
    # Phase 2 registers. Present as headers in a new pack; populated by the
    # specialist that owns each one.
    "07-evidence/claim-survival-matrix.csv",
    "07-evidence/pleading-support-table.csv",
    "07-evidence/pleading-defects.csv",
    "07-evidence/corrective-actions.csv",
    "07-evidence/transaction-reconciliation.csv",
    "07-evidence/disputed-amounts.csv",
    "07-evidence/entity-role-map.csv",
    "07-evidence/transfer-chronology.csv",
    "07-evidence/authority-matrix.csv",
    "07-evidence/attack-surface.csv",
    "07-evidence/custodian-map.csv",
    "09-research/discovery/request-to-issue.csv",
    # Phase 3: the operating layer. Each is a header-only file in a new pack.
    # access-map.yaml records WHERE each source system is reached and who holds
    # the key; it never holds a credential. task-board.csv is how a planned task
    # survives the session that planned it. source-index.csv is the intake
    # record behind the manifest. citation-verification.csv is where a quotation
    # stops being an assertion. approval-requests.csv is the human gate in front
    # of every irreversible act. production-log.csv is what was rendered and
    # whether it passed QC.
    "00-control/access-map.yaml",
    "00-control/task-board.csv",
    "03-sources/source-index.csv",
    "09-research/citation-verification.csv",
    "11-decisions/approval-requests.csv",
    "12-workproduct/production-log.csv",
    # Phase 4: who is on the other side, and who is on the bench. Both are
    # matter facts, both are routinely assumed rather than verified, and both
    # are where an unverified assumption does the most damage.
    "07-evidence/opposing-counsel-record.csv",
    "07-evidence/judicial-record.csv",
]

# Top-level keys every matter-control file must carry. A missing key is an
# error; a key present but still holding a <placeholder> is an error too, since
# a half-filled control file is more dangerous than an obviously empty one.
CONTROL_REQUIRED = [
    "matter_id", "matter_name", "court", "jurisdiction", "parties",
    "procedural_posture", "immediate_objectives", "controlling_deadlines",
    "authorized_source_locations", "prohibited_actions",
    "open_factual_questions", "open_legal_questions", "last_verified",
]

CONTROL_NESTED = {
    "court": ["name", "case_number", "presiding_judge"],
    "jurisdiction": ["basis", "governing_procedure", "governing_substantive_law",
                     "controlling_appellate_authority"],
    "procedural_posture": ["as_of", "summary"],
    "last_verified": ["date", "by", "method"],
}

STANDING_PROHIBITION_KEYWORDS = [
    ("filing/serving", ("fil", "serv", "e-fil", "submit")),
    ("source mutation", ("modif", "renam", "delet", "relocat", "move", "overwrit")),
]

MANIFEST_REQUIRED_COLS = [
    "source_id", "title", "doc_type", "doc_date", "file_path", "sha256",
    "ocr_status", "access_status", "authenticity_status",
]

HASH_SIDECAR = "03-sources/raw/.integrity.json"


def _has_placeholder(value) -> bool:
    if isinstance(value, str):
        s = value.strip()
        return s.startswith("<") and s.endswith(">")
    if isinstance(value, dict):
        return any(_has_placeholder(v) for v in value.values())
    if isinstance(value, list):
        return any(_has_placeholder(v) for v in value)
    return False


def check_structure(rep: Report, root: Path) -> None:
    for d in REQUIRED_DIRS:
        if not (root / d).is_dir():
            rep.error(f"missing required directory: {d}/")
    for f in REQUIRED_FILES:
        if not (root / f).is_file():
            rep.error(f"missing required file: {f}")


def check_control(rep: Report, root: Path, template_mode: bool = False) -> str | None:
    path = root / "00-control/matter-control.yaml"
    if not path.is_file():
        return None
    try:
        data = yaml.safe_load(path.read_text(encoding="utf-8")) or {}
    except yaml.YAMLError as exc:
        rep.error(f"matter-control.yaml is not valid YAML: {exc}")
        return None

    for key in CONTROL_REQUIRED:
        if key not in data:
            rep.error(f"matter-control.yaml: missing required key '{key}'")
        elif data[key] in (None, "", []):
            rep.error(f"matter-control.yaml: key '{key}' is empty")
        elif _has_placeholder(data[key]):
            if template_mode:
                rep.note(f"matter-control.yaml: key '{key}' holds a <placeholder> (template mode)")
            else:
                rep.error(f"matter-control.yaml: key '{key}' still holds a <placeholder>")

    if template_mode:
        return None

    for parent, children in CONTROL_NESTED.items():
        block = data.get(parent)
        if not isinstance(block, dict):
            continue
        for child in children:
            if child not in block or block[child] in (None, ""):
                rep.error(f"matter-control.yaml: '{parent}.{child}' is required and empty")

    prohibitions = " ".join(str(p).lower() for p in (data.get("prohibited_actions") or []))
    for label, words in STANDING_PROHIBITION_KEYWORDS:
        if not any(w in prohibitions for w in words):
            rep.error(f"matter-control.yaml: prohibited_actions does not cover {label}")

    # Deadlines in the control file must be typed, and anything not express or
    # calculated must not masquerade as a date.
    for i, dl in enumerate(data.get("controlling_deadlines") or [], start=1):
        if not isinstance(dl, dict):
            rep.error(f"matter-control.yaml: controlling_deadlines[{i}] is not a mapping")
            continue
        status = str(dl.get("status", "")).strip()
        if status not in {"express", "calculated", UNVERIFIED}:
            rep.error(f"matter-control.yaml: controlling_deadlines[{i}].status "
                      f"= '{status}'; must be express, calculated, or {UNVERIFIED}")
        if status in {"express", "calculated"} and not str(dl.get("source", "")).strip():
            rep.error(f"matter-control.yaml: controlling_deadlines[{i}] is '{status}' "
                      "but carries no source")

    mid = str(data.get("matter_id", "")).strip()
    if mid and not mid.replace("-", "").replace("_", "").isalnum():
        rep.error(f"matter-control.yaml: matter_id '{mid}' must be alphanumeric with - or _")
    return mid or None


def check_manifest(rep: Report, root: Path) -> set[str]:
    path = root / "03-sources/source-manifest.csv"
    header, rows = read_csv(path)
    if not header:
        rep.error("source-manifest.csv is missing or empty")
        return set()
    require_columns(rep, path, header, MANIFEST_REQUIRED_COLS)

    known: set[str] = set()
    for i, row in enumerate(rows, start=2):
        sid = (row.get("source_id") or "").strip()
        if not SOURCE_ID_RE.match(sid):
            rep.error(f"source-manifest.csv line {i}: source_id '{sid}' must match SRC-###")
            continue
        if sid in known:
            rep.error(f"source-manifest.csv line {i}: duplicate source_id {sid} "
                      "(IDs are permanent and must never be reused)")
        known.add(sid)

        fp = (row.get("file_path") or "").strip()
        if fp and fp not in ("n/a", UNVERIFIED) and not (root / fp).exists():
            rep.error(f"source-manifest.csv line {i}: file_path '{fp}' does not exist")

        parent = (row.get("derived_from") or "").strip()
        if parent and parent not in ("n/a", "", UNVERIFIED) and not SOURCE_ID_RE.match(parent):
            rep.error(f"source-manifest.csv line {i}: derived_from '{parent}' is not a SRC-### id")

        for col in ("title", "doc_type", "doc_date"):
            if not (row.get(col) or "").strip():
                rep.error(f"source-manifest.csv line {i}: '{col}' is empty "
                          f"(use {UNVERIFIED} if genuinely unknown)")

    check_enum(rep, path, rows, "ocr_status",
               {"native-text", "ocr-clean", "ocr-uncertain", "image-only", "n/a"})
    check_enum(rep, path, rows, "access_status",
               {"full", "partial", "paywalled", "missing-pages", "unavailable"})
    check_enum(rep, path, rows, "authenticity_status",
               {"self-authenticating", "produced-by-opponent", "party-created",
                # A record retrieved directly from a court's own electronic
                # system is not the same thing as a document a party handed
                # over, and collapsing the two loses the distinction that
                # matters most when a docket fact is challenged.
                "verified-public-record", "derived",
                "unauthenticated", "disputed"})

    # Second pass: derived_from must point at a source that exists.
    for i, row in enumerate(rows, start=2):
        parent = (row.get("derived_from") or "").strip()
        if parent and parent not in ("n/a", "", UNVERIFIED) and parent not in known:
            rep.error(f"source-manifest.csv line {i}: derived_from {parent} not in manifest")
    return known


CROSSREF = {
    "04-docket/docket-register.csv": ["source_id"],
    "05-chronology/chronology.csv": ["source_id", "corroborating_source_ids",
                                     "conflicting_source_ids"],
    "07-evidence/proposition-evidence.csv": ["supporting_source_ids", "contrary_source_ids"],
    "07-evidence/contradiction-register.csv": ["source_id_a", "source_id_b"],
    "07-evidence/entity-index.csv": ["source_ids"],
    "08-deadlines/deadline-register.csv": ["source_id"],
    "01-parties/parties.csv": ["source_ids"],
    "02-court/claims-defenses.csv": ["source_ids"],
    "07-evidence/pleading-support-table.csv": ["source_ids"],
    "07-evidence/transaction-reconciliation.csv": ["source_id"],
    "07-evidence/disputed-amounts.csv": ["claimed_source_id", "supporting_source_ids"],
    "07-evidence/entity-role-map.csv": ["asserted_by_source_id",
                                        "conflicting_assertion_source_ids"],
    "07-evidence/transfer-chronology.csv": ["source_id"],
    "07-evidence/authority-matrix.csv": ["document_relied_on"],
    "07-evidence/attack-surface.csv": ["source_ids"],
}


def check_crossrefs(rep: Report, root: Path, known: set[str]) -> None:
    for rel, cols in CROSSREF.items():
        path = root / rel
        _, rows = read_csv(path)
        if rows:
            check_source_refs(rep, path, rows, cols, known)


def check_raw_readonly(rep: Report, root: Path, do_hash: bool) -> None:
    raw = root / "03-sources/raw"
    if not raw.is_dir():
        return
    files = sorted(p for p in raw.rglob("*") if p.is_file() and p.name != ".integrity.json")
    rep.note(f"03-sources/raw/ contains {len(files)} file(s)")
    if not do_hash:
        return

    sidecar = root / HASH_SIDECAR
    current = {}
    for p in files:
        current[str(p.relative_to(raw))] = hashlib.sha256(p.read_bytes()).hexdigest()

    if sidecar.exists():
        prior = json.loads(sidecar.read_text(encoding="utf-8"))
        for name, digest in prior.items():
            if name not in current:
                rep.error(f"ORIGINAL SOURCE REMOVED since last check: raw/{name}")
            elif current[name] != digest:
                rep.error(f"ORIGINAL SOURCE ALTERED since last check: raw/{name}")
        for name in current:
            if name not in prior:
                rep.note(f"new source file recorded: raw/{name}")
        if all(prior.get(n) == d for n, d in current.items()) and \
           set(prior) == set(current):
            rep.note("integrity check: all original sources byte-identical to last run")
    else:
        rep.note(f"integrity baseline created at {HASH_SIDECAR}")
    sidecar.write_text(json.dumps(current, indent=2, sort_keys=True) + "\n", encoding="utf-8")


def main() -> int:
    ap = argparse.ArgumentParser(description="Validate a Litigation OS matter pack")
    ap.add_argument("pack", type=Path)
    ap.add_argument("--hash-check", action="store_true",
                    help="record/verify SHA-256 of every file in 03-sources/raw/")
    ap.add_argument("--strict", action="store_true", help="treat warnings as errors")
    ap.add_argument("--template", action="store_true",
                    help="validate the blank template: check structure and schema, "
                         "but do not require <placeholder> values to be filled in")
    args = ap.parse_args()

    root = args.pack.resolve()
    if not root.is_dir():
        die(f"not a directory: {root}")

    rep = Report(f"matter pack: {root.name}")
    check_structure(rep, root)
    check_control(rep, root, template_mode=args.template)
    known = check_manifest(rep, root)
    check_crossrefs(rep, root, known)
    check_raw_readonly(rep, root, args.hash_check)

    if args.strict and rep.warnings:
        rep.errors.extend(f"(strict) {w}" for w in rep.warnings)
        rep.warnings.clear()
    return rep.emit()


if __name__ == "__main__":
    raise SystemExit(main())
