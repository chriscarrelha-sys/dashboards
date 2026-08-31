# Storage Architecture — the decision, and why

## The actual problem

You are paying for and syncing **three full copies** of the same corpus:
iCloud Drive, Google Drive, OneDrive. Nothing is authoritative, so every tool,
every session, and every filing has to guess which copy is current. The 2,345
"copies" are the symptom; three co-equal roots is the disease.

Evidence from your live Drive (2026-08-31): files exist in byte-identical
pairs under two naming schemes, all created in a single batch at
2026-08-02 02:26 — e.g. `3.18.26 Truist - Requests for Admission.pdf`
and `2026.03.18 - Truist - Document — 3.18.26 Court Draft - Requests for
Admission.pdf`, both 18,674 bytes, different folders. A previous organize
pass **wrote a second copy instead of renaming in place**.

## The question you asked: "can we do it without an actual copy?"

Short answer: **not across providers.** Worth knowing exactly why, so you
stop looking for the trick:

| Trick | Verdict |
|---|---|
| Symlink / macOS alias into the other cloud folder | **No.** Drive for Desktop and OneDrive do not follow symlinks; they either skip them or upload a broken stub the app can't read. |
| Hard link | **No.** Each `CloudStorage` provider is its own volume; hard links can't cross volumes. |
| Google Drive "shortcut" | Works **inside** Drive only. Invisible to OneDrive. |
| One blob, two provider namespaces | **Does not exist.** Each provider stores its own bytes. |

What *does* solve it:

1. **On-demand streaming kills the disk cost.** Drive for Desktop ("Stream
   files") and OneDrive ("Files On-Demand") both keep files as zero-byte
   placeholders until opened. So a mirrored file costs ~0 local disk. The
   real cost is *cloud quota*, not your SSD.
2. **Shrink what gets mirrored.** You don't need OneDrive to hold everything —
   only the folders the OneDrive-only apps actually open. That's `10_ACTIVE/`,
   not the whole vault. Duplication drops from 100% to a few percent.
3. **Make the mirror one-way and machine-maintained.** A projection that is
   rebuilt every 15 minutes from the vault can never diverge, so it is not a
   "copy" in the sense that hurts you — it's a rendering. You never edit it.

## The layout

```
Google Drive  ← SOURCE OF TRUTH (streamed, ~0 disk)
  My Drive/
    00_VAULT/          everything, organized by matter
      10-TRUIST/  11-SHELLPOINT/  12-NMAC/  13-USBANK/
      14-AMEX/    15-ENERBANK/    20-CREDIT/  30-FINANCE/
      40-PERSONAL/  99-UNSORTED/
    10_ACTIVE/         ← the ONLY folder that mirrors to OneDrive
    90_ARCHIVE/

OneDrive      ← narrow one-way projection of 10_ACTIVE/ (rclone, every 15 min)
iCloud Drive  ← Apple apps only. Desktop & Documents sync OFF.
Local disk    ~/docorg-data/   index, reports, quarantine
```

## Why Google Drive is the source of truth

Not preference — capability:

- **It is the only one of the three a remote session can read.** This
  architecture was written after querying your Drive live from a cloud
  session. iCloud Drive has no API at all. OneDrive Personal's is weak and
  not wired into your tooling. Your "I can't access shit I need to access"
  problem is solved by Drive and by nothing else.
- Your corpus is already there.
- `rclone`, Zapier, and the Drive connector all speak it.

## Why iCloud gets demoted

**Desktop & Documents Folders sync is the single biggest duplication
source.** It silently makes `~/Desktop` and `~/Documents` a fourth root, so
anything you save locally becomes a competing copy. Turn it off (Runbook
Step 1a). Keep iCloud for Photos, Notes, Messages, and app data — things
Drive can't hold.

Demoting iCloud does **not** cost you mobile access. The Google Drive iOS app
registers as a File Provider, so the vault appears in the iPhone Files app
under Locations, next to iCloud Drive — same app, same browsing. Phone access
moves to the pipe that a remote session can also read, rather than
disappearing.

Note that "Desktop & Documents Folders" is one option *inside* iCloud Drive,
not iCloud Drive itself. Unticking it leaves iCloud Drive, Photos, Notes,
Messages, contacts, and calendars fully intact on every device.

## What this frees

| | Before | After |
|---|---|---|
| Full corpus copies | 3 | 1 |
| Local disk used | full copies, downloaded | ~0 (streamed) |
| Authoritative copy | none | `00_VAULT/` |
| Remote/AI access | none reliable | Drive connector |
| Duplicate files | ~2,345 | 0 (quarantined, then deleted) |

## Rules that keep it clean

1. Everything lands in `00_VAULT/`. No exceptions.
2. Never save to Desktop or Documents. They are scratch.
3. Never edit on the OneDrive side — it is overwritten every 15 minutes.
4. New matter → new numbered folder + a line in `config/taxonomy.json`.
5. Re-run `docorg scan → dupes → index → catalog` monthly. It is idempotent.
