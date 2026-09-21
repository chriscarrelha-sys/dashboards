#!/usr/bin/env python3
"""Validate a matter pack's citation-verification register.

The register is where a quotation, pincite, statute, rule, local rule, standing
order or effective-date stops being something a draft asserts and becomes
something somebody checked. This script does not go and read the authority —
no script can do that — but it makes an unchecked citation impossible to record
as checked, which is the failure that actually happens.

Rules enforced:
  * A quotation is a quotation only with the verbatim text AND a pincite AND
    the place it was read. A quotation with no pincite is a paraphrase.
  * `still_good_law: yes` requires a stated verification_method. Without a
    commercial citator the honest ceiling is CITATOR-LIMITED MEDIUM.
  * A statute, regulation, rule, local rule or standing order requires the
    version that was read and its effective or amendment date. Quoting the
    current text of a rule that was amended after the operative events is the
    most expensive error in this register.
  * `confidence: high` cannot sit beside a non-empty unverified_fields list.
  * Every cv_id claimed as used_in some work product must name where.
  * Cross-check: every case, rule or statute quoted in the pack's own results
    should appear here. --cross <dir> reports the ones that do not.

Usage:
    verify_citations.py <matter-pack-dir> [--cross 10-specialist-results]

Exit codes: 0 pass, 1 validation failure, 2 usage error.
"""
from __future__ import annotations

import argparse
import re
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from common import Report, UNVERIFIED, check_enum, die, read_csv, require_columns  # noqa: E402

REGISTER = "09-research/citation-verification.csv"

COLS = [
    "cv_id", "cited_as", "authority_type", "verification_target",
    "target_text_verbatim", "located_in", "pincite", "pincite_verified",
    "quotation_verified", "subsequent_history_checked", "history_result",
    "still_good_law", "version_checked", "effective_or_amendment_date",
    "verification_method", "verification_date", "verified_by",
    "unverified_fields", "confidence", "used_in", "notes",
]

AUTHORITY_TYPES = {
    "case", "statute", "regulation", "federal-rule", "local-rule",
    "standing-order", "constitutional", "secondary",
}
TARGETS = {
    "quotation", "pincite", "holding", "existence", "text",
    "subsequent-history", "effective-date",
}
YN = {"yes", "no", "n/a"}
CONF = {"high", "medium", "low"}

# The types whose text changes over time. For these the version actually read
# and its date are not optional.
VERSIONED = {"statute", "regulation", "federal-rule", "local-rule", "standing-order"}

CV_RE = re.compile(r"^CV-\d{3}$")
DATE_RE = re.compile(r"^\d{4}-\d{2}-\d{2}$")

# Shapes that mean "an authority is being quoted" in a result document.
CITE_IN_PROSE = re.compile(
    r"\b\d{1,4}\s+(?:F\.(?:\s?\d[a-z]{0,2}|\s?App'x|\s?Supp\.(?:\s?\d[a-z]{0,2})?)|"
    r"U\.S\.|S\.\s?Ct\.|Ga\.(?:\s?App\.)?|S\.E\.(?:\s?2d)?)\s+\d{1,5}\b"
    r"|\b\d{1,2}\s+U\.S\.C\.\s+§+\s?\d+[\w()\-]*"
    r"|\bO\.C\.G\.A\.\s+§+\s?[\d\-]+(?:\([\w]+\))*"
    r"|\bFed\.\s?R\.\s?Civ\.\s?P\.\s?\d+(?:\([\w]+\))*"
    r"|\bStanding Order\s+[\d\-]+")

# A reporter cite that shares a volume and reporter with a registered case, but
# lands on a different page, is almost always a pincite of that case rather
# than a second authority. It still needs saying — a pincite is exactly what
# this register exists to pin down — but it is a different thing from an
# unregistered case, and calling them the same teaches people to skim.
VOL_REPORTER = re.compile(r"\b(\d{1,4})\s+(F\.(?:\s?\d[a-z]{0,2}|\s?App'x|"
                          r"\s?Supp\.(?:\s?\d[a-z]{0,2})?)|U\.S\.|S\.\s?Ct\.|"
                          r"Ga\.(?:\s?App\.)?|S\.E\.(?:\s?2d)?)\s+(\d{1,5})\b")


