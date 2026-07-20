'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { TrustBadge } from '@/components/ui/badge';
import {
  setDeficiencyStatus, createMeetAndConfer, createWitness, createSubpoena,
} from '@/lib/actions/phase2';
import { DEFICIENCY_STATUSES, humanize } from '@/lib/enums';
import { formatDate } from '@/lib/utils';
import type { VerificationStatus } from '@/lib/enums';
import { Plus } from 'lucide-react';

/* ---------------------------------------------------------- Deficiencies */
export type DeficiencyRow = {
  id: string; title: string; category: string; explanation: string | null;
  resolutionStatus: string; verificationStatus: string; createdBy: string | null;
  requestTitle: string | null; createdAt: string;
};
export function DeficienciesClient({ caseId, rows }: { caseId: string; rows: DeficiencyRow[] }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  if (rows.length === 0) return <Empty msg="No deficiencies tracked. Flag them from a discovery set, or approve AI-proposed deficiencies in the Verification Queue." />;
  return (
    <div className="space-y-2">
      {rows.map((d) => (
        <div key={d.id} className="rounded-lg border bg-card p-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-medium">{d.title}</span>
            <span className="rounded bg-muted px-1.5 py-0.5 text-xs text-muted-foreground">{humanize(d.category)}</span>
            <TrustBadge status={d.verificationStatus as VerificationStatus} />
            {d.createdBy === 'ai' && <span className="text-xs text-[hsl(var(--unverified))]">AI</span>}
            <span className="ml-auto text-xs text-muted-foreground">{formatDate(d.createdAt)}</span>
          </div>
          {d.requestTitle && <div className="text-xs text-muted-foreground">Request: {d.requestTitle}</div>}
          {d.explanation && <p className="mt-1 text-sm text-muted-foreground">{d.explanation}</p>}
          <div className="mt-2 flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Status:</span>
            <select className="rounded-md border bg-background px-2 py-1 text-xs" value={d.resolutionStatus}
              onChange={(e) => start(async () => { await setDeficiencyStatus(caseId, d.id, e.target.value); router.refresh(); })} disabled={pending}>
              {DEFICIENCY_STATUSES.map((s) => <option key={s} value={s}>{humanize(s)}</option>)}
            </select>
          </div>
        </div>
      ))}
    </div>
  );
}

