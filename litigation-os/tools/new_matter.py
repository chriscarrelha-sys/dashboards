#!/usr/bin/env python3
"""Create a new matter pack from the template, ready to fill.

Copies the blank template, stamps the identifiers the whole pack keys off, and
validates the result. Two things it deliberately does NOT do:

  * It does not invent facts. Court name, judge, case number, posture and
    deadlines stay as placeholders until a human supplies them from a source.
  * It does not create anything under 03-sources/raw/. Sources arrive through
    import_sources.py, which hashes them; a file dropped in by hand has no
    provenance.

Usage:
    new_matter.py --slug carrelha-v-meb-2026 --matter-id CARRELHA-2026 \
                  --name "Carrelha v. MEB Loan Trust VIII" [--dest DIR] [--force]

Exit codes: 0 pass, 1 failure, 2 usage error.
"""
from __future__ import annotations

import argparse
import re
import shutil
import subprocess
import sys
from datetime import date
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from common import Report, die  # noqa: E402

SLUG_RE = re.compile(r"^[a-z0-9]+(?:-[a-z0-9]+)*$")
MATTER_ID_RE = re.compile(r"^[A-Z0-9]+(?:-[A-Z0-9]+)*$")


def find_template(here: Path) -> Path:
    for cand in [here.parent / "matter-pack-template",
                 here / "matter-pack-template",
                 here.parent / "assets" / "matter-pack-template"]:
        if cand.is_dir():
            return cand
    die("cannot locate matter-pack-template/ next to this script")


def stamp(root: Path, matter_id: str, name: str, slug: str) -> int:
    """Replace the handful of placeholders that are genuinely mechanical."""
    subs = {
        "<MATTER-ID>": matter_id,
        "<MATTER-SLUG>": slug,
        "<MATTER-NAME>": name,
        "<SHORTNAME-YEAR>": matter_id,
        "<TODAY>": date.today().isoformat(),
    }
    touched = 0
    for path in sorted(root.rglob("*")):
        if not path.is_file() or path.suffix.lower() not in {".yaml", ".yml", ".csv", ".md"}:
            continue
        text = path.read_text(encoding="utf-8")
        new = text
        for k, v in subs.items():
            new = new.replace(k, v)
        if new != text:
            path.write_text(new, encoding="utf-8")
            touched += 1
    return touched


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__,
                                 formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--slug", required=True, help="directory name, lower-kebab")
    ap.add_argument("--matter-id", required=True, help="prefix for every id, UPPER-KEBAB")
    ap.add_argument("--name", required=True, help="full case caption")
    ap.add_argument("--dest", default=None, help="matters/ directory (default: ../matters)")
    ap.add_argument("--force", action="store_true", help="overwrite an existing pack")
    args = ap.parse_args()

    if not SLUG_RE.match(args.slug):
        die(f"--slug '{args.slug}' must be lower-kebab-case, e.g. smith-v-acme-2026")
    if not MATTER_ID_RE.match(args.matter_id):
        die(f"--matter-id '{args.matter_id}' must be UPPER-KEBAB, e.g. SMITH-2026")

    here = Path(__file__).resolve().parent
    template = find_template(here)
    dest_root = Path(args.dest).resolve() if args.dest else (here.parent / "matters").resolve()
    target = dest_root / args.slug

    rep = Report(f"new matter: {args.slug}")

    if target.exists():
        if not args.force:
            die(f"{target} already exists (pass --force only if you mean to overwrite)")
        # Refuse to blow away real source material even under --force.
        raw = target / "03-sources" / "raw"
        real = [p for p in raw.glob("*") if p.is_file() and not p.name.startswith(".")] if raw.is_dir() else []
        if real:
            die(f"{raw} holds {len(real)} source file(s). Originals are never "
                f"deleted or overwritten. Move the pack aside by hand if you "
                f"really mean to start over.")
        shutil.rmtree(target)

    dest_root.mkdir(parents=True, exist_ok=True)
    shutil.copytree(template, target)
    touched = stamp(target, args.matter_id, args.name, args.slug)
    rep.note(f"created {target}")
    rep.note(f"stamped identifiers into {touched} file(s)")

    # The template ships as a template; a real pack must be filled before it
    # validates. Say exactly what the human owes.
    rep.note("next, before this pack validates:")
    for line in [
        "00-control/matter-control.yaml — court, judges, posture, objectives, "
        "prohibited actions, open questions",
        "00-control/access-map.yaml — delete systems that do not apply; record "
        "verified_on for every reachable one",
        "02-court/court-jurisdiction.yaml — forum, case number, governing rules",
        "then: import_sources.py to bring in material (never copy into raw/ by hand)",
    ]:
        rep.note(f"    - {line}")

    rc = rep.emit()
    print()
    val = here / "validate_matter_pack.py"
    print(f"--- validating as a template (placeholders expected) ---")
    sub = subprocess.run([sys.executable, str(val), str(target), "--template"])
    return rc or (0 if sub.returncode == 0 else 1)


if __name__ == "__main__":
    raise SystemExit(main())
