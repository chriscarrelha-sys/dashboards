#!/usr/bin/env python3
"""Validate a matter pack's access map and prove no credential is stored in it.

Two jobs, deliberately in one script so neither can be run without the other:

  1. The access map is structurally sound — every system says where it is
     reached, who holds the key, and what access THIS session actually had.
     An entry claiming access nobody verified is worse than no entry.

  2. Nothing anywhere in the matter pack looks like a secret. The scan runs
     over the whole pack, not just the access map, because the rule the user
     set is about the pack and the skills, not about one file.

Usage:
    validate_access_map.py <matter-pack-dir> [--scan-only] [--also <dir>...]

Exit codes: 0 pass, 1 validation failure, 2 usage error.
"""
from __future__ import annotations

import argparse
import re
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from common import Report, die, read_csv  # noqa: E402

try:
    import yaml
except ImportError:  # pragma: no cover
    die("PyYAML is required: pip install pyyaml")

ACCESS_MAP = "00-control/access-map.yaml"

SYSTEM_REQUIRED = [
    "key", "kind", "purpose", "reached_via", "credential_holder",
    "credential_location", "session_access", "write_permitted",
]
SESSION_ACCESS = {"none", "read", "read-write"}
YES_NO = {"yes", "no", "n/a"}


def yn(value) -> str:
    """YAML 1.1 turns bare `yes`/`no`/`on`/`off` into booleans before this code
    ever sees them. The file is written for a human, so it keeps plain yes/no;
    normalising here is what lets both be true at once."""
    if isinstance(value, bool):
        return "yes" if value else "no"
    return str(value if value is not None else "").strip().lower()

# Fields that may legitimately name a *place* a credential lives. They are
# checked separately and may never contain the credential itself.
LOCATION_FIELDS = {"credential_location", "credential_holder"}

# A location value that is actually a secret rather than a location.
LOCATION_LOOKS_LIKE_SECRET = re.compile(
    r"^\s*(?![A-Za-z ]{0,40}(manager|vault|keychain|1password|lastpass|bitwarden|"
    r"wallet|safe|human|client|attorney|counsel|n/?a|none|unknown|<)).{0,}$", re.I)

# Patterns that mean "a secret is written down here". Each is paired with the
# name printed in the failure so the human knows what to remove.
SECRET_PATTERNS: list[tuple[str, re.Pattern]] = [
    ("password assignment",
     re.compile(r"(?<![a-z_])(?:password|passphrase|passwd|pwd)\s*[:=]\s*\S", re.I)),
    ("PIN assignment",
     re.compile(r"(?<![a-z_])pin\s*[:=]\s*['\"]?\d{3,}", re.I)),
    ("MFA / OTP code",
     re.compile(r"(?<![a-z_])(mfa|otp|totp|2fa|one[- ]time[- ]code|auth(enticator)?[- ]code)"
                r"\s*[:=]\s*['\"]?[A-Za-z0-9]{4,}", re.I)),
    ("TOTP seed / otpauth URI", re.compile(r"otpauth://", re.I)),
    ("API key or token assignment",
     re.compile(r"(?<![a-z_])(api[_ -]?key|secret[_ -]?key|access[_ -]?token|"
                r"bearer[_ -]?token|client[_ -]?secret|session[_ -]?id|auth[_ -]?token)"
                r"\s*[:=]\s*['\"]?[A-Za-z0-9._\-]{8,}", re.I)),
    ("bearer token header", re.compile(r"Authorization\s*:\s*Bearer\s+\S{8,}", re.I)),
    ("private key block", re.compile(r"-----BEGIN [A-Z ]*PRIVATE KEY-----")),
    ("AWS access key id", re.compile(r"\bAKIA[0-9A-Z]{16}\b")),
    ("Google API key", re.compile(r"\bAIza[0-9A-Za-z_\-]{35}\b")),
    ("GitHub token", re.compile(r"\bgh[pousr]_[A-Za-z0-9]{20,}\b")),
    ("Slack token", re.compile(r"\bxox[abprs]-[A-Za-z0-9-]{10,}\b")),
    ("security-question answer",
     re.compile(r"security[_ -]?(question|answer)\s*[:=]\s*\S", re.I)),
    ("court-system login",
     re.compile(r"(pacer|efilega|efile[- ]ga|peachcourt|odyssey)[^\n]{0,30}"
                r"(password|pwd|passphrase|login[_ -]?secret)\s*[:=]\s*\S", re.I)),
]

