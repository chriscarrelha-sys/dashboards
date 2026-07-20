import { prisma } from '@/lib/prisma';
import { PageHeading } from '@/components/PageHeading';
import { AdmissionsClient, type AdmissionRow } from '@/components/phase2/AdmissionsClient';

export async function AdmissionsModule({ caseId }: { caseId: string }) {
  const [admissions, documents] = await Promise.all([
    prisma.admission.findMany({
      where: { caseId }, orderBy: { createdAt: 'desc' },
      include: { document: { select: { id: true, title: true, standardizedName: true } } },
    }),
    prisma.document.findMany({ where: { caseId }, select: { id: true, title: true, standardizedName: true }, orderBy: { createdAt: 'desc' } }),
  ]);
  const rows: AdmissionRow[] = admissions.map((a) => ({
    id: a.id, title: a.title, statement: a.statement, category: a.category,
    admittingParty: a.admittingParty, verificationStatus: a.verificationStatus,
    createdAt: a.createdAt.toISOString(), sourcePage: a.sourcePage,
    document: a.document ? { id: a.document.id, label: a.document.title || a.document.standardizedName } : null,
  }));
  return (
    <div>
      <PageHeading title="Admissions Tracker" description="Party admissions with exact source text and page. Filter by admitting party." />
      <AdmissionsClient caseId={caseId} rows={rows} documents={documents.map((d) => ({ id: d.id, title: d.title || d.standardizedName }))} />
    </div>
  );
}
