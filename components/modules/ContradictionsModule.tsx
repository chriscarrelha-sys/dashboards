import { prisma } from '@/lib/prisma';
import { PageHeading } from '@/components/PageHeading';
import { ContradictionsClient, type ContradictionView } from '@/components/phase2/ContradictionsClient';

export async function ContradictionsModule({ caseId }: { caseId: string }) {
  const [items, documents] = await Promise.all([
    prisma.contradiction.findMany({
      where: { caseId },
      orderBy: { createdAt: 'desc' },
      include: { statements: { include: { document: { select: { id: true, title: true, standardizedName: true } } } } },
    }),
    prisma.document.findMany({ where: { caseId }, select: { id: true, title: true, standardizedName: true }, orderBy: { createdAt: 'desc' } }),
  ]);

  const views: ContradictionView[] = items.map((c) => ({
    id: c.id, title: c.title, summary: c.summary, explanation: c.explanation,
    materiality: c.materiality, status: c.status, verificationStatus: c.verificationStatus,
    createdBy: c.createdBy, createdAt: c.createdAt.toISOString(),
    statements: (c.statements.length
      ? c.statements
      : [
          { label: 'A', text: c.statementA ?? '', author: null, sourcePage: null, document: null },
          { label: 'B', text: c.statementB ?? '', author: null, sourcePage: null, document: null },
        ] as never
    ).map((s: any) => ({
      label: s.label, text: s.text, author: s.author ?? null, sourcePage: s.sourcePage ?? null,
      documentId: s.document?.id ?? null, documentLabel: s.document ? (s.document.title || s.document.standardizedName) : null,
    })),
  }));

  return (
    <div>
      <PageHeading
        title="Contradiction Tracker"
        description="Compare conflicting statements side by side. AI proposals never auto-confirm — they enter the Verification Queue and never fabricate quotes or pages."
      />
      <ContradictionsClient caseId={caseId} items={views} documents={documents.map((d) => ({ id: d.id, title: d.title || d.standardizedName }))} />
    </div>
  );
}
