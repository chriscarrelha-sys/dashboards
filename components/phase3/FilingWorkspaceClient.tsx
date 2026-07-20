'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { TrustBadge } from '@/components/ui/badge';
import { createFiling } from '@/lib/actions/phase3';
import { FILING_TYPES, FILING_STAGES, humanize } from '@/lib/enums';
import { formatDate, relativeDeadline } from '@/lib/utils';
import type { VerificationStatus } from '@/lib/enums';
import { Plus, FileText } from 'lucide-react';

export type FilingRow = {
  id: string; title: string; filingType: string | null; stage: string; status: string;
  dueDate: string | null; filingParty: string | null; verificationStatus: string;
  warnings: number; hasFinal: boolean; hasCert: boolean;
};

export function FilingWorkspaceClient({ caseId, filings }: { caseId: string; filings: FilingRow[] }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [open, setOpen] = useState(false);
  const [f, setF] = useState({ title: '', filingType: 'motion', filingParty: '', dueDate: '', requestedRelief: '' });

  const submit = () => {
    if (!f.title) return;
    start(async () => {
      const res = await createFiling(caseId, { title: f.title, filingType: f.filingType, filingParty: f.filingParty || undefined, dueDate: f.dueDate || undefined, requestedRelief: f.requestedRelief || undefined });
      setOpen(false);
      router.push(`/case/${caseId}/filing/${res.id}`);
    });
  };

  const buckets = [
    ['Active drafts', filings.filter((x) => !['filed', 'filed-stamped', 'served', 'service-confirmed', 'resolved'].includes(x.stage)).length],
    ['Ready to file', filings.filter((x) => x.stage === 'ready-to-file').length],
    ['With warnings', filings.filter((x) => x.warnings > 0).length],
    ['Filed', filings.filter((x) => ['filed', 'filed-stamped', 'served', 'service-confirmed', 'resolved'].includes(x.stage)).length],
  ] as const;

  return (
    <div>
      <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {buckets.map(([label, n]) => (
          <div key={label} className="rounded-lg border bg-card p-3">
            <div className="text-2xl font-semibold">{n}</div>
            <div className="text-xs text-muted-foreground">{label}</div>
          </div>
        ))}
      </div>

      <div className="mb-4 flex justify-end">
        <Button size="sm" variant={open ? 'subtle' : 'primary'} onClick={() => setOpen((o) => !o)}><Plus size={15} /> New filing</Button>
      </div>

      {open && (
        <div className="mb-4 grid gap-3 rounded-lg border bg-card p-4">
          <input className="rounded-md border bg-background px-3 py-2 text-sm" placeholder="Filing title *" value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} />
          <div className="grid gap-2 sm:grid-cols-3">
            <select className="rounded-md border bg-background px-3 py-2 text-sm" value={f.filingType} onChange={(e) => setF({ ...f, filingType: e.target.value })}>
              {FILING_TYPES.map((t) => <option key={t} value={t}>{humanize(t)}</option>)}
            </select>
            <input className="rounded-md border bg-background px-3 py-2 text-sm" placeholder="Filing party" value={f.filingParty} onChange={(e) => setF({ ...f, filingParty: e.target.value })} />
            <input type="date" className="rounded-md border bg-background px-3 py-2 text-sm" value={f.dueDate} onChange={(e) => setF({ ...f, dueDate: e.target.value })} />
          </div>
          <input className="rounded-md border bg-background px-3 py-2 text-sm" placeholder="Requested relief" value={f.requestedRelief} onChange={(e) => setF({ ...f, requestedRelief: e.target.value })} />
          <div><Button size="sm" onClick={submit} disabled={pending || !f.title}>Create &amp; open</Button></div>
        </div>
      )}

      {filings.length === 0 ? (
        <p className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">No filings yet. Create one to open its workspace.</p>
      ) : (
        <div className="space-y-2">
          {filings.map((x) => {
            const rel = x.dueDate ? relativeDeadline(x.dueDate) : null;
            const stageIdx = FILING_STAGES.indexOf(x.stage as never);
            return (
              <Link key={x.id} href={`/case/${caseId}/filing/${x.id}`} className="flex items-center gap-3 rounded-lg border bg-card p-3 hover:border-ring">
                <FileText size={16} className="text-[hsl(var(--proposed))]" />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium">{x.title}</span>
                    <span className="rounded bg-muted px-1.5 py-0.5 text-xs text-muted-foreground">{humanize(x.filingType)}</span>
                    {x.warnings > 0 && <span className="rounded bg-[hsl(var(--unverified)/0.15)] px-1.5 py-0.5 text-xs text-[hsl(var(--unverified))]">{x.warnings} warning</span>}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Stage {stageIdx + 1}/{FILING_STAGES.length}: {humanize(x.stage)}
                    {rel ? ` · due ${formatDate(x.dueDate)} (${rel.label})` : ''}
                    {x.hasFinal ? ' · final ✓' : ''}{x.hasCert ? ' · cert ✓' : ''}
                  </div>
                </div>
                <TrustBadge status={x.verificationStatus as VerificationStatus} />
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
