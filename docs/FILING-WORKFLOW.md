# Filing, service & research workflows (Phase 3)

## Filing lifecycle

A `Filing` moves through configurable stages (`lib/enums.ts` → `FILING_STAGES`):

```
planned → research → outline → initial-draft → evidence-linked → authorities-linked
→ citation-verification → legal-review → formatting-review → exhibits-assembled
→ proposed-order → certificate-prepared → final-review → ready-to-file → filed
→ filed-stamped → served → service-confirmed → court-response-pending → resolved
```

- Every transition writes a `FilingStageHistory` row; you can move **backward** for revisions.
- **Versions are never overwritten** (`FilingVersion`); one is designated `final-for-filing`.
- Support is linked via join tables (`FilingLegalIssueLink`, `FilingEvidenceLink`,
  `FilingAuthorityLink`, `FilingDiscoveryLink`, `FilingDocumentLink`) — **no file duplication**.

## Readiness & quality-control

`runReadinessChecks` produces **operational warnings, not legal conclusions**
(missing certificate, unverified authority, placeholder text, no final version,
unconfirmed deadline, …). Each becomes a `FilingChecklistItem(isWarning)`.
**Waiving a warning requires a reason and is written to the audit log.**

## Filing packages

`FilingPackage` + `FilingPackageItem` order the components. A downloadable
**manifest** (`/case/[id]/filing-package/[packageId]/manifest`) lists caption,
case number, court, each file, upload order, confidentiality, exhibit
designation, and unresolved warnings. **A bundled ZIP is a future step.**

## Filing & service

- Pro Se Wins **records** filing details (`FilingSubmission`) and **does not submit**
  to PeachCourt or PACER. Submit in the portal, then record here; open the portal
  via the external link.
- Certificates (`CertificateOfService`) generate a **draft** statement that must
  be reviewed before it's final.
- Service is tracked as `ServiceEvent`s (multiple per filing) against reusable
  `ServiceRecipient` profiles that carry a **last-verified date** — an old address
  is never assumed current. Service events mirror to the timeline.

## Legal research & citations

- `Authority` records start **unverified**; `verifyAuthority` records each
  verification step and promotes the status only on human confirmation.
  **AI-generated citations stay unverified until the source is opened.**
- `aiExtractCitations` (mock) proposes `CitationOccurrence`s to the Verification
  Queue with flags; it never fabricates pages (marks them `unavailable`).

## AI drafting (source-controlled)

`aiDraft` records the **approved source scope** (shown before submission) on an
`AIDraftRun`. Output distinguishes source-supported facts, verified vs.
unverified legal propositions, and AI inference; unsupported assertions are
flagged, **never given invented support**. `aiReviewDraft` files `DraftReviewIssue`s
and Verification-Queue items — it **never rewrites** the filing.

## What's mocked vs. real

- **Mocked:** AI drafting/review/citation extraction (no live model), ZIP
  bundling, rich-text/PDF diff, email ingestion, live research provider.
- **Real & persisted:** the entire filing/version/checklist/package/submission/
  certificate/service data model, authority verification workflow, strategy
  supersession, immutable decision log, cross-case authorization, and audit trail.
