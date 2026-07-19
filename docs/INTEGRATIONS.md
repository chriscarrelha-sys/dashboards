# Integration status

Honest status of every connector. Source of truth:
[`lib/integrations/registry.ts`](../lib/integrations/registry.ts). Status is
resolved at runtime: `connected` (real credential present), `mock` (built-in
placeholder so the feature is explorable), or `unavailable`.

**Nothing is reported as functional unless it truly is.**

## AI providers

| Provider | v1 status | Becomes "connected" when | Notes |
|----------|-----------|--------------------------|-------|
| OpenAI (ChatGPT) | mock | `OPENAI_API_KEY` set | Strategy, drafting, synthesis. |
| Claude (Anthropic) | mock | `ANTHROPIC_API_KEY` set | Long-doc review, comparison, extraction. |
| Perplexity | mock | `PERPLEXITY_API_KEY` set | Research, source discovery. |
| Gemini | mock | `GEMINI_API_KEY` set | Secondary review. |
| Adobe Acrobat | unavailable | — | Desktop hand-off only in v1; no API wired. |

The provider **router** (`lib/providers/ai/registry.ts`) picks a preferred
available provider per task and otherwise falls back to the mock. The UI always
shows which provider will run **before** you send, and you can override it.
Keys are read server-side only; documents are never sent to a provider without a
configured provider and an explicit action.

## Storage

| Provider | v1 status | Notes |
|----------|-----------|-------|
| Finder / Local folders | mock (functional local store) | Real: originals saved under `STORAGE_LOCAL_ROOT` via `StorageProvider`. |
| iCloud Drive | unavailable | Browsers can't browse all of iCloud without a companion app; planned selected-folder sync. |
| OneDrive | unavailable | Needs Microsoft credentials. |

**iCloud is not natively connected** and is not represented as such.

## Calendars

| Provider | v1 status | Notes |
|----------|-----------|-------|
| Apple Calendar | mock | Interface + `CalendarEventLink` model; ICS/event creation planned. |
| Google Calendar | mock | Needs Google OAuth. |
| Outlook Calendar | mock | Needs Microsoft OAuth. |

Planned reminder schedule (per spec): 30 / 14 / 7 / 3 / 1 days before + morning of.

## Court systems & legal

| System | v1 status | Notes |
|--------|-----------|-------|
| PeachCourt / eFileGA | external link | No public API; opens the portal in a new tab. |
| PACER | external link | No filing API; read (PCL) API is paid + credentialed (planned). |
| Rocket Lawyer | external link | External resource only. |

See the earlier analysis in the project history for why programmatic filing is
effectively closed to a solo tool today.
