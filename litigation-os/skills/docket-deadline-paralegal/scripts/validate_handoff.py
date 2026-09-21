#!/usr/bin/env python3
"""Validate an Assignment or Result document against the Agent Handoff Standard.

Usage:
    validate_handoff.py <file.md> [<file.md> ...]
    validate_handoff.py --dir <10-specialist-results/>

Checks the YAML front matter and, for results, that all ten required body
headings are present in order. Exit: 0 pass, 1 failure, 2 usage error.
"""
from __future__ import annotations

import argparse
import re
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from common import CONFIDENCE_LEVELS, Report, die  # noqa: E402

try:
    import yaml
except ImportError:  # pragma: no cover
    die("PyYAML is required: pip install pyyaml")

SPECIALISTS = {
    "legal-research-paralegal",
    "evidence-chronology-paralegal",
    "docket-deadline-paralegal",
}
ORCHESTRATOR = "litigation-matter-orchestrator"

ASSIGNMENT_REQUIRED = [
    "doc_type", "schema_version", "assignment_id", "matter_id", "issued_by",
    "issued_to", "issued_date", "objective", "scope_included", "scope_excluded",
    "source_locations", "jurisdiction", "assumptions", "prohibited_actions",
    "required_output", "completion_standard",
]
JURISDICTION_KEYS = ["court", "governing_procedure", "governing_substantive_law"]

RESULT_REQUIRED = [
    "doc_type", "schema_version", "assignment_id", "matter_id", "produced_by",
    "produced_date", "assignment_answered", "short_conclusion", "confidence",
    "confidence_basis", "human_decisions_required", "recommended_next_action",
]

RESULT_HEADINGS = [
    "1. Assignment answered", "2. Short conclusion", "3. Verified findings",
    "4. Source citations", "5. Contrary information", "6. Uncertainty",
    "7. Missing material", "8. Confidence", "9. Recommended next action",
    "10. Human decisions required",
]

# The three standing prohibitions, detected by intent rather than exact wording
# so a sensibly-reworded assignment still passes.
PROHIBITION_CHECKS = [
    ("outbound action (filing/serving/sending)", ("fil", "serv", "send", "transmit", "submit")),
    ("source mutation (modify/rename/move/delete)",
     ("modif", "renam", "delet", "move", "relocat", "alter", "overwrit")),
    ("unsupported assertion (no fact, date, citation, or deadline without a source)",
     ("without", "not supported", "unsupported", "no source", "fabricat", "invent",
      "confirmed", "verif", "unverified", "guess", "assume", "made up", "read")),
]

FRONT_MATTER_RE = re.compile(r"\A---\s*\n(.*?)\n---\s*\n", re.DOTALL)


def parse_front_matter(rep: Report, path: Path) -> dict | None:
    text = path.read_text(encoding="utf-8")
    m = FRONT_MATTER_RE.match(text)
    if not m:
        rep.error(f"{path.name}: no YAML front matter (file must start with ---)")
        return None
    try:
        data = yaml.safe_load(m.group(1)) or {}
    except yaml.YAMLError as exc:
        rep.error(f"{path.name}: front matter is not valid YAML: {exc}")
        return None
    if not isinstance(data, dict):
        rep.error(f"{path.name}: front matter must be a mapping")
        return None
    data["__body__"] = text[m.end():]
    return data


def check_assignment(rep: Report, path: Path, d: dict) -> None:
    for key in ASSIGNMENT_REQUIRED:
        if key not in d:
            rep.error(f"{path.name}: assignment missing required key '{key}'")
        elif d[key] in (None, "", []):
            rep.error(f"{path.name}: assignment key '{key}' is empty "
                      "(an empty list must still be written as [])")

    if d.get("issued_by") != ORCHESTRATOR:
        rep.error(f"{path.name}: issued_by must be '{ORCHESTRATOR}', got "
                  f"'{d.get('issued_by')}'")
    if d.get("issued_to") not in SPECIALISTS:
        rep.error(f"{path.name}: issued_to '{d.get('issued_to')}' is not an installed "
                  f"specialist ({', '.join(sorted(SPECIALISTS))})")

    jur = d.get("jurisdiction")
    if not isinstance(jur, dict):
        rep.error(f"{path.name}: jurisdiction must be a mapping with "
                  f"{', '.join(JURISDICTION_KEYS)}")
    else:
        for k in JURISDICTION_KEYS:
            if not str(jur.get(k, "")).strip():
                rep.error(f"{path.name}: jurisdiction.{k} is required "
                          "(write UNDETERMINED and raise it as an open question "
                          "if it is genuinely unknown)")

    prohibitions = " ".join(str(p).lower() for p in (d.get("prohibited_actions") or []))
    for label, words in PROHIBITION_CHECKS:
        if not any(w in prohibitions for w in words):
            rep.error(
                f"{path.name}: prohibited_actions does not cover {label}. "
                "Every assignment must carry all three standing prohibitions: "
                "(1) no outbound action, (2) no source mutation, (3) no "
                "unsupported assertion. Word them to fit the task; they are "
                "checked by concept, not by exact phrasing.")

    for key in ("scope_included", "source_locations", "required_output"):
        val = d.get(key)
        if isinstance(val, list) and not val:
            rep.error(f"{path.name}: '{key}' must contain at least one entry")

    aid = str(d.get("assignment_id", ""))
    if not re.match(r"^ASSIGN-[A-Z0-9_-]+-\d{3}$", aid):
        rep.error(f"{path.name}: assignment_id '{aid}' must match ASSIGN-<MATTER>-<NNN>")
    mid = str(d.get("matter_id", ""))
    if mid and not aid.startswith(f"ASSIGN-{mid}-"):
        rep.error(f"{path.name}: assignment_id '{aid}' does not embed matter_id '{mid}'")


