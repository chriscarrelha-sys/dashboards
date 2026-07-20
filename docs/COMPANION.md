# Mac companion — protocol & spec

A browser cannot safely browse iCloud Drive continuously. The companion is a **native
SwiftUI (preferred) or Tauri** app that monitors user-selected folders. This repo implements
the **server side** of its protocol + a reference agent (`scripts/companion-agent.mjs`); the
native binary is not built/signed here (requires an Apple Developer account + your approval).

## Registration (implemented)
1. User signs in (browser) → Administration → Companion Devices → **Create registration code**
   (one-time, 10-min expiry).
2. Companion POSTs `{ code, deviceName }` to `POST /api/companion/register`.
3. Server validates, mints a device token, stores **only its SHA-256 hash**, returns the token
   **once** (companion stores it in the macOS Keychain), marks the code used.
4. Device appears in the device list; user can **revoke** it (token stops authenticating).
   No user password is ever handled by the companion.

Reference: `node scripts/companion-agent.mjs register <CODE>` then `... scan <folder>`.

## Folder model (spec)
Explicit user-selected folders only — **no whole-disk scanning**. Store macOS security-scoped
bookmarks. Per folder: choose/grant/view/revoke/test access, reveal in Finder, sync status.

## Monitoring & import (spec)
Detect new/renamed/modified/deleted/moved files → capture path, iCloud path, name, MIME, size,
dates, hash, inferred case/type. Import modes: **review-first** (default), auto-import
high-confidence (case+type over threshold), manual-only. After import: create document record,
preserve original filename, generate standardized name, assign case/category, start OCR/extraction,
support Undo. **Never rename/move the original local file** without explicit config.

## Round-trip & open/edit (spec)
Download generated outputs (filing packages, binders, exhibits, archives) into a selected folder;
re-uploading an edited local file creates a **new version** (prior versions preserved, ask for a
label + summary). Open in Finder/Preview/Adobe.

## Security threat model
Per-device revocable token (hashed at rest), 90-day expiry/rotation, encrypted transport,
least-privilege explicit folders, no unrestricted disk scanning, operation logs, remote revocation,
Keychain storage, no long-lived unrestricted credentials in plaintext. Diagnostics export excludes
document contents and credentials.
