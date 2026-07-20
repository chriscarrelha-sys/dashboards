import { prisma } from '@/lib/prisma';
import { PageHeading } from '@/components/PageHeading';
import { VerificationQueueClient, type QueueItem } from '@/components/phase2/VerificationQueueClient';

/**
 * Verification Queue. `onlyDocClassification` powers the "Document Review Queue"
 * nav item; the full queue powers "Verification Queue".
 */
export async function VerificationQueueModule({
  caseId, title, description, onlyDocClassification,
}: {
  caseId: string; title: string; description: string; onlyDocClassification?: boolean;
}) {
  const items = await prisma.reviewQueueItem.findMany({
    where: { caseId, status: 'pending', ...(onlyDocClassification ? { kind: 'document-classification' } : {}) },
    orderBy: { createdAt: 'desc' },
  });

  // Resolve source-doc labels in one query.
  const docIds = [...new Set(items.map((i) => i.sourceDocId).filter(Boolean) as string[])];
  const docs = docIds.length
    ? await prisma.document.findMany({ where: { id: { in: docIds } }, select: { id: true, title: true, standardizedName: true } })
    : [];
  const docMap = new Map(docs.map((d) => [d.id, d.title || d.standardizedName]));

  const views: QueueItem[] = items.map((it) => {
    let proposal: Record<string, unknown> = {};
    try { proposal = JSON.parse(it.proposal); } catch { /* ignore */ }
    return {
      id: it.id, kind: it.kind, title: it.title, confidence: it.confidence, provider: it.provider,
      reason: it.reason, sourcePage: it.sourcePage, createdAt: it.createdAt.toISOString(),
      sourceDoc: it.sourceDocId && docMap.has(it.sourceDocId) ? { id: it.sourceDocId, label: docMap.get(it.sourceDocId)! } : null,
      proposal,
    };
  });

  return (
    <div>
      <PageHeading title={title} description={description} />
      <VerificationQueueClient caseId={caseId} items={views} />
    </div>
  );
}
