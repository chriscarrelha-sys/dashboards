#!/usr/bin/env bash
#
# collect-case-financials.sh
#
# Sweep one or more folders for EVERY financial-proof document tied to each of
# your cases: ledgers, transaction/payment histories, payment confirmations,
# payment verifications, wire transfer confirmations, bank statements, bank
# confirmation letters, cancelled checks, escrow/payoff figures, and more.
#
# It matches on BOTH filename/path AND document contents (PDF text, Office
# files, CSV/TXT/email, and optionally OCR for scans), assigns each hit to a
# case, dedupes by checksum, and builds a reviewable collection tree plus a
# manifest, an index, and a gap report.
#
# Nothing is moved, renamed, or deleted. Source files are never modified.
#
# Usage:
#   ./collect-case-financials.sh [options]
#
# Common runs:
#   ./collect-case-financials.sh                       # scan default folders
#   ./collect-case-financials.sh --scan ~/Documents/Cases
#   ./collect-case-financials.sh --case shellpoint --copy
#   ./collect-case-financials.sh --ocr --out ~/Desktop/Evidence
#
set -u
set -o pipefail

VERSION="1.0.0"
SCRIPT_NAME="$(basename "$0")"

# ---------------------------------------------------------------------------
# Defaults
# ---------------------------------------------------------------------------
OUT_DIR=""
CONFIG_FILE=""
COLLECT_MODE="link"        # link | copy | none
DO_CONTENT=1
DO_OCR=0
CASE_FILTER=""
MAX_SIZE_MB=200
SINCE_DAYS=""
VERBOSE=0
DRY_RUN=0
LIST_CASES=0
STRICT=0
MAX_TEXT_BYTES=400000      # per-file text sampled for content matching

SCAN_ROOTS=""              # newline-delimited

# Directories we never descend into (noise / not evidence)
PRUNE_NAMES="node_modules .git .svn Library Caches .Trash .cache .npm .venv venv __pycache__ .DS_Store .idea .vscode Applications System"

# File types worth opening
EXT_LIST="pdf doc docx xls xlsx xlsm csv tsv txt rtf md eml msg mbox ofx qfx qbo qif json html htm png jpg jpeg heic tif tiff webp"

# ---------------------------------------------------------------------------
# Help
# ---------------------------------------------------------------------------
usage() {
  cat <<USAGE
$SCRIPT_NAME v$VERSION — collect every financial-proof file, per case.

OPTIONS
  --scan DIR          Folder to scan. Repeatable. Defaults to common doc folders.
  --out DIR           Output folder (default: ./case-financials-YYYYMMDD-HHMMSS)
  --config FILE       Case definitions file (default: ./config/cases.conf,
                      then ~/.case-financials/cases.conf; auto-created if absent)
  --case NAME         Only collect for this case id (repeat -> comma list ok)
  --copy              Copy matched files into the collection tree
  --link              Symlink matched files (default; fast, no extra disk)
  --no-collect        Manifest/index only, build no tree
  --ocr               OCR image files and image-only PDFs (needs tesseract)
  --no-content        Filename/path matching only (much faster, less complete)
  --max-size MB       Skip files larger than this (default: $MAX_SIZE_MB)
  --since DAYS        Only files modified in the last N days
  --strict            Drop hits that match no known case (no _unassigned bucket)
  --list-cases        Print configured cases and exit
  --dry-run           Report what would be collected, write nothing
  -v, --verbose       Progress output
  -h, --help          This help

OUTPUT
  MANIFEST.csv   one row per (case, category, file) with hash, size, date,
                 matched terms, and where the match came from
  INDEX.md       human-readable index grouped by case then evidence category
  GAPS.md        categories with zero evidence, files needing OCR, skipped files
  by-case/       collection tree: by-case/<case>/<category>/<files>
USAGE
}

# ---------------------------------------------------------------------------
# Arg parsing
# ---------------------------------------------------------------------------
while [ $# -gt 0 ]; do
  case "$1" in
    --scan)       SCAN_ROOTS="$SCAN_ROOTS
$2"; shift 2 ;;
    --out)        OUT_DIR="$2"; shift 2 ;;
    --config)     CONFIG_FILE="$2"; shift 2 ;;
    --case)       if [ -n "$CASE_FILTER" ]; then CASE_FILTER="$CASE_FILTER,$2"; else CASE_FILTER="$2"; fi; shift 2 ;;
    --copy)       COLLECT_MODE="copy"; shift ;;
    --link)       COLLECT_MODE="link"; shift ;;
    --no-collect) COLLECT_MODE="none"; shift ;;
    --ocr)        DO_OCR=1; shift ;;
    --no-content) DO_CONTENT=0; shift ;;
    --max-size)   MAX_SIZE_MB="$2"; shift 2 ;;
    --since)      SINCE_DAYS="$2"; shift 2 ;;
    --strict)     STRICT=1; shift ;;
    --list-cases) LIST_CASES=1; shift ;;
    --dry-run)    DRY_RUN=1; shift ;;
    -v|--verbose) VERBOSE=1; shift ;;
    -h|--help)    usage; exit 0 ;;
    *) echo "$SCRIPT_NAME: unknown option '$1' (try --help)" >&2; exit 2 ;;
  esac
