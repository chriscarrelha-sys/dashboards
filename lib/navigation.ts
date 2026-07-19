/**
 * Information architecture for a case. Drives the desktop sidebar, the mobile
 * navigation, and route generation. Every leaf maps to /case/[id]/<slug...>.
 * Sections that aren't backed by a dedicated module yet render a polished
 * empty state (see components/EmptyState + app/case/[id]/[...section]).
 */

export type NavLeaf = { label: string; slug: string };
export type NavGroup = { label: string; icon: string; items: NavLeaf[] };

export const CASE_NAV: NavGroup[] = [
  {
    label: 'Case Management',
    icon: 'gauge',
    items: [
      { label: 'Overview', slug: '' },
      { label: 'Timeline', slug: 'timeline' },
      { label: 'Deadlines & Tasks', slug: 'deadlines' },
      { label: 'Calendar', slug: 'calendar' },
      { label: 'Recent Activity', slug: 'activity' },
      { label: 'Case Notes', slug: 'notes' },
    ],
  },
  {
    label: 'Documents',
    icon: 'files',
    items: [
      { label: 'All Documents', slug: 'documents' },
      { label: 'Drafts', slug: 'documents/drafts' },
      { label: 'Filed Documents', slug: 'documents/filed' },
      { label: 'Orders', slug: 'documents/orders' },
      { label: 'Correspondence', slug: 'documents/correspondence' },
      { label: 'Research', slug: 'documents/research' },
      { label: 'Versions & Comparisons', slug: 'documents/versions' },
      { label: 'Document Review Queue', slug: 'review-queue' },
    ],
  },
  {
    label: 'Legal Issues',
    icon: 'scale',
    items: [
      { label: 'Claims', slug: 'claims' },
      { label: 'Counterclaims', slug: 'counterclaims' },
      { label: 'Defenses', slug: 'defenses' },
      { label: 'Affirmative Defenses', slug: 'affirmative-defenses' },
      { label: 'Elements & Burdens', slug: 'elements' },
      { label: 'Authorities', slug: 'authorities' },
      { label: 'Procedural Issues', slug: 'procedural-issues' },
      { label: 'Risks & Weaknesses', slug: 'risks' },
    ],
  },
  {
    label: 'Evidence',
    icon: 'fingerprint',
    items: [
      { label: 'Evidence Library', slug: 'evidence' },
      { label: 'Exhibits', slug: 'exhibits' },
      { label: 'Key Facts', slug: 'key-facts' },
      { label: 'Admissions', slug: 'admissions' },
      { label: 'Contradictions', slug: 'contradictions' },
      { label: 'Authentication', slug: 'authentication' },
      { label: 'Foundation', slug: 'foundation' },
      { label: 'Evidentiary Objections', slug: 'objections' },
      { label: 'Missing Evidence', slug: 'missing-evidence' },
      { label: 'Witnesses', slug: 'witnesses' },
    ],
  },
  {
    label: 'Discovery',
    icon: 'search',
    items: [
      { label: 'Discovery Overview', slug: 'discovery' },
      { label: 'Interrogatories', slug: 'discovery/interrogatories' },
      { label: 'Requests for Production', slug: 'discovery/rfp' },
      { label: 'Requests for Admission', slug: 'discovery/rfa' },
      { label: 'Depositions', slug: 'discovery/depositions' },
      { label: 'Subpoenas', slug: 'discovery/subpoenas' },
      { label: 'Discovery Responses', slug: 'discovery/responses' },
      { label: 'Deficiencies', slug: 'discovery/deficiencies' },
      { label: 'Meet-and-Confer', slug: 'discovery/meet-confer' },
      { label: 'Motions to Compel', slug: 'discovery/compel' },
      { label: 'Third-Party Discovery', slug: 'discovery/third-party' },
    ],
  },
  {
    label: 'Motions and Filings',
    icon: 'gavel',
    items: [
      { label: 'Pleadings', slug: 'pleadings' },
      { label: 'Pending Motions', slug: 'motions/pending' },
      { label: 'Filed Motions', slug: 'motions/filed' },
      { label: 'Responses', slug: 'motions/responses' },
      { label: 'Replies', slug: 'motions/replies' },
      { label: 'Notices', slug: 'motions/notices' },
      { label: 'Proposed Orders', slug: 'motions/proposed-orders' },
      { label: 'Certificates of Service', slug: 'motions/certificates' },
      { label: 'Filing Packages', slug: 'filings/packages' },
      { label: 'Hearing Binders', slug: 'filings/hearing-binders' },
    ],
  },
  {
    label: 'Parties and Communications',
    icon: 'users',
    items: [
      { label: 'Parties', slug: 'parties' },
      { label: 'Attorneys', slug: 'attorneys' },
      { label: 'Judges and Court Personnel', slug: 'judges' },
      { label: 'Witnesses', slug: 'people/witnesses' },
      { label: 'Experts', slug: 'people/experts' },
      { label: 'Contacts', slug: 'contacts' },
      { label: 'Emails', slug: 'comms/emails' },
      { label: 'Letters', slug: 'comms/letters' },
      { label: 'Calls and Conversations', slug: 'comms/calls' },
      { label: 'Service History', slug: 'comms/service-history' },
    ],
  },
  {
    label: 'Strategy',
    icon: 'target',
    items: [
      { label: 'Current Strategy', slug: 'strategy' },
      { label: 'Objectives', slug: 'strategy/objectives' },
      { label: 'Next Moves', slug: 'strategy/next-moves' },
      { label: 'Leverage', slug: 'strategy/leverage' },
      { label: 'Settlement', slug: 'strategy/settlement' },
      { label: 'Damages', slug: 'strategy/damages' },
      { label: 'Remedies', slug: 'strategy/remedies' },
      { label: 'Negotiation History', slug: 'strategy/negotiation' },
      { label: 'Opposing Party Positions', slug: 'strategy/opposing' },
      { label: 'Decision Log', slug: 'strategy/decision-log' },
    ],
  },
  {
    label: 'AI and Research',
    icon: 'sparkles',
    items: [
      { label: 'Case AI Workspace', slug: 'ai' },
      { label: 'Document Chats', slug: 'ai/document-chats' },
      { label: 'Legal Research', slug: 'research' },
      { label: 'Research Sources', slug: 'research/sources' },
      { label: 'Drafting Workspace', slug: 'ai/drafting' },
      { label: 'Comparisons', slug: 'ai/comparisons' },
      { label: 'Verification Queue', slug: 'verification-queue' },
      { label: 'Prompt History', slug: 'ai/prompts' },
      { label: 'AI Output History', slug: 'ai/outputs' },
    ],
  },
  {
    label: 'Administration',
    icon: 'settings',
    items: [
      { label: 'Case Profile', slug: 'admin/profile' },
      { label: 'Court Information', slug: 'admin/court' },
      { label: 'PeachCourt or PACER', slug: 'admin/portal' },
      { label: 'Integrations', slug: 'integrations' },
      { label: 'File Locations', slug: 'admin/file-locations' },
      { label: 'Naming Rules', slug: 'admin/naming' },
      { label: 'Permissions', slug: 'admin/permissions' },
      { label: 'Export and Backup', slug: 'admin/export' },
      { label: 'Audit History', slug: 'admin/audit' },
    ],
  },
];

/** Human label for a slug, used by the generic section page + breadcrumbs. */
export function labelForSlug(slug: string): string | null {
  for (const group of CASE_NAV) {
    for (const item of group.items) {
      if (item.slug === slug) return item.label;
    }
  }
  return null;
}
