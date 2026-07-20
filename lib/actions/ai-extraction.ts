'use server';

import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/prisma';
import { assertOwnedCase, audit } from '@/lib/auth/guard';

/**
 * Structured AI extraction tasks. These are MOCKED: with no live provider key,
 * they generate realistic, clearly-labeled proposals and route EVERY one to the
 * Verification Queue. No proposal ever becomes case record without user
 * approval, and the mock never invents page numbers it can't support — pages it
 * can't establish are marked "unavailable".
 *
 * When a real provider is wired behind lib/providers/ai, this same shape (kind +
 * proposal JSON + sourcePage + confidence + provider + reason) is produced from
 * the model output instead.
 */

const PROVIDER = 'mock';

async function queue(caseId: string, items: {
  kind: string; title: string; proposal: unknown; confidence: number; sourceDocId?: string | null; sourcePage?: string | null; reason: string;
}[]) {
  await prisma.reviewQueueItem.createMany({
    data: items.map((it) => ({
      caseId, kind: it.kind, title: it.title, proposal: JSON.stringify(it.proposal),
      confidence: it.confidence, provider: PROVIDER, sourceDocId: it.sourceDocId ?? null,
      sourcePage: it.sourcePage ?? null, reason: it.reason, status: 'pending',
    })),
  });
  revalidatePath(`/case/${caseId}/verification-queue`);
  revalidatePath(`/case/${caseId}/review-queue`);
}

/** Propose evidence items + one admission from a document (mock). */
export async function aiExtractEvidence(caseId: string, documentId: string) {
  const { user } = await assertOwnedCase(caseId);
  const doc = await prisma.document.findFirst({ where: { id: documentId, caseId } });
  if (!doc) throw new Error('Document not found');
  const label = doc.title || doc.standardizedName;

  await queue(caseId, [
    {
      kind: 'evidence', title: `Proposed evidence from “${label}”`, confidence: 0.72,
      sourceDocId: documentId, sourcePage: '1',
      reason: 'AI-proposed evidence characterization requires review before it becomes case record.',
      proposal: {
        title: `Key passage in ${label}`,
        proposition: '[MOCK] A factual proposition the document appears to support.',
        evidenceType: 'documentary', posture: 'supports-user',
        quotedText: '[MOCK extracted passage — verify against the source page.]',
      },
    },
    {
      kind: 'admission', title: `Possible admission in “${label}”`, confidence: 0.64,
      sourceDocId: documentId, sourcePage: 'unavailable',
      reason: 'Exact page could not be established; manual verification required.',
      proposal: {
        statement: '[MOCK] A statement that may qualify as an admission by the opposing party.',
        category: 'pleading', admittingParty: 'Opposing party',
      },
    },
  ]);
  await audit(user.id, 'ai.extract-evidence', 'Document', documentId, `provider=${PROVIDER}`);
  return { proposed: 2 };
}

/** Propose a contradiction across documents (mock). */
export async function aiDetectContradictions(caseId: string, documentIds: string[]) {
  const { user } = await assertOwnedCase(caseId);
  const docs = await prisma.document.findMany({ where: { id: { in: documentIds }, caseId } });
  if (docs.length < 1) throw new Error('No documents in this case');
  const a = docs[0]!;
  const b = docs[1] ?? docs[0]!;
  await queue(caseId, [{
    kind: 'contradiction', title: 'Possible contradiction between two statements', confidence: 0.6,
    sourceDocId: a.id, sourcePage: 'unavailable',
    reason: 'AI-inferred conflict — exact quotations/pages must be verified before confirming.',
    proposal: {
      summary: '[MOCK] Two case statements appear to conflict.',
      explanation: '[MOCK inferred conflict — verify the exact language in each source.]',
      materiality: 'medium',
      statements: [
        { label: 'A', text: '[MOCK statement A]', documentId: a.id, author: a.party || 'Unknown' },
        { label: 'B', text: '[MOCK statement B]', documentId: b.id, author: b.party || 'Unknown' },
      ],
    },
  }]);
  await audit(user.id, 'ai.detect-contradictions', 'Case', caseId, `docs=${documentIds.length}`);
  return { proposed: 1 };
}

