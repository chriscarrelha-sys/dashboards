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

/* ============================ PHASE 3 ============================ */

export const FILING_TYPES = [
  'complaint', 'amended-complaint', 'answer', 'amended-answer', 'counterclaim', 'reply-to-counterclaim',
  'motion', 'response', 'reply', 'surreply', 'notice', 'objection', 'affidavit', 'declaration',
  'brief', 'memorandum', 'proposed-order', 'certificate-of-service', 'discovery-motion',
  'motion-to-compel', 'motion-to-strike', 'motion-for-summary-judgment', 'motion-for-reconsideration',
  'motion-for-leave', 'emergency-motion', 'pretrial-filing', 'appellate-filing', 'arbitration-filing',
  'agency-complaint', 'settlement-demand', 'other',
] as const;

/** Ordered filing lifecycle stages. Configurable; index used for progress display. */
export const FILING_STAGES = [
  'planned', 'research', 'outline', 'initial-draft', 'evidence-linked', 'authorities-linked',
  'citation-verification', 'legal-review', 'formatting-review', 'exhibits-assembled',
  'proposed-order', 'certificate-prepared', 'final-review', 'ready-to-file', 'filed',
  'filed-stamped', 'served', 'service-confirmed', 'court-response-pending', 'resolved',
] as const;
export type FilingStage = (typeof FILING_STAGES)[number];

export const FILING_CHECKLIST_ITEM_STATUSES = [
  'not-applicable', 'incomplete', 'needs-review', 'complete', 'blocked', 'waived',
] as const;

export const VERSION_LABELS = [
  'initial-draft', 'revised-draft', 'reviewer-draft', 'citation-reviewed', 'final-for-filing',
  'redacted-filing-copy', 'filed-copy', 'filed-stamped', 'served-copy', 'exhibit-copy',
] as const;

export const SERVICE_METHODS = [
  'efile', 'mail', 'personal', 'overnight', 'hand-delivery', 'consented-email', 'other',
] as const;

export const COMMUNICATION_TYPES = [
  'email', 'letter', 'call', 'voicemail', 'text', 'meeting', 'video', 'court', 'clerk',
  'process-server', 'opposing-counsel', 'settlement', 'meet-confer', 'internal', 'other',
] as const;

export const CONFIDENTIALITY_LEVELS = [
  'public', 'confidential', 'privileged', 'work-product', 'settlement', 'mediation-confidential',
  'protective-order', 'personally-sensitive', 'sealed', 'unknown',
] as const;

export const AUTHORITY_TYPES = [
  'case', 'statute', 'regulation', 'court-rule', 'local-rule', 'administrative-guidance',
  'agency-order', 'constitutional', 'treatise', 'law-review', 'practice-guide', 'secondary', 'other',
] as const;

export const AUTHORITY_VERIFICATION_STATUSES = [
  'proposed', 'unverified', 'source-located', 'citation-confirmed', 'pinpoint-confirmed',
  'treatment-checked', 'negative-treatment', 'controlling', 'persuasive', 'adverse',
  'outdated', 'superseded', 'rejected',
] as const;

export const RESEARCH_QUESTION_STATUSES = [
  'open', 'researching', 'preliminary-answer', 'verification-needed', 'complete', 'superseded', 'abandoned',
] as const;

export const STRATEGY_RECORD_TYPES = [
  'objective', 'next-move', 'leverage', 'vulnerability', 'risk', 'opportunity', 'opposing-move',
  'contingency', 'settlement', 'hearing', 'discovery', 'filing', 'evidentiary', 'appeal', 'unresolved',
] as const;

export const STRATEGY_STATUSES = [
  'proposed', 'active', 'monitoring', 'blocked', 'completed', 'rejected', 'superseded', 'contingency', 'unresolved',
] as const;

export const SETTLEMENT_OFFER_TYPES = [
  'demand', 'offer', 'counteroffer', 'mediation', 'informal', 'nonmonetary',
  'consent-order', 'withdrawn', 'expired',
] as const;

export const DAMAGE_CATEGORIES = [
  'direct-economic', 'consequential', 'lost-income', 'out-of-pocket', 'fees-expenses', 'interest',
  'statutory', 'emotional-distress', 'reputational', 'property-loss', 'credit-related', 'punitive', 'other',
] as const;

export const REMEDY_TYPES = [
  'monetary', 'declaratory', 'injunctive', 'rescission', 'reformation', 'specific-performance',
  'title-relief', 'credit-correction', 'deletion', 'account-correction', 'fee-shifting',
  'sanctions', 'costs', 'interest', 'punitive', 'other',
] as const;

export const AI_DRAFT_TASKS = [
  'outline-filing', 'draft-section', 'revise-section', 'shorten', 'clarify', 'improve-organization',
  'identify-missing-support', 'identify-counterarguments', 'fact-statement-from-evidence',
  'procedural-history-from-timeline', 'draft-certificate', 'draft-proposed-order',
  'summarize-opposing', 'research-memo', 'compare-to-checklist',
] as const;

export const AI_SOURCE_SCOPES = [
  'selected-documents', 'selected-evidence', 'selected-issues', 'selected-authorities',
  'confirmed-timeline', 'entire-case', 'no-sources',
] as const;

