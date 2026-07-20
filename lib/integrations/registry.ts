/**
 * Integration registry. Each entry declares purpose, capabilities, limitations,
 * and how its live status is determined. Status is one of:
 *   - 'connected'   : real credentials present and adapter wired
 *   - 'mock'        : usable via a built-in mock (no external calls)
 *   - 'unavailable' : not connected; shown honestly, never faked
 *
 * We never report an integration as functional unless it truly is.
 */

export type IntegrationStatus = 'connected' | 'mock' | 'unavailable';

export type IntegrationDef = {
  key: string;
  name: string;
  category: 'ai' | 'storage' | 'calendar' | 'court' | 'pdf' | 'legal';
  purpose: string;
  capabilities: string[];
  limitations: string[];
  /** Env var whose presence flips this to 'connected'; else mock/unavailable. */
  envVar?: string;
  /** Whether a built-in mock exists so the feature is still explorable. */
  hasMock: boolean;
  /** For court/legal portals: an external link rather than an API. */
  externalOnly?: boolean;
};

export const INTEGRATIONS: IntegrationDef[] = [
  {
    key: 'openai', name: 'OpenAI (ChatGPT)', category: 'ai',
    purpose: 'Strategy, drafting, synthesis, workflow planning.',
    capabilities: ['Draft documents', 'Plan next moves', 'Summarize'],
    limitations: ['Requires OPENAI_API_KEY', 'Server-side calls only'],
    envVar: 'OPENAI_API_KEY', hasMock: true,
  },
  {
    key: 'claude', name: 'Claude (Anthropic)', category: 'ai',
    purpose: 'Long-document review, comparison, structured extraction.',
    capabilities: ['Review filings', 'Compare documents', 'Extract structure'],
    limitations: ['Requires ANTHROPIC_API_KEY', 'Server-side calls only'],
    envVar: 'ANTHROPIC_API_KEY', hasMock: true,
  },
  {
    key: 'perplexity', name: 'Perplexity', category: 'ai',
    purpose: 'Current legal research and source discovery.',
    capabilities: ['Research questions', 'Find sources'],
    limitations: ['Requires PERPLEXITY_API_KEY'],
    envVar: 'PERPLEXITY_API_KEY', hasMock: true,
  },
  {
    key: 'gemini', name: 'Gemini (Google)', category: 'ai',
    purpose: 'Secondary review and Google-connected workflows.',
    capabilities: ['Second-opinion review'],
    limitations: ['Requires GEMINI_API_KEY'],
    envVar: 'GEMINI_API_KEY', hasMock: true,
  },
  {
    key: 'adobe', name: 'Adobe Acrobat', category: 'pdf',
    purpose: 'PDF editing, OCR, combining, redaction, bookmarks, exhibits.',
    capabilities: ['Open original in Acrobat', 'OCR (planned)', 'Exhibit production (planned)'],
    limitations: ['Desktop hand-off only in v1', 'No direct API wired'],
    hasMock: false,
  },
  {
    key: 'icloud', name: 'iCloud Drive', category: 'storage',
    purpose: 'Preferred external file source for original litigation files.',
    capabilities: ['Keep originals in iCloud (planned)', 'Open in Finder/Preview (planned)'],
    limitations: [
      'Browsers cannot browse all of iCloud without a companion app',
      'v1 uses local app-managed storage behind a StorageProvider interface',
    ],
    hasMock: false,
  },
  {
    key: 'onedrive', name: 'OneDrive', category: 'storage',
    purpose: 'Alternative cloud file source.',
    capabilities: ['Selected-folder access (planned)'],
    limitations: ['Requires Microsoft credentials'],
    envVar: 'MICROSOFT_CLIENT_ID', hasMock: false,
  },
  {
    key: 'local-folders', name: 'Finder / Local Folders', category: 'storage',
    purpose: 'Local file storage for originals.',
    capabilities: ['Store and retrieve originals', 'Download original'],
    limitations: ['Selected folders only'],
    hasMock: true,
  },
  {
    key: 'apple-calendar', name: 'Apple Calendar', category: 'calendar',
    purpose: 'Add hearings and deadlines to your calendar.',
    capabilities: ['Create events (planned)', 'ICS export (planned)'],
    limitations: ['v1 provides interface + mock provider'],
    hasMock: true,
  },
  {
    key: 'google-calendar', name: 'Google Calendar', category: 'calendar',
    purpose: 'Add hearings and deadlines to your calendar.',
    capabilities: ['Create events (planned)'],
    limitations: ['Requires Google OAuth credentials'],
    envVar: 'GOOGLE_CALENDAR_CLIENT_ID', hasMock: true,
  },
  {
    key: 'outlook-calendar', name: 'Outlook Calendar', category: 'calendar',
    purpose: 'Add hearings and deadlines to your calendar.',
    capabilities: ['Create events (planned)'],
    limitations: ['Requires Microsoft credentials'],
    envVar: 'MICROSOFT_CLIENT_ID', hasMock: true,
  },
  {
    key: 'peachcourt', name: 'PeachCourt / eFileGA', category: 'court',
    purpose: 'Georgia state-court document access and e-filing portal.',
    capabilities: ['Open matter in PeachCourt (external link)'],
    limitations: ['No public API — external link only'],
    hasMock: false, externalOnly: true,
  },
  {
    key: 'pacer', name: 'PACER', category: 'court',
    purpose: 'Federal court records access.',
    capabilities: ['Open matter in PACER (external link)', 'Docket search API (planned, paid)'],
    limitations: ['No filing API', 'PCL read API is paid and requires credentials'],
    hasMock: false, externalOnly: true,
  },
  {
    key: 'rocket-lawyer', name: 'Rocket Lawyer', category: 'legal',
    purpose: 'Optional external legal-forms resource.',
    capabilities: ['External link'],
    limitations: ['External link only'],
    hasMock: false, externalOnly: true,
  },
];

export function resolveStatus(def: IntegrationDef): IntegrationStatus {
  if (def.envVar && process.env[def.envVar] && process.env[def.envVar]!.length > 0) {
    return 'connected';
  }
  if (def.hasMock) return 'mock';
  return 'unavailable';
}

export function integrationsWithStatus() {
  return INTEGRATIONS.map((def) => ({ ...def, status: resolveStatus(def) }));
}
