import { prisma } from '@/lib/prisma';
import { PageHeading } from '@/components/PageHeading';
import { DiscoveryClient, type SetRow } from '@/components/phase2/DiscoveryClient';

export async function DiscoveryModule({ caseId }: { caseId: string }) {
  const [sets, documents, requests, responses, deficiencies] = await Promise.all([
    prisma.discoverySet.findMany({ where: { caseId }, orderBy: { createdAt: 'desc' }, include: { requests: { select: { id: true } } } }),
    prisma.document.findMany({ where: { caseId }, select: { id: true, title: true, standardizedName: true }, orderBy: { createdAt: 'desc' } }),
    prisma.discoveryRequest.count({ where: { caseId } }),
    prisma.discoveryRequest.count({ where: { caseId, status: 'received' } }),
    prisma.discoveryDeficiency.count({ where: { caseId } }),
  ]);

  const rows: SetRow[] = sets.map((s) => ({
    id: s.id, title: s.title, discoveryType: s.discoveryType, servingParty: s.servingParty,
    respondingParty: s.respondingParty, status: s.status, verificationStatus: s.verificationStatus,
    requestCount: s.requests.length,
  }));

  return (
    <div>
      <PageHeading
        title="Discovery Command Center"
        description="Sets and individual requests, responses, deficiencies, and meet-and-confer — all cross-linked to evidence and legal issues."
      />
      <DiscoveryClient
        caseId={caseId}
        sets={rows}
        documents={documents.map((d) => ({ id: d.id, title: d.title || d.standardizedName }))}
        stats={{ sets: sets.length, requests, responses, deficiencies }}
      />
    </div>
  );
}
