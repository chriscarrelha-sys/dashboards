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
