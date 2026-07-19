import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth/session';

/** Downloadable export manifest (§50). */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string; exportId: string }> }) {
  const { id, exportId } = await params;
  const user = await getCurrentUser();
  const exp = await prisma.caseExport.findFirst({
    where: { id: exportId, caseId: id, case: { userId: user.id } },
    include: { case: { include: { court: true } } },
  });
  if (!exp) return new NextResponse('Not found', { status: 404 });

  let manifest: Record<string, unknown> = {};
  try { manifest = JSON.parse(exp.manifest || '{}'); } catch { /* ignore */ }

  const payload = {
    exportId: exp.id,
    case: { caption: exp.case.caption, caseNumber: exp.case.caseNumber, court: exp.case.court?.name ?? null },
    scope: exp.scope,
    includesConfidential: exp.includesConfidential,
    generatedAt: exp.createdAt.toISOString(),
    generatedBy: user.email,
    applicationVersion: '0.1.0',
    schemaVersion: 'phase4',
    ...manifest,
    note: 'Pro Se Wins export manifest. Original documents are referenced, not duplicated. Confidential materials excluded unless explicitly included.',
  };

  return new NextResponse(JSON.stringify(payload, null, 2), {
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Content-Disposition': `attachment; filename="case-export-${exportId}.json"`,
      'Cache-Control': 'no-store',
    },
  });
}
