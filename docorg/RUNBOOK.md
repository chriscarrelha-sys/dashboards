# RUNBOOK — copy/paste, top to bottom

Every command is a full line you paste into **Terminal.app**. Nothing here
deletes a file. Duplicates are *moved* to a quarantine folder you delete
yourself, later, once you've seen the report.

Total hands-on time: ~20 minutes. The OCR pass runs unattended afterward.

---

## Fast path — one command does all of it

```bash
cd ~ && git clone https://github.com/chriscarrelha-sys/dashboards.git docorg-repo && \
cd docorg-repo && git checkout claude/document-org-storage-jjc4nk && \
bash docorg/bin/run-all.sh
```

It installs the tools, finds your cloud folders, checks the iCloud sync state,
inventories, de-duplicates, renames, indexes, and offers to start OCR — pausing
for a y/N before anything moves, and opening each report for you to look at
first. `--yes` runs it with no prompts; `--dry-run` reports without moving
anything.

The numbered steps below are the same pipeline done by hand, if you'd rather
drive it yourself or something goes wrong.

---

## Step 0 — Get the toolkit onto your Mac

```bash
cd ~ && \
git clone https://github.com/chriscarrelha-sys/dashboards.git docorg-repo && \
cd docorg-repo && git checkout claude/document-org-storage-jjc4nk && \
bash docorg/bin/setup.sh
```

Then set a shortcut you'll reuse below:

```bash
echo 'alias docorg="python3 ~/docorg-repo/docorg/bin/docorg.py"' >> ~/.zshrc && source ~/.zshrc
```

---

## Step 1 — Stop the bleeding (do this FIRST)

### 1a. iCloud "Desktop & Documents Folders" — read this before deciding

**This checkbox is not iCloud Drive.** It is one option *inside* iCloud Drive
that redirects your Mac's `~/Desktop` and `~/Documents` into the cloud.
Turning it off does **not** turn off iCloud Drive, Photos, Notes, Messages,
contacts, or calendars. All of that keeps working on every device.

**You do not lose your files on iPhone.** The Google Drive iOS app registers
as a File Provider, so the vault appears in the iPhone **Files app** under
Locations, directly below iCloud Drive. Same app, same browsing, different
pipe — and it's the pipe a remote session can also read.

Why turning it off matters here:

- With it on, `~/Desktop` and `~/Documents` are a **second cloud root**. Every
  file you save there becomes a copy competing with the vault. This is the
  mechanism that produced the current mess.
- macOS gives no way to exclude a subfolder, so anything you put under
  `~/Documents` — including scratch and working files — is uploaded.

**Recommended:** turn it off.

> System Settings → Apple Account → iCloud → **iCloud Drive** → Options…
> → untick **Desktop & Documents Folders** → Done.

macOS moves your existing Desktop/Documents into `~/Library/Mobile
Documents/…/Desktop`. Nothing is lost — Step 3 catalogs it and Step 4
de-duplicates it.

**If you want to keep it on:** that's a legitimate call, and this toolkit
still works. It keeps all of its state in `~/docorg-data/` and clones to
`~/docorg-repo/` — both outside `~/Documents`, so the quarantine folder and
the SQLite index are never uploaded to iCloud. The cost of keeping it on is
discipline: Desktop and Documents remain a competing root, so you have to
actually follow the rule that **everything lands in `00_VAULT/`**, and re-run
the monthly upkeep to catch what drifts.

### 1b. Make both clouds stream instead of download

> Drive for Desktop menu bar icon → gear → Preferences → Google Drive →
> **Stream files** → Save.

Same for OneDrive:

```bash
defaults write com.microsoft.OneDrive FilesOnDemandEnabled -bool true
```

This is what makes a mirrored file cost ~0 local disk.

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
open ~/docorg-data/reports/duplicates.csv
```

Each `KEEP` row is the copy that survives; each `QUARANTINE` row is a
byte-identical twin. The keeper is chosen by: Google Drive first, then
canonical `2026.03.18` date-prefixed names, then non-`copy`/`(2)` names,
then shortest path.

When the CSV looks right:

```bash
bash ~/docorg-data/reports/quarantine-duplicates.sh
```

Duplicates move to `~/docorg-data/.docorg-quarantine/`. Because they
leave the Drive folder, Drive releases the cloud quota. **Nothing is deleted.**
After 30 days of everything working:

```bash
rm -rf ~/docorg-data/.docorg-quarantine
```

---

## Step 5 — Rename to one convention

```bash
docorg rename && open ~/docorg-data/reports/renames.csv
```

Proposed format — sorts chronologically, greps cleanly, reads in a filing:

```
2026-03-18__10-TRUIST__DISCOVERY__Requests-for-Admission.pdf
2026-06-22__10-TRUIST__COMPLAINT__Verified-Federal-Complaint.pdf
```

Wrong matter or doctype on some rows? Edit
`~/docorg-repo/docorg/config/taxonomy.json`, then re-run
`docorg scan …` (Step 3) and `docorg rename`. Repeat until the CSV is right.

Then apply — renames in place, creates no copies:

```bash
bash ~/docorg-data/reports/apply-renames.sh
```

---

## Step 6 — Make scanned PDFs searchable (unattended, hours)

Run it and walk away. Safe to interrupt with Ctrl-C and re-run — it skips
PDFs that already have a text layer.

```bash
nohup bash ~/docorg-repo/docorg/bin/ocr-pass.sh \
  ~/Library/CloudStorage/GoogleDrive-chriscarrelha@gmail.com/My\ Drive \
  > /tmp/ocr.out 2>&1 &
```

Check on it any time:

```bash
tail -f ~/docorg-data/reports/ocr.log
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
open ~/docorg-data/reports/CATALOG.md
```

---

## Step 8 — The OneDrive bridge (only if you need it)

Only for apps that can't read Google Drive. Put just those files in
`00_VAULT/../10_ACTIVE/`.

```bash
mkdir -p ~/Library/CloudStorage/GoogleDrive-chriscarrelha@gmail.com/My\ Drive/10_ACTIVE
bash ~/docorg-repo/docorg/bin/onedrive-bridge.sh --dry-run
```

Review the dry run, then make it automatic every 15 minutes:

```bash
sed "s|REPLACE_WITH_PATH|$HOME/docorg-repo|" \
  ~/docorg-repo/docorg/config/com.docorg.onedrive-bridge.plist \
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
| A quarantined file was needed | It's in `~/docorg-data/.docorg-quarantine/`, `mv` it back |
| Rename put a file in the wrong matter | Edit `taxonomy.json`, re-run Step 3 + 5 |
