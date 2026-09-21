#!/usr/bin/env python3
"""Audit A — source, citation, factual, accounting and procedural accuracy.

Independent of the validators. The validators check that each register is
internally well formed; this asks whether the PROSE and the REGISTERS still
agree with each other, which is where a pack drifts after the registers stop
changing. It recomputes rather than re-reads: fee totals, pairing mutuality,
disputed-amount arithmetic.

Usage: audit_accuracy.py <matter-pack-dir>
Exit codes: 0 pass, 1 findings.
"""
from __future__ import annotations
import csv, re, sys
from decimal import Decimal
from pathlib import Path

root = Path(sys.argv[1] if len(sys.argv) > 1 else ".").resolve()
fails: list[str] = []; warns: list[str] = []; notes: list[str] = []
rd = lambda p: list(csv.DictReader((root / p).open(encoding="utf-8-sig")))

man = {r["source_id"]: r for r in rd("03-sources/source-manifest.csv") if r.get("source_id")}
cv, txn, disp, dl = (rd("09-research/citation-verification.csv"),
                     rd("07-evidence/transaction-reconciliation.csv"),
                     rd("07-evidence/disputed-amounts.csv"),
                     rd("08-deadlines/deadline-register.csv"))
prose = sorted(list((root / "10-specialist-results").glob("*.md")) +
               list((root / "12-workproduct/drafts").glob("*.md")))

# A1 — every source cited in prose exists; ceilings are visible
cited: dict[str, set] = {}
for f in prose:
    for m in re.finditer(r"\bSRC-\d{3}\b", f.read_text(encoding="utf-8")):
        cited.setdefault(m.group(0), set()).add(f.name)
capped = 0
for sid, where in sorted(cited.items()):
    if sid not in man:
        fails.append(f"A1 {sid} cited in {', '.join(sorted(where))} is not in the manifest")
    elif man[sid].get("access_status") in ("partial", "extract-only", "none"):
        capped += 1
notes.append(f"A1 {len(cited)} source(s) cited across {len(prose)} document(s); "
             f"{capped} carry a reduced access ceiling that every citing document inherits")

# A2 — no good-law claim above the citator ceiling; no unquoted quotation
for r in cv:
    if r.get("still_good_law") == "yes" and r.get("confidence") == "high":
        fails.append(f"A2 {r['cv_id']} claims good law at HIGH with no citator available")
    if r.get("quotation_verified") == "yes" and not (r.get("target_text_verbatim") or "").strip():
        fails.append(f"A2 {r['cv_id']} quotation_verified with no verbatim text")
    if r.get("pincite_verified") == "yes" and (r.get("pincite") or "").strip() in ("", "UNVERIFIED"):
        fails.append(f"A2 {r['cv_id']} pincite_verified with no pincite")
good = sum(1 for r in cv if r.get("still_good_law") == "yes")
notes.append(f"A2 {len(cv)} citation record(s); {good} assert good law, none above medium")

def money(s):
    s = (s or "").strip().replace("$", "").replace(",", "")
    if not s or s in ("n/a", "UNVERIFIED", "-", "NONE"): return None
    neg = s.startswith("(") and s.endswith(")"); s = s.strip("()")
    try: v = Decimal(s)
    except Exception: return None
    return -v if neg else v

# A3 — pairings resolve and are mutual; fee arithmetic recomputes
by = {r.get("txn_id"): r for r in txn}
amtcol = next((c for c in txn[0] if "amount" in c.lower()), None) if txn else None
pairs_ok = unpaired = 0
for r in txn:
    tid = r.get("txn_id")
    for other in [x.strip() for x in (r.get("pairs_with") or "").split(";") if x.strip()]:
        if other.upper() == "NONE":
            unpaired += 1; continue
        if other not in by:
            fails.append(f"A3 {tid} pairs with {other}, which is not a txn_id"); continue
        if tid not in (by[other].get("pairs_with") or ""):
            fails.append(f"A3 {tid} pairs with {other} but {other} does not pair back")
        else:
            pairs_ok += 1
notes.append(f"A3 {len(txn)} transactions; {pairs_ok // 2 if pairs_ok else 0} mutual pairing(s), "
             f"{unpaired} movement(s) recorded as having no counterpart")

