import Link from 'next/link';
import { notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth/session';
import { ExhibitSetClient } from '@/components/phase4/Phase4Clients';
import { humanize } from '@/lib/enums';
import { ArrowLeft } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function ExhibitSetPage({ params }: { params: Promise<{ id: string; setId: string }> }) {
  const { id, setId } = await params;
  const user = await getCurrentUser();
  const set = await prisma.exhibitSet.findFirst({
    where: { id: setId, caseId: id, case: { userId: user.id } },
    include: { items: { orderBy: { createdAt: 'asc' }, include: { document: { select: { title: true, standardizedName: true } } } } },
  });
  if (!set) notFound();
  const documents = await prisma.document.findMany({ where: { caseId: id, deletedAt: null }, select: { id: true, title: true, standardizedName: true } });

  return (
    <div>
      <Link href={`/case/${id}/exhibits`} className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft size={14} /> Exhibit Builder
      </Link>
      <div className="mb-5 border-b pb-4">
        <h1 className="text-xl font-semibold">{set.title}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{humanize(set.kind)} · numbering: {humanize(set.numberingStyle)}</p>
      </div>
      <ExhibitSetClient
        caseId={id} setId={setId} numberingStyle={set.numberingStyle}
        items={set.items.map((it) => ({ id: it.id, exhibitNumber: it.exhibitNumber, title: it.title, pageRange: it.pageRange, authenticationStatus: it.authenticationStatus, redactionStatus: it.redactionStatus, documentLabel: it.document ? (it.document.title || it.document.standardizedName) : null }))}
        documents={documents.map((d) => ({ id: d.id, label: d.title || d.standardizedName }))}
      />
    </div>
  );
}
