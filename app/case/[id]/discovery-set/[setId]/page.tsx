import Link from 'next/link';
import { notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth/session';
import { TrustBadge } from '@/components/ui/badge';
import { DiscoverySetClient, type RequestRow } from '@/components/phase2/DiscoverySetClient';
import { humanize } from '@/lib/enums';
import { formatDate } from '@/lib/utils';
import type { VerificationStatus } from '@/lib/enums';
import { ArrowLeft } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function DiscoverySetDetail({ params }: { params: Promise<{ id: string; setId: string }> }) {
  const { id, setId } = await params;
  const user = await getCurrentUser();
  const set = await prisma.discoverySet.findFirst({
    where: { id: setId, caseId: id, case: { userId: user.id } },
    include: {
      requests: { orderBy: { requestNumber: 'asc' }, include: { deficiencies: { select: { id: true, title: true, category: true, resolutionStatus: true } } } },
      sourceDocument: { select: { id: true, title: true, standardizedName: true } },
    },
  });
  if (!set) notFound();

  const requests: RequestRow[] = set.requests.map((r) => ({
    id: r.id, requestNumber: r.requestNumber, kind: r.kind, shortTitle: r.shortTitle,
    requestText: r.requestText, responseText: r.responseText, objections: r.objections,
    status: r.status, deficiencyStatus: r.deficiencyStatus, verificationStatus: r.verificationStatus,
    deficiencies: r.deficiencies,
  }));

  return (
    <div>
      <Link href={`/case/${id}/discovery`} className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft size={14} /> Discovery
      </Link>
      <div className="mb-6 border-b pb-5">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-xl font-semibold">{set.title}</h1>
          <span className="rounded bg-muted px-2 py-0.5 text-xs text-muted-foreground">{humanize(set.discoveryType)}</span>
          <TrustBadge status={set.verificationStatus as VerificationStatus} />
        </div>
        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
          {set.servingParty && <span>{set.servingParty} → {set.respondingParty ?? '—'}</span>}
          <span>Status: {humanize(set.status)}</span>
          {set.responseDeadline && <span>Response due: {formatDate(set.responseDeadline)}</span>}
          {set.sourceDocument && (
            <Link href={`/case/${id}/document/${set.sourceDocument.id}`} className="text-[hsl(var(--proposed))] hover:underline">
              Source: {set.sourceDocument.title || set.sourceDocument.standardizedName}
            </Link>
          )}
        </div>
      </div>

      <DiscoverySetClient caseId={id} setId={setId} requests={requests} />
    </div>
  );
}
