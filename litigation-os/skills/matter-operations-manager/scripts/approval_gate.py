#!/usr/bin/env python3
"""The human-approval gate for irreversible and outward-facing actions.

Nothing in this system files, serves, sends, deletes, renames or materially
moves a litigation document. This script is how that rule is operated rather
than merely stated: an action of that kind is written down as a request, a
named human decides it, and only then may it be executed — by that human.

The gate is deliberately unable to perform the action it guards. It records,
checks and reports. There is no --execute.

    approval_gate.py <pack> --request --action file \
        --target "Response to Order to Replead" \
        --path 12-workproduct/final/APR-001-response.pdf \
        --why "Doc. 35 requires an amended complaint by 2026-08-21" \
        --review "caption, signature block, certificate of service, exhibit list"

    approval_gate.py <pack> --check APR-001     # may this be executed yet?
    approval_gate.py <pack> --list              # everything pending
    approval_gate.py <pack> --validate          # the register itself is sound

Exit codes: 0 pass / approved, 1 not approved or invalid, 2 usage error.
"""
from __future__ import annotations

import argparse
import csv
import re
import sys
from datetime import date
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from common import Report, die, read_csv, require_columns  # noqa: E402

REGISTER = "11-decisions/approval-requests.csv"

COLS = [
    "approval_id", "action_type", "target_description", "target_path",
    "requested_by", "requested_date", "why_needed", "irreversibility",
    "what_human_must_review", "human_decision", "decided_by", "decided_date",
    "conditions", "executed", "executed_date", "notes",
]

# Every action that leaves the workspace or cannot be undone.
ACTIONS = {"file", "serve", "send", "publish", "delete", "rename", "move", "other"}
DECISIONS = {"pending", "approved", "approved-with-conditions", "denied", "withdrawn"}
IRREVERSIBILITY = {"irreversible", "hard-to-reverse", "reversible"}
YN = {"yes", "no"}

# Actions that are irreversible as a matter of fact, whatever the row says.
ALWAYS_IRREVERSIBLE = {"file", "serve", "send", "publish", "delete"}

APR_RE = re.compile(r"^APR-\d{3}$")
DATE_RE = re.compile(r"^\d{4}-\d{2}-\d{2}$")


def load(pack: Path) -> tuple[Path, list[str], list[dict]]:
    path = pack / REGISTER
    header, rows = read_csv(path)
    return path, (header or COLS), rows


def save(path: Path, header: list[str], rows: list[dict]) -> None:
    with path.open("w", newline="", encoding="utf-8") as fh:
        w = csv.DictWriter(fh, fieldnames=header)
        w.writeheader()
        for r in rows:
            w.writerow({k: r.get(k, "") for k in header})


def do_request(rep: Report, pack: Path, args) -> int:
    path, header, rows = load(pack)
    if args.action not in ACTIONS:
        die(f"--action '{args.action}'; allowed: {', '.join(sorted(ACTIONS))}")
    for need, flag in [(args.target, "--target"), (args.why, "--why"),
                       (args.review, "--review")]:
        if not need:
            die(f"{flag} is required. A gate entry that does not say what the "
                f"human is approving, or why, is not a gate.")
    top = 0
    for r in rows:
        m = APR_RE.match((r.get("approval_id") or "").strip())
        if m:
            top = max(top, int(r["approval_id"].split("-")[1]))
    apr = f"APR-{top + 1:03d}"
    irrev = args.irreversibility or ("irreversible" if args.action in ALWAYS_IRREVERSIBLE
                                     else "hard-to-reverse")
    rows.append({
        "approval_id": apr, "action_type": args.action,
        "target_description": args.target, "target_path": args.path or "",
        "requested_by": args.by, "requested_date": date.today().isoformat(),
        "why_needed": args.why, "irreversibility": irrev,
        "what_human_must_review": args.review, "human_decision": "pending",
        "decided_by": "", "decided_date": "", "conditions": "",
        "executed": "no", "executed_date": "",
        "notes": args.notes or "",
    })
    save(path, header, rows)
    rep.note(f"recorded {apr} — {args.action}: {args.target}")
    rep.note(f"status: PENDING. No script executes this action. A named human "
             f"reviews {args.path or 'the target'}, sets human_decision and "
             f"decided_by in {REGISTER}, and then performs the action themselves.")
    return 0


def do_check(rep: Report, pack: Path, apr: str) -> int:
    _, _, rows = load(pack)
    row = next((r for r in rows if (r.get("approval_id") or "").strip() == apr), None)
    if row is None:
        rep.error(f"{apr} is not in {REGISTER}. An action with no gate entry is "
                  f"not an action that may be taken.")
        return 1
    dec = (row.get("human_decision") or "").strip()
    by = (row.get("decided_by") or "").strip()
    if dec in {"approved", "approved-with-conditions"} and by:
        rep.note(f"{apr}: {dec} by {by} on {row.get('decided_date') or 'UNDATED'}")
        if dec == "approved-with-conditions":
            rep.note(f"conditions that must hold: {row.get('conditions') or 'NONE RECORDED'}")
            if not (row.get("conditions") or "").strip():
                rep.error(f"{apr}: approved-with-conditions but conditions is empty")
                return 1
        rep.note(f"{by} may now perform this action. The system does not.")
        return 0
    rep.error(f"{apr}: human_decision='{dec or 'pending'}', decided_by="
              f"'{by or 'nobody'}'. NOT CLEARED. Do not file, serve, send, "
              f"delete, rename or move.")
    return 1


