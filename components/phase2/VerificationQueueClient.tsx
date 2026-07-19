'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { resolveProposal } from '@/lib/actions/verification';
import { humanize } from '@/lib/enums';
import { formatDate } from '@/lib/utils';
import { FileText } from 'lucide-react';

export type QueueItem = {
  id: string; kind: string; title: string; confidence: number | null; provider: string | null;
  reason: string | null; sourcePage: string | null; createdAt: string;
  sourceDoc: { id: string; label: string } | null;
  proposal: Record<string, unknown>;
};

const KIND_LABEL: Record<string, string> = {
  'document-classification': 'Document classification', evidence: 'Evidence', admission: 'Admission',
  contradiction: 'Contradiction', 'legal-issue': 'Legal issue', 'legal-element': 'Legal element',
  'discovery-extraction': 'Discovery import', 'discovery-deficiency': 'Discovery deficiency',
  witness: 'Witness', authentication: 'Authentication',
};

export function VerificationQueueClient({ caseId, items }: { caseId: string; items: QueueItem[] }) {
  const router = useRouter();
  const [pending, start] = useTransition();

  const act = (id: string, decision: 'approve' | 'reject' | 'defer') =>
    start(async () => { await resolveProposal(caseId, id, decision); router.refresh(); });

  if (items.length === 0) {
    return <p className="rounded-lg border border-dashed p-10 text-center text-sm text-muted-foreground">
      Nothing to review. AI-proposed evidence, contradictions, admissions, legal issues, discovery, and deficiencies land here for your confirmation — deadlines, hearings, and legal conclusions always require it.
    </p>;
  }

  return (
    <div className="space-y-3">
      {items.map((it) => (
        <div key={it.id} className="rounded-lg border bg-card p-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded bg-[hsl(var(--proposed)/0.15)] px-2 py-0.5 text-xs font-medium text-[hsl(var(--proposed))]">{KIND_LABEL[it.kind] ?? it.kind}</span>
            <span className="font-medium">{it.title}</span>
            {typeof it.confidence === 'number' && <span className="text-xs text-muted-foreground">{(it.confidence * 100).toFixed(0)}% confidence</span>}
            {it.provider && <span className="text-xs text-muted-foreground">· {it.provider}</span>}
            <span className="ml-auto text-xs text-muted-foreground">{formatDate(it.createdAt)}</span>
          </div>

          {it.reason && <p className="mt-2 text-xs text-muted-foreground">{it.reason}</p>}

          <div className="mt-2 rounded-md bg-muted/60 p-3 text-xs">
            <dl className="grid gap-0.5">
              {Object.entries(it.proposal).filter(([k]) => k !== 'statements' && k !== 'requests' && k !== 'set').map(([k, v]) => (
                <div key={k}><dt className="inline font-medium text-foreground">{humanize(k)}: </dt><span className="text-muted-foreground">{typeof v === 'object' ? JSON.stringify(v) : String(v)}</span></div>
              ))}
            </dl>
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-2">
            <Button size="sm" onClick={() => act(it.id, 'approve')} disabled={pending}>Approve</Button>
            <Button size="sm" variant="outline" onClick={() => act(it.id, 'reject')} disabled={pending}>Reject</Button>
            <Button size="sm" variant="ghost" onClick={() => act(it.id, 'defer')} disabled={pending}>Defer</Button>
            {it.sourceDoc && (
              <Link href={`/case/${caseId}/document/${it.sourceDoc.id}`} className="ml-auto inline-flex items-center gap-1 text-xs text-[hsl(var(--proposed))] hover:underline">
                <FileText size={12} /> Inspect source{it.sourcePage && it.sourcePage !== 'unavailable' ? ` p.${it.sourcePage}` : ''}
              </Link>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
