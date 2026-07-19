import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { PageHeading } from '@/components/PageHeading';
import { EmptyState } from '@/components/EmptyState';
import { TrustBadge } from '@/components/ui/badge';
import { UploadButton } from '@/components/modules/UploadButton';
import { formatDate } from '@/lib/utils';
import type { VerificationStatus } from '@/lib/enums';

/** Documents list, optionally filtered to an IA category (drafts/filed/...). */
export async function DocumentsModule({
  caseId,
  category,
  title,
}: {
  caseId: string;
  category?: string;
  title: string;
}) {
  const docs = await prisma.document.findMany({
    where: { caseId, ...(category ? { category } : {}) },
    orderBy: { createdAt: 'desc' },
  });

  return (
    <div>
      <PageHeading
        title={title}
        description="Uploads are auto-classified. Low-confidence items go to the review queue; extracted dates always need confirmation."
        action={<UploadButton caseId={caseId} />}
      />

      {docs.length === 0 ? (
        <EmptyState
          title="No documents yet"
          description="Upload a filing, order, or correspondence. It will be classified and given a standardized name automatically."
        />
      ) : (
        <div className="overflow-hidden rounded-lg border">
          <table className="w-full text-sm">
            <thead className="bg-muted/60 text-left text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-4 py-2.5 font-medium">Document</th>
                <th className="hidden px-4 py-2.5 font-medium sm:table-cell">Type</th>
                <th className="hidden px-4 py-2.5 font-medium md:table-cell">Date</th>
                <th className="px-4 py-2.5 font-medium">Trust</th>
              </tr>
            </thead>
            <tbody>
              {docs.map((d) => (
                <tr key={d.id} className="border-t hover:bg-accent/40">
                  <td className="px-4 py-3">
                    <Link href={`/case/${caseId}/document/${d.id}`} className="font-medium hover:underline">
                      {d.title || d.standardizedName}
                    </Link>
                    <div className="truncate font-mono text-xs text-muted-foreground">{d.originalName}</div>
                  </td>
                  <td className="hidden px-4 py-3 text-muted-foreground sm:table-cell">{d.docType ?? '—'}</td>
                  <td className="hidden px-4 py-3 text-muted-foreground md:table-cell">{formatDate(d.docDate)}</td>
                  <td className="px-4 py-3">
                    <TrustBadge status={d.verificationStatus as VerificationStatus} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