done

log()  { [ "$VERBOSE" -eq 1 ] && printf '%s\n' "$*" >&2; return 0; }
warn() { printf '%s\n' "$*" >&2; }
die()  { printf '%s\n' "$SCRIPT_NAME: $*" >&2; exit 1; }

# ---------------------------------------------------------------------------
# Portability helpers (macOS BSD tools and GNU coreutils both supported)
# ---------------------------------------------------------------------------
if stat -f '%z' . >/dev/null 2>&1; then STAT_FLAVOR="bsd"; else STAT_FLAVOR="gnu"; fi

file_size()  { if [ "$STAT_FLAVOR" = bsd ]; then stat -f '%z' "$1" 2>/dev/null; else stat -c '%s' "$1" 2>/dev/null; fi; }
file_mtime() { if [ "$STAT_FLAVOR" = bsd ]; then stat -f '%Sm' -t '%Y-%m-%d %H:%M' "$1" 2>/dev/null; else date -r "$1" '+%Y-%m-%d %H:%M' 2>/dev/null; fi; }

if command -v shasum >/dev/null 2>&1; then
  hash_file() { shasum -a 256 "$1" 2>/dev/null | awk '{print $1}'; }
elif command -v sha256sum >/dev/null 2>&1; then
  hash_file() { sha256sum "$1" 2>/dev/null | awk '{print $1}'; }
else
  hash_file() { file_size "$1"; }   # weak fallback, still catches exact dupes by size+name
fi

