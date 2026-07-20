import { prisma } from '@/lib/prisma';
import { PageHeading } from '@/components/PageHeading';
import { EmptyState } from '@/components/EmptyState';
import { Card } from '@/components/ui/card';
import { ReviewActions } from '@/components/modules/ReviewActions';

/** Shared by the Document Review Queue and the Verification Queue nav items. */
export async function ReviewQueueModule({
  caseId,
  title,
  description,
}: {
  caseId: string;
  title: string;
  description: string;
}) {
  const items = await prisma.reviewQueueItem.findMany({
    where: { caseId, status: 'pending' },
    orderBy: { createdAt: 'desc' },
  });

  return (
    <div>
      <PageHeading title={title} description={description} />
      {items.length === 0 ? (
        <EmptyState
          title="Nothing to review"
          description="Uncertain classifications and any AI-proposed deadlines, hearings, or facts will appear here for your confirmation."
        />
      ) : (
        <div className="space-y-3">
          {items.map((it) => {
            let proposal: Record<string, unknown> = {};
            try {
              proposal = JSON.parse(it.proposal);
            } catch {
              /* leave empty */
            }
            return (
              <Card key={it.id} className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold">{it.title}</span>
                      <span className="rounded bg-muted px-1.5 py-0.5 text-xs text-muted-foreground">
                        {it.kind}
                      </span>
                      {typeof it.confidence === 'number' && (
                        <span className="text-xs text-muted-foreground">
                          confidence {(it.confidence * 100).toFixed(0)}%
                        </span>
                      )}
                    </div>
                    <dl className="mt-2 grid gap-0.5 text-xs text-muted-foreground">
                      {Object.entries(proposal).map(([k, v]) => (
                        <div key={k}>
                          <dt className="inline font-medium text-foreground">{k}: </dt>
                          {String(v)}
                        </div>
                      ))}
                    </dl>
                    {it.provider && (
                      <p className="mt-2 text-xs text-muted-foreground">Proposed by: {it.provider}</p>
                    )}
                  </div>
                  <ReviewActions caseId={caseId} itemId={it.id} />
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
