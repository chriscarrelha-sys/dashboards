# Verification workflow

The trust model in one place. Nothing AI-proposed becomes case record without an
explicit human approval, and approval always creates a real structured record and
an audit entry.

## Flow

```
AI extraction (mock)          user action
      │                            │
      ▼                            ▼
ReviewQueueItem (status=pending) ──► Verification Queue UI
  kind, proposal(JSON),                 │
  confidence, provider,                 ├── Approve ──► create/update structured record
  sourceDocId, sourcePage, reason       │               (EvidenceItem / Contradiction / Admission /
                                        │                LegalIssue / DiscoverySet / DiscoveryDeficiency /
                                        │                Witness / Document classification)
                                        │               + AuditLog(verification.approve)
                                        ├── Approve-with-edits ──► merge edits over proposal, then create
                                        ├── Reject  ──► status=rejected (+ AuditLog)
                                        └── Defer   ──► status=deferred
```

Implemented in `lib/actions/verification.ts` (`resolveProposal`). Proposals are
produced by `lib/actions/ai-extraction.ts` (mock) and could later come from a
real provider behind `lib/providers/ai`.

## Proposal kinds

`document-classification`, `evidence`, `admission`, `contradiction`,
`legal-issue`, `legal-element`, `discovery-extraction`, `discovery-deficiency`,
`witness`, `authentication`.

## Guarantees

- **Always-confirm classes** (deadlines, hearings, service dates, legal
  conclusions, governing rules, calculated dates) never auto-apply — they only
  reach case record through this queue.
- **No fabricated citations/pages.** Mock extraction marks a page it cannot
  establish as `unavailable` and sets a `reason` requiring manual verification.
  Real providers must follow the same contract.
- **Case isolation.** Every approval re-checks case ownership; cross-case links
  are rejected server-side (`lib/auth/guard.ts`).
- **Audit.** Approvals, rejections, edits, creations, and AI proposals are all
  written to `AuditLog` (viewable at Administration → Audit History).

## What's mocked vs. real here

- **Mocked:** the extraction itself (no live model). Output is clearly labeled
  `[MOCK]` and low-confidence.
- **Real:** the queue, the approval logic, record creation, cross-case
  authorization, and the audit trail — all persist to the database.