abspath() {
  case "$1" in
    /*) printf '%s\n' "$1" ;;
    *)  printf '%s\n' "$PWD/${1#./}" ;;
  esac
}

lower() { printf '%s' "$1" | tr '[:upper:]' '[:lower:]'; }

# ---------------------------------------------------------------------------
# Evidence categories
#
# Each category is a grep -E pattern (case-insensitive) run against the
# file path AND the extracted text. Order matters only for display.
# ---------------------------------------------------------------------------
CATEGORIES="ledger transaction_history payment_confirmation payment_verification wire_transfer bank_statement bank_confirmation checks_money_orders escrow_payoff servicing_correspondence tax_forms"

cat_label() {
  case "$1" in
    ledger)                   echo "Ledgers / Account Ledgers" ;;
    transaction_history)      echo "Transaction & Payment History" ;;
    payment_confirmation)     echo "Payment Confirmations & Receipts" ;;
    payment_verification)     echo "Payment Verification / Proof of Payment" ;;
    wire_transfer)            echo "Wire Transfer & ACH Confirmations" ;;
    bank_statement)           echo "Bank / Account Statements" ;;
    bank_confirmation)        echo "Bank Confirmation & Certified Funds" ;;
    checks_money_orders)      echo "Checks, Money Orders & Cashier's Checks" ;;
    escrow_payoff)            echo "Escrow, Payoff & Reinstatement Figures" ;;
    servicing_correspondence) echo "Servicing / Billing Correspondence" ;;
    tax_forms)                echo "Tax Forms & Year-End Statements" ;;
    *)                        echo "$1" ;;
  esac
}

cat_pattern() {
  case "$1" in
    ledger)
      echo 'ledger|general ledger|account ledger|loan ledger|payment ledger|running balance|amortization (schedule|table)|balance forward|debits? and credits?|trial balance' ;;
    transaction_history)
      echo 'transaction (history|detail|listing|log|report)|payment history|account (history|activity)|loan history|activity (statement|report|detail)|posting history|transaction id|history of payments|payments? (made|applied|posted|received)' ;;
    payment_confirmation)
      echo 'payment confirmation|confirmation (number|no\.?|code|#)|conf(irmation)? ?#|payment receipt|receipt (number|no\.?|#|for payment)|remittance advice|payment (posted|processed|accepted|successful|complete)|thank you for your payment|your payment of|authorization (code|number)|reference (number|no\.?|#)' ;;
    payment_verification)
      echo 'payment verification|verification of (payment|deposit|funds|receipt)|proof of (payment|funds|deposit)|verify(ing)? (the )?payment|confirm(ing|ed)? (receipt of )?(payment|funds)|payment was (received|applied|credited)|evidence of payment' ;;
    wire_transfer)
      echo 'wire (transfer|confirmation|advice|receipt|details|instructions)|outgoing wire|incoming wire|fedwire|imad|omad|swift( code)?|bic|iban|ach (transfer|credit|debit|confirmation|trace)|trace (number|no\.?|#)|routing (number|no\.?|#|transit)|aba( number)?|electronic funds transfer|eft (confirmation|receipt)|book transfer' ;;
    bank_statement)
      echo 'bank statement|account statement|monthly statement|e-?statement|statement of account|checking account|savings account|beginning balance|ending balance|available balance|statement (period|date|cycle)|deposits? and (credits|withdrawals)|withdrawals? and debits' ;;
    bank_confirmation)
      echo 'bank confirmation|confirmation letter|letter of (confirmation|credit)|verification of funds|funds (are )?available|certified funds|cashier.?s check|teller|bank officer|notarized (statement|letter)|attestation|affidavit of (payment|funds)|comfort letter' ;;
    checks_money_orders)
      echo 'cancell?ed check|cleared check|check (number|no\.?|#|image|copy|stub)|money order|cashier.?s check|certified check|official check|front and back|negotiated instrument|endorsement' ;;
    escrow_payoff)
      echo 'escrow (analysis|account|statement|disbursement|shortage|surplus)|payoff (statement|quote|figure|demand|letter|amount)|reinstatement (figure|quote|amount|letter|statement)|per ?diem|good through (date)?|total amount due to (reinstate|payoff)|suspense (account|balance|funds)|unapplied funds' ;;
    servicing_correspondence)
      echo 'notice of (error|servicing transfer|default)|qualified written request|qwr|request for information|rfi response|loan servicer|servicing (transfer|record|notes|comments)|billing (statement|dispute|error)|monthly (mortgage )?statement|periodic statement|validation of debt|debt validation' ;;
    tax_forms)
      echo '1098|1099|form 1098|year.?end (statement|tax|summary)|annual (tax|escrow|interest) statement|interest paid (statement|summary)|tax (statement|document|form) for' ;;
    *) echo 'zzzz_no_match_zzzz' ;;
  esac
}

# One combined pattern used as a cheap pre-filter: a file that matches nothing
# here cannot match any individual category, so we skip the per-category work.
ALL_CAT_PATTERN=""
for _c in $CATEGORIES; do
  _p=$(cat_pattern "$_c")
  if [ -z "$ALL_CAT_PATTERN" ]; then ALL_CAT_PATTERN="$_p"; else ALL_CAT_PATTERN="$ALL_CAT_PATTERN|$_p"; fi
done

# ---------------------------------------------------------------------------
# Case configuration
#
# Format, one case per line, pipe delimited:
#   case_id | Display Name | alias regex (matched vs path AND text)
# Blank lines and lines starting with # are ignored.
# ---------------------------------------------------------------------------
default_config() {
  cat <<'CONF'
# ---------------------------------------------------------------------------
# Case definitions for collect-case-financials.sh
#
#   case_id | Display Name | alias regex
#
# case_id      short slug, used for folder names and --case filtering
# Display Name shown in INDEX.md
# alias regex  extended regex (case-insensitive) matched against each file's
#              full path AND its extracted text. Include every name, docket
#              number, address, loan number, and account number that identifies
#              the case. The more aliases, the fewer files land in _unassigned.
#
# Add loan/account numbers below — they are the single most reliable way to
# tie a bank statement or ledger to the right case.
# ---------------------------------------------------------------------------

shellpoint|Shellpoint Mortgage Servicing (foreclosure defense)|shellpoint|shell ?point|newrez|new ?rez|mccalla|mc ?calla ?raymer|pierce|specialized loan servicing|foreclosure|deed (to secure debt|under power)|security deed|wells fargo|mortgage

nmac|NMAC / Infiniti Financial Services (25CV-0783-3)|nmac|nissan motor acceptance|infiniti financial|infiniti fs|ifs|qx80|25 ?cv ?-? ?0783|weltman|weinberg|replevin|lease (agreement|deficiency)|forsyth county

# Example of a third case — copy this shape, uncomment, and edit:
# smith|Smith v. Acme Bank|smith v\.? acme|acme bank|acct ?# ?4455|1234 Main St
CONF
}

resolve_config() {
  if [ -n "$CONFIG_FILE" ]; then
    [ -f "$CONFIG_FILE" ] || die "config not found: $CONFIG_FILE"
    return 0
  fi
  if [ -f "./config/cases.conf" ]; then CONFIG_FILE="./config/cases.conf"; return 0; fi
  if [ -f "$HOME/.case-financials/cases.conf" ]; then CONFIG_FILE="$HOME/.case-financials/cases.conf"; return 0; fi
  CONFIG_FILE="$HOME/.case-financials/cases.conf"
  mkdir -p "$HOME/.case-financials" || die "cannot create $HOME/.case-financials"
  default_config > "$CONFIG_FILE"
  warn "Created a starter case file at: $CONFIG_FILE"
  warn "Edit it to add loan numbers, account numbers, and any other cases, then re-run."
}

resolve_config

CASE_IDS=""
case_line_for() {   # $1 = case_id -> echoes the raw config line
  grep -i "^[[:space:]]*$1[[:space:]]*|" "$CONFIG_FILE" 2>/dev/null | head -1
}
case_name_for()    { case_line_for "$1" | awk -F'|' '{print $2}' | sed 's/^ *//; s/ *$//'; }
case_pattern_for() { case_line_for "$1" | cut -d'|' -f3- | sed 's/^ *//; s/ *$//'; }

while IFS= read -r line; do
  case "$line" in \#*|"") continue ;; esac
  cid=$(printf '%s' "$line" | awk -F'|' '{print $1}' | sed 's/^ *//; s/ *$//')
  [ -n "$cid" ] || continue
  CASE_IDS="$CASE_IDS $cid"
done < "$CONFIG_FILE"

[ -n "$(printf '%s' "$CASE_IDS" | tr -d ' ')" ] || die "no cases defined in $CONFIG_FILE"

if [ "$LIST_CASES" -eq 1 ]; then
  printf 'Cases defined in %s:\n\n' "$CONFIG_FILE"
  for c in $CASE_IDS; do printf '  %-14s %s\n' "$c" "$(case_name_for "$c")"; done
  exit 0
fi

# Apply --case filter
if [ -n "$CASE_FILTER" ]; then
  filtered=""
  for want in $(printf '%s' "$CASE_FILTER" | tr ',' ' '); do
    found=0
    for c in $CASE_IDS; do
      [ "$(lower "$c")" = "$(lower "$want")" ] && { filtered="$filtered $c"; found=1; }
    done
    [ "$found" -eq 1 ] || die "no such case '$want' in $CONFIG_FILE (try --list-cases)"
  done
  CASE_IDS="$filtered"
  # A case filter is an explicit "only this case" — don't bucket other cases'
  # documents into _unassigned, just leave them out.
  STRICT=1
fi

# ---------------------------------------------------------------------------
# Scan roots
# ---------------------------------------------------------------------------
if [ -z "$(printf '%s' "$SCAN_ROOTS" | tr -d '[:space:]')" ]; then
  for d in \
    "$HOME/Documents" "$HOME/Desktop" "$HOME/Downloads" \
    "$HOME/Google Drive" "$HOME/Google Drive/My Drive" \
    "$HOME/Library/CloudStorage" \
    "$HOME/Dropbox" "$HOME/OneDrive" \
    "$HOME/Library/Mobile Documents/com~apple~CloudDocs"
  do
    [ -d "$d" ] && SCAN_ROOTS="$SCAN_ROOTS
$d"
  done
fi

REAL_ROOTS=""
while IFS= read -r r; do
  [ -n "$r" ] || continue
  if [ -d "$r" ]; then
    REAL_ROOTS="$REAL_ROOTS
$(abspath "$r")"
  else
    warn "skipping (not a directory): $r"
  fi
done <<EOF
$SCAN_ROOTS
EOF

[ -n "$(printf '%s' "$REAL_ROOTS" | tr -d '[:space:]')" ] || \
  die "no readable folders to scan. Pass --scan /path/to/your/case/files"

# ---------------------------------------------------------------------------
# Output setup
# ---------------------------------------------------------------------------
STAMP=$(date '+%Y%m%d-%H%M%S')
[ -n "$OUT_DIR" ] || OUT_DIR="./case-financials-$STAMP"
OUT_DIR=$(abspath "$OUT_DIR")

TMP_DIR=$(mktemp -d "${TMPDIR:-/tmp}/casefin.XXXXXX") || die "cannot create temp dir"
cleanup() { rm -rf "$TMP_DIR"; }
trap cleanup EXIT INT TERM

HITROWS="$TMP_DIR/hits.tsv"        # case \t category \t path \t hash \t size \t mtime \t terms \t source
NEEDS_OCR="$TMP_DIR/needs_ocr.txt"
SKIPPED="$TMP_DIR/skipped.txt"
SEEN_HASH="$TMP_DIR/seen"
: > "$HITROWS"; : > "$NEEDS_OCR"; : > "$SKIPPED"; mkdir -p "$SEEN_HASH"

# ---------------------------------------------------------------------------
# Text extraction
# ---------------------------------------------------------------------------
HAVE_PDFTOTEXT=0; command -v pdftotext  >/dev/null 2>&1 && HAVE_PDFTOTEXT=1
HAVE_TESSERACT=0; command -v tesseract  >/dev/null 2>&1 && HAVE_TESSERACT=1
HAVE_TEXTUTIL=0;  command -v textutil   >/dev/null 2>&1 && HAVE_TEXTUTIL=1
HAVE_UNZIP=0;     command -v unzip      >/dev/null 2>&1 && HAVE_UNZIP=1
HAVE_PDFTOPPM=0;  command -v pdftoppm   >/dev/null 2>&1 && HAVE_PDFTOPPM=1

extract_text() {   # $1 = file, $2 = lowercase extension
  f="$1"; ext="$2"
  case "$ext" in
    pdf)
      if [ "$HAVE_PDFTOTEXT" -eq 1 ]; then
        txt=$(pdftotext -q -layout -enc UTF-8 "$f" - 2>/dev/null | head -c "$MAX_TEXT_BYTES")
        if [ -n "$(printf '%s' "$txt" | tr -d '[:space:]')" ]; then printf '%s' "$txt"; return 0; fi
      fi
      # No text layer (scan) — OCR if asked and possible
      if [ "$DO_OCR" -eq 1 ] && [ "$HAVE_TESSERACT" -eq 1 ] && [ "$HAVE_PDFTOPPM" -eq 1 ]; then
        pdftoppm -r 150 -f 1 -l 3 -png "$f" "$TMP_DIR/ocrpage" >/dev/null 2>&1
        for p in "$TMP_DIR"/ocrpage*.png; do
          [ -f "$p" ] || continue
          tesseract "$p" - 2>/dev/null
          rm -f "$p"
        done | head -c "$MAX_TEXT_BYTES"
        return 0
      fi
      printf '%s' "$f" >> "$NEEDS_OCR"; printf '\n' >> "$NEEDS_OCR"
      return 0 ;;
    docx|xlsx|pptx|xlsm)
      [ "$HAVE_UNZIP" -eq 1 ] || return 0
      unzip -p "$f" 'word/document.xml' 'xl/sharedStrings.xml' 'xl/worksheets/*.xml' 'ppt/slides/*.xml' 2>/dev/null \
        | sed 's/<[^>]*>/ /g' | head -c "$MAX_TEXT_BYTES"
      return 0 ;;
    doc|xls|rtf)
      if [ "$HAVE_TEXTUTIL" -eq 1 ]; then
        textutil -convert txt -stdout "$f" 2>/dev/null | head -c "$MAX_TEXT_BYTES"
      else
        LC_ALL=C tr -cd '\11\12\15\40-\176' < "$f" 2>/dev/null | head -c "$MAX_TEXT_BYTES"
      fi
      return 0 ;;
    txt|csv|tsv|md|eml|mbox|ofx|qfx|qbo|qif|json|html|htm|msg)
      head -c "$MAX_TEXT_BYTES" "$f" 2>/dev/null | sed 's/<[^>]*>/ /g'
      return 0 ;;
    png|jpg|jpeg|heic|tif|tiff|webp)
      if [ "$DO_OCR" -eq 1 ] && [ "$HAVE_TESSERACT" -eq 1 ]; then
        tesseract "$f" - 2>/dev/null | head -c "$MAX_TEXT_BYTES"
      else
        printf '%s\n' "$f" >> "$NEEDS_OCR"
      fi
      return 0 ;;
  esac
  return 0
}

