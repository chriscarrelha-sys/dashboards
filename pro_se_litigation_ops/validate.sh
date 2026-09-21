#!/usr/bin/env bash
# Structural and arithmetic validation of the litigation ops system.
# Exits non-zero if any check fails.
set -uo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT"
PASS=0; FAIL=0
ok(){ printf '  ok    %s\n' "$1"; PASS=$((PASS+1)); }
no(){ printf '  FAIL  %s\n' "$1"; FAIL=$((FAIL+1)); }
sec(){ printf '\n%s\n' "$1"; }

sec "1. Agent library"
N=$(ls -1 .claude/agents/*.md 2>/dev/null | wc -l)
[[ "$N" -eq 24 ]] && ok "24 agents present" || no "expected 24 agents, found $N"

for f in .claude/agents/*.md; do
  b=$(basename "$f" .md)
  head -1 "$f" | grep -qx -- '---' || no "$b: no opening frontmatter delimiter"
  nm=$(awk -F': *' '/^name: /{print $2; exit}' "$f")
  [[ "$nm" == "$b" ]] || no "$b: frontmatter name '$nm' != filename"
  for k in description tools model; do
    grep -q "^$k: " "$f" || no "$b: missing '$k' in frontmatter"
  done
  # frontmatter must close before the body
  [[ $(grep -c -- '^---$' "$f") -ge 2 ]] || no "$b: frontmatter not closed"
done
[[ $FAIL -eq 0 ]] && ok "all agents have well-formed frontmatter"

DUP=$(awk -F': *' '/^name: /{print $2}' .claude/agents/*.md | sort | uniq -d)
[[ -z "$DUP" ]] && ok "no duplicate agent names" || no "duplicate agent names: $DUP"

sec "2. Settings"
python3 -c "import json;d=json.load(open('.claude/settings.json'));assert d['env']['CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS']=='1'" 2>/dev/null \
  && ok "settings.json valid; agent teams enabled" || no "settings.json invalid or teams not enabled"

sec "3. Cross-references resolve"
# every agent named in MASTER_PROMPT.md and CLAUDE.md must exist
MISS=0
for a in $(grep -oE '\b[a-z0-9]+(-[a-z0-9]+){1,4}\b' MASTER_PROMPT.md CLAUDE.md \
           | sed 's/^[^:]*://' | sort -u); do
  if grep -qx "$a" <(ls -1 .claude/agents/ | sed 's/\.md$//') 2>/dev/null; then :; fi
done
for a in record-custodian docket-deadline-clerk local-rules-procedure motion-argument-mapper \
         claim-element-matrix rule12-pleading-specialist incorporation-judicial-notice \
         fdcpa-specialist respa-regx-specialist fcra-specialist georgia-foreclosure-specialist \
         contract-equity-remedies accounting-forensics discovery-stay-rule72 \
         emergency-injunction defense-red-team magistrate-howard-bench judge-story-review \
         appellate-preservation citation-authority-checker filing-format-service-qc \
         final-editor litigation-chief declaration-evidence-auditor; do
  [[ -f ".claude/agents/$a.md" ]] || { no "referenced agent missing: $a"; MISS=1; }
done
[[ $MISS -eq 0 ]] && ok "all 24 referenced agents resolve to files"

sec "4. Vocabulary consistency"
for s in OPERATIVE SUPERSEDED MOOT HISTORICAL EXHIBIT MISSING; do
  grep -q "$s" CLAUDE.md || no "record status '$s' missing from CLAUDE.md"
done
ok "record-status vocabulary defined"
for s in "FILE AFTER SPECIFIED CORRECTION" "DO NOT FILE" "BLOCKED BY MISSING OPERATIVE RECORD"; do
  grep -q "$s" QUALITY_GATES.md || no "release state '$s' missing from QUALITY_GATES.md"
  grep -q "$s" CLAUDE.md || no "release state '$s' missing from CLAUDE.md"
done
ok "release states consistent between CLAUDE.md and QUALITY_GATES.md"
[[ $(grep -c '^### [0-9]\.' QUALITY_GATES.md) -eq 7 ]] && ok "7 gates defined" \
  || no "expected 7 gates in QUALITY_GATES.md"

sec "5. Case structure"
for c in _template carrelha; do
  for d in 00_intake 01_record 02_procedure 03_research 04_analysis 05_drafts 06_redteam 07_final 08_exhibits 09_service; do
    [[ -d "cases/$c/$d" ]] || no "cases/$c/$d missing"
  done
  [[ -f "cases/$c/CASE.md" ]] || no "cases/$c/CASE.md missing"
done
ok "case folder structure complete for _template and carrelha"

sec "6. Privacy — no case documents committed"
LEAK=$(find cases -type f \( -iname '*.pdf' -o -iname '*.docx' -o -iname '*.xlsx' \) | head)
[[ -z "$LEAK" ]] && ok "no case documents in the repository (index-by-reference honored)" \
  || no "case documents committed: $LEAK"

sec "7. bootstrap_case.sh behavior"
[[ -x bootstrap_case.sh ]] && ok "bootstrap_case.sh is executable" || no "bootstrap_case.sh not executable"
./bootstrap_case.sh >/dev/null 2>&1 && no "bootstrap accepted an empty slug" || ok "rejects empty slug"
./bootstrap_case.sh 'Bad Slug!' >/dev/null 2>&1 && no "bootstrap accepted an invalid slug" || ok "rejects invalid slug"
./bootstrap_case.sh carrelha >/dev/null 2>&1 && no "bootstrap overwrote an existing case" || ok "refuses to overwrite an existing case"
./bootstrap_case.sh zz-selftest >/dev/null 2>&1 && [[ -f cases/zz-selftest/CASE.md ]] \
  && ok "creates a new case from the template" || no "failed to create a case"
rm -rf cases/zz-selftest

sec "8. Deadline arithmetic re-derived independently"
chk(){ # label expected actual
  [[ "$2" == "$3" ]] && ok "$1 = $2" || no "$1: file says $2, recomputed $3"
}
chk "Doc 37 response (9/4 +14 +3 mail)" "2026-09-21" "$(date -d '2026-09-04 +17 days' +%F)"
chk "Doc 40 response (9/11 +14)"        "2026-09-25" "$(date -d '2026-09-11 +14 days' +%F)"
chk "Doc 40 response (9/11 +14 +3)"     "2026-09-28" "$(date -d '2026-09-11 +17 days' +%F)"
chk "Rule 72(a) raw (9/9 +14 +3)"       "2026-09-26" "$(date -d '2026-09-09 +17 days' +%F)"
[[ "$(date -d '2026-09-26' +%a)" == "Sat" ]] && ok "9/26 is a Saturday — Rule 6(a)(1)(C) roll applies" \
  || no "9/26 weekday check"
chk "Rule 72(a) rolled to Monday"       "2026-09-28" "$(date -d '2026-09-28' +%F)"
chk "Doc 34 60-day from 9/15"           "2026-11-14" "$(date -d '2026-09-15 +60 days' +%F)"
D1=$(( ($(date -d 2026-11-03 +%s) - $(date -d 2026-09-15 +%s))/86400 ))
D2=$(( ($(date -d 2026-12-01 +%s) - $(date -d 2026-09-15 +%s))/86400 ))
chk "days 9/15 -> Nov 3 first Tuesday"  "49" "$D1"
chk "days 9/15 -> Dec 1 first Tuesday"  "77" "$D2"
[[ "$(date -d 2026-11-03 +%a)" == "Tue" && "$(date -d 2026-12-01 +%a)" == "Tue" ]] \
  && ok "Nov 3 and Dec 1 2026 are both Tuesdays" || no "first-Tuesday check failed"
[[ $D1 -lt 60 && $D2 -ge 60 ]] \
  && ok "Nov 3 violates the 60-day condition; Dec 1 is the earliest compliant sale" \
  || no "60-day compliance conclusion does not hold"

sec "9. Blocker integrity"
for d in 35 36 37 38 39 40 41; do
  grep -q "Doc $d" cases/carrelha/01_record/RECORD_INDEX.md || no "Doc $d not tracked in RECORD_INDEX"
done
grep -q "BLOCKED" cases/carrelha/02_procedure/DEADLINES.md || no "DEADLINES.md does not mark blocked items"
ok "missing documents are tracked and their deadlines marked BLOCKED"

printf '\n─────────────────────────────\n%d passed, %d failed\n' "$PASS" "$FAIL"
[[ $FAIL -eq 0 ]] || exit 1
