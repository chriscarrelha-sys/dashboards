#!/usr/bin/env bash
# Create a new matter from the template.
#   ./bootstrap_case.sh smith-v-acme
set -euo pipefail

SLUG="${1:-}"
if [[ -z "$SLUG" ]]; then
  echo "usage: $0 <case-slug>" >&2; exit 2
fi
if [[ ! "$SLUG" =~ ^[a-z0-9][a-z0-9-]*$ ]]; then
  echo "error: slug must be lowercase letters, digits, and hyphens" >&2; exit 2
fi

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SRC="$ROOT/cases/_template"
DST="$ROOT/cases/$SLUG"

[[ -d "$SRC" ]] || { echo "error: template missing at $SRC" >&2; exit 1; }
[[ -e "$DST" ]] && { echo "error: $DST already exists — refusing to overwrite" >&2; exit 1; }

cp -R "$SRC" "$DST"
sed -i "s/<Case Name>/$SLUG/" "$DST/CASE.md" 2>/dev/null || true

echo "Created cases/$SLUG"
echo
echo "Next:"
echo "  1. Fill in cases/$SLUG/CASE.md — caption, parties, record source."
echo "  2. Put documents where INTAKE_MANIFEST.md says, named"
echo "     'YYYY-MM-DD - Doc NN - Description.pdf'."
echo "  3. Run record-custodian, then docket-deadline-clerk."
echo "  4. Nothing may be drafted before those two have run."