/* ---------------------------------------------------------- Meet & Confer */
export type MeetConferRow = { id: string; title: string; communicationType: string | null; participants: string | null; summary: string | null; status: string; createdAt: string };
export function MeetConferClient({ caseId, rows }: { caseId: string; rows: MeetConferRow[] }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [open, setOpen] = useState(false);
  const [f, setF] = useState({ title: '', communicationType: 'letter', participants: '', summary: '', demand: '' });
  const submit = () => {
    if (!f.title) return;
    start(async () => { await createMeetAndConfer(caseId, f); setF({ title: '', communicationType: 'letter', participants: '', summary: '', demand: '' }); setOpen(false); router.refresh(); });
  };
  return (
    <div>
      <div className="mb-4 flex justify-end"><Button size="sm" variant={open ? 'subtle' : 'primary'} onClick={() => setOpen((o) => !o)}><Plus size={15} /> New record</Button></div>
      {open && (
        <div className="mb-4 grid gap-2 rounded-lg border bg-card p-4">
          <input className="rounded-md border bg-background px-3 py-2 text-sm" placeholder="Title *" value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} />
          <div className="grid gap-2 sm:grid-cols-2">
            <select className="rounded-md border bg-background px-3 py-2 text-sm" value={f.communicationType} onChange={(e) => setF({ ...f, communicationType: e.target.value })}>
              {['letter', 'email', 'telephone', 'certification', 'follow-up'].map((t) => <option key={t} value={t}>{humanize(t)}</option>)}
            </select>
            <input className="rounded-md border bg-background px-3 py-2 text-sm" placeholder="Participants" value={f.participants} onChange={(e) => setF({ ...f, participants: e.target.value })} />
          </div>
          <textarea rows={2} className="rounded-md border bg-background px-3 py-2 text-sm" placeholder="Summary" value={f.summary} onChange={(e) => setF({ ...f, summary: e.target.value })} />
          <input className="rounded-md border bg-background px-3 py-2 text-sm" placeholder="Requested cure / demand" value={f.demand} onChange={(e) => setF({ ...f, demand: e.target.value })} />
          <div><Button size="sm" onClick={submit} disabled={pending || !f.title}>Save</Button></div>
        </div>
      )}
      {rows.length === 0 ? <Empty msg="No meet-and-confer records yet." /> : (
        <div className="space-y-2">
          {rows.map((m) => (
            <div key={m.id} className="rounded-lg border bg-card p-3">
              <div className="flex items-center gap-2"><span className="font-medium">{m.title}</span><span className="rounded bg-muted px-1.5 py-0.5 text-xs text-muted-foreground">{humanize(m.communicationType)}</span><span className="ml-auto text-xs text-muted-foreground">{formatDate(m.createdAt)}</span></div>
              {m.participants && <div className="text-xs text-muted-foreground">{m.participants}</div>}
              {m.summary && <p className="mt-1 text-sm text-muted-foreground">{m.summary}</p>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ---------------------------------------------------------- Witnesses */
export type WitnessRow = { id: string; name: string; role: string | null; party: string | null; expectedTestimony: string | null; evidenceCount: number };
export function WitnessesClient({ caseId, rows }: { caseId: string; rows: WitnessRow[] }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [open, setOpen] = useState(false);
  const [f, setF] = useState({ name: '', role: '', party: '', expectedTestimony: '' });
  const submit = () => { if (!f.name) return; start(async () => { await createWitness(caseId, f); setF({ name: '', role: '', party: '', expectedTestimony: '' }); setOpen(false); router.refresh(); }); };
  return (
    <div>
      <div className="mb-4 flex justify-end"><Button size="sm" variant={open ? 'subtle' : 'primary'} onClick={() => setOpen((o) => !o)}><Plus size={15} /> New witness</Button></div>
      {open && (
        <div className="mb-4 grid gap-2 rounded-lg border bg-card p-4">
          <input className="rounded-md border bg-background px-3 py-2 text-sm" placeholder="Name *" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} />
          <div className="grid gap-2 sm:grid-cols-2">
            <input className="rounded-md border bg-background px-3 py-2 text-sm" placeholder="Role" value={f.role} onChange={(e) => setF({ ...f, role: e.target.value })} />
            <input className="rounded-md border bg-background px-3 py-2 text-sm" placeholder="Party affiliation" value={f.party} onChange={(e) => setF({ ...f, party: e.target.value })} />
          </div>
          <textarea rows={2} className="rounded-md border bg-background px-3 py-2 text-sm" placeholder="Expected testimony" value={f.expectedTestimony} onChange={(e) => setF({ ...f, expectedTestimony: e.target.value })} />
          <div><Button size="sm" onClick={submit} disabled={pending || !f.name}>Save</Button></div>
        </div>
      )}
      {rows.length === 0 ? <Empty msg="No witnesses recorded." /> : (
        <div className="space-y-2">
          {rows.map((w) => (
            <div key={w.id} className="rounded-lg border bg-card p-3">
              <div className="flex items-center gap-2"><span className="font-medium">{w.name}</span>{w.role && <span className="text-xs text-muted-foreground">{w.role}</span>}{w.party && <span className="rounded bg-muted px-1.5 py-0.5 text-xs text-muted-foreground">{w.party}</span>}<span className="ml-auto text-xs text-muted-foreground">{w.evidenceCount} evidence</span></div>
              {w.expectedTestimony && <p className="mt-1 text-sm text-muted-foreground">{w.expectedTestimony}</p>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ---------------------------------------------------------- Subpoenas */
export type SubpoenaRow = { id: string; recipient: string; subpoenaType: string; requested: string | null; status: string; createdAt: string };
export function SubpoenasClient({ caseId, rows }: { caseId: string; rows: SubpoenaRow[] }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [open, setOpen] = useState(false);
  const [f, setF] = useState({ recipient: '', subpoenaType: 'documents', requested: '' });
  const submit = () => { if (!f.recipient) return; start(async () => { await createSubpoena(caseId, f); setF({ recipient: '', subpoenaType: 'documents', requested: '' }); setOpen(false); router.refresh(); }); };
  return (
    <div>
      <p className="mb-4 rounded-md bg-muted px-3 py-2 text-xs text-muted-foreground">Pro Se Wins tracks subpoenas — it does not file or serve them. External issuance/service remains a manual step.</p>
      <div className="mb-4 flex justify-end"><Button size="sm" variant={open ? 'subtle' : 'primary'} onClick={() => setOpen((o) => !o)}><Plus size={15} /> New subpoena</Button></div>
      {open && (
        <div className="mb-4 grid gap-2 rounded-lg border bg-card p-4">
          <input className="rounded-md border bg-background px-3 py-2 text-sm" placeholder="Recipient *" value={f.recipient} onChange={(e) => setF({ ...f, recipient: e.target.value })} />
          <select className="rounded-md border bg-background px-3 py-2 text-sm" value={f.subpoenaType} onChange={(e) => setF({ ...f, subpoenaType: e.target.value })}>
            {['documents', 'testimony', 'both'].map((t) => <option key={t} value={t}>{humanize(t)}</option>)}
          </select>
          <textarea rows={2} className="rounded-md border bg-background px-3 py-2 text-sm" placeholder="Documents or testimony requested" value={f.requested} onChange={(e) => setF({ ...f, requested: e.target.value })} />
          <div><Button size="sm" onClick={submit} disabled={pending || !f.recipient}>Save</Button></div>
        </div>
      )}
      {rows.length === 0 ? <Empty msg="No subpoenas tracked." /> : (
        <div className="space-y-2">
          {rows.map((s) => (
            <div key={s.id} className="rounded-lg border bg-card p-3">
              <div className="flex items-center gap-2"><span className="font-medium">{s.recipient}</span><span className="rounded bg-muted px-1.5 py-0.5 text-xs text-muted-foreground">{humanize(s.subpoenaType)}</span><span className="ml-auto text-xs text-muted-foreground">{humanize(s.status)}</span></div>
              {s.requested && <p className="mt-1 text-sm text-muted-foreground">{s.requested}</p>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function Empty({ msg }: { msg: string }) {
  return <p className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">{msg}</p>;
}
