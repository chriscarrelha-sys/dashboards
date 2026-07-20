import { prisma } from '@/lib/prisma';
import { PageHeading } from '@/components/PageHeading';
import { EvidenceExplorer, type EvidenceRow } from '@/components/phase2/EvidenceExplorer';

/** Evidence Command Center — table/card views, filters, search, cross-links. */
export async function EvidenceModule({ caseId }: { caseId: string }) {
  const [evidence, documents, legalIssues] = await Promise.all([
    prisma.evidenceItem.findMany({
      where: { caseId },
      orderBy: { updatedAt: 'desc' },
      include: {
        document: { select: { id: true, title: true, standardizedName: true } },
        legalIssueLinks: { include: { legalIssue: { select: { id: true, title: true } } } },
      },
    }),
    prisma.document.findMany({ where: { caseId }, select: { id: true, title: true, standardizedName: true }, orderBy: { createdAt: 'desc' } }),
    prisma.legalIssue.findMany({ where: { caseId }, select: { id: true, title: true }, orderBy: { createdAt: 'asc' } }),
  ]);

  const rows: EvidenceRow[] = evidence.map((e) => ({
    id: e.id, title: e.title, proposition: e.proposition, evidenceType: e.evidenceType,
    posture: e.posture, evidentiaryStatus: e.evidentiaryStatus, authenticationStatus: e.authenticationStatus,
    verificationStatus: e.verificationStatus, disputed: e.disputed, createdBy: e.createdBy,
    updatedAt: e.updatedAt.toISOString(), sourcePage: e.sourcePage,
    document: e.document ? { id: e.document.id, label: e.document.title || e.document.standardizedName } : null,
    issues: e.legalIssueLinks.map((l) => ({ id: l.legalIssue.id, title: l.legalIssue.title, relation: l.relation })),
  }));

  return (
    <div>
      <PageHeading
        title="Evidence Command Center"
        description="Every fact, source-linked. Filter by type, posture, legal issue, or origin (AI vs. user). AI-proposed evidence is confirmed through the Verification Queue."
      />
      <EvidenceExplorer
        caseId={caseId}
        rows={rows}
        documents={documents.map((d) => ({ id: d.id, title: d.title || d.standardizedName }))}
        legalIssues={legalIssues.map((i) => ({ id: i.id, title: i.title }))}
      />
    </div>
  );
}
