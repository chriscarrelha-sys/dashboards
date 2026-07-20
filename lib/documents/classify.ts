import { CONFIDENCE_AUTO_APPLY } from '@/lib/enums';
import type { DocumentType } from '@/lib/enums';

/**
 * Mock document classifier. Infers a document type / party / status from the
 * filename using heuristics, returning a confidence score. This stands in for
 * the future extraction pipeline; low-confidence results are routed to the
 * Verification Queue, and deadlines/hearings it might imply are NEVER
 * auto-confirmed.
 */

export type Classification = {
  docType: DocumentType;
  party: string | null;
  docStatus: string | null;
  docDate: Date | null;
  confidence: number;
  autoApply: boolean;
  rationale: string;
};

const TYPE_RULES: { re: RegExp; type: DocumentType; base: number }[] = [
  { re: /complaint|petition/i, type: 'Complaint', base: 0.9 },
  { re: /\banswer\b/i, type: 'Answer', base: 0.9 },
  { re: /motion|brief|memo(randum)?/i, type: 'Motion', base: 0.82 },
  { re: /reply/i, type: 'Reply', base: 0.8 },
  { re: /response|opposition/i, type: 'Response', base: 0.8 },
  { re: /order|ruling|judgment|decree/i, type: 'Order', base: 0.85 },
  { re: /notice/i, type: 'Notice', base: 0.78 },
  { re: /interrog|rfp|rfa|request for (production|admission)|discovery/i, type: 'Discovery Request', base: 0.8 },
  { re: /verification|declaration|affidavit/i, type: 'Declaration', base: 0.8 },
  { re: /exhibit/i, type: 'Exhibit', base: 0.75 },
  { re: /letter|email|correspond/i, type: 'Correspondence', base: 0.72 },
];

const STATUS_RULES: { re: RegExp; status: string }[] = [
  { re: /filed/i, status: 'filed' },
  { re: /served/i, status: 'served' },
  { re: /received/i, status: 'received' },
  { re: /entered/i, status: 'entered' },
  { re: /draft/i, status: 'draft' },
];

const PARTY_RULES: { re: RegExp; party: string }[] = [
  { re: /plaintiff/i, party: 'Plaintiff' },
  { re: /defendant/i, party: 'Defendant' },
  { re: /petitioner/i, party: 'Petitioner' },
  { re: /respondent/i, party: 'Respondent' },
];

function findDate(name: string): Date | null {
  // ISO-ish first: 2026-05-12
  const iso = name.match(/(20\d{2})[-_.](\d{1,2})[-_.](\d{1,2})/);
  if (iso) {
    const d = new Date(Date.UTC(+iso[1]!, +iso[2]! - 1, +iso[3]!));
    if (!Number.isNaN(d.getTime())) return d;
  }
  // US-style: 05-12-2026
  const us = name.match(/(\d{1,2})[-_.](\d{1,2})[-_.](20\d{2})/);
  if (us) {
    const d = new Date(Date.UTC(+us[3]!, +us[1]! - 1, +us[2]!));
    if (!Number.isNaN(d.getTime())) return d;
  }
  return null;
}

export function classifyByFilename(originalName: string): Classification {
  const name = originalName || '';
  const typeMatch = TYPE_RULES.find((r) => r.re.test(name));
  const docType = typeMatch?.type ?? 'Other';
  let confidence = typeMatch?.base ?? 0.35;

  const party = PARTY_RULES.find((r) => r.re.test(name))?.party ?? null;
  const docStatus = STATUS_RULES.find((r) => r.re.test(name))?.status ?? null;
  const docDate = findDate(name);

  // Corroborating signals nudge confidence up slightly.
  if (party) confidence += 0.03;
  if (docStatus) confidence += 0.03;
  if (docDate) confidence += 0.02;
  confidence = Math.min(0.98, confidence);

  const autoApply = confidence >= CONFIDENCE_AUTO_APPLY;
  const rationale = typeMatch
    ? `Filename matched “${typeMatch.re.source}”.`
    : 'No strong type signal in filename; sent for review.';

  return { docType, party, docStatus, docDate, confidence, autoApply, rationale };
}
