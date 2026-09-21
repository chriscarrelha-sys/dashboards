"""Shared helpers for Litigation OS validators.

Everything here is deliberately dependency-light: a validator that cannot run
because a package is missing is a validator that stops being run.
"""
from __future__ import annotations

import csv
import re
import sys
from dataclasses import dataclass, field
from pathlib import Path

SOURCE_ID_RE = re.compile(r"^SRC-\d{3}$")
UNVERIFIED = "UNVERIFIED"

EPISTEMIC_LABELS = {
    "[VERIFIED]", "[ALLEGED]", "[COURT-FOUND]",
    "[INFERENCE]", "[LEGAL-CONCLUSION]", "[UNRESOLVED]",
}
CONFIDENCE_LEVELS = {"high", "medium", "low"}


@dataclass
class Report:
    """Collects findings so one run reports every problem, not just the first."""
    name: str
    errors: list[str] = field(default_factory=list)
    warnings: list[str] = field(default_factory=list)
    notes: list[str] = field(default_factory=list)

    def error(self, msg: str) -> None:
        self.errors.append(msg)

    def warn(self, msg: str) -> None:
        self.warnings.append(msg)

    def note(self, msg: str) -> None:
        self.notes.append(msg)

    @property
    def ok(self) -> bool:
        return not self.errors

    def emit(self) -> int:
        print(f"\n=== {self.name} ===")
        for n in self.notes:
            print(f"  .  {n}")
        for w in self.warnings:
            print(f"  !  WARN  {w}")
        for e in self.errors:
            print(f"  X  FAIL  {e}")
        status = "PASS" if self.ok else "FAIL"
        print(f"  -> {status}  ({len(self.errors)} error(s), {len(self.warnings)} warning(s))")
        return 0 if self.ok else 1


def read_csv(path: Path) -> tuple[list[str], list[dict]]:
    """Return (header, rows). Missing file yields ([], [])."""
    if not path.exists():
        return [], []
    with path.open(newline="", encoding="utf-8-sig") as fh:
        reader = csv.DictReader(fh)
        header = reader.fieldnames or []
        rows = [r for r in reader if any((v or "").strip() for v in r.values())]
    return header, rows


def require_columns(rep: Report, path: Path, header: list[str], required: list[str]) -> None:
    missing = [c for c in required if c not in header]
    if missing:
        rep.error(f"{path.name}: missing required column(s): {', '.join(missing)}")


def split_ids(cell: str) -> list[str]:
    return [p.strip() for p in (cell or "").split(";") if p.strip()]


def check_source_refs(rep: Report, path: Path, rows: list[dict],
                      columns: list[str], known: set[str]) -> None:
    """Every source reference must resolve to the manifest.

    A dangling SRC id is worse than a blank one: it looks like provenance.
    """
    for i, row in enumerate(rows, start=2):
        for col in columns:
            if col not in row:
                continue
            for sid in split_ids(row.get(col, "")):
                if sid in (UNVERIFIED, "n/a", "none", "none-found"):
                    continue
                if not SOURCE_ID_RE.match(sid):
                    rep.error(f"{path.name} line {i} col {col}: '{sid}' is not a SRC-### id")
                elif sid not in known:
                    rep.error(f"{path.name} line {i} col {col}: {sid} is not in source-manifest.csv")


def check_enum(rep: Report, path: Path, rows: list[dict], column: str,
               allowed: set[str], *, required: bool = True) -> None:
    for i, row in enumerate(rows, start=2):
        val = (row.get(column) or "").strip()
        if not val:
            if required:
                rep.error(f"{path.name} line {i}: column '{column}' is empty "
                          f"(write UNVERIFIED rather than leaving it blank)")
            continue
        if val not in allowed and val != UNVERIFIED:
            rep.error(f"{path.name} line {i}: column '{column}' = '{val}'; "
                      f"allowed: {', '.join(sorted(allowed))} (or UNVERIFIED)")


def check_nonempty(rep: Report, path: Path, rows: list[dict], columns: list[str]) -> None:
    for i, row in enumerate(rows, start=2):
        for col in columns:
            if col in row and not (row.get(col) or "").strip():
                rep.error(f"{path.name} line {i}: column '{col}' must not be empty")


def die(msg: str) -> None:
    print(f"error: {msg}", file=sys.stderr)
    raise SystemExit(2)
