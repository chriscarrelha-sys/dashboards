import { prisma } from '@/lib/prisma';
import { PageHeading } from '@/components/PageHeading';
import { TimelineClient, type TLEvent } from '@/components/modules/TimelineClient';

export async function TimelineModule({ caseId }: { caseId: string }) {
  const events = await prisma.timelineEvent.findMany({
    where: { caseId },
    orderBy: { date: 'asc' },
  });
  const data: TLEvent[] = events.map((e) => ({
    id: e.id,
    date: e.date.toISOString(),
    title: e.title,
    eventType: e.eventType,
    description: e.description,
    verificationStatus: e.verificationStatus,
  }));
  return (
    <div>
      <PageHeading
        title="Case Timeline"
        description="Every filing, hearing, order, and factual event in chronological order. Proposed entries need confirmation."
      />
      <TimelineClient caseId={caseId} events={data} />
    </div>
  );
}
