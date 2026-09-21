# Intake Manifest — where the record comes from

The system may only cite documents that exist in `cases/<case>/01_record/`, indexed by
`record-custodian`. This file defines how documents get there and which channels are
actually reachable.

## Channel reality check (verified 2026-09-21)

| Channel | Reachable from a Claude Code cloud session? | Notes |
|---|---|---|
| **Dropbox** | **Yes** — connector | Primary record store for this user. Search + full-text fetch. |
| **Google Drive** | **Yes** — connector | Secondary; holds spreadsheets and older matters. |
| **Gmail** | **Yes** — connector | Service copies, ECF notices, opposing-counsel correspondence. |
| **CourtListener / RECAP** | **Yes** — MCP | Docket shell only unless someone has purchased the documents. |
| **Notion** | Yes — connector | Not currently used for this matter. |
| **PACER (direct)** | **No** | No PACER credentials in the session. User must download. |
| **The user's computer** (`~/Documents`, Desktop) | **No** | Cloud container; no desktop link. Desktop control requires the Claude desktop app running on that machine. |
| **iCloud Drive** | **No** | No iCloud connector exists. Reachable only by syncing the folder to Dropbox/Drive, or uploading. |
| **OneDrive / Box** | **No** | No connector configured. |

**Consequence:** anything that lives only on the Mac or in iCloud is invisible to the
system. The supported bridge is: put it in Dropbox (or Drive), then run intake.

## Intake procedure

1. **Drop** new documents into the case's record source (for Carrelha: the Dropbox
   `SHELLPOINT MASTER CASE FILE` tree).
2. **Name** them `YYYY-MM-DD - Doc NN - Short Description.pdf`. The custodian parses
   this. A file without a docket number is inventoried as `EXHIBIT` or `HISTORICAL`,
   never as `OPERATIVE`.
3. **Run** `record-custodian`. It writes/refreshes `01_record/RECORD_INDEX.md`,
   assigning every document one status and flagging every `MISSING` document that the
   docket implies should exist.
4. **Run** `docket-deadline-clerk`. It recomputes `02_procedure/DEADLINES.md` from the
   refreshed index.
5. Only then may any drafting agent run.

## What is NOT copied into this repository

Case PDFs are **not** committed to git. This repository stores the *index* — docket
number, date, title, status, and source path — not the documents. Three reasons:

- The user has an active search-engine de-indexing and PII-suppression effort on this
  case; adding another copy of the record to a hosted repository works against it.
- The documents contain a loan number, a home address, and financial records.
- Dropbox is already the system of record and is versioned.

`record-custodian` therefore indexes by reference. Agents fetch document text through the
Dropbox connector at analysis time and keep quotations in the analysis files.

## Standing gate for the Carrelha matter

As of 2026-09-21 the following are **MISSING** and block the workstreams named:

| Document | Blocks |
|---|---|
| Doc 36 — operative Amended Complaint | every Rule 12 element matrix; the McCalla opposition |
| Doc 39 — 2026-09-09 order granting the discovery stay | the Rule 72(a) timing and merits analysis |
| Doc 40 — McCalla motion to dismiss, filed 2026-09-11 | the opposition; the old-MTD/new-MTD delta |
| Doc 41 — 2026-09-15 Notice of Foreclosure Sale Scheduling | the 60-day compliance check; any renewed Rule 65 motion |

Until each arrives, the corresponding deliverable's release state is
`BLOCKED BY MISSING OPERATIVE RECORD`. No agent may substitute an earlier version,
a summary, a docket-text snippet, or an inference for the document itself.
