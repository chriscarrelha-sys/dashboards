/**
 * App-level enums. Modeled as string unions + label maps rather than DB enums
 * so the schema stays portable (SQLite dev → Postgres prod) and values can
 * evolve without a migration. Validation happens with Zod at the service layer.
 */

export const FORUMS = ['state', 'federal', 'arbitration'] as const;
export type Forum = (typeof FORUMS)[number];

export const CASE_TYPES = [
  'foreclosure',
  'replevin',
  'contract',
  'consumer',
  'general-civil',
  'other',
] as const;

export const DOCUMENT_TYPES = [
  'Complaint',
  'Answer',
  'Motion',
  'Response',
  'Reply',
  'Order',
  'Notice',
  'Discovery Request',
  'Discovery Response',
  'Exhibit',
  'Correspondence',
  'Declaration',
  'Verification',
  'Other',
] as const;
export type DocumentType = (typeof DOCUMENT_TYPES)[number];

export const DOCUMENT_STATUSES = ['draft', 'filed', 'served', 'received', 'entered'] as const;

/** IA buckets shown under the Documents nav group. */
export const DOCUMENT_CATEGORIES = [
  { key: 'drafts', label: 'Drafts' },
  { key: 'filed', label: 'Filed Documents' },
  { key: 'orders', label: 'Orders' },
  { key: 'correspondence', label: 'Correspondence' },
  { key: 'research', label: 'Research' },
] as const;

/**
 * The trust model. Every AI-extracted or date-calculated value carries one of
 * these, and the UI renders each with a distinct badge so the user can always
 * tell a confirmed fact from a proposal.
 */
export const VERIFICATION_STATUSES = [
  'proposed',
  'unverified',
  'confirmed',
  'disputed',
  'corrected',
] as const;
export type VerificationStatus = (typeof VERIFICATION_STATUSES)[number];

export const VERIFICATION_LABELS: Record<VerificationStatus, string> = {
  proposed: 'Proposed',
  unverified: 'Unverified',
  confirmed: 'Confirmed',
  disputed: 'Disputed',
  corrected: 'Corrected',
};

export const DEADLINE_SOURCES = ['extracted', 'calculated', 'manual'] as const;
export type DeadlineSource = (typeof DEADLINE_SOURCES)[number];

export const TIMELINE_EVENT_TYPES = [
  'filing',
  'service',
  'hearing',
  'order',
  'discovery',
  'communication',
  'payment',
  'fact',
  'procedural',
  'settlement',
] as const;

export const TIMELINE_TYPES = [
  'combined',
  'procedural',
  'factual',
  'discovery',
  'settlement',
] as const;

export const TASK_PRIORITIES = ['low', 'normal', 'high', 'critical'] as const;
export const TASK_STATUSES = ['open', 'in-progress', 'blocked', 'done'] as const;

/** How confident an automated classification must be to auto-apply vs. queue. */
export const CONFIDENCE_AUTO_APPLY = 0.85;
export const CONFIDENCE_REVIEW_FLOOR = 0.5;

/** Item classes that must ALWAYS be confirmed by the user, regardless of score. */
export const ALWAYS_CONFIRM_KINDS = [
  'deadline',
  'hearing',
  'service-date',
  'procedural-obligation',
  'legal-conclusion',
  'governing-rule',
  'calculated-date',
] as const;

/* ============================ PHASE 2 ============================ */

export const EVIDENCE_TYPES = [
  'documentary', 'testimonial', 'admission', 'business-record', 'public-record',
  'demonstrative', 'digital', 'communication', 'financial-record', 'photograph',
  'audio-video', 'expert', 'impeachment', 'damages', 'procedural', 'other',
] as const;
export type EvidenceType = (typeof EVIDENCE_TYPES)[number];

export const EVIDENCE_POSTURES = ['supports-user', 'adverse', 'mixed', 'neutral', 'unknown'] as const;
export type EvidencePosture = (typeof EVIDENCE_POSTURES)[number];

export const EVIDENTIARY_STATUSES = [
  'identified', 'collected', 'reviewed', 'needs-authentication', 'authenticated',
  'disputed', 'excluded', 'admitted', 'unresolved',
] as const;

export const AUTHENTICATION_STATUSES = [
  'not-started', 'needs-authentication', 'in-progress', 'authenticated', 'disputed',
] as const;

export const EXHIBIT_STATUSES = [
  'not-selected', 'candidate', 'selected', 'needs-redaction', 'needs-page-extraction',
  'needs-authentication', 'ready', 'included-in-binder', 'filed', 'admitted', 'excluded',
] as const;

export const EVIDENCE_LINK_RELATIONS = ['supporting', 'adverse', 'impeachment'] as const;

export const CONTRADICTION_STATUSES = [
  'proposed', 'confirmed', 'disputed', 'explained', 'resolved', 'immaterial', 'rejected',
] as const;

export const ADMISSION_CATEGORIES = [
  'rfa-response', 'pleading', 'affidavit', 'deposition', 'hearing-testimony',
  'correspondence', 'contract-record', 'judicial', 'party-statement', 'stipulation', 'other',
] as const;

export const LEGAL_ISSUE_TYPES = [
  'claim', 'counterclaim', 'defense', 'affirmative-defense', 'procedural', 'evidentiary', 'remedy',
] as const;
export type LegalIssueType = (typeof LEGAL_ISSUE_TYPES)[number];

export const LEGAL_ISSUE_STATUSES = [
  'asserted', 'disputed', 'pending', 'dismissed', 'withdrawn', 'resolved', 'preserved', 'undecided',
] as const;

export const ELEMENT_STATUSES = [
  'supported', 'partially-supported', 'disputed', 'unsupported',
  'missing-evidence', 'legal-issue-unresolved', 'not-applicable',
] as const;
export type ElementStatus = (typeof ELEMENT_STATUSES)[number];

export const DISCOVERY_TYPES = [
  'interrogatories', 'rfp', 'rfa', 'subpoena', 'deposition-notice',
  'deposition-topics', 'third-party', 'informal', 'other',
] as const;

export const DISCOVERY_SET_STATUSES = [
  'draft', 'served', 'received', 'response-due', 'partially-answered',
  'completed', 'deficient', 'subject-to-motion', 'closed',
] as const;

export const DEFICIENCY_CATEGORIES = [
  'no-response', 'late-response', 'incomplete', 'evasive', 'boilerplate-objection',
  'unsupported-objection', 'missing-verification', 'missing-signature', 'missing-production',
  'incomplete-production', 'inconsistent', 'contradiction', 'improper-qualification',
  'failure-to-supplement', 'privilege-log', 'bates-numbering', 'authentication', 'other',
] as const;

export const DEFICIENCY_STATUSES = [
  'proposed', 'confirmed', 'raised', 'awaiting-cure', 'partially-cured',
  'cured', 'disputed', 'included-in-motion', 'waived', 'closed',
] as const;

/** Verification-queue proposal kinds introduced in Phase 2. */
export const PROPOSAL_KINDS = [
  'evidence', 'contradiction', 'admission', 'legal-issue', 'legal-element',
  'discovery-extraction', 'discovery-deficiency', 'witness', 'authentication',
] as const;
export type ProposalKind = (typeof PROPOSAL_KINDS)[number];

/** Human labels for the many kebab-case status strings above. */
export function humanize(s: string | null | undefined): string {
  if (!s) return '—';
  return s.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}
