import { notFound } from 'next/navigation';
import { getCaseOrThrow, getCaseSummary } from '@/lib/services/cases';
import { CaseHeader } from '@/components/case/CaseHeader';
import { SummaryCards, type SummaryData } from '@/components/case/SummaryCards';

export const dynamic = 'force-dynamic';

export default async function CaseOverview({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  let c;
  try {
    c = await getCaseOrThrow(id);
  } catch {
    notFound();
  }
  const summary = await getCaseSummary(id);

  const data: SummaryData = {
    base: `/case/${id}`,
    nextTask: summary.nextTask
      ? {
          title: summary.nextTask.title,
          why: summary.nextTask.why,
          priority: summary.nextTask.priority,
          dueDate: summary.nextTask.dueDate ? summary.nextTask.dueDate.toISOString() : null,
          status: summary.nextTask.status,
        }
      : null,
    nextDeadline: summary.nextDeadline
      ? {
          title: summary.nextDeadline.title,
          dueDate: summary.nextDeadline.dueDate ? summary.nextDeadline.dueDate.toISOString() : null,
          source: summary.nextDeadline.source,
          verificationStatus: summary.nextDeadline.verificationStatus,
          governingRule: summary.nextDeadline.governingRule,
        }
      : null,
    posture: {
      pendingMotions: summary.pendingMotions,
      notes: summary.postureNotes.map((n) => ({ title: n.title, body: n.body })),
    },
  };

  return (
    <div>
      <CaseHeader
        caption={c.caption}
        courtName={c.court?.name ?? null}
        division={c.court?.division ?? null}
        caseNumber={c.caseNumber}
        judgeName={c.judge?.name ?? null}
        caseType={c.caseType}
        forum={c.forum}
        portal={c.portal ? { kind: c.portal.kind, label: c.portal.label, url: c.portal.url } : null}
      />
      <SummaryCards data={data} />
    </div>
  );
}
