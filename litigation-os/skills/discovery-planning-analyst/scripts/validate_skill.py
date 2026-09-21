#!/usr/bin/env python3
"""Structural validation for a Litigation OS skill directory.

Checks what actually breaks skills in practice: malformed or missing front
matter, a name that does not match the directory, a description too thin to
trigger on or too long to be carried in context, references named in SKILL.md
that do not exist on disk, and SKILL.md length.

Usage: validate_skill.py <skill-dir> [<skill-dir> ...]
"""
from __future__ import annotations

import re
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from common import Report, die  # noqa: E402

try:
    import yaml
except ImportError:  # pragma: no cover
    die("PyYAML is required: pip install pyyaml")

FRONT_MATTER_RE = re.compile(r"\A---\s*\n(.*?)\n---\s*\n", re.DOTALL)
NAME_RE = re.compile(r"^[a-z0-9]+(-[a-z0-9]+)*$")
MAX_BODY_LINES = 500
MIN_DESC_CHARS = 120
MAX_DESC_CHARS = 2000
# Paths SKILL.md points at, e.g. `references/foo.md` or assets/bar.csv
REF_RE = re.compile(r"`?((?:references|assets|scripts)/[A-Za-z0-9_\-./]+)`?")


def validate(skill_dir: Path) -> Report:
    rep = Report(f"skill: {skill_dir.name}")
    md = skill_dir / "SKILL.md"
    if not md.is_file():
        rep.error("no SKILL.md")
        return rep

    text = md.read_text(encoding="utf-8")
    m = FRONT_MATTER_RE.match(text)
    if not m:
        rep.error("SKILL.md must begin with YAML front matter delimited by ---")
        return rep
    try:
        fm = yaml.safe_load(m.group(1)) or {}
    except yaml.YAMLError as exc:
        rep.error(f"front matter is not valid YAML: {exc}")
        return rep
    if not isinstance(fm, dict):
        rep.error("front matter must be a mapping")
        return rep

    name = str(fm.get("name", "")).strip()
    if not name:
        rep.error("front matter is missing 'name'")
    else:
        if not NAME_RE.match(name):
            rep.error(f"name '{name}' must be lowercase-hyphenated")
        if name != skill_dir.name:
            rep.error(f"name '{name}' does not match directory '{skill_dir.name}'")

    desc = str(fm.get("description", "")).strip()
    if not desc:
        rep.error("front matter is missing 'description'")
    else:
        if len(desc) < MIN_DESC_CHARS:
            rep.error(f"description is {len(desc)} chars; too thin to trigger "
                      f"reliably (want >= {MIN_DESC_CHARS})")
        if len(desc) > MAX_DESC_CHARS:
            rep.error(f"description is {len(desc)} chars; exceeds {MAX_DESC_CHARS}")
        low = desc.lower()
        if "use" not in low and "when" not in low:
            rep.warn("description does not say when to use the skill; triggering "
                     "will suffer")

    extra = set(fm) - {"name", "description", "compatibility", "license",
                       "allowed-tools", "version", "metadata"}
    if extra:
        rep.warn(f"unrecognized front-matter key(s): {', '.join(sorted(extra))}")

    body = text[m.end():]
    n_lines = body.count("\n") + 1
    rep.note(f"SKILL.md body is {n_lines} lines; description is {len(desc)} chars")
    if n_lines > MAX_BODY_LINES:
        rep.error(f"SKILL.md body is {n_lines} lines; keep it under {MAX_BODY_LINES} "
                  "and move detail into references/")

    referenced = {r for r in REF_RE.findall(body)}
    for ref in sorted(referenced):
        if not (skill_dir / ref).exists():
            rep.error(f"SKILL.md references '{ref}' which does not exist")
    if referenced:
        rep.note(f"{len(referenced)} bundled resource path(s) referenced, all resolved"
                 if all((skill_dir / r).exists() for r in referenced)
                 else f"{len(referenced)} bundled resource path(s) referenced")

    # Bundled resources that nothing points at are dead weight in a skill.
    for sub in ("references", "assets"):
        d = skill_dir / sub
        if d.is_dir():
            for f in sorted(d.iterdir()):
                if f.is_file() and f"{sub}/{f.name}" not in referenced \
                        and not any(f"{sub}/" == r or r.startswith(f"{sub}/")
                                    and f.name in r for r in referenced):
                    if f"{sub}/" not in body:
                        rep.warn(f"{sub}/{f.name} is bundled but never referenced "
                                 "from SKILL.md")
    return rep


def main() -> int:
    if len(sys.argv) < 2:
        die("usage: validate_skill.py <skill-dir> [...]")
    rc = 0
    for arg in sys.argv[1:]:
        p = Path(arg).resolve()
        if not p.is_dir():
            print(f"error: not a directory: {p}", file=sys.stderr)
            rc = 2
            continue
        rc |= validate(p).emit()
    return rc


if __name__ == "__main__":
    raise SystemExit(main())