/** Propose a discovery set with individual requests extracted from a document (mock). */
export async function aiExtractDiscovery(caseId: string, documentId: string) {
  const { user } = await assertOwnedCase(caseId);
  const doc = await prisma.document.findFirst({ where: { id: documentId, caseId } });
  if (!doc) throw new Error('Document not found');
  await queue(caseId, [{
    kind: 'discovery-extraction', title: `Proposed discovery set from “${doc.title || doc.standardizedName}”`, confidence: 0.7,
    sourceDocId: documentId, sourcePage: '1-3',
    reason: 'Extracted discovery structure requires review; correct numbering and text before import.',
    proposal: {
      set: { title: '[MOCK] Plaintiff’s First Interrogatories', discoveryType: 'interrogatories', servingParty: 'Plaintiff', respondingParty: 'Defendant' },
      requests: [
        { requestNumber: 1, kind: 'interrogatory', requestText: '[MOCK] Identify all persons with knowledge of the account.' },
        { requestNumber: 2, kind: 'interrogatory', requestText: '[MOCK] State the basis for the amount claimed.' },
        { requestNumber: 3, kind: 'interrogatory', requestText: '[MOCK] Describe all communications with the defendant.' },
      ],
    },
  }]);
  await audit(user.id, 'ai.extract-discovery', 'Document', documentId);
  return { proposed: 1 };
}

/** Extract proposed citations from a filing/document (mock). */
export async function aiExtractCitations(caseId: string, documentId: string, filingId?: string) {
  const { user } = await assertOwnedCase(caseId);
  const doc = await prisma.document.findFirst({ where: { id: documentId, caseId } });
  if (!doc) throw new Error('Document not found');
  await queue(caseId, [
    {
      kind: 'citation', title: 'Proposed citation — authority not in library', confidence: 0.55,
      sourceDocId: documentId, sourcePage: 'unavailable',
      reason: 'Citation referenced in text but not matched to a verified authority; open the source to confirm.',
      proposal: {
        citationText: '[MOCK] 123 Ga. App. 456 (2021)', location: 'draft §II.A',
        quotedProposition: '[MOCK] proposition the citation is offered for',
        flags: ['authority-not-linked', 'unverified-treatment'], filingId: filingId ?? null,
      },
    },
  ]);
  await audit(user.id, 'ai.extract-citations', 'Document', documentId);
  return { proposed: 1 };
}

/** Review discovery responses for potential deficiencies (mock). */
export async function aiReviewDeficiencies(caseId: string, requestIds: string[]) {
  const { user } = await assertOwnedCase(caseId);
  const reqs = await prisma.discoveryRequest.findMany({ where: { id: { in: requestIds }, caseId } });
  if (!reqs.length) throw new Error('No requests in this case');
  await queue(caseId, reqs.slice(0, 2).map((r) => ({
    kind: 'discovery-deficiency', title: `Possible deficiency: ${r.shortTitle || r.title}`, confidence: 0.58,
    sourceDocId: null, sourcePage: 'unavailable',
    reason: 'AI flags a potential deficiency; it does not opine that an objection is legally invalid without authority.',
    proposal: {
      title: `Evasive/incomplete response to ${r.shortTitle || r.title}`,
      category: 'evasive', discoveryRequestId: r.id,
      explanation: '[MOCK] The response may be non-responsive or incomplete — verify against the rule and the exact text.',
      missingInformation: '[MOCK] Specific facts responsive to the request.',
    },
  })));
  await audit(user.id, 'ai.review-deficiencies', 'Case', caseId, `requests=${requestIds.length}`);
  return { proposed: Math.min(2, reqs.length) };
}
