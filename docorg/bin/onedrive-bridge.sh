#!/bin/bash
# One-way projection: Google Drive vault  ->  OneDrive, for the narrow set of
# folders that OneDrive-only apps need. Drive stays authoritative; OneDrive is
# a disposable rendering of it. Never edit files on the OneDrive side.
set -euo pipefail
SRC="$HOME/Library/CloudStorage/GoogleDrive-chriscarrelha@gmail.com/My Drive/10_ACTIVE"
DST="$HOME/Library/CloudStorage/OneDrive-Personal/10_ACTIVE"
LOG=~/Documents/docorg/reports/bridge.log
mkdir -p "$DST" "$(dirname "$LOG")"
rclone sync "$SRC" "$DST" \
  --create-empty-src-dirs --track-renames --checksum \
  --exclude '.docorg-quarantine/**' --exclude '.DS_Store' \
  --log-file "$LOG" --log-level INFO "$@"
echo "bridge complete $(date)" >>"$LOG"