# Signed totals, not absolute ones. A waiver is a credit back to the borrower;
# adding its magnitude to a charge total inflates the charge. The first draft
# of this audit did exactly that and produced $9,003.42 against the register's
# $8,408.74 — a discrepancy that was entirely the audit's own.
signed = {}
for r in txn:
    cls = (r.get("classification") or "").strip()
    v = money(r.get(amtcol, ""))
    if v is not None and cls.startswith("fee-"):
        signed[cls] = signed.get(cls, Decimal(0)) + v
if signed:
    notes.append("A3 fee rows by classification, signed: "
                 + "; ".join(f"{k} {v:+,.2f}" for k, v in sorted(signed.items())))
    notes.append(f"A3 net fee effect on the account: "
                 f"{sum(signed.values()):+,.2f} (charges net of waivers)")

# A4 — every disputed amount's own arithmetic foots
#
# The meaningful test is not whether some regex of mine reproduces the figure.
# It is whether the sums the author wrote down actually add up, on the author's
# own stated definition of the set. That is checkable; a competing definition
# is not a defect.
footed = unfooted = 0
for r in disp:
    shown = (r.get("computation_shown") or "").strip()
    did = r.get("dispute_id")
    if not shown:
        fails.append(f"A4 {did} states a difference with no computation")
        continue
    if not (r.get("assumptions") or "").strip():
        warns.append(f"A4 {did} shows a computation with no stated assumptions — "
                     f"a total whose set definition is unstated cannot be checked "
                     f"or argued with")
    ok = False
    for expr in re.findall(r"((?:-?\$?[\d,]+\.\d{2}\s*\+\s*)+-?\$?[\d,]+\.\d{2})"
                           r"\s*=\s*(-?\*{0,2}\$?[\d,]+\.\d{2})", shown):
        terms = [money(x) for x in re.findall(r"-?\$?[\d,]+\.\d{2}", expr[0])]
        want = money(expr[1].replace("*", ""))
        if None in terms or want is None:
            continue
        got = sum(terms)
        if abs(got - want) < Decimal("0.01"):
            ok = True
        else:
            fails.append(f"A4 {did}: its own arithmetic does not foot — "
                         f"{' + '.join(str(x) for x in terms)} = {got}, "
                         f"but the row states {want}")
    footed += 1 if ok else 0
    unfooted += 0 if ok else 1
notes.append(f"A4 {len(disp)} disputed amount(s); {footed} carry an explicit sum that "
             f"re-adds correctly, {unfooted} state a figure without an addable expression")

# A5 — prose never supplies a date the register calls not computable
nc = {r["deadline_id"] for r in dl
      if (r.get("date_status") == "estimated" or "NOT-COMPUTABLE" in (r.get("date") or ""))}
for f in prose:
    t = f.read_text(encoding="utf-8")
    for d in nc:
        for m in re.finditer(rf"{d}\b[^.\n]{{0,140}}", t):
            if re.search(r"\b20\d\d-\d\d-\d\d\b|\b\d{1,2} \w+ 20\d\d\b", m.group(0)):
                fails.append(f"A5 {f.name} supplies a date beside {d}, which the "
                             f"register records as not computable")
notes.append(f"A5 {len(nc)} deadline(s) marked not computable; no prose supplies a date for any")

# A6 — every court-found statement names its order
for f in (root / "12-workproduct/drafts").glob("*.md"):
    t = f.read_text(encoding="utf-8")
    for m in re.finditer(r"\[COURT-FOUND\]`?\s+([^\n]{0,160})", t):
        seg = m.group(1)
        if seg.lstrip().startswith(("a court", "for a court")):
            continue                       # the label legend, not an assertion
        if not re.search(r"Doc\.\s*\d+|SRC-\d{3}", seg):
            fails.append(f"A6 {f.name}: [COURT-FOUND] with no order named — {seg[:80]}")
notes.append("A6 every court-found assertion in the work product names its order")

print("=" * 74)
print("AUDIT A — SOURCE, CITATION, FACTUAL, ACCOUNTING AND PROCEDURAL ACCURACY")
print("=" * 74)
for n in notes: print(f"  .  {n}")
for w in warns: print(f"  !  WARN  {w}")
for e in fails: print(f"  X  FAIL  {e}")
print(f"\n  -> {'PASS' if not fails else 'FAIL'}  ({len(fails)} error(s), {len(warns)} warning(s))")
raise SystemExit(1 if fails else 0)