def check_register(rep: Report, pack: Path) -> list[dict]:
    path = pack / REGISTER
    header, rows = read_csv(path)
    if not header:
        rep.error(f"missing or empty: {REGISTER}")
        return []
    require_columns(rep, path, header, COLS)
    if not rows:
        rep.note(f"{REGISTER} has a header and no rows — nothing verified yet")
        return []

    check_enum(rep, path, rows, "authority_type", AUTHORITY_TYPES)
    check_enum(rep, path, rows, "verification_target", TARGETS)
    check_enum(rep, path, rows, "pincite_verified", YN)
    check_enum(rep, path, rows, "quotation_verified", YN)
    check_enum(rep, path, rows, "subsequent_history_checked", YN)
    check_enum(rep, path, rows, "still_good_law", YN)
    check_enum(rep, path, rows, "confidence", CONF)

    seen: set[str] = set()
    for i, r in enumerate(rows, start=2):
        g = lambda c: (r.get(c) or "").strip()  # noqa: E731
        cid, atype, target = g("cv_id"), g("authority_type"), g("verification_target")

        if not CV_RE.match(cid):
            rep.error(f"{path.name} line {i}: cv_id '{cid}' is not CV-###")
        elif cid in seen:
            rep.error(f"{path.name} line {i}: duplicate cv_id {cid}")
        seen.add(cid)

        if not g("cited_as"):
            rep.error(f"{path.name} line {i} [{cid}]: cited_as is empty — the "
                      f"register must record the citation exactly as it will appear "
                      f"in the filing, because that is the string being checked")

        # --- a quotation is a quotation only if it is all three things ---
        if target == "quotation" or g("quotation_verified") == "yes":
            if not g("target_text_verbatim"):
                rep.error(f"{path.name} line {i} [{cid}]: a verified quotation with "
                          f"no target_text_verbatim. Record the words that were read.")
            if not g("pincite"):
                rep.error(f"{path.name} line {i} [{cid}]: quotation with no pincite. "
                          f"A quotation without a page is a paraphrase; label it one "
                          f"or find the page.")
            if not g("located_in"):
                rep.error(f"{path.name} line {i} [{cid}]: quotation with no "
                          f"located_in — say where the text was actually read "
                          f"(reporter page, slip op., SRC id, database).")

        if g("pincite_verified") == "yes" and not g("pincite"):
            rep.error(f"{path.name} line {i} [{cid}]: pincite_verified=yes with an "
                      f"empty pincite")

        # --- good-law claims need a stated method ---
        if g("still_good_law") == "yes":
            if not g("verification_method"):
                rep.error(f"{path.name} line {i} [{cid}]: still_good_law=yes with no "
                          f"verification_method. Name what was run — and if no "
                          f"commercial citator was available, the honest ceiling is "
                          f"CITATOR-LIMITED MEDIUM, not high.")
            if g("subsequent_history_checked") not in {"yes", "n/a"}:
                rep.error(f"{path.name} line {i} [{cid}]: still_good_law=yes but "
                          f"subsequent_history_checked='{g('subsequent_history_checked')}'. "
                          f"Good law is a conclusion about later treatment.")
        if g("subsequent_history_checked") == "yes" and not g("history_result"):
            rep.error(f"{path.name} line {i} [{cid}]: subsequent history checked but "
                      f"history_result is empty — record what was found, including "
                      f"'nothing adverse located'")

        # --- versioned authority must say which version ---
        if atype in VERSIONED:
            if not g("version_checked"):
                rep.error(f"{path.name} line {i} [{cid}]: {atype} with no "
                          f"version_checked. Rules and statutes are amended; the "
                          f"operative text is the one in force at the relevant time.")
            if not g("effective_or_amendment_date"):
                rep.error(f"{path.name} line {i} [{cid}]: {atype} with no "
                          f"effective_or_amendment_date")
            elif not DATE_RE.match(g("effective_or_amendment_date")) \
                    and g("effective_or_amendment_date") != UNVERIFIED:
                rep.error(f"{path.name} line {i} [{cid}]: "
                          f"effective_or_amendment_date '{g('effective_or_amendment_date')}' "
                          f"is not YYYY-MM-DD or {UNVERIFIED}")

        if atype in {"local-rule", "standing-order"} and not g("located_in"):
            rep.error(f"{path.name} line {i} [{cid}]: a {atype} must record "
                      f"located_in — these are not in the general databases and a "
                      f"remembered local rule is not a verified one")

        # --- confidence discipline ---
        if g("confidence") == "high" and g("unverified_fields") not in {"", "none"}:
            rep.error(f"{path.name} line {i} [{cid}]: confidence=high with "
                      f"unverified_fields='{g('unverified_fields')}'. Confidence "
                      f"follows the weakest verified link.")
        if not g("verification_date"):
            rep.error(f"{path.name} line {i} [{cid}]: verification_date is empty")
        elif not DATE_RE.match(g("verification_date")):
            rep.error(f"{path.name} line {i} [{cid}]: verification_date "
                      f"'{g('verification_date')}' is not YYYY-MM-DD")
        if not g("verified_by"):
            rep.error(f"{path.name} line {i} [{cid}]: verified_by is empty — a "
                      f"verification nobody signed is not a verification")
        if not g("used_in"):
            rep.warn(f"{path.name} line {i} [{cid}]: used_in is empty. A verified "
                     f"citation nothing relies on is fine, but usually means the "
                     f"work product was not linked back.")

    rep.note(f"{len(rows)} citation verification record(s) checked")
    return rows


