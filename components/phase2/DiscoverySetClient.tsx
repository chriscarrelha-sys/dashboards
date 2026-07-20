'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { TrustBadge } from '@/components/ui/badge';
import { addDiscoveryRequest, updateDiscoveryResponse, createDeficiency } from '@/lib/actions/phase2';
import { aiReviewDeficiencies } from '@/lib/actions/ai-extraction';
import { DEFICIENCY_CATEGORIES, humanize } from '@/lib/enums';
import type { VerificationStatus } from '@/lib/enums';
import { Plus, Sparkles, AlertTriangle } from 'lucide-react';

export type RequestRow = {
  id: string; requestNumber: number | null; kind: string; shortTitle: string | null;
  requestText: string | null; responseText: string | null; objections: string | null;
  status: string; deficiencyStatus: string | null; verificationStatus: string;
  deficiencies: { id: string; title: string; category: string; resolutionStatus: string }[];
};

export function DiscoverySetClient({ caseId, setId, requests }: { caseId: string; setId: string; requests: RequestRow[] }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [adding, setAdding] = useState(false);
  const [nf, setNf] = useState({ requestNumber: '', kind: 'interrogatory', shortTitle: '', requestText: '', responseText: '' });

  const add = () => {
    if (!nf.requestText) return;
    start(async () => {
      await addDiscoveryRequest(caseId, setId, {
        requestNumber: nf.requestNumber ? Number(nf.requestNumber) : undefined, kind: nf.kind,
        shortTitle: nf.shortTitle || undefined, requestText: nf.requestText, responseText: nf.responseText || undefined,
      });
      setNf({ requestNumber: '', kind: 'interrogatory', shortTitle: '', requestText: '', responseText: '' });
      setAdding(false); router.refresh();
    });
  };
  const aiReview = () => start(async () => { await aiReviewDeficiencies(caseId, requests.map((r) => r.id)); router.refresh(); });

  return (
    <div>
      <div className="mb-4 flex flex-wrap justify-end gap-2">
        {requests.length > 0 && <Button size="sm" variant="outline" onClick={aiReview} disabled={pending}><Sparkles size={15} /> AI: review responses (→ queue)</Button>}
        <Button size="sm" variant={adding ? 'subtle' : 'primary'} onClick={() => setAdding((a) => !a)}><Plus size={15} /> Add request</Button>
      </div>

      {adding && (
        <div className="mb-4 grid gap-2 rounded-lg border bg-card p-4">
          <div className="grid gap-2 sm:grid-cols-3">
            <input className="rounded-md border bg-background px-3 py-2 text-sm" placeholder="No." value={nf.requestNumber} onChange={(e) => setNf({ ...nf, requestNumber: e.target.value })} />
            <input className="rounded-md border bg-background px-3 py-2 text-sm sm:col-span-2" placeholder="Short title" value={nf.shortTitle} onChange={(e) => setNf({ ...nf, shortTitle: e.target.value })} />
          </div>
          <textarea rows={2} className="rounded-md border bg-background px-3 py-2 text-sm" placeholder="Exact request text *" value={nf.requestText} onChange={(e) => setNf({ ...nf, requestText: e.target.value })} />
          <textarea rows={2} className="rounded-md border bg-background px-3 py-2 text-sm" placeholder="Response text (optional)" value={nf.responseText} onChange={(e) => setNf({ ...nf, responseText: e.target.value })} />
          <div><Button size="sm" onClick={add} disabled={pending || !nf.requestText}>Add request</Button></div>
        </div>
      )}

      {requests.length === 0 ? (
        <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">No requests in this set yet.</p>
      ) : (
        <div className="space-y-3">
          {requests.map((r) => <RequestCard key={r.id} caseId={caseId} setId={setId} r={r} pending={pending} start={start} router={router} />)}
        </div>
      )}
    </div>
  );
}

