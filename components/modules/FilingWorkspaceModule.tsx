import { prisma } from '@/lib/prisma';
import { PageHeading } from '@/components/PageHeading';
import { FilingWorkspaceClient, type FilingRow } from '@/components/phase3/FilingWorkspaceClient';

export async function FilingWorkspaceModule({ caseId }: { caseId: string }) {
  const filings = await prisma.filing.findMany({
    where: { caseId },
    orderBy: { updatedAt: 'desc' },
    include: {
      checklistItems: { where: { isWarning: true, status: { not: 'waived' } }, select: { id: true } },
      versions: { select: { approvalStatus: true } },
      certificates: { select: { id: true } },
    },
  });
  const rows: FilingRow[] = filings.map((f) => ({
    id: f.id, title: f.title, filingType: f.filingType, stage: f.stage, status: f.status,
    dueDate: f.dueDate ? f.dueDate.toISOString() : null, filingParty: f.filingParty,
    verificationStatus: f.verificationStatus, warnings: f.checklistItems.length,
    hasFinal: f.versions.some((v) => v.approvalStatus === 'final-for-filing'), hasCert: f.certificates.length > 0,
  }));
  return (
    <div>
      <PageHeading
        title="Filing Workspace"
        description="Prepare filings end-to-end: link support, manage drafts and versions, run readiness checks, assemble packages, and record filing and service."
      />
      <FilingWorkspaceClient caseId={caseId} filings={rows} />
    </div>
  );
}