# ---------------------------------------------------------------------------
# Build the candidate file list
# ---------------------------------------------------------------------------
FIND_LIST="$TMP_DIR/files.z"
: > "$FIND_LIST"

log "Scanning for candidate files..."
while IFS= read -r root; do
  [ -n "$root" ] || continue
  log "  root: $root"

  # Assemble find args safely
  set -- "$root"
  # prune noisy dirs
  for p in $PRUNE_NAMES; do
    set -- "$@" -name "$p" -prune -o
  done
  set -- "$@" -type f "("
  first=1
  for e in $EXT_LIST; do
    if [ $first -eq 1 ]; then set -- "$@" -iname "*.$e"; first=0
    else set -- "$@" -o -iname "*.$e"; fi
  done
  set -- "$@" ")"
  [ -n "$SINCE_DAYS" ] && set -- "$@" -mtime "-$SINCE_DAYS"
  set -- "$@" -print0

  find "$@" 2>/dev/null >> "$FIND_LIST"
done <<EOF
$REAL_ROOTS
EOF

TOTAL=$(tr -dc '\0' < "$FIND_LIST" | wc -c | tr -d ' ')
log "Candidate files: $TOTAL"
[ "$TOTAL" -gt 0 ] || die "found no documents under the scanned folders. Check --scan paths."

