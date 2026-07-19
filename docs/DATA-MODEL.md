# Data model

Defined in [`prisma/schema.prisma`](../prisma/schema.prisma). Dev uses SQLite;
the schema is Postgres-portable. Below is the map of entities and the
conventions that matter.

## Conventions

- **IDs:** `cuid()` strings.
- **"Enums":** stored as strings, validated in `lib/enums.ts` + Zod. Keeps the
  schema portable and lets values evolve without a migration.
- **Trust fields:** anything that can be AI-extracted or date-calculated carries
  `confidence` (0–1) and `verificationStatus`
  (`proposed | unverified | confirmed | disputed | corrected`).
- **Ownership:** everything hangs off `Case`, which belongs to a `User`; every
  query/action filters by the signed-in user.

## Entity groups

- **Identity & case:** `User`, `Case`, `Court`, `CourtPortal`, `Judge`
- **People:** `Party`, `Attorney`, `Contact`, `Witness`
- **Documents:** `Document`, `DocumentVersion`, `DocumentCategory`,
  `DocumentTag`, `DocumentRelationship`
- **Ingestion & review:** `UploadJob`, `ExtractionResult`, `ReviewQueueItem`
- **Timeline / deadlines / tasks:** `TimelineEvent`, `Deadline`, `Task`,
  `CalendarEventLink`
- **Legal issues:** `Claim`, `Defense`, `LegalIssue`, `Authority`
- **Evidence:** `EvidenceItem`, `Exhibit`, `Admission`, `Contradiction`
- **Discovery:** `DiscoveryRequest`, `DiscoveryResponse`
- **Motions & filings:** `Motion`, `Filing`
- **Communications:** `Communication`
- **Strategy:** `StrategyNote`, `DecisionLogEntry`, `DamageItem`
- **Research:** `ResearchItem`
- **AI:** `AIConversation`, `AIMessage`, `AIProviderRun`, `AIOutput`
- **Ops:** `Integration`, `StorageLocation`, `CaseNote`, `AuditLog`

## Key trust-bearing tables

| Table | Trust behavior |
|-------|----------------|
| `Document` | `verificationStatus` starts `proposed`; `confirmed` only when auto-applied at high confidence or user-approved. |
| `Deadline` | starts `unverified` (or `confirmed` only for a manual, user-set date); calculated dates always require an explicit Confirm. |
| `TimelineEvent` | manual entries `confirmed`; system/AI-proposed `proposed`. |
| `Contradiction`, `EvidenceItem` | AI-surfaced items start `proposed`. |
| `AIOutput` | every AI output starts `proposed` and must be routed through review before it becomes case record. |

## Notes on relationships

Relationships are intentionally simple in this first migration (foreign keys +
a generic `DocumentRelationship` join for document-to-document links). They can
be enriched (e.g. many-to-many evidence↔claims) without breaking existing rows.
