import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth/session';
import { getStorageProvider } from '@/lib/storage/local';

/** Streams a stored original back to the browser for the preview pane. */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string; docId: string }> },
) {
  const { id, docId } = await params;
  const user = await getCurrentUser();

  const doc = await prisma.document.findFirst({
    where: { id: docId, caseId: id, case: { userId: user.id } },
  });
  if (!doc || !doc.storageKey) {
    return new NextResponse('Not found', { status: 404 });
  }

  try {
    const bytes = await getStorageProvider(doc.storageProvider).get(doc.storageKey);
    return new NextResponse(new Uint8Array(bytes), {
      headers: {
        'Content-Type': doc.mimeType || 'application/octet-stream',
        'Content-Disposition': `inline; filename="${encodeURIComponent(doc.standardizedName)}"`,
        'Cache-Control': 'private, no-store',
      },
    });
  } catch {
    return new NextResponse('File data unavailable', { status: 404 });
  }
}