def cross_check(rep: Report, pack: Path, subdir: str, rows: list[dict]) -> None:
    """Report authorities quoted in work product that the register never saw."""
    d = pack / subdir
    if not d.is_dir():
        rep.warn(f"--cross: {subdir} is not a directory")
        return
    registered = " | ".join((r.get("cited_as") or "") for r in rows)
    reg_vols: dict[tuple[str, str], str] = {}
    # Pages a register row has actually pinned down, as (volume, reporter, page).
    reg_pages: set[tuple[str, str, str]] = set()
    for r in rows:
        pin = (r.get("pincite") or "").strip()
        for m in VOL_REPORTER.finditer(r.get("cited_as") or ""):
            vol, rep_, first = m.group(1), re.sub(r"\s+", "", m.group(2)), m.group(3)
            reg_vols.setdefault((vol, rep_), r.get("cv_id", ""))
            reg_pages.add((vol, rep_, first))
            # A pincite of "1321-24" pins every page in the range, and a row's
            # own cited_as may already carry the page after a comma.
            for part in re.split(r"[;,]", pin):
                part = part.strip()
                if rng := re.match(r"^(\d{1,5})\s*[-\u2013]\s*(\d{1,5})$", part):
                    lo, hi = rng.group(1), rng.group(2)
                    hi = lo[:len(lo) - len(hi)] + hi if len(hi) < len(lo) else hi
                    for pg in range(int(lo), int(hi) + 1):
                        reg_pages.add((vol, rep_, str(pg)))
                elif re.match(r"^\d{1,5}$", part):
                    reg_pages.add((vol, rep_, part))
            for extra in re.findall(r",\s*(\d{1,5})\b", r.get("cited_as") or ""):
                reg_pages.add((vol, rep_, extra))
    missing: dict[str, set[str]] = {}
    for f in sorted(d.rglob("*.md")):
        text = f.read_text(encoding="utf-8", errors="replace")
        for m in CITE_IN_PROSE.finditer(text):
            token = m.group(0).strip()
            core = re.sub(r"\s+", " ", token)
            if core and core not in registered:
                missing.setdefault(core, set()).add(f.name)
    pincites = unregistered = 0
    for cite in sorted(missing):
        where = ", ".join(sorted(missing[cite]))
        m = VOL_REPORTER.match(cite)
        if m and (m.group(1), re.sub(r"\s+", "", m.group(2)), m.group(3)) in reg_pages:
            continue                       # this exact page is pinned by a row
        owner = reg_vols.get((m.group(1), re.sub(r"\s+", "", m.group(2)))) if m else None
        if owner:
            pincites += 1
            unregistered += 1
            rep.warn(f"'{cite}' ({where}) reads as a pincite of {owner}, which IS "
                     f"registered — but that page is not the one the register "
                     f"verified. Add a row for the page actually relied on.")
        else:
            unregistered += 1
            rep.warn(f"cited in work product but not in {REGISTER}: '{cite}' ({where})")
    if not unregistered:
        rep.note(f"cross-check: every authority cited under {subdir}/ resolves to "
                 f"a row in the verification register, pincites included")
    else:
        rep.note(f"cross-check: {unregistered} authority string(s) cited but not "
                 f"registered ({pincites} of them unverified pincites of a "
                 f"registered case) — each is either a verification that was "
                 f"never recorded or a citation that should not be in the draft")


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__,
                                 formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("pack")
    ap.add_argument("--cross", default=None,
                    help="directory within the pack whose .md files are scanned "
                         "for citations (e.g. 10-specialist-results)")
    args = ap.parse_args()
    pack = Path(args.pack).resolve()
    if not pack.is_dir():
        die(f"not a directory: {pack}")
    rep = Report(f"citation verification: {pack.name}")
    rows = check_register(rep, pack)
    if args.cross:
        cross_check(rep, pack, args.cross, rows)
    return rep.emit()


if __name__ == "__main__":
    raise SystemExit(main())