# ---------------------------------------------------------------------------
# Classify
# ---------------------------------------------------------------------------
MAX_BYTES=$(( MAX_SIZE_MB * 1024 * 1024 ))
processed=0
matched_files=0

while IFS= read -r -d '' file; do
  processed=$(( processed + 1 ))
  if [ "$VERBOSE" -eq 1 ] && [ $(( processed % 200 )) -eq 0 ]; then
    printf '  ...%s/%s examined, %s matched\n' "$processed" "$TOTAL" "$matched_files" >&2
  fi

  [ -r "$file" ] || { printf '%s\tunreadable\n' "$file" >> "$SKIPPED"; continue; }

  size=$(file_size "$file"); [ -n "$size" ] || size=0
  if [ "$size" -gt "$MAX_BYTES" ]; then
    printf '%s\ttoo large (%s bytes)\n' "$file" "$size" >> "$SKIPPED"; continue
  fi

  base=$(basename "$file")
  ext=$(lower "${base##*.}")

  text=""
  if [ "$DO_CONTENT" -eq 1 ]; then
    text=$(extract_text "$file" "$ext" 2>/dev/null)
  fi

  # Two haystacks so we can report where a match came from
  path_hay="$file"
  text_hay="$text"

  # --- cheap pre-filter --------------------------------------------------
  if ! printf '%s\n%s' "$file" "$text" | grep -q -i -E "$ALL_CAT_PATTERN" 2>/dev/null; then
    continue
  fi

  # --- category matching -------------------------------------------------
  hit_cats=""
  hit_terms=""
  hit_src=""
  for cat in $CATEGORIES; do
    pat=$(cat_pattern "$cat")
    pterm=$(printf '%s' "$path_hay" | grep -o -i -E "$pat" 2>/dev/null | sort -u | head -3 | paste -sd';' - 2>/dev/null)
    tterm=""
    [ -n "$text_hay" ] && tterm=$(printf '%s' "$text_hay" | grep -o -i -E "$pat" 2>/dev/null | sort -u | head -3 | paste -sd';' - 2>/dev/null)
    if [ -n "$pterm" ] || [ -n "$tterm" ]; then
      hit_cats="$hit_cats $cat"
      if [ -n "$pterm" ] && [ -n "$tterm" ]; then src="filename+content"; terms="$pterm;$tterm"
      elif [ -n "$pterm" ]; then src="filename"; terms="$pterm"
      else src="content"; terms="$tterm"; fi
      hit_terms="$hit_terms|$cat=$terms"
      hit_src="$hit_src|$cat=$src"
    fi
  done

  [ -n "$(printf '%s' "$hit_cats" | tr -d ' ')" ] || continue

  # --- case matching -----------------------------------------------------
  hit_cases=""
  for c in $CASE_IDS; do
    cpat=$(case_pattern_for "$c")
    [ -n "$cpat" ] || continue
    if printf '%s' "$path_hay" | grep -q -i -E "$cpat" 2>/dev/null; then
      hit_cases="$hit_cases $c"
    elif [ -n "$text_hay" ] && printf '%s' "$text_hay" | grep -q -i -E "$cpat" 2>/dev/null; then
      hit_cases="$hit_cases $c"
    fi
  done
  if [ -z "$(printf '%s' "$hit_cases" | tr -d ' ')" ]; then
    [ "$STRICT" -eq 1 ] && continue
    hit_cases="_unassigned"
  fi

  fhash=$(hash_file "$file"); [ -n "$fhash" ] || fhash="nohash-$size"
  mtime=$(file_mtime "$file"); [ -n "$mtime" ] || mtime="unknown"
  matched_files=$(( matched_files + 1 ))

  for c in $hit_cases; do
    for cat in $hit_cats; do
      terms=$(printf '%s' "$hit_terms" | tr '|' '\n' | grep "^$cat=" | head -1 | cut -d= -f2-)
      src=$(printf '%s' "$hit_src"   | tr '|' '\n' | grep "^$cat=" | head -1 | cut -d= -f2-)
      dupe="no"
      key="$SEEN_HASH/${c}__${cat}__${fhash}"
      if [ -e "$key" ]; then dupe="yes"; else : > "$key"; fi
      printf '%s\t%s\t%s\t%s\t%s\t%s\t%s\t%s\t%s\n' \
        "$c" "$cat" "$file" "$fhash" "$size" "$mtime" "$terms" "$src" "$dupe" >> "$HITROWS"
    done
  done
