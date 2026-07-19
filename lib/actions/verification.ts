'use server';

import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/prisma';
import { assertOwnedCase, audit } from '@/lib/auth/guard';

/**
 * Verification Queue resolution. Approving a proposal creates or updates the
 * appropriate structured record IN THE SAME CASE and writes the audit log.
 * Approval can carry user edits (approve-with-edits) which are merged over the
 * original proposal before persistence.
 */

type Decision = 'approve' | 'reject' | 'defer';

export async function resolveProposal(
  caseId: string,
  itemId: string,
  decision: Decision,
  edits?: Record<string, unknown>,
) {
  const { user } = await assertOwnedCase(caseId);
  const item = await prisma.reviewQueueItem.findFirst({ where: { id: itemId, caseId } });
  if (!item) throw new Error('Queue item not found');

  if (decision !== 'approve') {
    await prisma.reviewQueueItem.update({
      where: { id: itemId },
      data: { status: decision === 'reject' ? 'rejected' : 'deferred' },
    });
    // For a rejected document classification, still mark the doc reviewed.
    if (decision === 'reject' && item.kind === 'document-classification' && item.sourceDocId) {
      await prisma.document.update({ where: { id: item.sourceDocId }, data: { reviewStatus: 'reviewed' } });
    }
    await audit(user.id, `verification.${decision}`, 'ReviewQueueItem', itemId, `kind=${item.kind}`);
    revalidatePath(`/case/${caseId}/verification-queue`);
    revalidatePath(`/case/${caseId}/review-queue`);
    return { decision };
  }

  const proposal = { ...safeParse(item.proposal), ...(edits ?? {}) } as Record<string, any>;
  let createdEntity = '';
  let createdId = '';

  switch (item.kind) {
    case 'document-classification': {
      if (item.sourceDocId) {
        await prisma.document.update({
          where: { id: item.sourceDocId },
          data: {
            docType: proposal.docType ?? undefined,
            title: proposal.docType ?? undefined,
            verificationStatus: 'confirmed',
            reviewStatus: 'reviewed',
          },
        });
        createdEntity = 'Document';
        createdId = item.sourceDocId;
      }
      break;
    }
    case 'evidence': {
      const ev = await prisma.evidenceItem.create({
        data: {
          caseId, title: proposal.title || 'Evidence item', proposition: proposal.proposition || null,
          evidenceType: proposal.evidenceType || null, posture: proposal.posture || null,
          quotedText: proposal.quotedText || null, documentId: item.sourceDocId || null,
          sourcePage: item.sourcePage || null, createdBy: 'ai', creationSource: 'ai-extraction',
          aiProvider: item.provider, confidence: item.confidence, evidentiaryStatus: 'identified',
          verificationStatus: 'confirmed', reviewStatus: 'reviewed',
        },
      });
      createdEntity = 'EvidenceItem'; createdId = ev.id;
      break;
    }
    case 'admission': {
      const a = await prisma.admission.create({
        data: {
          caseId, statement: proposal.statement || 'Admission', category: proposal.category || null,
          admittingParty: proposal.admittingParty || null, documentId: item.sourceDocId || null,
          sourcePage: item.sourcePage || null, createdBy: 'ai', aiProvider: item.provider,
          confidence: item.confidence, verificationStatus: 'confirmed',
        },
      });
      createdEntity = 'Admission'; createdId = a.id;
      break;
    }
    case 'contradiction': {
      const statements = Array.isArray(proposal.statements) ? proposal.statements : [];
      const c = await prisma.contradiction.create({
        data: {
          caseId, summary: proposal.summary || 'Contradiction', explanation: proposal.explanation || null,
          materiality: proposal.materiality || null, statementA: statements[0]?.text ?? null,
          statementB: statements[1]?.text ?? null, status: 'confirmed', createdBy: 'ai',
          aiProvider: item.provider, confidence: item.confidence, verificationStatus: 'confirmed',
          statements: {
            create: statements.map((s: any) => ({
              label: s.label || '?', text: s.text || '', documentId: s.documentId || null,
              sourcePage: s.sourcePage || null, author: s.author || null,
            })),
          },
        },
      });
      createdEntity = 'Contradiction'; createdId = c.id;
      break;
    }
    case 'legal-issue': {
      const li = await prisma.legalIssue.create({
        data: {
          caseId, title: proposal.title || 'Legal issue', issueType: proposal.issueType || 'claim',
          assertingParty: proposal.assertingParty || null, opposingParty: proposal.opposingParty || null,
          requestedRelief: proposal.requestedRelief || null, createdBy: 'ai', aiProvider: item.provider,
          confidence: item.confidence, verificationStatus: 'confirmed', status: 'asserted',
          elements: Array.isArray(proposal.elements)
            ? { create: proposal.elements.map((e: any, i: number) => ({ number: i + 1, title: e.title || `Element ${i + 1}`, status: 'unsupported' })) }
            : undefined,
        },
      });
      createdEntity = 'LegalIssue'; createdId = li.id;
      break;
    }
    case 'discovery-extraction': {
      const setData = proposal.set || {};
      const set = await prisma.discoverySet.create({
        data: {
          caseId, title: setData.title || 'Imported discovery set', discoveryType: setData.discoveryType || 'interrogatories',
          servingParty: setData.servingParty || null, respondingParty: setData.respondingParty || null,
          sourceDocumentId: item.sourceDocId || null, status: 'served', createdBy: 'ai',
          aiProvider: item.provider, verificationStatus: 'confirmed',
          requests: Array.isArray(proposal.requests)
            ? {
                create: proposal.requests.map((r: any) => ({
                  caseId, kind: r.kind || 'interrogatory', title: r.shortTitle || `${r.kind || 'request'} ${r.requestNumber ?? ''}`.trim(),
                  requestNumber: r.requestNumber ?? null, requestText: r.requestText || '', verificationStatus: 'confirmed', status: 'open',
                })),
              }
            : undefined,
        },
      });
      createdEntity = 'DiscoverySet'; createdId = set.id;
      break;
    }
    case 'discovery-deficiency': {
      const d = await prisma.discoveryDeficiency.create({
        data: {
          caseId, title: proposal.title || 'Deficiency', category: proposal.category || 'other',
          discoveryRequestId: proposal.discoveryRequestId || null, explanation: proposal.explanation || null,
          missingInformation: proposal.missingInformation || null, dateIdentified: new Date(),
          resolutionStatus: 'confirmed', createdBy: 'ai', aiProvider: item.provider,
          confidence: item.confidence, verificationStatus: 'confirmed',
        },
      });
      createdEntity = 'DiscoveryDeficiency'; createdId = d.id;
      break;
    }
    case 'witness': {
      const w = await prisma.witness.create({ data: { caseId, name: proposal.name || 'Witness', role: proposal.role || null } });
      createdEntity = 'Witness'; createdId = w.id;
      break;
    }
    default:
      throw new Error(`Unknown proposal kind: ${item.kind}`);
  }

  await prisma.reviewQueueItem.update({ where: { id: itemId }, data: { status: edits ? 'edited' : 'approved' } });
  await audit(user.id, 'verification.approve', createdEntity || 'ReviewQueueItem', createdId || itemId, `kind=${item.kind}`);

  // Revalidate the queue and the destination module.
  revalidatePath(`/case/${caseId}/verification-queue`);
  revalidatePath(`/case/${caseId}/review-queue`);
  const dest: Record<string, string> = {
    evidence: 'evidence', admission: 'admissions', contradiction: 'contradictions',
    'legal-issue': 'claims', 'discovery-extraction': 'discovery', 'discovery-deficiency': 'discovery/deficiencies',
    witness: 'people/witnesses', 'document-classification': 'documents',
  };
  if (dest[item.kind]) revalidatePath(`/case/${caseId}/${dest[item.kind]}`);
  return { decision, createdEntity, createdId };
}

function safeParse(s: string): Record<string, unknown> {
  try {
    return JSON.parse(s);
  } catch {
    return {};
  }
}
