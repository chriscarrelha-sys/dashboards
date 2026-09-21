#!/usr/bin/env python3
"""One page that says what is due, what is waiting on a human, and what is broken.

The registers already hold everything. What they do not do is answer the only
question anybody actually asks on a Monday morning: what has to happen now.
This script reads the pack and answers that, in a fixed order — deadlines,
pending decisions, unfinished work, critical risks, next actions — so the same
page can be read the same way every week.

It computes nothing it cannot derive. In particular it never converts a rule
into a date: a deadline whose date_status is `estimated` is reported as
NOT-COMPUTABLE with the inputs that are missing, exactly as the register holds
it. A command centre that invents a date is worse than no command centre.

Usage:
    command_center.py <matter-pack-dir> [--out 00-control/command-center.md]
                      [--as-of YYYY-MM-DD] [--quiet]

Exit codes: 0 always for a readable pack (this reports, it does not gate);
1 if the pack cannot be read; 2 usage error.
"""
from __future__ import annotations

import argparse
import sys
from datetime import date, datetime
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from common import die, read_csv  # noqa: E402

try:
    import yaml
except ImportError:  # pragma: no cover
    die("PyYAML is required: pip install pyyaml")

NOT_COMPUTABLE = "NOT-COMPUTABLE"


def g(row: dict, *names: str) -> str:
    for n in names:
        v = (row.get(n) or "").strip()
        if v:
            return v
    return ""


def parse_date(s: str):
    try:
        return datetime.strptime(s.strip(), "%Y-%m-%d").date()
    except Exception:
        return None


def blank_column_warning(rows: list[dict], column: str, label: str) -> str | None:
    """Return a warning when a column this page depends on is absent everywhere.

    An em-dash in every row of a column means one of two things, and they need
    different responses: the register is genuinely empty, or this script asked
    for a column name the register does not use. Distinguish them by whether
    the column exists in the header at all.
    """
    if not rows:
        return None
    if column not in rows[0]:
        return (f"`{column}` is not a column in this register, so **{label}** "
                f"below is blank for a reason that has nothing to do with the "
                f"matter. Fix the column name in command_center.py.")
    return None


def section(out: list[str], title: str) -> None:
    out.append("")
    out.append(f"## {title}")
    out.append("")


def table(out: list[str], header: list[str], rows: list[list[str]]) -> None:
    if not rows:
        out.append("_Nothing in this category._")
        return
    out.append("| " + " | ".join(header) + " |")
    out.append("|" + "|".join("---" for _ in header) + "|")
    for r in rows:
        out.append("| " + " | ".join(str(c).replace("|", "\\|") for c in r) + " |")


