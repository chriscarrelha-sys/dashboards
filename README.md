# CaseDeck — Pro Se Case Management

A local-first case management dashboard for self-represented (pro se) litigants.
It brings the three things pro se litigants struggle with most — **scattered
documents, missed deadlines, and no way to search what they already have** —
into one workspace.

Everything runs in the browser. There is no server, no account, and no upload:
your documents and case data never leave your machine.

> ⚖️ CaseDeck is an organizational tool, **not legal advice**.

## Features

| Area | What it does |
|------|--------------|
| **Dashboard** | Case-at-a-glance: document counts, open/overdue deadlines, next due date, document-type breakdown, and recent activity. |
| **Documents** | Drag-and-drop / file-picker upload. Auto-categorizes each file by type (Pleading, Motion, Exhibit, Correspondence, Discovery, Order) from its name, with an editable status tag (Draft → Filed → Served → Pending Response). Filter by name, type, or status. |
| **Deadlines** | Track due dates with an overdue/soon/ok indicator, mark them done, and link them to a document. Built-in **deadline calculator** adds calendar *or* business days from a trigger date (e.g. "21 days after service"). |
| **Timeline** | Auto-built chronological view of every filing, deadline, and exhibit — the "tell your story to the judge" view. |
| **Evidence Locker** | Logs each item with a **SHA-256 fingerprint** (computed via the Web Crypto API) plus a **chain-of-custody log** you append to over time — upload date, source, and every action taken with the item. |
| **Search** | Plain-language keyword search ranked across document names, notes, types, statuses, deadlines, and evidence sources, with match highlighting. |
| **Multiple cases** | Switch between cases; each is stored independently. |
| **Export / Import** | Export a whole case (metadata **and** file bytes) to a single portable `.casedeck.json` file, and import it back on any machine. |

## Running it

It's a static site — no build step.

```bash
# from the repo root, any static server works:
python3 -m http.server 8000
# then open http://localhost:8000
```

Use a local server (or any http/https host) rather than opening `index.html`
directly from the filesystem: the SHA-256 hashing relies on the Web Crypto API,
which browsers only expose in a **secure context** (https or `localhost`).

## How data is stored

- **Case metadata** (documents, deadlines, evidence records, notes) → `localStorage`.
- **File bytes** (the actual PDFs/images) → **IndexedDB**, so large files don't
  bloat `localStorage`.
- Nothing is ever sent over the network. Clearing your browser storage clears
  your cases — use **Export** to keep a backup.

## Project layout

```
index.html        App shell + layout
css/styles.css    Self-contained styling (no external fonts/assets)
js/store.js       Persistence: IndexedDB blobs + localStorage case index
js/util.js        Helpers: hashing, date math, formatting, auto-classification
js/views.js       One render function per screen
js/app.js         Controller: navigation, modals, case lifecycle, export/import
```

## Roadmap

Natural extensions that fit the local-first design:
- OCR of scanned uploads (e.g. Tesseract.js) to make photos of paper filings searchable
- In-app PDF viewer with highlight/sticky-note annotation (PDF.js)
- Court-rule presets so the deadline calculator auto-fills common triggers
- True retrieval-augmented (RAG) semantic search over document text
