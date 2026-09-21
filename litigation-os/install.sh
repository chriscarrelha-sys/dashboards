#!/usr/bin/env bash
# Build and install the Litigation OS skills.
#
# The validators live once, in tools/. Each skill is meant to be self-contained
# so it still works when copied somewhere with no repo around it, so this script
# syncs tools/ into every skill's scripts/ and the matter-pack template into
# every skill's assets/, then copies the finished skills into the personal
# skills directory. Edit tools/ and re-run; never edit a skill's scripts/ copy.
#
# Usage:  ./install.sh [--build-only]   (--build-only skips the install step)
set -euo pipefail

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DEST="${CLAUDE_SKILLS_DIR:-$HOME/.claude/skills}"
# Phase 1 + Phase 2 + Phase 3. The authoritative list is standards/specialists.yaml; this
# array must match it, and the build fails below if it does not.
SKILLS=(litigation-matter-orchestrator legal-research-paralegal
        evidence-chronology-paralegal docket-deadline-paralegal
        pleading-amendment-analyst loan-accounting-analyst
        discovery-planning-analyst securitization-ownership-analyst
        adversarial-redteam-analyst
        matter-operations-manager document-production-qc)
VALIDATORS=(common.py validate_matter_pack.py validate_handoff.py
            validate_registers.py validate_crossrefs.py validate_skill.py)
# Phase 3 operating-layer scripts. Synced only into the skills that document
# them, so a skill's scripts/ matches what its SKILL.md tells you to run.
OPS_SCRIPTS=(new_matter.py import_sources.py ingest_docket.py verify_citations.py
             approval_gate.py command_center.py validate_access_map.py
             audit_accuracy.py)
DOC_SCRIPTS=(produce_document.py qc_document.py approval_gate.py command_center.py)
# A skill may only tell you to run a script that ships inside it, so a Phase 3
# script referenced by a Phase 1 skill has to be synced there too.
ORCH_SCRIPTS=(command_center.py)
RESEARCH_SCRIPTS=(verify_citations.py)

echo "== checking the skill list against the registry =="
python3 - "$HERE" "${SKILLS[@]}" <<'PY'
import sys, pathlib, yaml
here, *skills = sys.argv[1:]
reg = yaml.safe_load((pathlib.Path(here) / "standards" / "specialists.yaml").read_text())
named = {s["name"] for s in reg["specialists"]}
have = set(skills)
missing, extra = named - have, have - named
ok = True
for n in sorted(missing):
    print(f"  ERROR: {n} is in specialists.yaml but not in install.sh"); ok = False
for n in sorted(extra):
    print(f"  ERROR: {n} is in install.sh but not in specialists.yaml"); ok = False
for n in sorted(named):
    if not (pathlib.Path(here) / "skills" / n).is_dir():
        print(f"  ERROR: {n} is registered but skills/{n}/ does not exist"); ok = False
print(f"  {len(named)} specialist(s) registered and present" if ok else "")
sys.exit(0 if ok else 1)
PY

echo "== syncing shared resources into each skill =="
for s in "${SKILLS[@]}"; do
  mkdir -p "$HERE/skills/$s/scripts" "$HERE/skills/$s/assets"
  for v in "${VALIDATORS[@]}"; do
    cp "$HERE/tools/$v" "$HERE/skills/$s/scripts/$v"
  done
  cp "$HERE/standards/specialists.yaml" "$HERE/skills/$s/scripts/specialists.yaml"
  if [[ "$s" == "litigation-matter-orchestrator" ]]; then
    mkdir -p "$HERE/skills/$s/references"
    cp "$HERE/standards/specialists.yaml" "$HERE/skills/$s/references/specialists.yaml"
  fi
  cp "$HERE/standards/handoff-standard.md" "$HERE/skills/$s/references/handoff-standard.md"
  if [[ "$s" == "matter-operations-manager" ]]; then
    for v in "${OPS_SCRIPTS[@]}"; do cp "$HERE/tools/$v" "$HERE/skills/$s/scripts/$v"; done
  fi
  if [[ "$s" == "document-production-qc" ]]; then
    for v in "${DOC_SCRIPTS[@]}"; do cp "$HERE/tools/$v" "$HERE/skills/$s/scripts/$v"; done
  fi
  if [[ "$s" == "litigation-matter-orchestrator" ]]; then
    for v in "${ORCH_SCRIPTS[@]}"; do cp "$HERE/tools/$v" "$HERE/skills/$s/scripts/$v"; done
  fi
  if [[ "$s" == "legal-research-paralegal" ]]; then
    for v in "${RESEARCH_SCRIPTS[@]}"; do cp "$HERE/tools/$v" "$HERE/skills/$s/scripts/$v"; done
  fi
  rm -rf "$HERE/skills/$s/assets/matter-pack-template"
  cp -r "$HERE/matter-pack-template" "$HERE/skills/$s/assets/matter-pack-template"
  # a freshly copied template carries no integrity baseline
  rm -f "$HERE/skills/$s/assets/matter-pack-template/03-sources/raw/.integrity.json"
  echo "  $s"
done

echo "== validating skill structure =="
python3 "$HERE/tools/validate_skill.py" "${SKILLS[@]/#/$HERE/skills/}"

echo "== checking for stale repo paths in bundled resources =="
if grep -rn "litigation-os/tools\|litigation-os/matter-pack" "$HERE/skills/" 2>/dev/null; then
  echo "  ERROR: a bundled resource references a repo path that will not exist"
  echo "  in an installed skill. Use scripts/ and assets/ paths instead."
  exit 1
fi
echo "  none found"

echo "== scanning for stored credentials =="
# The rule is about the whole system, so the scan covers the template, every
# skill, and the shared tools — not just the access map it also validates.
python3 "$HERE/tools/validate_access_map.py" "$HERE/matter-pack-template" \
        --also "$HERE/skills" --also "$HERE/tools" --also "$HERE/standards"

echo "== validating the bundled template =="
python3 "$HERE/tools/validate_matter_pack.py" "$HERE/matter-pack-template" --template

if [[ "${1:-}" == "--build-only" ]]; then
  echo "build only; not installing"
  exit 0
fi

echo "== installing to $DEST =="
mkdir -p "$DEST"
for s in "${SKILLS[@]}"; do
  rm -rf "${DEST:?}/$s"
  cp -r "$HERE/skills/$s" "$DEST/$s"
  echo "  $DEST/$s"
done

echo "== verifying the installed copies =="
python3 "$HERE/tools/validate_skill.py" "${SKILLS[@]/#/$DEST/}"
echo "done."
