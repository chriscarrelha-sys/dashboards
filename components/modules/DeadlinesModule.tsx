import { prisma } from '@/lib/prisma';
import { PageHeading } from '@/components/PageHeading';
import { DeadlinesClient, type DeadlineRow, type TaskRow } from '@/components/modules/DeadlinesClient';

export async function DeadlinesModule({ caseId }: { caseId: string }) {
  const [deadlines, tasks] = await Promise.all([
    prisma.deadline.findMany({ where: { caseId }, orderBy: [{ done: 'asc' }, { dueDate: 'asc' }] }),
    prisma.task.findMany({ where: { caseId }, orderBy: [{ isNextAction: 'desc' }, { dueDate: 'asc' }] }),
  ]);

  const d: DeadlineRow[] = deadlines.map((x) => ({
    id: x.id, title: x.title, dueDate: x.dueDate ? x.dueDate.toISOString() : null,
    source: x.source, verificationStatus: x.verificationStatus, governingRule: x.governingRule, done: x.done,
  }));
  const t: TaskRow[] = tasks.map((x) => ({
    id: x.id, title: x.title, why: x.why, priority: x.priority,
    dueDate: x.dueDate ? x.dueDate.toISOString() : null, status: x.status, isNextAction: x.isNextAction,
  }));

  return (
    <div>
      <PageHeading
        title="Deadlines & Tasks"
        description="Calculated deadlines are marked Unverified until you confirm them. The rule calculator uses clearly-labeled example rules, not legal authority."
      />
      <DeadlinesClient caseId={caseId} deadlines={d} tasks={t} />
    </div>
  );
}
