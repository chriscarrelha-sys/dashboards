#!/bin/bash
# docorg run-all - the whole pipeline in one command.
#   bash run-all.sh            interactive (pauses before anything moves)
#   bash run-all.sh --yes      no prompts, run it all
#   bash run-all.sh --dry-run  report only, move nothing
# Written for macOS's stock bash 3.2.
set -uo pipefail

YES=0; DRY=0
for arg in "$@"; do
  case "$arg" in
    --yes|-y) YES=1 ;;
    --dry-run|-n) DRY=1 ;;
    *) echo "unknown option: $arg"; exit 2 ;;
  esac
done

HERE="$(cd "$(dirname "$0")" && pwd)"
DOCORG="python3 $HERE/docorg.py"
DATA="$HOME/docorg-data"
REP="$DATA/reports"
B=$'\033[1m'; G=$'\033[32m'; Y=$'\033[33m'; R=$'\033[31m'; N=$'\033[0m'

say()  { printf '\n%s==> %s%s\n' "$B" "$1" "$N"; }
warn() { printf '%s !  %s%s\n' "$Y" "$1" "$N"; }
bad()  { printf '%s !! %s%s\n' "$R" "$1" "$N"; }
ok()   { printf '%s ok %s%s\n' "$G" "$1" "$N"; }
ask() {   # ask "question" -> 0 = yes
  [ "$DRY" = 1 ] && { warn "dry run - skipping: $1"; return 1; }
  [ "$YES" = 1 ] && return 0
  printf '\n%s%s [y/N] %s' "$B" "$1" "$N"
  read -r a </dev/tty
  case "$a" in y|Y|yes|YES) return 0 ;; *) return 1 ;; esac
}

mkdir -p "$REP"

# ---------------------------------------------------------------- 1. deps
say "Step 1/8  Checking tools"
if ! command -v brew >/dev/null; then
  bad "Homebrew not installed. Get it from https://brew.sh then re-run."; exit 1
fi
MISSING=""
for t in pdftotext ocrmypdf rclone; do
  command -v "$t" >/dev/null || MISSING="$MISSING $t"
done
if [ -n "$MISSING" ]; then
  say "Installing:$MISSING  (a few minutes, one time)"
  brew install poppler ocrmypdf rclone
fi
for t in python3 pdftotext ocrmypdf rclone; do
  if command -v "$t" >/dev/null; then ok "$t"; else warn "$t missing - related step will be skipped"; fi
done

# ------------------------------------------------------- 2. iCloud state
say "Step 2/8  Checking iCloud Desktop & Documents sync"
SYNC_ON=0
for d in "$HOME/Desktop" "$HOME/Documents"; do
  if [ -L "$d" ]; then SYNC_ON=1; warn "$(basename "$d") is a symlink into iCloud - sync is ON"; fi
done
if [ "$SYNC_ON" = 1 ]; then
  warn "Desktop/Documents are still a second cloud root."
  warn "Recommended: System Settings > your name > iCloud > Drive >"
  warn "  turn OFF 'Desktop & Documents Folders', then re-run this script."
  warn "Continuing anyway is safe - docorg keeps its state in ~/docorg-data,"
  warn "  which is outside ~/Documents and will not upload to iCloud."
  ask "Continue without turning it off?" || { echo "Stopped. Nothing changed."; exit 0; }
else
  ok "sync is OFF (or was never on)"
fi

# ------------------------------------------------------- 3. detect roots
say "Step 3/8  Finding your cloud folders"
ROOTS=""
add_root() {
  [ -d "$1" ] || return 0
  if [ -z "$ROOTS" ]; then ROOTS="$1"; else ROOTS="$ROOTS
$1"; fi
  ok "$1"
}
for d in "$HOME"/Library/CloudStorage/GoogleDrive-*/"My Drive"; do add_root "$d"; done
for d in "$HOME"/Library/CloudStorage/OneDrive*;              do add_root "$d"; done
add_root "$HOME/Library/Mobile Documents/com~apple~CloudDocs"
add_root "$HOME/Desktop"
add_root "$HOME/Documents"
add_root "$HOME/Downloads"
if [ -z "$ROOTS" ]; then bad "No cloud folders found. Are Drive/OneDrive installed?"; exit 1; fi

# feed roots to python as separate args, newline-delimited, spaces preserved
run_scan() { printf '%s' "$ROOTS" | tr '\n' '\0' | xargs -0 $DOCORG scan; }

# ------------------------------------------------------------- 4. scan
say "Step 4/8  Inventorying files (metadata only - downloads nothing)"
run_scan || { bad "scan failed"; exit 1; }

# ------------------------------------------------------------ 5. dupes
say "Step 5/8  Finding duplicates"
$DOCORG dupes --prefer-cloud gdrive || { bad "dupe scan failed"; exit 1; }
if [ -s "$REP/duplicates.csv" ]; then
  echo; echo "Opening duplicates.csv - KEEP rows survive, QUARANTINE rows get moved."
  command -v open >/dev/null && open "$REP/duplicates.csv" 2>/dev/null
  if ask "Move the QUARANTINE copies to ~/docorg-data/.docorg-quarantine? (nothing is deleted)"; then
    bash "$REP/quarantine-duplicates.sh" && ok "duplicates quarantined"
    run_scan >/dev/null
  else
    warn "skipped - re-run later with: bash $REP/quarantine-duplicates.sh"
  fi
fi

# ----------------------------------------------------------- 6. rename
say "Step 6/8  Proposing canonical filenames"
$DOCORG rename
if [ -s "$REP/renames.csv" ]; then
  command -v open >/dev/null && open "$REP/renames.csv" 2>/dev/null
  echo "Wrong matter/doctype on some rows? Edit $HERE/../config/taxonomy.json and re-run."
  if ask "Apply these renames? (in place, creates no copies)"; then
    bash "$REP/apply-renames.sh" && ok "renamed"
    run_scan >/dev/null
  else
    warn "skipped - re-run later with: bash $REP/apply-renames.sh"
  fi
fi

# ------------------------------------------------------ 7. index+catalog
say "Step 7/8  Building full-text index and catalog"
$DOCORG index
$DOCORG catalog
command -v open >/dev/null && open "$REP/CATALOG.md" 2>/dev/null

# --------------------------------------------------------------- 8. OCR
say "Step 8/8  OCR for scanned PDFs"
GD=""
for d in "$HOME"/Library/CloudStorage/GoogleDrive-*/"My Drive"; do [ -d "$d" ] && GD="$d"; done
if [ -n "$GD" ] && command -v ocrmypdf >/dev/null; then
  if ask "Start OCR in the background? (runs for hours, safe to ignore)"; then
    nohup bash "$HERE/ocr-pass.sh" "$GD" >/tmp/docorg-ocr.out 2>&1 &
    ok "OCR started (PID $!). Watch it:  tail -f $REP/ocr.log"
    echo "   When it finishes, re-run:  $DOCORG index"
  fi
else
  warn "skipping OCR (no Google Drive folder or ocrmypdf missing)"
fi

# ------------------------------------------------------------------ done
say "Done"
cat <<EOF

  Catalog        $REP/CATALOG.md
  Duplicates     $REP/duplicates.csv
  Quarantine     $DATA/.docorg-quarantine   (delete after 30 days)

  Search everything you own:

    alias docorg="python3 $HERE/docorg.py"
    docorg search "requests for admission"
    docorg search "escrow AND 2026"

  Monthly upkeep:  bash $HERE/run-all.sh --yes

EOF