/** Human labels for the many kebab-case status strings above. */
export function humanize(s: string | null | undefined): string {
  if (!s) return '—';
  return s.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

/* ============================ PHASE 4 ============================ */

export const SEARCH_RECORD_TYPES = [
  'document', 'evidence', 'filing', 'discovery', 'deadline', 'task', 'communication',
  'authority', 'strategy', 'admission', 'contradiction', 'legal-issue', 'timeline', 'research',
] as const;

export const EXHIBIT_NUMBERING_STYLES = [
  'numeric', 'alpha', 'plaintiff-numeric', 'defendant-alpha', 'px', 'dx', 'joint', 'custom',
] as const;

export const REDACTION_STATUSES = [
  'no-redaction-needed', 'potential-redaction', 'redaction-required', 'redaction-in-progress',
  'redacted-copy-uploaded', 'redaction-reviewed', 'approved-for-export',
] as const;

export const BINDER_KINDS = [
  'complete', 'hearing', 'motion', 'discovery', 'evidence', 'deposition', 'settlement', 'research', 'custom',
] as const;

export const BINDER_SECTION_TEMPLATE = [
  'Case Summary', 'Procedural History', 'Timeline', 'Pending Deadlines', 'Pleadings',
  'Pending Motions', 'Orders', 'Discovery', 'Evidence', 'Exhibits', 'Authorities',
  'Witnesses', 'Communications', 'Damages', 'Settlement', 'Strategy Notes',
] as const;

export const CALENDAR_PROVIDERS = ['apple', 'google', 'outlook'] as const;
export const CALENDAR_SYNC_MODES = ['manual', 'confirmed-auto', 'selected-category', 'no-sync'] as const;

export const NOTIFICATION_PRIORITIES = ['critical', 'high', 'normal', 'low', 'informational'] as const;

/** Default reminder offsets (days before) for hearings & final deadlines. */
export const DEFAULT_REMINDER_OFFSETS = [30, 14, 7, 3, 1, 0] as const;

export const INTEGRATION_STATUSES_V4 = [
  'not-configured', 'available', 'connected', 'partially-connected', 'mocked',
  'disabled', 'permission-expired', 'error', 'unsupported', 'planned',
] as const;

export const BACKUP_TYPES = ['database', 'full', 'manual', 'pre-migration', 'pre-import', 'pre-restore'] as const;
export const EXPORT_SCOPES = ['full', 'external-sharing', 'documents-only'] as const;

/** Export directory structure (§49). */
export const EXPORT_DIRS = [
  '00_Case_Profile', '01_Pleadings', '02_Orders', '03_Motions', '04_Discovery', '05_Evidence',
  '06_Exhibits', '07_Correspondence', '08_Service', '09_Research', '10_Strategy', '11_Damages',
  '12_AI_Outputs', '13_Audit', '14_Data_Export', '15_Manifests',
] as const;

/** Default retention (days) — never deletes the only successful backup. */
export const BACKUP_RETENTION = { daily: 30, weekly: 84, monthly: 365 } as const;
export const TRASH_RETENTION_DAYS = 30;

/* ============================ PHASE 5 ============================ */

export const DOCKET_SOURCE_TYPES = [
  'manual', 'docket-sheet', 'court-notice', 'filing-confirmation', 'pacer',
  'peachcourt', 'public', 'rss', 'third-party', 'clerk',
] as const;

export const DOCKET_MONITOR_SCHEDULES = ['manual', 'daily', 'weekdays', 'weekly'] as const;

export const AI_CASE_MODES = ['disabled', 'manual', 'approved-automation', 'local-only'] as const;

/** Provider capability registry — each capability's honest availability level. */
export type CapabilityLevel = 'live' | 'mocked' | 'external-link' | 'unavailable';
export const PROVIDER_CAPABILITIES: { provider: string; capability: string; level: CapabilityLevel }[] = [
  { provider: 'openai', capability: 'document-analysis', level: 'mocked' },
  { provider: 'openai', capability: 'drafting', level: 'mocked' },
  { provider: 'openai', capability: 'synthesis', level: 'mocked' },
  { provider: 'claude', capability: 'long-document-review', level: 'mocked' },
  { provider: 'claude', capability: 'comparison', level: 'mocked' },
  { provider: 'claude', capability: 'structured-extraction', level: 'mocked' },
  { provider: 'perplexity', capability: 'source-discovery', level: 'mocked' },
  { provider: 'gemini', capability: 'secondary-analysis', level: 'mocked' },
  { provider: 'adobe', capability: 'open-externally', level: 'external-link' },
  { provider: 'adobe', capability: 'combine-redact-ocr', level: 'unavailable' },
  { provider: 'onedrive', capability: 'browse-import-export', level: 'mocked' },
  { provider: 'icloud-companion', capability: 'folder-monitoring', level: 'mocked' },
  { provider: 'peachcourt', capability: 'portal-access', level: 'external-link' },
  { provider: 'pacer', capability: 'docket-access', level: 'external-link' },
];

/** Default readiness checklist seeded per filing (category → items). */
export const FILING_CHECKLIST_TEMPLATE: { category: string; label: string }[] = [
  { category: 'case-identity', label: 'Full caption matches the case profile' },
  { category: 'case-identity', label: 'Case number correct' },
  { category: 'case-identity', label: 'Court / division correct' },
  { category: 'document-identity', label: 'Filing title correct' },
  { category: 'document-identity', label: 'Filing party correct' },
  { category: 'timing', label: 'Deadline confirmed' },
  { category: 'content', label: 'Requested relief clearly stated' },
  { category: 'content', label: 'Legal issues linked' },
  { category: 'content', label: 'Evidence linked' },
  { category: 'content', label: 'Authorities linked and citations verified' },
  { category: 'format', label: 'Readable, text-searchable PDF' },
  { category: 'format', label: 'Signature block present' },
  { category: 'components', label: 'Certificate of service prepared' },
  { category: 'components', label: 'Proposed order prepared (if required)' },
  { category: 'components', label: 'Exhibit index attached (if exhibits)' },
  { category: 'service', label: 'Recipients identified and addresses verified' },
];
