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

## Phase 2 additions (evidence, legal issues, discovery)

Extended existing models with nullable Phase 2 fields (non-destructive) and added:

- **Evidence links:** `EvidenceLegalIssueLink` (with optional `elementId` + `relation` = supporting/adverse/impeachment), `EvidenceDiscoveryLink`, `EvidenceTimelineLink`, `EvidenceMotionLink`, `EvidenceDocumentLink` — many-to-many so one source document backs many issues **without file duplication**.
- **Legal issues:** unified `LegalIssue` (`issueType` = claim/counterclaim/defense/affirmative-defense/procedural/evidentiary/remedy) + `LegalIssueElement` (the Elements & Burdens matrix) + `LegalIssueAuthorityLink`.
- **Contradictions:** `ContradictionStatement` (2+ source statements per contradiction, each with document + page + author).
- **Discovery:** `DiscoverySet` → `DiscoveryRequest` (belongs to a set, retains individual records) → `DiscoveryResponse`; plus `DiscoveryDeficiency`, `MeetAndConferRecord`, `Subpoena`, `Deposition`.
- **Authentication:** `AuthenticationRecord` (foundation/hearsay/best-evidence tracking on evidence or documents).

Migration: `20260719114745_phase2_evidence_discovery` (additive; Phase 1 data preserved).

## Phase 3 additions (filing, service, research, strategy)

Extended `Filing`, `Communication`, `Authority`, `DamageItem`, `DecisionLogEntry`
with nullable fields; added:

- **Filing:** `FilingStageHistory`, `FilingVersion`, `FilingChecklistItem`,
  `FilingPackage`/`FilingPackageItem`, `FilingSubmission`, and join tables
  `Filing{LegalIssue,Evidence,Authority,Discovery,Document}Link`.
- **Service:** `CertificateOfService`, `ServiceRecipient`, `ServiceEvent`.
- **Communications:** `CommunicationAttachment` (+ extended `Communication`).
- **Research:** `AuthorityVerification`, `CitationOccurrence`, `ResearchQuestion`,
  `ResearchMemorandum`.
- **Strategy:** `StrategyItem`, `StrategySnapshot`, `OpposingPosition`,
  `SettlementRecord`/`SettlementTerm`, `Remedy` (+ extended `DamageItem`,
  `DecisionLogEntry`).
- **AI:** `AIDraftRun`, `DraftReviewIssue`.

Migration: `20260719123800_phase3_filing_service_research_strategy` (additive; Phase 1 & 2 data preserved).

## Phase 4 additions (search, exhibits/binders, calendar, backup, security)

Added `deletedAt` (soft-delete) to Document, EvidenceItem, Filing, Communication; new models:
`SearchIndexEntry`, `SavedSearch`, `ExhibitSet`/`ExhibitItem`, `BatesJob`,
`Binder`/`BinderSection`/`BinderItem`, `CalendarConnection`, `NotificationPreference`,
`Notification`, `NotificationDigest`, `Backup`, `RestorePreview`, `CaseExport`,
`SecurityEvent`, `AppSession`, `SelectedFolder`, `BackgroundJob`.

Migration: `20260719..._phase4_search_exhibits_calendar_backup` (additive; Phase 1–3 data preserved).

## Notes on relationships

Relationships are intentionally simple in this first migration (foreign keys +
a generic `DocumentRelationship` join for document-to-document links). They can
be enriched (e.g. many-to-many evidence↔claims) without breaking existing rows.