# Text that names the prohibition rather than breaking it. A pack is expected
# to SAY "never here"; that sentence must not trip the scanner.
ALLOWLIST = re.compile(
    r"(never|no|not|without|prohibit|forbid|do not|don't|nothing)"
    r"[^\n]{0,60}(password|credential|mfa|otp|token|pin|secret|key)", re.I)

SCAN_EXT = {".yaml", ".yml", ".csv", ".md", ".txt", ".json", ".py", ".sh", ".html"}
SKIP_DIRS = {".git", "__pycache__", "node_modules"}


def scan_for_secrets(rep: Report, root: Path) -> int:
    """Walk a tree and fail on anything shaped like a stored credential.

    This file is skipped wherever it is found, because it necessarily contains
    every shape it hunts for — a detector that trips on itself gets switched
    off, and a scanner nobody runs protects nothing. The skip is announced, so
    it cannot become a quiet hiding place; the copies in skills/*/scripts/ are
    written by install.sh from tools/, and the build fails if they drift.
    """
    self_name = Path(__file__).name
    scanned = skipped = 0
    for path in sorted(root.rglob("*")):
        if not path.is_file():
            continue
        if any(part in SKIP_DIRS for part in path.parts):
            continue
        if path.suffix.lower() not in SCAN_EXT and path.name != ".integrity.json":
            continue
        if path.name == self_name:
            skipped += 1
            continue
        try:
            text = path.read_text(encoding="utf-8", errors="replace")
        except OSError:
            continue
        scanned += 1
        rel = path.relative_to(root)
        for lineno, line in enumerate(text.splitlines(), start=1):
            if ALLOWLIST.search(line):
                continue
            for label, pat in SECRET_PATTERNS:
                if pat.search(line):
                    rep.error(
                        f"{rel} line {lineno}: {label} — a credential must never be "
                        f"stored in a skill or a matter pack. Record WHERE the key "
                        f"is held (credential_location), never the key."
                    )
                    break
    if skipped:
        rep.note(f"{skipped} cop{'y' if skipped == 1 else 'ies'} of {self_name} "
                 f"skipped (the scanner contains the patterns it hunts)")
    return scanned