def check_result(rep: Report, path: Path, d: dict) -> None:
    for key in RESULT_REQUIRED:
        if key not in d:
            rep.error(f"{path.name}: result missing required key '{key}'")
        elif d[key] in (None, ""):
            rep.error(f"{path.name}: result key '{key}' is empty")

    if "human_decisions_required" in d and not isinstance(
            d["human_decisions_required"], list):
        rep.error(f"{path.name}: human_decisions_required must be a list "
                  "(use [] when there are none; never omit it)")

    ans = d.get("assignment_answered")
    if ans not in {"full", "partial", "not_answered"}:
        rep.error(f"{path.name}: assignment_answered = '{ans}'; "
                  "must be full, partial, or not_answered")

    conf = d.get("confidence")
    if conf not in CONFIDENCE_LEVELS:
        rep.error(f"{path.name}: confidence = '{conf}'; must be one of "
                  f"{', '.join(sorted(CONFIDENCE_LEVELS))}")

    if d.get("produced_by") not in SPECIALISTS | {ORCHESTRATOR}:
        rep.error(f"{path.name}: produced_by '{d.get('produced_by')}' is not an "
                  "installed Litigation OS skill")

    body = d.get("__body__", "")
    found = re.findall(r"^##\s+(.+?)\s*$", body, flags=re.MULTILINE)
    normalized = [h.strip() for h in found]
    missing = [h for h in RESULT_HEADINGS if h not in normalized]
    if missing:
        rep.error(f"{path.name}: result body missing required heading(s): "
                  f"{'; '.join(missing)}")
    else:
        idx = [normalized.index(h) for h in RESULT_HEADINGS]
        if idx != sorted(idx):
            rep.error(f"{path.name}: result headings are out of order; the ten "
                      "sections must appear in the order given by the standard")

    # A result claiming full answer with low confidence and no human decision is
    # usually an over-claim; flag rather than fail, because it can be legitimate.
    if ans == "full" and conf == "low" and not (d.get("human_decisions_required") or []):
        rep.warn(f"{path.name}: assignment_answered=full with confidence=low and no "
                 "human_decisions_required — confirm this is not an over-claim")


def validate_file(path: Path) -> Report:
    rep = Report(f"handoff: {path.name}")
    d = parse_front_matter(rep, path)
    if d is None:
        return rep
    dt = d.get("doc_type")
    if dt == "assignment":
        check_assignment(rep, path, d)
    elif dt == "result":
        check_result(rep, path, d)
    else:
        rep.error(f"{path.name}: doc_type must be 'assignment' or 'result', got '{dt}'")
    return rep


def main() -> int:
    ap = argparse.ArgumentParser(description="Validate Litigation OS handoff documents")
    ap.add_argument("files", nargs="*", type=Path)
    ap.add_argument("--dir", type=Path, help="validate every ASSIGN-*.md / RESULT-*.md here")
    args = ap.parse_args()

    targets: list[Path] = list(args.files)
    if args.dir:
        targets += sorted(args.dir.glob("ASSIGN-*.md")) + sorted(args.dir.glob("RESULT-*.md"))
    if not targets:
        die("no files to validate")

    rc = 0
    for t in targets:
        if not t.is_file():
            print(f"error: not a file: {t}", file=sys.stderr)
            rc = 2
            continue
        rc |= validate_file(t).emit()
    return rc


if __name__ == "__main__":
    raise SystemExit(main())
