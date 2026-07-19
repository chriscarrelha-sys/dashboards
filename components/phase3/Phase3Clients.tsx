'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { TrustBadge } from '@/components/ui/badge';
import { createCommunication, communicationFollowUp, createServiceRecipient, recordServiceEvent } from '@/lib/actions/phase3';
import {
  createAuthority, verifyAuthority, createResearchQuestion, createResearchMemo,
  createStrategyItem, supersedeStrategyItem, createSnapshot, createDecision, supersedeDecision,
  createOpposingPosition, createSettlement, createDamage, createRemedy,
} from '@/lib/actions/phase3b';
import {
  COMMUNICATION_TYPES, SERVICE_METHODS, AUTHORITY_TYPES, STRATEGY_RECORD_TYPES,
  SETTLEMENT_OFFER_TYPES, DAMAGE_CATEGORIES, REMEDY_TYPES, humanize,
} from '@/lib/enums';
import { formatDate } from '@/lib/utils';
import type { VerificationStatus } from '@/lib/enums';
import { Plus } from 'lucide-react';

function useAct() {
  const router = useRouter();
  const [pending, start] = useTransition();
  return { pending, run: (fn: () => Promise<unknown>) => start(async () => { await fn(); router.refresh(); }) };
}
function Empty({ msg }: { msg: string }) { return <p className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">{msg}</p>; }
function AddBtn({ open, set }: { open: boolean; set: (v: boolean) => void }) {
  return <Button size="sm" variant={open ? 'subtle' : 'primary'} onClick={() => set(!open)}><Plus size={15} /> New</Button>;
}

/* ---------------------------------------------------------- Communications */
export function CommunicationsClient({ caseId, rows }: { caseId: string; rows: any[] }) {
  const { pending, run } = useAct();
  const [open, setOpen] = useState(false);
  const [f, setF] = useState({ kind: 'email', direction: 'inbound', subject: '', summary: '', withParty: '', settlementComm: false, followUpRequired: false });
  return (
    <div>
      <div className="mb-4 flex justify-end"><AddBtn open={open} set={setOpen} /></div>
      {open && (
        <div className="mb-4 grid gap-2 rounded-lg border bg-card p-4">
          <div className="grid gap-2 sm:grid-cols-2">
            <select className="rounded-md border bg-background px-3 py-2 text-sm" value={f.kind} onChange={(e) => setF({ ...f, kind: e.target.value })}>{COMMUNICATION_TYPES.map((t) => <option key={t} value={t}>{humanize(t)}</option>)}</select>
            <select className="rounded-md border bg-background px-3 py-2 text-sm" value={f.direction} onChange={(e) => setF({ ...f, direction: e.target.value })}>{['inbound', 'outbound', 'internal', 'court-originated', 'third-party'].map((d) => <option key={d} value={d}>{humanize(d)}</option>)}</select>
          </div>
          <input className="rounded-md border bg-background px-3 py-2 text-sm" placeholder="Subject" value={f.subject} onChange={(e) => setF({ ...f, subject: e.target.value })} />
          <textarea rows={2} className="rounded-md border bg-background px-3 py-2 text-sm" placeholder="Summary" value={f.summary} onChange={(e) => setF({ ...f, summary: e.target.value })} />
          <input className="rounded-md border bg-background px-3 py-2 text-sm" placeholder="With party" value={f.withParty} onChange={(e) => setF({ ...f, withParty: e.target.value })} />
          <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
            <label className="flex items-center gap-1.5"><input type="checkbox" checked={f.settlementComm} onChange={(e) => setF({ ...f, settlementComm: e.target.checked })} /> Settlement communication</label>
            <label className="flex items-center gap-1.5"><input type="checkbox" checked={f.followUpRequired} onChange={(e) => setF({ ...f, followUpRequired: e.target.checked })} /> Needs follow-up</label>
          </div>
          <div><Button size="sm" onClick={() => f.kind && run(async () => { await createCommunication(caseId, f); setOpen(false); setF({ kind: 'email', direction: 'inbound', subject: '', summary: '', withParty: '', settlementComm: false, followUpRequired: false }); })} disabled={pending}>Save</Button></div>
        </div>
      )}
      {rows.length === 0 ? <Empty msg="No communications logged." /> : (
        <div className="space-y-2">
          {rows.map((c) => (
            <div key={c.id} className="rounded-lg border bg-card p-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded bg-muted px-1.5 py-0.5 text-xs text-muted-foreground">{humanize(c.kind)} · {humanize(c.direction)}</span>
                <span className="font-medium">{c.subject || '(no subject)'}</span>
                {c.settlementComm && <span className="rounded bg-[hsl(var(--unverified)/0.15)] px-1.5 py-0.5 text-xs text-[hsl(var(--unverified))]">settlement</span>}
                {c.confidentiality !== 'public' && <span className="text-xs text-[hsl(var(--disputed))]">{humanize(c.confidentiality)}</span>}
                <span className="ml-auto text-xs text-muted-foreground">{formatDate(c.occurredAt)}</span>
              </div>
              {c.summary && <p className="mt-1 text-sm text-muted-foreground">{c.summary}</p>}
              {c.followUpRequired && (
                <button className="mt-1 text-xs font-medium text-[hsl(var(--proposed))] hover:underline"
                  onClick={() => run(() => communicationFollowUp(caseId, c.id, `Follow up: ${c.subject || c.kind}`))} disabled={pending}>+ Create follow-up task</button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ---------------------------------------------------------- Service */
export function ServiceClient({ caseId, recipients, events }: { caseId: string; recipients: any[]; events: any[] }) {
  const { pending, run } = useAct();
  const [rOpen, setROpen] = useState(false);
  const [eOpen, setEOpen] = useState(false);
  const [r, setR] = useState({ name: '', role: '', email: '', serviceAddress: '', preferredMethod: 'efile', sourceOfAddress: '' });
  const [e, setE] = useState({ recipientName: '', serviceMethod: 'efile', serviceDate: '' });
  return (
    <div className="space-y-6">
      <section>
        <div className="mb-2 flex items-center justify-between"><h2 className="text-base font-semibold">Service recipients</h2><AddBtn open={rOpen} set={setROpen} /></div>
        {rOpen && (
          <div className="mb-3 grid gap-2 rounded-lg border bg-card p-4">
            <input className="rounded-md border bg-background px-3 py-2 text-sm" placeholder="Name *" value={r.name} onChange={(ev) => setR({ ...r, name: ev.target.value })} />
            <div className="grid gap-2 sm:grid-cols-2">
              <input className="rounded-md border bg-background px-3 py-2 text-sm" placeholder="Role / represented party" value={r.role} onChange={(ev) => setR({ ...r, role: ev.target.value })} />
              <input className="rounded-md border bg-background px-3 py-2 text-sm" placeholder="Email" value={r.email} onChange={(ev) => setR({ ...r, email: ev.target.value })} />
              <input className="rounded-md border bg-background px-3 py-2 text-sm" placeholder="Service address" value={r.serviceAddress} onChange={(ev) => setR({ ...r, serviceAddress: ev.target.value })} />
              <input className="rounded-md border bg-background px-3 py-2 text-sm" placeholder="Source of address" value={r.sourceOfAddress} onChange={(ev) => setR({ ...r, sourceOfAddress: ev.target.value })} />
            </div>
            <div><Button size="sm" onClick={() => r.name && run(async () => { await createServiceRecipient(caseId, r); setROpen(false); setR({ name: '', role: '', email: '', serviceAddress: '', preferredMethod: 'efile', sourceOfAddress: '' }); })} disabled={pending}>Save</Button></div>
          </div>
        )}
        {recipients.length === 0 ? <Empty msg="No service recipients." /> : (
          <div className="space-y-2">
            {recipients.map((x) => (
              <div key={x.id} className="rounded-lg border bg-card p-3 text-sm">
                <div className="flex items-center gap-2"><span className="font-medium">{x.name}</span>{x.role && <span className="text-xs text-muted-foreground">{x.role}</span>}<span className="ml-auto text-xs text-[hsl(var(--unverified))]">{x.lastVerified ? `verified ${formatDate(x.lastVerified)}` : 'address not verified'}</span></div>
                <div className="text-xs text-muted-foreground">{x.serviceAddress || x.email || '—'}</div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section>
        <div className="mb-2 flex items-center justify-between"><h2 className="text-base font-semibold">Service history</h2><AddBtn open={eOpen} set={setEOpen} /></div>
        {eOpen && (
          <div className="mb-3 grid gap-2 rounded-lg border bg-card p-4 sm:grid-cols-3">
            <input className="rounded-md border bg-background px-3 py-2 text-sm" placeholder="Recipient *" value={e.recipientName} onChange={(ev) => setE({ ...e, recipientName: ev.target.value })} />
            <select className="rounded-md border bg-background px-3 py-2 text-sm" value={e.serviceMethod} onChange={(ev) => setE({ ...e, serviceMethod: ev.target.value })}>{SERVICE_METHODS.map((m) => <option key={m} value={m}>{humanize(m)}</option>)}</select>
            <input type="date" className="rounded-md border bg-background px-3 py-2 text-sm" value={e.serviceDate} onChange={(ev) => setE({ ...e, serviceDate: ev.target.value })} />
            <div><Button size="sm" onClick={() => e.recipientName && run(async () => { await recordServiceEvent(caseId, e); setEOpen(false); setE({ recipientName: '', serviceMethod: 'efile', serviceDate: '' }); })} disabled={pending}>Record</Button></div>
          </div>
        )}
        {events.length === 0 ? <Empty msg="No service events. Also visible on the timeline." /> : (
          <div className="space-y-2">
            {events.map((x) => (
              <div key={x.id} className="flex items-center gap-2 rounded-lg border bg-card p-3 text-sm">
                <span className="font-medium">{x.recipientName}</span><span className="text-xs text-muted-foreground">{humanize(x.method)}</span>
                <span className="ml-auto text-xs text-muted-foreground">{formatDate(x.date)} · {humanize(x.deliveryStatus)}</span>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

/* ---------------------------------------------------------- Research */
export function ResearchClient({ caseId, authorities, questions, memos }: { caseId: string; authorities: any[]; questions: any[]; memos: any[] }) {
  const { pending, run } = useAct();
  const [aOpen, setAOpen] = useState(false);
  const [a, setA] = useState({ citation: '', authorityType: 'case', court: '', jurisdiction: '', proposition: '' });
  const [q, setQ] = useState('');
  const [m, setM] = useState({ title: '', issuePresented: '', briefAnswer: '' });
  return (
    <div className="space-y-6">
      <section>
        <div className="mb-2 flex items-center justify-between"><h2 className="text-base font-semibold">Authorities</h2><AddBtn open={aOpen} set={setAOpen} /></div>
        {aOpen && (
          <div className="mb-3 grid gap-2 rounded-lg border bg-card p-4">
            <input className="rounded-md border bg-background px-3 py-2 text-sm" placeholder="Full citation *" value={a.citation} onChange={(e) => setA({ ...a, citation: e.target.value })} />
            <div className="grid gap-2 sm:grid-cols-3">
              <select className="rounded-md border bg-background px-3 py-2 text-sm" value={a.authorityType} onChange={(e) => setA({ ...a, authorityType: e.target.value })}>{AUTHORITY_TYPES.map((t) => <option key={t} value={t}>{humanize(t)}</option>)}</select>
              <input className="rounded-md border bg-background px-3 py-2 text-sm" placeholder="Court" value={a.court} onChange={(e) => setA({ ...a, court: e.target.value })} />
              <input className="rounded-md border bg-background px-3 py-2 text-sm" placeholder="Jurisdiction" value={a.jurisdiction} onChange={(e) => setA({ ...a, jurisdiction: e.target.value })} />
            </div>
            <input className="rounded-md border bg-background px-3 py-2 text-sm" placeholder="Proposition supported" value={a.proposition} onChange={(e) => setA({ ...a, proposition: e.target.value })} />
            <p className="text-xs text-muted-foreground">New authorities start Unverified until you open the source and confirm it.</p>
            <div><Button size="sm" onClick={() => a.citation && run(async () => { await createAuthority(caseId, a); setAOpen(false); setA({ citation: '', authorityType: 'case', court: '', jurisdiction: '', proposition: '' }); })} disabled={pending}>Add authority</Button></div>
          </div>
        )}
        {authorities.length === 0 ? <Empty msg="No authorities yet." /> : (
          <div className="space-y-2">
            {authorities.map((x) => (
              <div key={x.id} className="rounded-lg border bg-card p-3">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono text-sm">{x.citation}</span>
                  <TrustBadge status={(x.verificationStatus === 'unverified' || x.verificationStatus === 'proposed' ? 'unverified' : 'confirmed') as VerificationStatus} />
                  <span className="text-xs text-muted-foreground">{humanize(x.verificationStatus)}</span>
                </div>
                {x.proposition && <p className="mt-1 text-sm text-muted-foreground">{x.proposition}</p>}
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {['exists', 'quotation', 'pinpoint', 'treatment', 'controlling'].map((step) => (
                    <button key={step} className="rounded border px-2 py-0.5 text-xs text-muted-foreground hover:bg-accent"
                      onClick={() => run(() => verifyAuthority(caseId, x.id, step, 'confirmed'))} disabled={pending}>✓ {humanize(step)}</button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section>
        <div className="mb-2 flex items-center gap-2"><h2 className="text-base font-semibold">Research questions</h2></div>
        <div className="mb-3 flex gap-2">
          <input className="flex-1 rounded-md border bg-background px-3 py-2 text-sm" placeholder="New research question…" value={q} onChange={(e) => setQ(e.target.value)} />
          <Button size="sm" onClick={() => q && run(async () => { await createResearchQuestion(caseId, { question: q }); setQ(''); })} disabled={pending}>Add</Button>
        </div>
        {questions.length === 0 ? <Empty msg="No research questions." /> : (
          <ul className="space-y-1">{questions.map((x) => <li key={x.id} className="rounded-lg border bg-card p-3 text-sm">{x.question} <span className="text-xs text-muted-foreground">· {humanize(x.status)}</span></li>)}</ul>
        )}
      </section>

      <section>
        <h2 className="mb-2 text-base font-semibold">Research memoranda</h2>
        <div className="mb-3 grid gap-2 rounded-lg border bg-card p-4">
          <input className="rounded-md border bg-background px-3 py-2 text-sm" placeholder="Memo title" value={m.title} onChange={(e) => setM({ ...m, title: e.target.value })} />
          <input className="rounded-md border bg-background px-3 py-2 text-sm" placeholder="Issue presented" value={m.issuePresented} onChange={(e) => setM({ ...m, issuePresented: e.target.value })} />
          <input className="rounded-md border bg-background px-3 py-2 text-sm" placeholder="Brief answer" value={m.briefAnswer} onChange={(e) => setM({ ...m, briefAnswer: e.target.value })} />
          <div><Button size="sm" onClick={() => m.title && run(async () => { await createResearchMemo(caseId, m); setM({ title: '', issuePresented: '', briefAnswer: '' }); })} disabled={pending}>Create memo</Button></div>
        </div>
        {memos.length === 0 ? <Empty msg="No memoranda." /> : (
          <div className="space-y-2">{memos.map((x) => <div key={x.id} className="rounded-lg border bg-card p-3"><div className="font-medium">{x.title}</div>{x.briefAnswer && <p className="text-sm text-muted-foreground">{x.briefAnswer}</p>}</div>)}</div>
        )}
      </section>
    </div>
  );
}

/* ---------------------------------------------------------- Strategy */
export function StrategyClient({ caseId, items }: { caseId: string; items: any[] }) {
  const { pending, run } = useAct();
  const [open, setOpen] = useState(false);
  const [f, setF] = useState({ recordType: 'objective', title: '', description: '', assumptions: '', risks: '' });
  return (
    <div>
      <div className="mb-4 flex justify-end gap-2">
        <Button size="sm" variant="outline" onClick={() => run(() => createSnapshot(caseId, `Snapshot ${new Date().toISOString().slice(0, 10)}`))} disabled={pending}>Snapshot</Button>
        <AddBtn open={open} set={setOpen} />
      </div>
      {open && (
        <div className="mb-4 grid gap-2 rounded-lg border bg-card p-4">
          <div className="grid gap-2 sm:grid-cols-2">
            <select className="rounded-md border bg-background px-3 py-2 text-sm" value={f.recordType} onChange={(e) => setF({ ...f, recordType: e.target.value })}>{STRATEGY_RECORD_TYPES.map((t) => <option key={t} value={t}>{humanize(t)}</option>)}</select>
            <input className="rounded-md border bg-background px-3 py-2 text-sm" placeholder="Title *" value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} />
          </div>
          <textarea rows={2} className="rounded-md border bg-background px-3 py-2 text-sm" placeholder="Description" value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} />
          <input className="rounded-md border bg-background px-3 py-2 text-sm" placeholder="Assumptions" value={f.assumptions} onChange={(e) => setF({ ...f, assumptions: e.target.value })} />
          <input className="rounded-md border bg-background px-3 py-2 text-sm" placeholder="Risks" value={f.risks} onChange={(e) => setF({ ...f, risks: e.target.value })} />
          <div><Button size="sm" onClick={() => f.title && run(async () => { await createStrategyItem(caseId, f); setOpen(false); setF({ recordType: 'objective', title: '', description: '', assumptions: '', risks: '' }); })} disabled={pending}>Save</Button></div>
        </div>
      )}
      {items.length === 0 ? <Empty msg="No strategy items yet." /> : (
        <div className="space-y-2">
          {items.map((s) => (
            <div key={s.id} className={`rounded-lg border bg-card p-3 ${s.status === 'superseded' ? 'opacity-60' : ''}`}>
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded bg-muted px-1.5 py-0.5 text-xs text-muted-foreground">{humanize(s.recordType)}</span>
                <span className={`font-medium ${s.status === 'superseded' ? 'line-through' : ''}`}>{s.title}</span>
                <span className="text-xs text-muted-foreground">{humanize(s.status)}</span>
                {s.status !== 'superseded' && (
                  <button className="ml-auto text-xs text-[hsl(var(--proposed))] hover:underline"
                    onClick={() => { const t = prompt('New (superseding) title?', s.title); if (t) run(() => supersedeStrategyItem(caseId, s.id, { title: t })); }} disabled={pending}>Supersede</button>
                )}
              </div>
              {s.description && <p className="mt-1 text-sm text-muted-foreground">{s.description}</p>}
              {s.assumptions && <p className="mt-1 text-xs text-muted-foreground"><span className="font-medium">Assumptions:</span> {s.assumptions}</p>}
              {s.risks && <p className="text-xs text-muted-foreground"><span className="font-medium">Risks:</span> {s.risks}</p>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ---------------------------------------------------------- Decision Log */
export function DecisionLogClient({ caseId, rows }: { caseId: string; rows: any[] }) {
  const { pending, run } = useAct();
  const [open, setOpen] = useState(false);
  const [f, setF] = useState({ title: '', decision: '', options: '', selectedOption: '', rationale: '', risks: '' });
  return (
    <div>
      <p className="mb-3 rounded-md bg-muted px-3 py-2 text-xs text-muted-foreground">Decisions are immutable — to change course, record a new decision that supersedes the old one. History is preserved.</p>
      <div className="mb-4 flex justify-end"><AddBtn open={open} set={setOpen} /></div>
      {open && (
        <div className="mb-4 grid gap-2 rounded-lg border bg-card p-4">
          <input className="rounded-md border bg-background px-3 py-2 text-sm" placeholder="Decision title *" value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} />
          <textarea rows={2} className="rounded-md border bg-background px-3 py-2 text-sm" placeholder="The decision *" value={f.decision} onChange={(e) => setF({ ...f, decision: e.target.value })} />
          <input className="rounded-md border bg-background px-3 py-2 text-sm" placeholder="Options considered" value={f.options} onChange={(e) => setF({ ...f, options: e.target.value })} />
          <input className="rounded-md border bg-background px-3 py-2 text-sm" placeholder="Rationale" value={f.rationale} onChange={(e) => setF({ ...f, rationale: e.target.value })} />
          <div><Button size="sm" onClick={() => f.title && f.decision && run(async () => { await createDecision(caseId, f); setOpen(false); setF({ title: '', decision: '', options: '', selectedOption: '', rationale: '', risks: '' }); })} disabled={pending}>Log decision</Button></div>
        </div>
      )}
      {rows.length === 0 ? <Empty msg="No decisions logged." /> : (
        <div className="space-y-2">
          {rows.map((d) => (
            <div key={d.id} className={`rounded-lg border bg-card p-3 ${d.supersededById ? 'opacity-60' : ''}`}>
              <div className="flex items-center gap-2"><span className="font-medium">{d.title || 'Decision'}</span>{d.supersededById && <span className="text-xs text-muted-foreground">superseded</span>}<span className="ml-auto text-xs text-muted-foreground">{formatDate(d.decidedAt)}</span></div>
              <p className="mt-1 text-sm">{d.decision}</p>
              {d.rationale && <p className="mt-0.5 text-xs text-muted-foreground">{d.rationale}</p>}
              {!d.supersededById && (
                <button className="mt-1 text-xs text-[hsl(var(--proposed))] hover:underline"
                  onClick={() => { const t = prompt('New decision title?'); const dec = t && prompt('New decision?'); if (t && dec) run(() => supersedeDecision(caseId, d.id, { title: t, decision: dec })); }} disabled={pending}>Supersede</button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ---------------------------------------------------------- Opposing */
export function OpposingClient({ caseId, rows }: { caseId: string; rows: any[] }) {
  const { pending, run } = useAct();
  const [open, setOpen] = useState(false);
  const [f, setF] = useState({ issue: '', party: '', positionSummary: '', weaknesses: '', userResponse: '' });
  return (
    <div>
      <div className="mb-4 flex justify-end"><AddBtn open={open} set={setOpen} /></div>
      {open && (
        <div className="mb-4 grid gap-2 rounded-lg border bg-card p-4">
          <input className="rounded-md border bg-background px-3 py-2 text-sm" placeholder="Issue *" value={f.issue} onChange={(e) => setF({ ...f, issue: e.target.value })} />
          <input className="rounded-md border bg-background px-3 py-2 text-sm" placeholder="Party" value={f.party} onChange={(e) => setF({ ...f, party: e.target.value })} />
          <textarea rows={2} className="rounded-md border bg-background px-3 py-2 text-sm" placeholder="Their position" value={f.positionSummary} onChange={(e) => setF({ ...f, positionSummary: e.target.value })} />
          <input className="rounded-md border bg-background px-3 py-2 text-sm" placeholder="Weaknesses" value={f.weaknesses} onChange={(e) => setF({ ...f, weaknesses: e.target.value })} />
          <input className="rounded-md border bg-background px-3 py-2 text-sm" placeholder="Your response" value={f.userResponse} onChange={(e) => setF({ ...f, userResponse: e.target.value })} />
          <div><Button size="sm" onClick={() => f.issue && run(async () => { await createOpposingPosition(caseId, f); setOpen(false); setF({ issue: '', party: '', positionSummary: '', weaknesses: '', userResponse: '' }); })} disabled={pending}>Save</Button></div>
        </div>
      )}
      {rows.length === 0 ? <Empty msg="No opposing positions tracked." /> : (
        <div className="space-y-2">
          {rows.map((p) => (
            <div key={p.id} className="rounded-lg border bg-card p-3">
              <div className="flex items-center gap-2"><span className="font-medium">{p.issue}</span>{p.party && <span className="text-xs text-muted-foreground">· {p.party}</span>}</div>
              <div className="mt-2 grid gap-2 sm:grid-cols-2">
                <div className="rounded-md border bg-background p-2"><div className="text-xs font-semibold text-[hsl(var(--disputed))]">Their position</div><p className="text-sm text-muted-foreground">{p.positionSummary || '—'}</p></div>
                <div className="rounded-md border bg-background p-2"><div className="text-xs font-semibold text-[hsl(var(--confirmed))]">Your response</div><p className="text-sm text-muted-foreground">{p.userResponse || '—'}</p></div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ---------------------------------------------------------- Settlement */
export function SettlementClient({ caseId, rows }: { caseId: string; rows: any[] }) {
  const { pending, run } = useAct();
  const [open, setOpen] = useState(false);
  const [f, setF] = useState({ offerType: 'offer', direction: 'inbound', monetaryAmount: '', releaseScope: '', deadline: '' });
  return (
    <div>
      <div className="mb-4 flex justify-end"><AddBtn open={open} set={setOpen} /></div>
      {open && (
        <div className="mb-4 grid gap-2 rounded-lg border bg-card p-4 sm:grid-cols-2">
          <select className="rounded-md border bg-background px-3 py-2 text-sm" value={f.offerType} onChange={(e) => setF({ ...f, offerType: e.target.value })}>{SETTLEMENT_OFFER_TYPES.map((t) => <option key={t} value={t}>{humanize(t)}</option>)}</select>
          <select className="rounded-md border bg-background px-3 py-2 text-sm" value={f.direction} onChange={(e) => setF({ ...f, direction: e.target.value })}>{['inbound', 'outbound'].map((d) => <option key={d} value={d}>{humanize(d)}</option>)}</select>
          <input type="number" className="rounded-md border bg-background px-3 py-2 text-sm" placeholder="Amount ($)" value={f.monetaryAmount} onChange={(e) => setF({ ...f, monetaryAmount: e.target.value })} />
          <input type="date" className="rounded-md border bg-background px-3 py-2 text-sm" value={f.deadline} onChange={(e) => setF({ ...f, deadline: e.target.value })} />
          <input className="rounded-md border bg-background px-3 py-2 text-sm sm:col-span-2" placeholder="Release scope" value={f.releaseScope} onChange={(e) => setF({ ...f, releaseScope: e.target.value })} />
          <div className="sm:col-span-2"><Button size="sm" onClick={() => run(async () => { await createSettlement(caseId, { ...f, monetaryAmount: f.monetaryAmount ? Number(f.monetaryAmount) : undefined }); setOpen(false); setF({ offerType: 'offer', direction: 'inbound', monetaryAmount: '', releaseScope: '', deadline: '' }); })} disabled={pending}>Save offer</Button></div>
        </div>
      )}
      {rows.length === 0 ? <Empty msg="No settlement offers tracked." /> : (
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full min-w-[560px] text-sm">
            <thead className="bg-muted/60 text-left text-xs uppercase tracking-wide text-muted-foreground"><tr><th className="px-3 py-2">Type</th><th className="px-3 py-2">Direction</th><th className="px-3 py-2">Amount</th><th className="px-3 py-2">Release</th><th className="px-3 py-2">Deadline</th><th className="px-3 py-2">Status</th></tr></thead>
            <tbody>
              {rows.map((s) => (
                <tr key={s.id} className="border-t"><td className="px-3 py-2">{humanize(s.offerType)}</td><td className="px-3 py-2 text-muted-foreground">{humanize(s.direction)}</td><td className="px-3 py-2 font-medium">{s.monetaryAmount != null ? `$${s.monetaryAmount.toLocaleString()}` : '—'}</td><td className="px-3 py-2 text-muted-foreground">{s.releaseScope || '—'}</td><td className="px-3 py-2 text-muted-foreground">{formatDate(s.deadline)}</td><td className="px-3 py-2 text-muted-foreground">{humanize(s.status)}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

/* ---------------------------------------------------------- Damages */
export function DamagesClient({ caseId, rows }: { caseId: string; rows: any[] }) {
  const { pending, run } = useAct();
  const [open, setOpen] = useState(false);
  const [f, setF] = useState({ label: '', category: 'direct-economic', amount: '', calculationMethod: '', assumptions: '' });
  const total = rows.reduce((s, r) => s + (r.amount || 0), 0);
  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <div className="text-sm text-muted-foreground">Claimed total: <span className="font-semibold text-foreground">${total.toLocaleString()}</span> <span className="text-xs">(organized, not a determination of recoverability)</span></div>
        <AddBtn open={open} set={setOpen} />
      </div>
      {open && (
        <div className="mb-4 grid gap-2 rounded-lg border bg-card p-4">
          <input className="rounded-md border bg-background px-3 py-2 text-sm" placeholder="Label *" value={f.label} onChange={(e) => setF({ ...f, label: e.target.value })} />
          <div className="grid gap-2 sm:grid-cols-2">
            <select className="rounded-md border bg-background px-3 py-2 text-sm" value={f.category} onChange={(e) => setF({ ...f, category: e.target.value })}>{DAMAGE_CATEGORIES.map((c) => <option key={c} value={c}>{humanize(c)}</option>)}</select>
            <input type="number" className="rounded-md border bg-background px-3 py-2 text-sm" placeholder="Amount ($)" value={f.amount} onChange={(e) => setF({ ...f, amount: e.target.value })} />
          </div>
          <input className="rounded-md border bg-background px-3 py-2 text-sm" placeholder="Calculation method" value={f.calculationMethod} onChange={(e) => setF({ ...f, calculationMethod: e.target.value })} />
          <input className="rounded-md border bg-background px-3 py-2 text-sm" placeholder="Assumptions" value={f.assumptions} onChange={(e) => setF({ ...f, assumptions: e.target.value })} />
          <div><Button size="sm" onClick={() => f.label && run(async () => { await createDamage(caseId, { ...f, amount: f.amount ? Number(f.amount) : undefined }); setOpen(false); setF({ label: '', category: 'direct-economic', amount: '', calculationMethod: '', assumptions: '' }); })} disabled={pending}>Save</Button></div>
        </div>
      )}
      {rows.length === 0 ? <Empty msg="No damages items." /> : (
        <div className="space-y-2">
          {rows.map((d) => (
            <div key={d.id} className="rounded-lg border bg-card p-3">
              <div className="flex items-center gap-2"><span className="font-medium">{d.label}</span><span className="rounded bg-muted px-1.5 py-0.5 text-xs text-muted-foreground">{humanize(d.category)}</span><span className="ml-auto font-medium">{d.amount != null ? `$${d.amount.toLocaleString()}` : '—'}</span></div>
              {d.calculationMethod && <p className="text-xs text-muted-foreground">Method: {d.calculationMethod}</p>}
              {d.assumptions && <p className="text-xs text-muted-foreground">Assumptions: {d.assumptions}</p>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ---------------------------------------------------------- Remedies */
export function RemediesClient({ caseId, rows }: { caseId: string; rows: any[] }) {
  const { pending, run } = useAct();
  const [open, setOpen] = useState(false);
  const [f, setF] = useState({ remedyType: 'monetary', description: '', legalBasis: '' });
  return (
    <div>
      <div className="mb-4 flex justify-end"><AddBtn open={open} set={setOpen} /></div>
      {open && (
        <div className="mb-4 grid gap-2 rounded-lg border bg-card p-4">
          <select className="rounded-md border bg-background px-3 py-2 text-sm" value={f.remedyType} onChange={(e) => setF({ ...f, remedyType: e.target.value })}>{REMEDY_TYPES.map((t) => <option key={t} value={t}>{humanize(t)}</option>)}</select>
          <input className="rounded-md border bg-background px-3 py-2 text-sm" placeholder="Description" value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} />
          <input className="rounded-md border bg-background px-3 py-2 text-sm" placeholder="Legal basis" value={f.legalBasis} onChange={(e) => setF({ ...f, legalBasis: e.target.value })} />
          <div><Button size="sm" onClick={() => run(async () => { await createRemedy(caseId, f); setOpen(false); setF({ remedyType: 'monetary', description: '', legalBasis: '' }); })} disabled={pending}>Save</Button></div>
        </div>
      )}
      {rows.length === 0 ? <Empty msg="No remedies tracked." /> : (
        <div className="space-y-2">{rows.map((r) => <div key={r.id} className="rounded-lg border bg-card p-3"><div className="flex items-center gap-2"><span className="font-medium">{humanize(r.remedyType)}</span><span className="ml-auto text-xs text-muted-foreground">{humanize(r.status)}</span></div>{r.description && <p className="text-sm text-muted-foreground">{r.description}</p>}{r.legalBasis && <p className="text-xs text-muted-foreground">Basis: {r.legalBasis}</p>}</div>)}</div>
      )}
    </div>
  );
}