def check_access_map(rep: Report, root: Path) -> None:
    path = root / ACCESS_MAP
    if not path.is_file():
        rep.error(f"missing required file: {ACCESS_MAP}")
        return
    try:
        doc = yaml.safe_load(path.read_text(encoding="utf-8")) or {}
    except yaml.YAMLError as exc:
        rep.error(f"{ACCESS_MAP}: YAML will not parse: {exc}")
        return

    for key in ("schema_version", "matter_id", "systems"):
        if key not in doc:
            rep.error(f"{ACCESS_MAP}: missing top-level key '{key}'")

    systems = doc.get("systems") or []
    if not isinstance(systems, list) or not systems:
        rep.error(f"{ACCESS_MAP}: 'systems' must be a non-empty list")
        return

    seen: set[str] = set()
    reachable = 0
    for i, sysdef in enumerate(systems, start=1):
        if not isinstance(sysdef, dict):
            rep.error(f"{ACCESS_MAP}: systems[{i}] is not a mapping")
            continue
        key = str(sysdef.get("key", "")).strip()
        label = key or f"systems[{i}]"
        for col in SYSTEM_REQUIRED:
            if col not in sysdef:
                rep.error(f"{ACCESS_MAP} [{label}]: missing field '{col}'")
        if key:
            if key in seen:
                rep.error(f"{ACCESS_MAP}: duplicate system key '{key}'")
            seen.add(key)

        access = yn(sysdef.get("session_access", ""))
        if access and not access.startswith("<") and access not in SESSION_ACCESS:
            rep.error(f"{ACCESS_MAP} [{label}]: session_access = '{access}'; "
                      f"allowed: {', '.join(sorted(SESSION_ACCESS))}")
        if access in {"read", "read-write"}:
            reachable += 1
            if not str(sysdef.get("verified_on", "")).strip():
                rep.error(f"{ACCESS_MAP} [{label}]: claims session_access "
                          f"'{access}' but verified_on is empty. Access that was "
                          f"never exercised is not access.")
            if not str(sysdef.get("scope_note", "")).strip():
                rep.warn(f"{ACCESS_MAP} [{label}]: reachable system with no "
                         f"scope_note — say what was actually in scope.")

        wp = yn(sysdef.get("write_permitted", ""))
        if wp and not wp.startswith("<") and wp not in YES_NO:
            rep.error(f"{ACCESS_MAP} [{label}]: write_permitted = '{wp}'; "
                      f"allowed: yes, no, n/a")

        # A court-record or e-filing system may never be marked writable here.
        if sysdef.get("kind") in {"court-efiling", "court-record"} and wp == "yes":
            rep.error(f"{ACCESS_MAP} [{label}]: write_permitted=yes on a "
                      f"{sysdef.get('kind')} system. Nothing in this system is "
                      f"written by a skill or a script; a human files, after an "
                      f"approved APR- entry.")

        # The credential fields must name a place, not hold a value.
        for f in LOCATION_FIELDS:
            val = str(sysdef.get(f, "") or "")
            if re.search(r"[A-Za-z0-9!@#$%^&*]{10,}", val) and not re.search(
                    r"(manager|vault|keychain|1password|lastpass|bitwarden|"
                    r"human|client|attorney|counsel|of record|n/a|none|unknown)", val, re.I):
                rep.warn(f"{ACCESS_MAP} [{label}]: {f} = '{val}' does not read like "
                         f"a location. This field names where the key is kept, "
                         f"never the key.")

    _, gap_rows = read_csv(root / "07-evidence/missing-evidence.csv")
    known_gaps = {(r.get("gap_id") or "").strip() for r in gap_rows if r.get("gap_id")}
    inaccessible = doc.get("known_inaccessible") or []
    if isinstance(inaccessible, list):
        for i, entry in enumerate(inaccessible, start=1):
            if not isinstance(entry, dict):
                continue
            label = str(entry.get("system", ""))
            if label.startswith("<"):
                continue
            gaps = [x.strip() for x in str(entry.get("gap_ids", "")).split(";") if x.strip()]
            if not gaps:
                rep.error(f"{ACCESS_MAP}: known_inaccessible[{i}] ('{label}') has no "
                          f"gap_ids. An access gap that is not a GAP- row is a gap "
                          f"nobody will close.")
                continue
            for gid in gaps:
                if not re.match(r"^GAP-\d{3}$", gid):
                    rep.error(f"{ACCESS_MAP}: known_inaccessible[{i}] ('{label}') "
                              f"gap_ids contains '{gid}', which is not a GAP-### id")
                elif known_gaps and gid not in known_gaps:
                    rep.error(f"{ACCESS_MAP}: known_inaccessible[{i}] ('{label}') "
                              f"points at {gid}, which is not in "
                              f"07-evidence/missing-evidence.csv. A pointer checked "
                              f"for presence and not for target is provenance that "
                              f"resolves to nothing.")
            for sysdef in systems:
                if str(sysdef.get("key", "")) == label and \
                        yn(sysdef.get("session_access", "")) in {"read", "read-write"}:
                    rep.error(f"{ACCESS_MAP}: '{label}' is listed under "
                              f"known_inaccessible while its system entry claims "
                              f"session_access '{sysdef.get('session_access')}'")
    rep.note(f"{len(systems)} system(s) mapped; {reachable} reachable this session")


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__,
                                 formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("pack")
    ap.add_argument("--scan-only", action="store_true",
                    help="run the credential scan and skip the access-map schema")
    ap.add_argument("--also", action="append", default=[],
                    help="additional directory to include in the credential scan "
                         "(use for skills/ so the same rule covers both)")
    args = ap.parse_args()

    root = Path(args.pack).resolve()
    if not root.is_dir():
        die(f"not a directory: {root}")

    rep = Report(f"access map + credential scan: {root.name}")
    if not args.scan_only:
        check_access_map(rep, root)

    total = scan_for_secrets(rep, root)
    for extra in args.also:
        p = Path(extra).resolve()
        if not p.is_dir():
            rep.error(f"--also path is not a directory: {p}")
            continue
        total += scan_for_secrets(rep, p)
    rep.note(f"{total} file(s) scanned for stored credentials")
    return rep.emit()


if __name__ == "__main__":
    raise SystemExit(main())
