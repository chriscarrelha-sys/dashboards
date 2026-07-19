import { notFound } from 'next/navigation';
import { getCaseOrThrow } from '@/lib/services/cases';
import { CaseShell } from '@/components/case/CaseShell';

export const dynamic = 'force-dynamic';

export default async function CaseLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  let header;
  try {
    const c = await getCaseOrThrow(id);
    header = {
      id: c.id,
      shortName: c.shortName,
      caption: c.caption,
      caseNumber: c.caseNumber,
    };
  } catch {
    notFound();
  }

  return <CaseShell header={header}>{children}</CaseShell>;
}
