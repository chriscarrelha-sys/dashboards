#!/bin/bash
# Make every PDF in the vault text-searchable, in place, skipping ones that
# already have a text layer. Safe to interrupt and re-run.
set -uo pipefail
VAULT="${1:?usage: ocr-pass.sh /path/to/vault}"
LOG=~/Documents/docorg/reports/ocr.log
mkdir -p "$(dirname "$LOG")"
echo "OCR pass started $(date)" | tee -a "$LOG"
find "$VAULT" -type f -iname '*.pdf' -print0 |
while IFS= read -r -d '' f; do
  # Skip cloud placeholders: st_blocks == 0 means bytes are not on this Mac.
  [ "$(stat -f %b "$f")" -eq 0 ] && { echo "STUB  $f" >>"$LOG"; continue; }
  if ocrmypdf --skip-text --quiet --output-type pdf "$f" "$f" 2>>"$LOG"; then
    echo "OK    $f" >>"$LOG"
  else
    echo "FAIL  $f" >>"$LOG"
  fi
done
echo "OCR pass finished $(date). Log: $LOG" | tee -a "$LOG"
grep -c '^OK' "$LOG" | xargs echo "  PDFs processed:"