def build(pack: Path, as_of: date) -> tuple[str, dict]:
    ctl = {}
    ctl_path = pack / "00-control/matter-control.yaml"
    if ctl_path.is_file():
        try:
            ctl = yaml.safe_load(ctl_path.read_text(encoding="utf-8")) or {}
        except Exception:
            ctl = {}

    rd = lambda p: read_csv(pack / p)[1]  # noqa: E731
    deadlines = rd("08-deadlines/deadline-register.csv")
    decisions = rd("11-decisions/attorney-decision-log.csv")
    approvals = rd("11-decisions/approval-requests.csv")
    tasks = rd("00-control/task-board.csv")
    issues = rd("06-issues/issue-register.csv")
    gaps = rd("07-evidence/missing-evidence.csv")
    attacks = rd("07-evidence/attack-surface.csv")
    contras = rd("07-evidence/contradiction-register.csv")
    prod = rd("12-workproduct/production-log.csv")
    sources = rd("03-sources/source-manifest.csv")

    court = (ctl.get("court") or {})
    name = ctl.get("matter_name") or pack.name
    out: list[str] = []
    out.append(f"# Matter Command Center — {name}")
    out.append("")
    out.append(f"**As of** {as_of.isoformat()}  ")
    out.append(f"**Court** {court.get('name', 'UNVERIFIED')}  ")
    out.append(f"**Case No.** {court.get('case_number', 'UNVERIFIED')}  ")
    judge = court.get("presiding_judge", "UNVERIFIED")
    mag = court.get("referred_magistrate") or court.get("magistrate_judge") or ""
    if court.get("division"):
        out[-1] = out[-1].rstrip("  ")
        out.append(f"**Division** {court['division']}  ")
    out.append(f"**Bench** {judge}" + (f"; Magistrate Judge {mag}" if mag else "") + "  ")
    posture = (ctl.get("procedural_posture") or {})
    if posture.get("summary"):
        out.append("")
        out.append(f"> {str(posture['summary']).strip()}")
        out.append(f">")
        out.append(f"> _posture as of {posture.get('as_of', 'UNDATED')}_")

    # ------------------------------------------------------------ deadlines --
    section(out, "1 · Deadlines")
    rows, uncomputable = [], []
    for d in deadlines:
        status = g(d, "date_status")
        raw = g(d, "deadline_date", "date")
        dt = parse_date(raw)
        if status == "estimated" or raw == NOT_COMPUTABLE or dt is None:
            uncomputable.append([
                g(d, "deadline_id", "id"), g(d, "description", "event") or "—",
                g(d, "governing_rule") or "—",
                g(d, "missing_inputs", "notes") or "inputs not recorded",
            ])
            continue
        days = (dt - as_of).days
        flag = ("**OVERDUE**" if days < 0 else "**≤7 DAYS**" if days <= 7
                else "≤30 days" if days <= 30 else "")
        rows.append([dt.isoformat(), f"{days:+d}", g(d, "deadline_id", "id"),
                     g(d, "description", "event") or "—",
                     g(d, "governing_rule") or "—",
                     g(d, "responsible_party", "owner") or "—", flag])
    rows.sort(key=lambda r: r[0])
    table(out, ["Date", "Days", "ID", "What", "Rule", "Owner", "Flag"], rows)
    if uncomputable:
        out.append("")
        out.append("**Not computable from the record — these require a human to "
                   "supply the missing input before any date is relied on:**")
        out.append("")
        table(out, ["ID", "What", "Rule", "What is missing"], uncomputable)

    # --------------------------------------------- decisions and approvals --
    section(out, "2 · Waiting on a human")
    pend_dec = [d for d in decisions
                if not g(d, "decision_made") or not g(d, "decided_by")]
    table(out, ["ID", "Decision required", "Options", "Raised by", "Blocks"],
          [[g(d, "decision_id", "id"),
            (g(d, "decision_required", "question", "decision_point") or "—")[:96],
            (g(d, "options_presented") or "—")[:60],
            g(d, "presented_by", "raised_by", "raised_in") or "—",
            (g(d, "authorizes_action", "notes") or "—")[:52]] for d in pend_dec])

    pend_apr = [a for a in approvals if g(a, "human_decision") in ("", "pending")]
    if approvals:
        out.append("")
        out.append("**Approval gate — nothing below may be filed, served, sent, "
                   "deleted, renamed or moved until a named human approves it:**")
        out.append("")
        table(out, ["APR", "Action", "Target", "What the human must review"],
              [[g(a, "approval_id"), g(a, "action_type"),
                g(a, "target_description")[:60],
                g(a, "what_human_must_review")[:80]] for a in pend_apr])

    # ------------------------------------------------------ unfinished work --
    section(out, "3 · Unfinished work")
    open_tasks = [t for t in tasks if g(t, "status") not in ("complete", "completed",
                                                             "closed", "cancelled")]
    table(out, ["Task", "Specialist", "Wave", "Status", "Blocked by", "Supports"],
          [[f"{g(t, 'task_id')} {g(t, 'title')[:44]}", g(t, "specialist") or "—",
            g(t, "wave") or "—", g(t, "status") or "—",
            g(t, "depends_on") or "—", g(t, "decision_supported")[:40] or "—"]
           for t in open_tasks])

    open_issues = [i for i in issues if g(i, "status") in ("open", "unresolved", "")]
    if open_issues:
        out.append("")
        out.append(f"**{len(open_issues)} open issue(s) in the issue register.** "
                   f"Highest-ranked:")
        out.append("")
        ranked = sorted(open_issues,
                        key=lambda i: (g(i, "priority", "rank") or "9", g(i, "issue_id")))[:8]
        table(out, ["ID", "Question", "Why it matters", "Owner"],
              [[g(i, "issue_id", "id"),
                g(i, "question", "issue", "description")[:76],
                (g(i, "why_it_matters") or "—")[:60],
                g(i, "owner_skill", "owner", "specialist") or "—"]
               for i in ranked])

    # ------------------------------------------------------- critical risks --
    section(out, "4 · Critical risks")
    top_attacks = sorted(
        [a for a in attacks if (g(a, "rank") or "99").isdigit()],
        key=lambda a: int(g(a, "rank") or 99))[:6]
    table(out, ["Rank", "Seat", "Attack", "Answer strength", "Fix"],
          [[g(a, "rank"), g(a, "seat")[:22] or "—",
            g(a, "attack_argument", "attack", "attack_summary", "description")[:74],
            g(a, "answer_strength", "survives", "assessment")[:22] or "—",
            g(a, "corrective_action_id") or "—"] for a in top_attacks])

    hot_contra = [c for c in contras
                  if g(c, "materiality", "severity").lower()
                  in ("high", "dispositive", "material", "significant")]
    if hot_contra:
        out.append("")
        out.append(f"**{len(hot_contra)} material contradiction(s) on the record:**")
        out.append("")
        table(out, ["ID", "Subject", "Nature of the conflict", "Sources"],
              [[g(c, "contradiction_id", "id"), g(c, "subject", "description")[:44],
                g(c, "nature_of_conflict", "contradiction", "summary")[:64],
                f"{g(c, 'source_id_a')} v {g(c, 'source_id_b')}"[:22]]
               for c in hot_contra[:6]])

    p1_gaps = [x for x in gaps if (g(x, "priority") or "9").startswith("1")]
    if p1_gaps:
        out.append("")
        out.append(f"**{len(p1_gaps)} priority-1 evidentiary gap(s)** "
                   f"(of {len(gaps)} total):")
        out.append("")
        table(out, ["GAP", "What is missing", "What it would prove", "Who has it"],
              [[g(x, "gap_id", "id"),
                g(x, "missing_item", "what_is_missing", "description")[:56],
                g(x, "what_it_would_prove", "why_it_matters")[:56] or "—",
                g(x, "likely_custodian", "custodian", "held_by")[:26] or "—"]
               for x in p1_gaps[:8]])

    # ----------------------------------------------------------- next steps --
    section(out, "5 · Next actions")
    actions: list[str] = []
    overdue = [r for r in rows if r[6] == "**OVERDUE**"]
    soon = [r for r in rows if r[6] == "**≤7 DAYS**"]
    if overdue:
        actions.append(f"**Verify {len(overdue)} apparently-overdue deadline(s) "
                       f"against the live docket before anything else.** A date in "
                       f"this register is only as current as the last docket check.")
    if soon:
        actions.append(f"{len(soon)} deadline(s) fall within seven days: "
                       f"{', '.join(r[2] for r in soon)}.")
    if uncomputable:
        actions.append(f"{len(uncomputable)} deadline(s) cannot be computed from the "
                       f"record. Supply the missing trigger inputs or confirm the "
                       f"date from the docket.")
    if pend_apr:
        actions.append(f"{len(pend_apr)} action(s) are held at the approval gate "
                       f"({', '.join(g(a, 'approval_id') for a in pend_apr)}).")
    if pend_dec:
        actions.append(f"{len(pend_dec)} attorney decision(s) are unanswered; "
                       f"dependent work cannot close until they are.")
    blocked = [t for t in open_tasks if g(t, "depends_on")]
    if blocked:
        actions.append(f"{len(blocked)} task(s) are waiting on a dependency.")
    draft_docs = [p for p in prod if g(p, "status") == "draft"]
    failed_qc = [p for p in prod if g(p, "qc_status") == "fail"]
    if failed_qc:
        actions.append(f"{len(failed_qc)} produced document(s) failed QC: "
                       f"{', '.join(g(p, 'doc_id') for p in failed_qc)}.")
    if draft_docs:
        actions.append(f"{len(draft_docs)} document(s) sit in drafts/ awaiting "
                       f"attorney review. None has been filed, served or sent.")
    unver = [s for s in sources if g(s, "authenticity_status") in ("UNVERIFIED", "")]
    if unver:
        actions.append(f"{len(unver)} of {len(sources)} source(s) carry "
                       f"authenticity_status UNVERIFIED — every finding resting on "
                       f"them inherits that ceiling.")
    if not actions:
        actions.append("Nothing is outstanding in the registers. Re-check the "
                       "docket before treating that as true.")
    for a in actions:
        out.append(f"- {a}")

    mismatches = [w for w in (
        blank_column_warning(decisions, "decision_required", "Decision required"),
        blank_column_warning(attacks, "attack_argument", "Attack"),
        blank_column_warning(issues, "question", "Question"),
        blank_column_warning(gaps, "missing_item", "What is missing"),
    ) if w]
    if mismatches:
        out.append("")
        out.append("**This page could not read part of the pack:**")
        out.append("")
        for w in mismatches:
            out.append(f"- {w}")

    section(out, "Provenance")
    lv = ctl.get("last_verified") or {}
    out.append(f"- Registers last verified {lv.get('date', 'UNDATED')} "
               f"by {lv.get('by', 'UNRECORDED')}.")
    out.append(f"- {len(sources)} source(s) in the manifest; "
               f"{len(deadlines)} deadline(s); {len(issues)} issue(s); "
               f"{len(gaps)} evidentiary gap(s); {len(prod)} produced document(s).")
    out.append("- This page is generated from the registers. It computes no "
               "deadline and confirms no docket entry; both require a human "
               "against the live record.")
    out.append("")

    stats = {"deadlines": len(rows), "uncomputable": len(uncomputable),
             "pending_decisions": len(pend_dec), "pending_approvals": len(pend_apr),
             "open_tasks": len(open_tasks), "failed_qc": len(failed_qc)}
    return "\n".join(out), stats


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__,
                                 formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("pack")
    ap.add_argument("--out", default="00-control/command-center.md")
    ap.add_argument("--as-of", default=date.today().isoformat())
    ap.add_argument("--quiet", action="store_true")
    args = ap.parse_args()

    pack = Path(args.pack).resolve()
    if not pack.is_dir():
        die(f"not a directory: {pack}")
    as_of = parse_date(args.as_of) or date.today()

    text, stats = build(pack, as_of)
    out = pack / args.out
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(text + "\n", encoding="utf-8")
    if not args.quiet:
        print(text)
    print(f"\n[command-center] written to {out.relative_to(pack)}  "
          f"({stats['deadlines']} dated deadline(s), "
          f"{stats['uncomputable']} not computable, "
          f"{stats['pending_decisions']} decision(s) pending, "
          f"{stats['pending_approvals']} approval(s) pending, "
          f"{stats['open_tasks']} open task(s))")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
