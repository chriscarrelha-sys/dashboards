# Final integrations matrix (Phase 6 §56)

Every integration, at its **honest** availability level. This is the single
authoritative table; the in-app Integrations Hub reflects the same status via
`lib/integrations/registry.ts` and `lib/enums.ts` `PROVIDER_CAPABILITIES`.

**Levels:** `live` · `live (limited)` · `external-link only` · `manual import`
· `mocked` · `disabled` · `unsupported` · `planned`.

| Integration | Level (v1) | Capabilities | Data transmitted | Known limitations | On failure | Disconnect |
|-------------|-----------|--------------|------------------|-------------------|-----------|-----------|
| **OpenAI** | mocked → live when key set | Drafting, synthesis, case-wide analysis, planning | Only the source scope you confirm; never privileged/settlement docs without confirmation | Output routes to Verification Queue; never verified fact | Falls back to labeled mock | Remove `OPENAI_API_KEY`; set case AI mode |
| **Claude (Anthropic)** | mocked → live when key set | Long-document review, comparison, extraction | Confirmed source scope only | Same trust rules | Labeled mock | Remove `ANTHROPIC_API_KEY` |
| **Perplexity** | mocked → live when key set | Public-source discovery, current research | Research queries only | Research is unverified until you open the source | Labeled mock | Remove `PERPLEXITY_API_KEY` |
| **Gemini** | mocked → live when key set | Secondary review | Confirmed scope only | Same trust rules | Labeled mock | Remove `GEMINI_API_KEY` |
| **Adobe Acrobat** | external-link only | Open original in Acrobat | None (local hand-off) | No API; combine/redact/OCR not wired | N/A | N/A |
| **iCloud Drive** | mocked (companion protocol) | Folder monitoring via companion | Only files you select; nothing scanned disk-wide | Needs the signed native app (deferred) | Manual upload | Revoke device |
| **Finder / local folders** | live (limited) | Store/retrieve/download originals | Local only | Selected folders only | Error surfaced | N/A |
| **OneDrive** | mocked | Selected-folder import/export | Selected files only | Needs Microsoft OAuth | Manual upload | Remove credentials |
| **Google Drive** | mocked / planned | Selected-folder import | Selected files only | Needs Google OAuth | Manual upload | Remove credentials |
| **Apple Calendar** | mocked (+ ICS export) | Add hearings/deadlines | Only **confirmed** deadlines; privacy-safe text | Mock until authorized | ICS export always works | Disconnect in Integrations |
| **Google Calendar** | mocked / planned | Add confirmed deadlines | Confirmed deadlines only | Needs Google OAuth | ICS export | Disconnect |
| **Outlook Calendar** | mocked / planned | Add confirmed deadlines | Confirmed deadlines only | Needs Microsoft OAuth | ICS export | Disconnect |
| **Gmail** | manual import / planned | Import selected messages, extract attachments | Only selected messages | No continuous ingestion by default | Manual forward | Remove credentials |
| **Outlook Email** | manual import / planned | Import selected messages | Only selected messages | Needs Microsoft OAuth | Manual forward | Remove credentials |
| **PeachCourt / eFileGA** | external-link only | Open matter, copy case number | None | No public API; **records filings, never files** | N/A | N/A |
| **PACER** | external-link only | Open matter | None (read API is paid/credentialed, planned) | No filing API | N/A | N/A |
| **Rocket Lawyer** | external-link only | External resource | None | Link only | N/A | N/A |
| **Court docket monitoring** | manual import | Manual entries + docket-sheet import → Verification Queue | Only what you upload | No login-scraping; non-manual providers shown `unavailable` | Stays manual | N/A |
| **Email/push notifications** | mocked (in-app is live) | Reminders, digests | N/A | Email/push are mock channels | In-app still fires | Preferences |
| **Search backend** | live (local index) | Case/global search, page-level, filters | Local only; secrets excluded | Fuzzy is approximate; no semantic/vector yet | N/A | N/A |

**Golden rules encoded across the app:**
- A mock is never shown as live.
- AI output is never a verified legal fact and never a win-probability score.
- No court filing is ever claimed as submitted.
- No docket is claimed monitored without an authorized source.
- Secrets are server-side only and never indexed.
