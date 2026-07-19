import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth/session';

/**
 * Downloadable filing manifest (§12). Generates a structured, human-readable
 * manifest listing every included document, order, confidentiality, and
 * unresolved warnings. (A bundled ZIP is a future step; this is the index.)
 */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string; packageId: string }> }) {
  const { id, packageId } = await params;
  const user = await getCurrentUser();
  const pkg = await prisma.filingPackage.findFirst({
    where: { id: packageId, caseId: id, case: { userId: user.id } },
    include: {
      case: { include: { court: true } },
      filing: true,
      items: { orderBy: { order: 'asc' }, include: { document: { select: { standardizedName: true, sizeBytes: true, mimeType: true } } } },
    },
  });
  if (!pkg) return new NextResponse('Not found', { status: 404 });

  const c = pkg.case;
  const warnings: string[] = [];
  pkg.items.forEach((it, i) => { if (!it.documentId) warnings.push(`Item ${i + 1} (“${it.label}”) has no attached document.`); });
  if (!pkg.items.length) warnings.push('Package has no items.');

  const lines: string[] = [
    'FILING PACKAGE MANIFEST',
    '='.repeat(60),
    `Case caption:  ${c.caption}`,
    `Case number:   ${c.caseNumber}`,
    `Court:         ${c.court?.name ?? '—'}${c.court?.division ? ` (${c.court.division})` : ''}`,
    `Filing:        ${pkg.filing?.title ?? pkg.title}`,
    `Filing party:  ${pkg.filing?.filingParty ?? '—'}`,
    `Portal:        ${pkg.portal ?? pkg.filing?.portalType ?? '—'}`,
    `Generated:     ${new Date().toISOString()}`,
    '',
    'DOCUMENTS (upload in this order):',
    '-'.repeat(60),
  ];
  pkg.items.forEach((it, i) => {
    lines.push(
      `${i + 1}. ${it.label}${it.exhibitDesignation ? ` [${it.exhibitDesignation}]` : ''}`,
      `   file:            ${it.document?.standardizedName ?? '(no document attached)'}`,
      `   type:            ${it.document?.mimeType ?? '—'}`,
      `   pages:           ${it.pageRange ?? 'all'}`,
      `   confidentiality: ${it.confidentiality}`,
      `   separate upload: ${it.separateUpload ? 'YES' : 'no'}`,
      '',
    );
  });
  if (warnings.length) {
    lines.push('UNRESOLVED WARNINGS:', '-'.repeat(60), ...warnings.map((w) => `! ${w}`), '');
  }
  lines.push('Pro Se Wins does not file with any court. Upload the above in the portal yourself.');

  const body = lines.join('\n');
  return new NextResponse(body, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Content-Disposition': `attachment; filename="manifest-${packageId}.txt"`,
      'Cache-Control': 'no-store',
    },
  });
}
