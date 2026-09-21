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
SKILLS=(litigation-matter-orchestrator legal-research-paralegal
        evidence-chronology-paralegal docket-deadline-paralegal)
VALIDATORS=(common.py validate_matter_pack.py validate_handoff.py
            validate_registers.py validate_crossrefs.py validate_skill.py)

echo "== syncing shared resources into each skill =="
for s in "${SKILLS[@]}"; do
  mkdir -p "$HERE/skills/$s/scripts" "$HERE/skills/$s/assets"
  for v in "${VALIDATORS[@]}"; do
    cp "$HERE/tools/$v" "$HERE/skills/$s/scripts/$v"
  done
  rm -rf "$HERE/skills/$s/assets/matter-pack-template"
  cp -r "$HERE/matter-pack-template" "$HERE/skills/$s/assets/matter-pack-template"
  # a freshly copied template carries no integrity baseline
  rm -f "$HERE/skills/$s/assets/matter-pack-template/03-sources/raw/.integrity.json"
  echo "  $s"
done

echo "== validating skill structure =="
python3 "$HERE/tools/validate_skill.py" "${SKILLS[@]/#/$HERE/skills/}"

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
