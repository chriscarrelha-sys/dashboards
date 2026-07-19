'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { addElement, setElementStatus, linkEvidenceToIssue } from '@/lib/actions/phase2';
import { ELEMENT_STATUSES, humanize } from '@/lib/enums';
import { Plus, Check, AlertTriangle, CircleDashed } from 'lucide-react';

export type ElementView = {
  id: string; number: number; title: string; standard: string | null; status: string;
  supporting: { id: string; title: string }[];
  adverse: { id: string; title: string }[];
};
type Ev = { id: string; title: string };

const STATUS_TONE: Record<string, string> = {
  supported: 'text-[hsl(var(--confirmed))]',
  'partially-supported': 'text-[hsl(var(--unverified))]',
  disputed: 'text-[hsl(var(--disputed))]',
  unsupported: 'text-muted-foreground',
  'missing-evidence': 'text-[hsl(var(--disputed))]',
};

export function ElementsMatrix({
  caseId, legalIssueId, elements, allEvidence,
}: {
  caseId: string; legalIssueId: string; elements: ElementView[]; allEvidence: Ev[];
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [adding, setAdding] = useState(false);
  const [nf, setNf] = useState({ title: '', standard: '', burdenHolder: '' });

  const addEl = () => {
    if (!nf.title) return;
    start(async () => {
      await addElement(caseId, legalIssueId, { title: nf.title, standard: nf.standard || undefined, burdenHolder: nf.burdenHolder || undefined });
      setNf({ title: '', standard: '', burdenHolder: '' });
      setAdding(false);
      router.refresh();
    });
  };

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-base font-semibold">Elements &amp; Burdens</h2>
        <Button size="sm" variant={adding ? 'subtle' : 'primary'} onClick={() => setAdding((a) => !a)}><Plus size={15} /> Add element</Button>
      </div>

      {adding && (
        <div className="mb-3 grid gap-2 rounded-lg border bg-card p-3 sm:grid-cols-3">
          <input className="rounded-md border bg-background px-3 py-2 text-sm sm:col-span-3" placeholder="Element title *" value={nf.title} onChange={(e) => setNf({ ...nf, title: e.target.value })} />
          <input className="rounded-md border bg-background px-3 py-2 text-sm" placeholder="Legal standard" value={nf.standard} onChange={(e) => setNf({ ...nf, standard: e.target.value })} />
          <input className="rounded-md border bg-background px-3 py-2 text-sm" placeholder="Burden holder" value={nf.burdenHolder} onChange={(e) => setNf({ ...nf, burdenHolder: e.target.value })} />
          <Button size="sm" onClick={addEl} disabled={pending || !nf.title}>Add</Button>
        </div>
      )}

      {elements.length === 0 ? (
        <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">No elements yet. Add the elements this issue must prove.</p>
      ) : (
        <div className="space-y-3">
          {elements.map((el) => (
            <ElementRow key={el.id} caseId={caseId} legalIssueId={legalIssueId} el={el} allEvidence={allEvidence} pending={pending} start={start} router={router} />
          ))}
        </div>
      )}
    </div>
  );
}

function ElementRow({ caseId, legalIssueId, el, allEvidence, pending, start, router }: any) {
  const [linkOpen, setLinkOpen] = useState(false);
  const [evId, setEvId] = useState('');
  const [rel, setRel] = useState('supporting');
  const missing = el.supporting.length === 0;

  const link = () => {
    if (!evId) return;
    start(async () => {
      await linkEvidenceToIssue(caseId, evId, legalIssueId, el.id, rel);
      setEvId(''); setLinkOpen(false); router.refresh();
    });
  };

  const Icon = el.status === 'supported' ? Check : missing ? AlertTriangle : CircleDashed;

  return (
    <div className="rounded-lg border bg-card p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <div className="flex items-center gap-2 font-medium">
            <Icon size={15} className={STATUS_TONE[el.status] ?? 'text-muted-foreground'} />
            <span>{el.number}. {el.title}</span>
          </div>
          {el.standard && <div className="ml-6 text-xs text-muted-foreground">{el.standard}</div>}
        </div>
        <select
          className={`rounded-md border bg-background px-2 py-1 text-xs ${STATUS_TONE[el.status] ?? ''}`}
          value={el.status}
          onChange={(e) => start(async () => { await setElementStatus(caseId, el.id, e.target.value); router.refresh(); })}
        >
          {ELEMENT_STATUSES.map((s) => <option key={s} value={s}>{humanize(s)}</option>)}
        </select>
      </div>

      <div className="ml-6 mt-3 grid gap-3 sm:grid-cols-2">
        <EvidenceCol caseId={caseId} label="Supporting evidence" tone="confirmed" items={el.supporting} empty="No supporting evidence — a gap to fill." />
        <EvidenceCol caseId={caseId} label="Adverse evidence" tone="disputed" items={el.adverse} empty="None linked." />
      </div>

      <div className="ml-6 mt-3">
        {linkOpen ? (
          <div className="flex flex-wrap items-center gap-2">
            <select className="rounded-md border bg-background px-2 py-1 text-sm" value={evId} onChange={(e) => setEvId(e.target.value)}>
              <option value="">— evidence —</option>
              {allEvidence.map((e: Ev) => <option key={e.id} value={e.id}>{e.title}</option>)}
            </select>
            <select className="rounded-md border bg-background px-2 py-1 text-sm" value={rel} onChange={(e) => setRel(e.target.value)}>
              <option value="supporting">Supporting</option>
              <option value="adverse">Adverse</option>
              <option value="impeachment">Impeachment</option>
            </select>
            <Button size="sm" onClick={link} disabled={pending || !evId}>Link</Button>
            <Button size="sm" variant="ghost" onClick={() => setLinkOpen(false)}>Cancel</Button>
          </div>
        ) : (
          <button className="text-xs font-medium text-[hsl(var(--proposed))] hover:underline" onClick={() => setLinkOpen(true)}>+ Link evidence to this element</button>
        )}
      </div>
    </div>
  );
}

function EvidenceCol({ caseId, label, tone, items, empty }: { caseId: string; label: string; tone: string; items: Ev[]; empty: string }) {
  return (
    <div>
      <div className={`text-xs font-semibold text-[hsl(var(--${tone}))]`}>{label}</div>
      {items.length ? (
        <ul className="mt-1 space-y-0.5">
          {items.map((e) => (
            <li key={e.id}><Link href={`/case/${caseId}/evidence`} className="text-sm hover:underline">{e.title}</Link></li>
          ))}
        </ul>
      ) : <p className="mt-1 text-xs text-muted-foreground">{empty}</p>}
    </div>
  );
}
