#!/bin/bash
# docorg setup - installs the handful of CLI tools the pipeline needs.
set -euo pipefail
echo "==> Checking Homebrew"
command -v brew >/dev/null || { echo "Install Homebrew first: https://brew.sh"; exit 1; }
echo "==> Installing tools (safe to re-run)"
brew install poppler ocrmypdf rclone || true   # poppler = pdftotext
echo "==> Verifying"
for t in python3 pdftotext ocrmypdf rclone; do
  printf '  %-12s ' "$t"
  command -v "$t" >/dev/null && echo "ok" || echo "MISSING"
done
mkdir -p ~/docorg-data/reports
echo "==> Ready. Reports will land in ~/docorg-data/reports"