done < "$FIND_LIST"

log "Examined $processed files; $matched_files matched."

# ---------------------------------------------------------------------------
# Write output
# ---------------------------------------------------------------------------
if [ "$DRY_RUN" -eq 1 ]; then
  printf '\nDRY RUN — nothing written.\n\n'
  printf 'Files examined : %s\n' "$processed"
  printf 'Files matched  : %s\n\n' "$matched_files"
  printf 'Hits per case / category:\n'
  awk -F'\t' '$9=="no"{print "  " $1 "  " $2}' "$HITROWS" | sort | uniq -c | sort -rn
  exit 0
fi

mkdir -p "$OUT_DIR" || die "cannot create $OUT_DIR"

csv_escape() { printf '"%s"' "$(printf '%s' "$1" | sed 's/"/""/g' | tr '\n' ' ')"; }

MANIFEST="$OUT_DIR/MANIFEST.csv"
{
  printf 'case_id,case_name,category,category_label,file_path,file_name,sha256,size_bytes,modified,matched_terms,match_source,duplicate\n'
  while IFS="$(printf '\t')" read -r c cat path fhash size mtime terms src dupe; do
    [ -n "$c" ] || continue
    if [ "$c" = "_unassigned" ]; then cname="(no case matched)"; else cname=$(case_name_for "$c"); fi
    printf '%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s\n' \
      "$(csv_escape "$c")" "$(csv_escape "$cname")" "$(csv_escape "$cat")" \
      "$(csv_escape "$(cat_label "$cat")")" "$(csv_escape "$path")" \
      "$(csv_escape "$(basename "$path")")" "$(csv_escape "$fhash")" \
      "$(csv_escape "$size")" "$(csv_escape "$mtime")" "$(csv_escape "$terms")" \
      "$(csv_escape "$src")" "$(csv_escape "$dupe")"
  done < "$HITROWS"
} > "$MANIFEST"

# --- collection tree -------------------------------------------------------
if [ "$COLLECT_MODE" != "none" ]; then
  while IFS="$(printf '\t')" read -r c cat path fhash size mtime terms src dupe; do
    [ -n "$c" ] || continue
    [ "$dupe" = "no" ] || continue
    dest="$OUT_DIR/by-case/$c/$cat"
    mkdir -p "$dest"
    bn=$(basename "$path")
    short=$(printf '%s' "$fhash" | cut -c1-8)
    target="$dest/${short}__${bn}"
    if [ "$COLLECT_MODE" = "copy" ]; then
      cp -p "$path" "$target" 2>/dev/null || warn "copy failed: $path"
    else
      ln -sf "$path" "$target" 2>/dev/null || warn "link failed: $path"
    fi
  done < "$HITROWS"
fi

# --- INDEX.md --------------------------------------------------------------
INDEX="$OUT_DIR/INDEX.md"
{
  printf '# Financial Evidence Index\n\n'
  printf -- '- Generated: %s\n' "$(date '+%Y-%m-%d %H:%M:%S')"
  printf -- '- Case definitions: `%s`\n' "$CONFIG_FILE"
  printf -- '- Folders scanned:\n'
  while IFS= read -r r; do [ -n "$r" ] && printf '  - `%s`\n' "$r"; done <<EOF
$REAL_ROOTS
EOF
  printf -- '- Files examined: %s\n' "$processed"
  printf -- '- Files matched: %s\n' "$matched_files"
  printf -- '- Content search: %s | OCR: %s\n\n' \
    "$( [ "$DO_CONTENT" -eq 1 ] && echo on || echo off )" \
    "$( [ "$DO_OCR" -eq 1 ] && echo on || echo off )"

  all_cases=$(awk -F'\t' '{print $1}' "$HITROWS" | sort -u)
  for c in $all_cases; do
    if [ "$c" = "_unassigned" ]; then cname="Unassigned — matched no case"; else cname=$(case_name_for "$c"); fi
    printf '\n---\n\n## %s\n\n_%s_\n\n' "$c" "$cname"
    total_c=$(awk -F'\t' -v c="$c" '$1==c && $9=="no"{print $3}' "$HITROWS" | sort -u | wc -l | tr -d ' ')
    place_c=$(awk -F'\t' -v c="$c" '$1==c && $9=="no"' "$HITROWS" | wc -l | tr -d ' ')
    printf 'Documents: **%s** (across %s evidence categories)\n' "$total_c" \
      "$(awk -F'\t' -v c="$c" '$1==c && $9=="no"{print $2}' "$HITROWS" | sort -u | wc -l | tr -d ' ')"
    for cat in $CATEGORIES; do
      n=$(awk -F'\t' -v c="$c" -v k="$cat" '$1==c && $2==k && $9=="no"' "$HITROWS" | wc -l | tr -d ' ')
      [ "$n" -gt 0 ] || continue
      printf '\n### %s (%s)\n\n' "$(cat_label "$cat")" "$n"
      awk -F'\t' -v c="$c" -v k="$cat" '$1==c && $2==k && $9=="no" {print $3 "\t" $6 "\t" $7 "\t" $8}' "$HITROWS" \
        | sort \
        | while IFS="$(printf '\t')" read -r p m t s; do
            printf -- '- **%s**  \n' "$(basename "$p")"
            printf -- '  `%s`  \n' "$p"
            printf -- '  modified %s · matched on %s via %s\n' "$m" "$t" "$s"
          done
    done
  done
} > "$INDEX"

# --- GAPS.md ---------------------------------------------------------------
GAPS="$OUT_DIR/GAPS.md"
{
  printf '# Gaps & Follow-Up\n\n'
  printf 'What this run could NOT find or could not read. Work this list before\n'
  printf 'you rely on the collection being complete.\n\n'

  printf '## Missing evidence categories by case\n\n'
  for c in $CASE_IDS; do
    missing=""
    for cat in $CATEGORIES; do
      n=$(awk -F'\t' -v c="$c" -v k="$cat" '$1==c && $2==k && $9=="no"' "$HITROWS" | wc -l | tr -d ' ')
      [ "$n" -eq 0 ] && missing="$missing
  - $(cat_label "$cat")"
    done
    printf '### %s — %s\n' "$c" "$(case_name_for "$c")"
    if [ -n "$(printf '%s' "$missing" | tr -d '[:space:]')" ]; then
      printf 'No documents found for:%s\n\n' "$missing"
    else
      printf 'Every category has at least one document.\n\n'
    fi
  done

  n_ocr=$(sort -u "$NEEDS_OCR" 2>/dev/null | grep -c . || true)
  printf '## Files that could not be read (%s)\n\n' "${n_ocr:-0}"
  if [ "${n_ocr:-0}" -gt 0 ]; then
    printf 'Scanned PDFs and images with no text layer. They may well be the\n'
    printf 'statements or check images you need. Re-run with `--ocr` (needs\n'
    printf '`tesseract`), or open them by hand.\n\n'
    sort -u "$NEEDS_OCR" | while IFS= read -r p; do [ -n "$p" ] && printf -- '- %s\n' "$p"; done
    printf '\n'
  else
    printf 'None.\n\n'
  fi

  n_skip=$(grep -c . "$SKIPPED" 2>/dev/null || true)
  printf '## Skipped files (%s)\n\n' "${n_skip:-0}"
  if [ "${n_skip:-0}" -gt 0 ]; then
    while IFS="$(printf '\t')" read -r p why; do [ -n "$p" ] && printf -- '- %s — %s\n' "$p" "$why"; done < "$SKIPPED"
    printf '\n'
  else
    printf 'None.\n\n'
  fi

  n_unassigned=$(awk -F'\t' '$1=="_unassigned" && $9=="no"{print $3}' "$HITROWS" | sort -u | wc -l | tr -d ' ')
  printf '## Financial documents that matched no case (%s)\n\n' "$n_unassigned"
  if [ "$n_unassigned" -gt 0 ]; then
    printf 'These look like financial proof but carry no case identifier. Add the\n'
    printf 'right loan/account numbers or party names to `%s` and re-run.\n\n' "$CONFIG_FILE"
    awk -F'\t' '$1=="_unassigned" && $9=="no" {print "- " $3}' "$HITROWS" | sort -u
    printf '\n'
  else
    printf 'None.\n\n'
  fi

  printf '## Tooling\n\n'
  printf -- '- pdftotext (PDF text): %s\n' "$( [ "$HAVE_PDFTOTEXT" -eq 1 ] && echo installed || echo 'MISSING — install poppler (brew install poppler)' )"
  printf -- '- tesseract (OCR): %s\n'     "$( [ "$HAVE_TESSERACT" -eq 1 ] && echo installed || echo 'MISSING — brew install tesseract' )"
  printf -- '- textutil (.doc/.rtf): %s\n' "$( [ "$HAVE_TEXTUTIL" -eq 1 ] && echo installed || echo 'not present (macOS only)' )"
} > "$GAPS"

# ---------------------------------------------------------------------------
# Summary
# ---------------------------------------------------------------------------
uniq_hits=$(awk -F'\t' '$9=="no"' "$HITROWS" | wc -l | tr -d ' ')
uniq_files=$(awk -F'\t' '$9=="no"{print $3}' "$HITROWS" | sort -u | wc -l | tr -d ' ')
printf '\nDone.\n\n'
printf '  Examined      : %s files\n' "$processed"
printf '  Matched       : %s files, %s case/category placements\n' "$matched_files" "$uniq_hits"
printf '  Output        : %s\n' "$OUT_DIR"
printf '                  MANIFEST.csv, INDEX.md, GAPS.md'
[ "$COLLECT_MODE" != "none" ] && printf ', by-case/'
printf '\n\n'
printf 'Per case:\n'
awk -F'\t' '$9=="no"{print $1 "\t" $3}' "$HITROWS" | sort -u | awk -F'\t' '{print $1}' \
  | uniq -c | sort -rn | while read -r n c; do
      cats=$(awk -F'\t' -v c="$c" '$1==c && $9=="no"{print $2}' "$HITROWS" | sort -u | wc -l | tr -d ' ')
      printf '  %-16s %s documents across %s categories\n' "$c" "$n" "$cats"
    done
if [ "$HAVE_PDFTOTEXT" -eq 0 ]; then
  printf '\nNOTE: pdftotext is not installed, so PDF *contents* were not searched.\n'
  printf '      Install it (brew install poppler) and re-run for full coverage.\n'
fi
printf '\nRead GAPS.md before treating this as complete.\n'
