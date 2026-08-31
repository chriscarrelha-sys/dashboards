# RUNBOOK — copy/paste, top to bottom

Every command is a full line you paste into **Terminal.app**. Nothing here
deletes a file. Duplicates are *moved* to a quarantine folder you delete
yourself, later, once you've seen the report.

Total hands-on time: ~20 minutes. The OCR pass runs unattended afterward.

---

## Step 0 — Get the toolkit onto your Mac

```bash
mkdir -p ~/Documents && cd ~/Documents && \
git clone https://github.com/chriscarrelha-sys/dashboards.git docorg-repo && \
cd docorg-repo && git checkout claude/document-org-storage-jjc4nk && \
bash docorg/bin/setup.sh
```

Then set a shortcut you'll reuse below:

```bash
echo 'alias docorg="python3 ~/Documents/docorg-repo/docorg/bin/docorg.py"' >> ~/.zshrc && source ~/.zshrc
```

---

## Step 1 — Stop the bleeding (do this FIRST)

Turn off iCloud Desktop & Documents sync. This is what keeps re-creating the
mess; every later step is undone if you skip it.

> System Settings → Apple Account → iCloud → **iCloud Drive** → Options…
> → untick **Desktop & Documents Folders** → Done.

macOS moves your existing Desktop/Documents into `~/Library/Mobile
Documents/…/Desktop`. That's fine — Step 3 catalogs it.

Set Google Drive to stream instead of download:

> Drive for Desktop menu bar icon → gear → Preferences → Google Drive →
> **Stream files** → Save.

Same for OneDrive:

```bash
defaults write com.microsoft.OneDrive FilesOnDemandEnabled -bool true
```

---

## Step 2 — Verify your cloud roots exist

```bash
ls -d ~/Library/CloudStorage/* ~/Library/Mobile\ Documents/com~apple~CloudDocs 2>/dev/null
```

Copy the exact Google Drive path it prints — you need it in Step 3. It looks
like `/Users/you/Library/CloudStorage/GoogleDrive-chriscarrelha@gmail.com`.

---

## Step 3 — Inventory everything (read-only, ~2 min)

This reads **metadata only**. It will not download your cloud files.

```bash
docorg scan \
  ~/Library/CloudStorage/GoogleDrive-chriscarrelha@gmail.com/My\ Drive \
  ~/Library/CloudStorage/OneDrive-Personal \
  ~/Library/Mobile\ Documents/com~apple~CloudDocs \
  ~/Documents ~/Desktop ~/Downloads
```

You get a per-cloud file and GB count. That is your real baseline.

---

## Step 4 — Find the duplicates (~5 min)

```bash
docorg dupes --prefer-cloud gdrive
```

It hashes only files that share a byte size, and only ones already on disk
(cloud placeholders are skipped, never downloaded). It prints how many GB are
reclaimable and writes two files.

**Read the report before running anything:**

```bash
open ~/Documents/docorg/reports/duplicates.csv
```

Each `KEEP` row is the copy that survives; each `QUARANTINE` row is a
byte-identical twin. The keeper is chosen by: Google Drive first, then
canonical `2026.03.18` date-prefixed names, then non-`copy`/`(2)` names,
then shortest path.

When the CSV looks right:

```bash
bash ~/Documents/docorg/reports/quarantine-duplicates.sh
```

Duplicates move to `~/Documents/docorg/.docorg-quarantine/`. Because they
leave the Drive folder, Drive releases the cloud quota. **Nothing is deleted.**
After 30 days of everything working:

```bash
rm -rf ~/Documents/docorg/.docorg-quarantine
```

---

## Step 5 — Rename to one convention

```bash
docorg rename && open ~/Documents/docorg/reports/renames.csv
```

Proposed format — sorts chronologically, greps cleanly, reads in a filing:

```
2026-03-18__10-TRUIST__DISCOVERY__Requests-for-Admission.pdf
2026-06-22__10-TRUIST__COMPLAINT__Verified-Federal-Complaint.pdf
```

Wrong matter or doctype on some rows? Edit
`~/Documents/docorg-repo/docorg/config/taxonomy.json`, then re-run
`docorg scan …` (Step 3) and `docorg rename`. Repeat until the CSV is right.

Then apply — renames in place, creates no copies:

```bash
bash ~/Documents/docorg/reports/apply-renames.sh
```

---

## Step 6 — Make scanned PDFs searchable (unattended, hours)

Run it and walk away. Safe to interrupt with Ctrl-C and re-run — it skips
PDFs that already have a text layer.

```bash
nohup bash ~/Documents/docorg-repo/docorg/bin/ocr-pass.sh \
  ~/Library/CloudStorage/GoogleDrive-chriscarrelha@gmail.com/My\ Drive \
  > /tmp/ocr.out 2>&1 &
```

Check on it any time:

```bash
tail -f ~/Documents/docorg/reports/ocr.log
```

---

## Step 7 — Build the search index

```bash
docorg index && docorg catalog
```

Now search the full text of every document, instantly, offline:

```bash
docorg search "requests for admission"
docorg search "escrow AND 2026"
docorg search "replevin OR repossession"
```

And your catalog:

```bash
open ~/Documents/docorg/reports/CATALOG.md
```

---

## Step 8 — The OneDrive bridge (only if you need it)

Only for apps that can't read Google Drive. Put just those files in
`00_VAULT/../10_ACTIVE/`.

```bash
mkdir -p ~/Library/CloudStorage/GoogleDrive-chriscarrelha@gmail.com/My\ Drive/10_ACTIVE
bash ~/Documents/docorg-repo/docorg/bin/onedrive-bridge.sh --dry-run
```

Review the dry run, then make it automatic every 15 minutes:

```bash
sed "s|REPLACE_WITH_PATH|$HOME/Documents/docorg-repo|" \
  ~/Documents/docorg-repo/docorg/config/com.docorg.onedrive-bridge.plist \
  > ~/Library/LaunchAgents/com.docorg.onedrive-bridge.plist && \
launchctl load ~/Library/LaunchAgents/com.docorg.onedrive-bridge.plist && \
echo "bridge active"
```

To stop it later:
`launchctl unload ~/Library/LaunchAgents/com.docorg.onedrive-bridge.plist`

---

## Step 9 — Remote access

Once the vault is the single source of truth, a remote Claude session reaches
it through the Google Drive connector — search, read, and cite documents with
nothing downloaded locally. That is the payoff for making Drive authoritative:
iCloud has no API, so anything left only in iCloud stays invisible.

---

## Monthly upkeep (2 minutes)

```bash
docorg scan ~/Library/CloudStorage/GoogleDrive-chriscarrelha@gmail.com/My\ Drive && \
docorg dupes && docorg index && docorg catalog
```

---

## If something looks wrong

| Symptom | Fix |
|---|---|
| `docorg: command not found` | `source ~/.zshrc` |
| Scan finds 0 files | Wrong path — re-run Step 2 and copy the exact string |
| Huge "placeholders" count | Normal and good: cloud files not downloaded |
| `pdftotext: command not found` | `brew install poppler` |
| A quarantined file was needed | It's in `~/Documents/docorg/.docorg-quarantine/`, `mv` it back |
| Rename put a file in the wrong matter | Edit `taxonomy.json`, re-run Step 3 + 5 |
