# Security & privacy (threat model + status)

Honest statement of what is implemented vs. planned. **No exaggerated claims.**

## Implemented
- **Server-side authorization on every mutation.** `assertOwnedCase` / `assertSameCase`
  (`lib/auth/guard.ts`) reject cross-case access and cross-case links — tested.
- **Case-scoped search isolation** — case-scoped queries can never return another
  case's rows (double-checked in `runSearch`); confidential records excluded unless opted in.
- **Secrets are server-side only.** API keys/tokens are read from `process.env`
  in server code; provider availability is exposed to the client as booleans, never values.
  `.env` is git-ignored. The indexer only reads content fields — secrets are never indexed.
- **Soft-delete + confirmed permanent deletion.** Trash keeps records 30 days;
  purge requires typing `DELETE` and only removes the app record (not external files).
- **Security-event log + audit log** for logins, backups, exports, restores,
  permanent deletions, integration connects, and authorization failures.
- **Sessions** model with revoke; **backups** are encrypted-flagged, checksummed,
  and require verification (checksum + encryption + restore test) before "verified".
- **No auto-transmission to AI** — providers are key-gated, output is mock without keys,
  and drafting shows its source scope before submission.

## Not yet implemented (planned)
- **Real authentication.** Runs in `AUTH_DEV_MODE` single-user mode — **not production auth.**
  Planned: Sign in with Apple/Google/Microsoft, passkeys, **2FA** (authenticator + recovery
  codes), forced re-auth for sensitive ops (permanent delete, full export, credential changes,
  restore). The `AppSession`/`SecurityEvent` models are the seam for this.
- **Encryption at rest** beyond host FS/DB (dev DB is unencrypted SQLite); real
  backup/export encryption keys.
- **File-upload hardening:** signature validation, malware scan, sandboxed PDF parsing,
  quarantine. Current uploads compute SHA-256 and store bytes; deeper validation is planned
  (a `suspicious-upload` security-event type exists for it).
- **Rate limiting**, CSRF hardening beyond framework defaults, native push, real OAuth token
  storage/rotation.

## Threat-model notes (Mac companion — future)
Per-device revocable tokens, least-privilege explicit folder selection (no unrestricted
disk scanning), encrypted transport, operation logs, remote revocation. No long-lived
unrestricted credentials in plaintext. See `docs/COMPANION.md` (spec) — not yet built.

## Production-readiness gaps (must-fix before deployment)
1. Replace dev-mode auth with a real provider + 2FA.
2. Move to PostgreSQL with encryption at rest; encrypt backups/exports with a real KMS.
3. Add rate limiting, file-scan, and sandboxed PDF processing.
4. Externalize the search index and job queue; real OAuth for calendar/storage.
