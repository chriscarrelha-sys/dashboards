import Link from 'next/link';
import { notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth/session';
import { Button } from '@/components/ui/button';
import { humanize } from '@/lib/enums';
import { ArrowLeft, Download } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function FilingPackagePage({ params }: { params: Promise<{ id: string; packageId: string }> }) {
  const { id, packageId } = await params;
  const user = await getCurrentUser();
  const pkg = await prisma.filingPackage.findFirst({
    where: { id: packageId, caseId: id, case: { userId: user.id } },
    include: { filing: true, items: { orderBy: { order: 'asc' }, include: { document: { select: { standardizedName: true } } } } },
  });
  if (!pkg) notFound();

  return (
    <div>
      <Link href={pkg.filingId ? `/case/${id}/filing/${pkg.filingId}` : `/case/${id}/filing-workspace`} className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft size={14} /> Back to filing
      </Link>
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">{pkg.title}</h1>
          {pkg.filing && <p className="text-sm text-muted-foreground">For: {pkg.filing.title}</p>}
        </div>
        <a href={`/case/${id}/filing-package/${packageId}/manifest`} target="_blank" rel="noopener noreferrer">
          <Button size="sm"><Download size={14} /> Download manifest</Button>
        </a>
      </div>

      {pkg.items.length === 0 ? (
        <p className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">No items yet. Add components from the filing&apos;s Package tab.</p>
      ) : (
        <ol className="space-y-2">
          {pkg.items.map((it, i) => (
            <li key={it.id} className="flex items-center gap-3 rounded-lg border bg-card p-3">
              <span className="grid h-6 w-6 place-items-center rounded-full bg-muted text-xs">{i + 1}</span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-medium">{it.label}</span>
                  {it.exhibitDesignation && <span className="rounded bg-muted px-1.5 py-0.5 text-xs">{it.exhibitDesignation}</span>}
                  {it.confidentiality !== 'public' && <span className="text-xs text-[hsl(var(--disputed))]">{humanize(it.confidentiality)}</span>}
                  {it.separateUpload && <span className="text-xs text-muted-foreground">separate upload</span>}
                </div>
                <div className="font-mono text-xs text-muted-foreground">{it.document?.standardizedName ?? '(no document attached)'}{it.pageRange ? ` · pp. ${it.pageRange}` : ''}</div>
              </div>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