function RequestCard({ caseId, setId, r, pending, start, router }: any) {
  const [editing, setEditing] = useState(false);
  const [resp, setResp] = useState(r.responseText ?? '');
  const [defOpen, setDefOpen] = useState(false);
  const [df, setDf] = useState({ title: '', category: 'evasive', explanation: '' });

  const saveResp = () => start(async () => { await updateDiscoveryResponse(caseId, r.id, { responseText: resp }); setEditing(false); router.refresh(); });
  const addDef = () => {
    if (!df.title) return;
    start(async () => {
      await createDeficiency(caseId, { title: df.title, category: df.category, discoveryRequestId: r.id, explanation: df.explanation || undefined });
      setDf({ title: '', category: 'evasive', explanation: '' }); setDefOpen(false); router.refresh();
    });
  };

  return (
    <div className="rounded-lg border bg-card p-4">
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-medium">No. {r.requestNumber ?? '—'}{r.shortTitle ? ` · ${r.shortTitle}` : ''}</span>
        <span className="rounded bg-muted px-1.5 py-0.5 text-xs text-muted-foreground">{humanize(r.kind)}</span>
        <TrustBadge status={r.verificationStatus as VerificationStatus} />
        {r.deficiencies.length > 0 && <span className="inline-flex items-center gap-1 text-xs text-[hsl(var(--disputed))]"><AlertTriangle size={12} /> {r.deficiencies.length} deficiency</span>}
      </div>

      <div className="mt-3 grid gap-3 md:grid-cols-2">
        <div className="rounded-md border bg-background p-3">
          <div className="mb-1 text-xs font-semibold text-muted-foreground">Request</div>
          <p className="text-sm">{r.requestText || '—'}</p>
        </div>
        <div className="rounded-md border bg-background p-3">
          <div className="mb-1 flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground">Response</span>
            {!editing && <button className="text-xs text-[hsl(var(--proposed))] hover:underline" onClick={() => setEditing(true)}>edit</button>}
          </div>
          {editing ? (
            <div className="grid gap-2">
              <textarea rows={3} className="rounded-md border bg-background px-2 py-1.5 text-sm" value={resp} onChange={(e) => setResp(e.target.value)} />
              <div className="flex gap-2"><Button size="sm" onClick={saveResp} disabled={pending}>Save</Button><Button size="sm" variant="ghost" onClick={() => setEditing(false)}>Cancel</Button></div>
            </div>
          ) : <p className="text-sm">{r.responseText || <span className="text-muted-foreground">No response recorded.</span>}</p>}
          {r.objections && <p className="mt-2 text-xs text-muted-foreground"><span className="font-medium">Objections: </span>{r.objections}</p>}
        </div>
      </div>

      {r.deficiencies.length > 0 && (
        <ul className="mt-2 space-y-1">
          {r.deficiencies.map((d: any) => (
            <li key={d.id} className="text-xs text-[hsl(var(--disputed))]">• {d.title} ({humanize(d.category)}) — {humanize(d.resolutionStatus)}</li>
          ))}
        </ul>
      )}

      <div className="mt-3">
        {defOpen ? (
          <div className="grid gap-2 rounded-md border bg-background p-3">
            <input className="rounded-md border bg-background px-2 py-1.5 text-sm" placeholder="Deficiency title *" value={df.title} onChange={(e) => setDf({ ...df, title: e.target.value })} />
            <div className="grid gap-2 sm:grid-cols-2">
              <select className="rounded-md border bg-background px-2 py-1.5 text-sm" value={df.category} onChange={(e) => setDf({ ...df, category: e.target.value })}>
                {DEFICIENCY_CATEGORIES.map((c) => <option key={c} value={c}>{humanize(c)}</option>)}
              </select>
              <input className="rounded-md border bg-background px-2 py-1.5 text-sm" placeholder="Explanation" value={df.explanation} onChange={(e) => setDf({ ...df, explanation: e.target.value })} />
            </div>
            <div className="flex gap-2"><Button size="sm" onClick={addDef} disabled={pending || !df.title}>Add deficiency</Button><Button size="sm" variant="ghost" onClick={() => setDefOpen(false)}>Cancel</Button></div>
          </div>
        ) : (
          <button className="text-xs font-medium text-[hsl(var(--disputed))] hover:underline" onClick={() => setDefOpen(true)}>+ Flag a deficiency</button>
        )}
      </div>
    </div>
  );
}