def do_validate(rep: Report, pack: Path) -> None:
    path, header, rows = load(pack)
    if not header:
        rep.error(f"missing or empty: {REGISTER}")
        return
    require_columns(rep, path, header, COLS)
    seen: set[str] = set()
    pending = 0
    for i, r in enumerate(rows, start=2):
        g = lambda c: (r.get(c) or "").strip()  # noqa: E731
        apr = g("approval_id")
        if not APR_RE.match(apr):
            rep.error(f"{path.name} line {i}: approval_id '{apr}' is not APR-###")
        elif apr in seen:
            rep.error(f"{path.name} line {i}: duplicate approval_id {apr}")
        seen.add(apr)

        act, dec = g("action_type"), g("human_decision")
        if act not in ACTIONS:
            rep.error(f"{path.name} line {i} [{apr}]: action_type '{act}'; allowed: "
                      f"{', '.join(sorted(ACTIONS))}")
        if dec not in DECISIONS:
            rep.error(f"{path.name} line {i} [{apr}]: human_decision '{dec}'; allowed: "
                      f"{', '.join(sorted(DECISIONS))}")
        if dec == "pending":
            pending += 1
        if g("irreversibility") not in IRREVERSIBILITY:
            rep.error(f"{path.name} line {i} [{apr}]: irreversibility "
                      f"'{g('irreversibility')}'; allowed: "
                      f"{', '.join(sorted(IRREVERSIBILITY))}")
        if act in ALWAYS_IRREVERSIBLE and g("irreversibility") == "reversible":
            rep.error(f"{path.name} line {i} [{apr}]: action_type '{act}' recorded as "
                      f"reversible. Filing, serving, sending, publishing and deleting "
                      f"are not reversible; recording otherwise invites a human to "
                      f"approve on a false premise.")
        for col in ("target_description", "why_needed", "what_human_must_review"):
            if not g(col):
                rep.error(f"{path.name} line {i} [{apr}]: {col} is empty")

        # --- the decision itself ---
        if dec in {"approved", "approved-with-conditions", "denied"}:
            if not g("decided_by"):
                rep.error(f"{path.name} line {i} [{apr}]: human_decision='{dec}' with "
                          f"decided_by empty. A decision is not made until a named "
                          f"human makes it.")
            if not DATE_RE.match(g("decided_date") or ""):
                rep.error(f"{path.name} line {i} [{apr}]: human_decision='{dec}' with "
                          f"decided_date '{g('decided_date')}' not YYYY-MM-DD")
        if dec == "approved-with-conditions" and not g("conditions"):
            rep.error(f"{path.name} line {i} [{apr}]: approved-with-conditions with "
                      f"no conditions recorded")
        if g("executed") not in YN:
            rep.error(f"{path.name} line {i} [{apr}]: executed '{g('executed')}'; "
                      f"allowed: yes, no")
        if g("executed") == "yes":
            if dec not in {"approved", "approved-with-conditions"}:
                rep.error(f"{path.name} line {i} [{apr}]: EXECUTED without approval "
                          f"(human_decision='{dec}'). This is the failure the gate "
                          f"exists to prevent.")
            if not DATE_RE.match(g("executed_date") or ""):
                rep.error(f"{path.name} line {i} [{apr}]: executed=yes with "
                          f"executed_date '{g('executed_date')}' not YYYY-MM-DD")
            if g("decided_date") and DATE_RE.match(g("executed_date") or "") \
                    and g("executed_date") < g("decided_date"):
                rep.error(f"{path.name} line {i} [{apr}]: executed on "
                          f"{g('executed_date')}, before it was decided on "
                          f"{g('decided_date')}")
        if dec == "denied" and g("executed") == "yes":
            rep.error(f"{path.name} line {i} [{apr}]: a denied action is recorded as "
                      f"executed")
    rep.note(f"{len(rows)} approval request(s); {pending} pending a human decision")


def do_list(rep: Report, pack: Path) -> None:
    _, _, rows = load(pack)
    pend = [r for r in rows if (r.get("human_decision") or "").strip() in ("", "pending")]
    if not pend:
        rep.note("nothing is waiting on a human approval")
    for r in pend:
        rep.note(f"{r.get('approval_id')}  {r.get('action_type'):<7}  "
                 f"{r.get('target_description')}")
        rep.note(f"      review: {r.get('what_human_must_review')}")


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__,
                                 formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("pack")
    ap.add_argument("--request", action="store_true")
    ap.add_argument("--check", default=None, metavar="APR-###")
    ap.add_argument("--list", dest="do_list", action="store_true")
    ap.add_argument("--validate", action="store_true")
    ap.add_argument("--action", default="")
    ap.add_argument("--target", default="")
    ap.add_argument("--path", default="")
    ap.add_argument("--why", default="")
    ap.add_argument("--review", default="")
    ap.add_argument("--irreversibility", default="")
    ap.add_argument("--by", default="litigation-matter-orchestrator")
    ap.add_argument("--notes", default="")
    args = ap.parse_args()

    pack = Path(args.pack).resolve()
    if not pack.is_dir():
        die(f"not a directory: {pack}")
    rep = Report(f"approval gate: {pack.name}")

    rc = 0
    if args.request:
        rc = do_request(rep, pack, args)
    elif args.check:
        rc = do_check(rep, pack, args.check)
    elif args.do_list:
        do_list(rep, pack)
    elif args.validate:
        do_validate(rep, pack)
    else:
        die("give one of --request, --check, --list, --validate")
    return rep.emit() or rc


if __name__ == "__main__":
    raise SystemExit(main())
