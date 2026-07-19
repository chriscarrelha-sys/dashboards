import { prisma } from '@/lib/prisma';
import { PageHeading } from '@/components/PageHeading';
import { LegalIssuesClient, type IssueRow } from '@/components/phase2/LegalIssuesClient';
import { humanize } from '@/lib/enums';

/** Lists legal issues, optionally filtered to a type (claim/defense/...). */
export async function LegalIssuesModule({
  caseId, issueType, title,
}: {
  caseId: string; issueType?: string; title: string;
}) {
  const issues = await prisma.legalIssue.findMany({
    where: { caseId, ...(issueType ? { issueType } : {}) },
    orderBy: { createdAt: 'asc' },
    include: {
      elements: { select: { status: true } },
      evidenceLinks: { select: { id: true } },
    },
  });

  const rows: IssueRow[] = issues.map((i) => ({
    id: i.id, title: i.title, issueType: i.issueType, status: i.status,
    assertingParty: i.assertingParty, verificationStatus: i.verificationStatus,
    elementCount: i.elements.length,
    supportedCount: i.elements.filter((e) => e.status === 'supported' || e.status === 'partially-supported').length,
    evidenceCount: i.evidenceLinks.length,
  }));

  return (
    <div>
      <PageHeading
        title={title}
        description={`${humanize(issueType ?? 'all')} — open one to work its Elements & Burdens matrix and see supporting, adverse, and missing evidence.`}
      />
      <LegalIssuesClient caseId={caseId} issues={rows} defaultType={issueType} />
    </div>
  );
}
