'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { TrustBadge } from '@/components/ui/badge';
import {
  advanceFilingStage, linkFiling, addFilingVersion, markVersionFinal, setChecklistItem,
  runReadinessChecks, generateCertificate, createFilingPackage, addPackageItem,
  recordSubmission, addFiledStampedCopy, recordServiceEvent,
} from '@/lib/actions/phase3';
import { aiDraft, aiReviewDraft } from '@/lib/actions/phase3b';
import { FILING_STAGES, FILING_CHECKLIST_ITEM_STATUSES, VERSION_LABELS, SERVICE_METHODS, AI_DRAFT_TASKS, AI_SOURCE_SCOPES, humanize } from '@/lib/enums';
import { formatDate, relativeDeadline } from '@/lib/utils';
import type { VerificationStatus } from '@/lib/enums';

type Opt = { id: string; label: string };
type Options = { issues: Opt[]; evidence: Opt[]; authorities: Opt[]; discovery: Opt[]; documents: Opt[]; recipients: Opt[] };

const TABS = ['Overview', 'Draft', 'Support', 'Checklist', 'Cert & Service', 'Package', 'Filing', 'AI'] as const;

export function FilingDetail({ caseId, data, options }: { caseId: string; data: any; options: Options }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [tab, setTab] = useState<(typeof TABS)[number]>('Overview');
  const refresh = () => router.refresh();
  const run = (fn: () => Promise<unknown>) => start(async () => { await fn(); refresh(); });

  const stageIdx = FILING_STAGES.indexOf(data.stage);
  const rel = data.dueDate ? relativeDeadline(data.dueDate) : null;
  const warnings = data.checklist.filter((c: any) => c.isWarning && c.status !== 'waived');

  return (
    <div>
      {/* Header */}
      <div className="mb-4 border-b pb-4">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-xl font-semibold">{data.title}</h1>
          <span className="rounded bg-muted px-2 py-0.5 text-xs text-muted-foreground">{humanize(data.filingType)}</span>
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
          <span>Stage {stageIdx + 1}/{FILING_STAGES.length}: <strong className="text-foreground">{humanize(data.stage)}</strong></span>
          {rel && <span>Due {formatDate(data.dueDate)} · <span className={`text-[hsl(var(--${rel.tone === 'ok' ? 'confirmed' : rel.tone === 'danger' ? 'disputed' : 'unverified'}))]`}>{rel.label}</span></span>}
          {data.filingParty && <span>{data.filingParty}</span>}
          {warnings.length > 0 && <span className="text-[hsl(var(--unverified))]">{warnings.length} unresolved warning(s)</span>}
        </div>
      </div>

      {/* Tabs */}
      <div className="mb-4 flex flex-wrap gap-1 border-b">
        {TABS.map((t) => (
          <button key={t} onClick={() => setTab(t)} className={`px-3 py-2 text-sm ${tab === t ? 'border-b-2 border-[hsl(var(--proposed))] font-medium' : 'text-muted-foreground hover:text-foreground'}`}>{t}</button>
        ))}
      </div>

      {tab === 'Overview' && <OverviewTab data={data} stageIdx={stageIdx} run={run} pending={pending} caseId={caseId} />}
      {tab === 'Draft' && <DraftTab caseId={caseId} data={data} run={run} pending={pending} />}
      {tab === 'Support' && <SupportTab caseId={caseId} data={data} options={options} run={run} pending={pending} />}
      {tab === 'Checklist' && <ChecklistTab caseId={caseId} data={data} run={run} pending={pending} />}
      {tab === 'Cert & Service' && <CertServiceTab caseId={caseId} data={data} options={options} run={run} pending={pending} />}
      {tab === 'Package' && <PackageTab caseId={caseId} data={data} options={options} run={run} pending={pending} />}
      {tab === 'Filing' && <FilingTab caseId={caseId} data={data} run={run} pending={pending} />}
      {tab === 'AI' && <AITab caseId={caseId} data={data} run={run} pending={pending} />}
    </div>
  );
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return <div className="mb-4 rounded-lg border bg-card p-4"><h2 className="mb-3 text-sm font-semibold">{title}</h2>{children}</div>;
}

function OverviewTab({ data, stageIdx, run, pending, caseId }: any) {
  const next = FILING_STAGES[stageIdx + 1];
  return (
    <div>
      <Panel title="Lifecycle">
        <div className="mb-3 h-2 w-full overflow-hidden rounded bg-muted">
          <div className="h-full bg-[hsl(var(--proposed))]" style={{ width: `${((stageIdx + 1) / FILING_STAGES.length) * 100}%` }} />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm text-muted-foreground">Current: {humanize(data.stage)}</span>
          {next && <Button size="sm" onClick={() => run(() => advanceFilingStage(caseId, data.id, next))} disabled={pending}>Advance → {humanize(next)}</Button>}
          {stageIdx > 0 && <Button size="sm" variant="outline" onClick={() => run(() => advanceFilingStage(caseId, data.id, FILING_STAGES[stageIdx - 1]!, 'Reverted for revisions'))} disabled={pending}>← Back</Button>}
        </div>
      </Panel>
      <Panel title="Stage history">
        <ol className="space-y-1 text-sm">
          {data.stageHistory.map((h: any, i: number) => (
            <li key={i} className="text-muted-foreground"><span className="text-foreground">{humanize(h.toStage)}</span> · {formatDate(h.at)}{h.note ? ` — ${h.note}` : ''}</li>
          ))}
        </ol>
      </Panel>
      {data.requestedRelief && <Panel title="Requested relief"><p className="text-sm text-muted-foreground">{data.requestedRelief}</p></Panel>}
    </div>
  );
}

function DraftTab({ caseId, data, run, pending }: any) {
  const [label, setLabel] = useState('initial-draft');
  const [content, setContent] = useState('');
  const [summary, setSummary] = useState('');
  return (
    <div>
      <Panel title="Add draft version">
        <p className="mb-2 text-xs text-muted-foreground">Earlier versions are never overwritten. Mark one final-for-filing when ready.</p>
        <div className="grid gap-2">
          <select className="rounded-md border bg-background px-3 py-2 text-sm" value={label} onChange={(e) => setLabel(e.target.value)}>
            {VERSION_LABELS.map((l) => <option key={l} value={l}>{humanize(l)}</option>)}
          </select>
          <textarea rows={4} className="rounded-md border bg-background px-3 py-2 text-sm" placeholder="Draft text (in-app editing)" value={content} onChange={(e) => setContent(e.target.value)} />
          <input className="rounded-md border bg-background px-3 py-2 text-sm" placeholder="Changes summary" value={summary} onChange={(e) => setSummary(e.target.value)} />
          <div><Button size="sm" onClick={() => run(async () => { await addFilingVersion(caseId, data.id, { label, contentText: content || undefined, changesSummary: summary || undefined }); setContent(''); setSummary(''); })} disabled={pending}>Save version</Button></div>
        </div>
      </Panel>
      <Panel title={`Versions (${data.versions.length})`}>
        {data.versions.length === 0 ? <p className="text-sm text-muted-foreground">No versions yet.</p> : (
          <ul className="space-y-2">
            {data.versions.map((v: any) => (
              <li key={v.id} className="flex items-center justify-between gap-2 rounded-md border bg-background p-2.5">
                <div>
                  <span className="text-sm font-medium">v{v.versionNumber} · {humanize(v.label)}</span>
                  {v.approvalStatus === 'final-for-filing' && <span className="ml-2 rounded bg-[hsl(var(--confirmed)/0.15)] px-1.5 py-0.5 text-xs text-[hsl(var(--confirmed))]">final-for-filing</span>}
                  <div className="text-xs text-muted-foreground">{formatDate(v.createdAt)}{v.changesSummary ? ` · ${v.changesSummary}` : ''}</div>
                </div>
                {v.approvalStatus !== 'final-for-filing' && <Button size="sm" variant="outline" onClick={() => run(() => markVersionFinal(caseId, data.id, v.id))} disabled={pending}>Mark final</Button>}
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </div>
  );
}

function LinkRow({ caseId, filingId, kind, opts, current, run, pending, label }: any) {
  const [sel, setSel] = useState('');
  const [rel, setRel] = useState('supporting');
  return (
    <Panel title={label}>
      <ul className="mb-2 space-y-1 text-sm">
        {current.length === 0 ? <li className="text-muted-foreground">None linked.</li> : current.map((c: any) => (
          <li key={c.linkId} className="flex items-center gap-2">
            <span>{c.label}</span>
            {c.relation && <span className="text-xs text-muted-foreground">· {c.relation}</span>}
            {c.verificationStatus && <TrustBadge status={c.verificationStatus as VerificationStatus} />}
            {c.role && <span className="text-xs text-muted-foreground">· {c.role}</span>}
          </li>
        ))}
      </ul>
      <div className="flex flex-wrap items-center gap-2">
        <select className="rounded-md border bg-background px-2 py-1 text-sm" value={sel} onChange={(e) => setSel(e.target.value)}>
          <option value="">— add —</option>
          {opts.map((o: Opt) => <option key={o.id} value={o.id}>{o.label}</option>)}
        </select>
        {kind === 'evidence' && (
          <select className="rounded-md border bg-background px-2 py-1 text-sm" value={rel} onChange={(e) => setRel(e.target.value)}>
            <option value="supporting">Supporting</option><option value="adverse">Adverse</option>
          </select>
        )}
        <Button size="sm" onClick={() => sel && run(async () => { await linkFiling(caseId, filingId, kind, sel, { relation: rel }); setSel(''); })} disabled={pending || !sel}>Link</Button>
      </div>
    </Panel>
  );
}

function SupportTab({ caseId, data, options, run, pending }: any) {
  return (
    <div>
      <LinkRow caseId={caseId} filingId={data.id} kind="issue" label="Legal issues" opts={options.issues} current={data.links.issues} run={run} pending={pending} />
      <LinkRow caseId={caseId} filingId={data.id} kind="evidence" label="Evidence" opts={options.evidence} current={data.links.evidence} run={run} pending={pending} />
      <LinkRow caseId={caseId} filingId={data.id} kind="authority" label="Authorities" opts={options.authorities} current={data.links.authorities} run={run} pending={pending} />
      <LinkRow caseId={caseId} filingId={data.id} kind="discovery" label="Discovery" opts={options.discovery} current={data.links.discovery} run={run} pending={pending} />
      <LinkRow caseId={caseId} filingId={data.id} kind="document" label="Documents" opts={options.documents} current={data.links.documents} run={run} pending={pending} />
    </div>
  );
}

function ChecklistTab({ caseId, data, run, pending }: any) {
  const grouped: Record<string, any[]> = {};
  data.checklist.forEach((c: any) => { (grouped[c.category] ??= []).push(c); });
  return (
    <div>
      <div className="mb-3 flex justify-end">
        <Button size="sm" onClick={() => run(() => runReadinessChecks(caseId, data.id))} disabled={pending}>Run readiness checks</Button>
      </div>
      <p className="mb-3 rounded-md bg-muted px-3 py-2 text-xs text-muted-foreground">Automated checks are operational warnings, not legal conclusions. Waiving a warning is logged with your reason.</p>
      {Object.entries(grouped).map(([cat, items]) => (
        <Panel key={cat} title={humanize(cat)}>
          <ul className="space-y-2">
            {items.map((c: any) => (
              <li key={c.id} className="flex flex-wrap items-center gap-2">
                <span className={`flex-1 text-sm ${c.isWarning ? 'text-[hsl(var(--unverified))]' : ''}`}>{c.label}</span>
                <select className="rounded-md border bg-background px-2 py-1 text-xs" value={c.status}
                  onChange={(e) => { const s = e.target.value; const reason = s === 'waived' ? (prompt('Reason for waiving?') || 'no reason given') : undefined; run(() => setChecklistItem(caseId, c.id, s, reason)); }}>
                  {FILING_CHECKLIST_ITEM_STATUSES.map((s) => <option key={s} value={s}>{humanize(s)}</option>)}
                </select>
              </li>
            ))}
          </ul>
        </Panel>
      ))}
    </div>
  );
}

function CertServiceTab({ caseId, data, options, run, pending }: any) {
  const [cert, setCert] = useState({ serviceDate: '', method: 'efile', recipientsText: '' });
  const [svc, setSvc] = useState({ recipientName: '', serviceMethod: 'efile', serviceDate: '' });
  return (
    <div>
      <Panel title="Certificate of service">
        {data.certificates.map((c: any) => (
          <div key={c.id} className="mb-2 rounded-md border bg-background p-3 text-sm">
            <div className="mb-1 flex items-center gap-2"><span className="text-xs font-semibold text-muted-foreground">{humanize(c.filedStatus)}</span><TrustBadge status={c.verificationStatus as VerificationStatus} /></div>
            <p className="text-muted-foreground">{c.statementText}</p>
          </div>
        ))}
        <div className="grid gap-2 sm:grid-cols-3">
          <input type="date" className="rounded-md border bg-background px-2 py-1.5 text-sm" value={cert.serviceDate} onChange={(e) => setCert({ ...cert, serviceDate: e.target.value })} />
          <select className="rounded-md border bg-background px-2 py-1.5 text-sm" value={cert.method} onChange={(e) => setCert({ ...cert, method: e.target.value })}>{SERVICE_METHODS.map((m) => <option key={m} value={m}>{humanize(m)}</option>)}</select>
          <input className="rounded-md border bg-background px-2 py-1.5 text-sm" placeholder="Recipients" value={cert.recipientsText} onChange={(e) => setCert({ ...cert, recipientsText: e.target.value })} />
        </div>
        <div className="mt-2"><Button size="sm" onClick={() => run(() => generateCertificate(caseId, data.id, cert))} disabled={pending}>Generate draft certificate</Button></div>
      </Panel>
      <Panel title={`Service events (${data.serviceEvents.length})`}>
        <ul className="mb-2 space-y-1 text-sm">
          {data.serviceEvents.map((s: any) => (
            <li key={s.id} className="text-muted-foreground">{s.recipientName} · {humanize(s.method)} · {formatDate(s.date)} · {humanize(s.deliveryStatus)}</li>
          ))}
        </ul>
        <div className="grid gap-2 sm:grid-cols-3">
          <input className="rounded-md border bg-background px-2 py-1.5 text-sm" placeholder="Recipient *" value={svc.recipientName} onChange={(e) => setSvc({ ...svc, recipientName: e.target.value })} />
          <select className="rounded-md border bg-background px-2 py-1.5 text-sm" value={svc.serviceMethod} onChange={(e) => setSvc({ ...svc, serviceMethod: e.target.value })}>{SERVICE_METHODS.map((m) => <option key={m} value={m}>{humanize(m)}</option>)}</select>
          <input type="date" className="rounded-md border bg-background px-2 py-1.5 text-sm" value={svc.serviceDate} onChange={(e) => setSvc({ ...svc, serviceDate: e.target.value })} />
        </div>
        <div className="mt-2"><Button size="sm" onClick={() => svc.recipientName && run(async () => { await recordServiceEvent(caseId, { filingId: data.id, ...svc }); setSvc({ recipientName: '', serviceMethod: 'efile', serviceDate: '' }); })} disabled={pending || !svc.recipientName}>Record service</Button></div>
      </Panel>
    </div>
  );
}

function PackageTab({ caseId, data, options, run, pending }: any) {
  const [title, setTitle] = useState('Filing package');
  const [item, setItem] = useState({ packageId: '', label: '', documentId: '', separateUpload: false });
  return (
    <div>
      <Panel title="Filing packages">
        <div className="mb-3 flex gap-2">
          <input className="flex-1 rounded-md border bg-background px-2 py-1.5 text-sm" value={title} onChange={(e) => setTitle(e.target.value)} />
          <Button size="sm" onClick={() => run(() => createFilingPackage(caseId, data.id, title))} disabled={pending}>Create package</Button>
        </div>
        {data.packages.map((p: any) => (
          <div key={p.id} className="mb-2 rounded-md border bg-background p-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">{p.title} <span className="text-muted-foreground">({p.itemCount} items)</span></span>
              <Link href={`/case/${caseId}/filing-package/${p.id}`} className="text-xs text-[hsl(var(--proposed))] hover:underline">Open / manifest →</Link>
            </div>
            <div className="mt-2 grid gap-2 sm:grid-cols-3">
              <input className="rounded-md border bg-background px-2 py-1 text-sm" placeholder="Item label" value={item.packageId === p.id ? item.label : ''} onChange={(e) => setItem({ packageId: p.id, label: e.target.value, documentId: item.documentId, separateUpload: item.separateUpload })} />
              <select className="rounded-md border bg-background px-2 py-1 text-sm" value={item.packageId === p.id ? item.documentId : ''} onChange={(e) => setItem({ ...item, packageId: p.id, documentId: e.target.value })}>
                <option value="">— document —</option>{options.documents.map((o: Opt) => <option key={o.id} value={o.id}>{o.label}</option>)}
              </select>
              <Button size="sm" onClick={() => item.packageId === p.id && item.label && run(async () => { await addPackageItem(caseId, p.id, { label: item.label, documentId: item.documentId || undefined }); setItem({ packageId: '', label: '', documentId: '', separateUpload: false }); })} disabled={pending}>Add item</Button>
            </div>
          </div>
        ))}
      </Panel>
    </div>
  );
}

function FilingTab({ caseId, data, run, pending }: any) {
  const [sub, setSub] = useState({ portal: '', confirmationNumber: '', docketNumber: '', status: 'accepted' });
  return (
    <div>
      <Panel title="Record filing submission">
        <div className="grid gap-2 sm:grid-cols-2">
          <input className="rounded-md border bg-background px-2 py-1.5 text-sm" placeholder="Portal (PeachCourt/PACER)" value={sub.portal} onChange={(e) => setSub({ ...sub, portal: e.target.value })} />
          <input className="rounded-md border bg-background px-2 py-1.5 text-sm" placeholder="Confirmation number" value={sub.confirmationNumber} onChange={(e) => setSub({ ...sub, confirmationNumber: e.target.value })} />
          <input className="rounded-md border bg-background px-2 py-1.5 text-sm" placeholder="Docket / document number" value={sub.docketNumber} onChange={(e) => setSub({ ...sub, docketNumber: e.target.value })} />
          <select className="rounded-md border bg-background px-2 py-1.5 text-sm" value={sub.status} onChange={(e) => setSub({ ...sub, status: e.target.value })}>
            {['submitted', 'accepted', 'rejected', 'correction-required', 'filed'].map((s) => <option key={s} value={s}>{humanize(s)}</option>)}
          </select>
        </div>
        <p className="my-2 rounded-md bg-muted px-3 py-2 text-xs text-muted-foreground">Pro Se Wins records filing details — it does not submit to PeachCourt or PACER. Submit in the portal, then record it here.</p>
        <div className="flex gap-2">
          <Button size="sm" onClick={() => run(() => recordSubmission(caseId, data.id, sub))} disabled={pending}>Record submission</Button>
          <Button size="sm" variant="outline" onClick={() => run(() => addFiledStampedCopy(caseId, data.id))} disabled={pending}>Add filed-stamped copy</Button>
          {data.portalUrl && <a href={data.portalUrl} target="_blank" rel="noopener noreferrer"><Button size="sm" variant="ghost">Open portal ↗</Button></a>}
        </div>
      </Panel>
      <Panel title="Submissions">
        {data.submissions.length === 0 ? <p className="text-sm text-muted-foreground">None recorded.</p> : (
          <ul className="space-y-1 text-sm text-muted-foreground">
            {data.submissions.map((s: any) => <li key={s.id}>{humanize(s.status)} · {s.portal ?? '—'} · conf {s.confirmationNumber ?? '—'} · {formatDate(s.submittedAt)}</li>)}
          </ul>
        )}
      </Panel>
    </div>
  );
}

function AITab({ caseId, data, run, pending }: any) {
  const [task, setTask] = useState('draft-section');
  const [prompt, setPrompt] = useState('');
  const [scope, setScope] = useState<string[]>(['selected-evidence']);
  const toggle = (s: string) => setScope((prev) => prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]);
  return (
    <div>
      <Panel title="AI-assisted drafting (source-controlled)">
        <div className="grid gap-2">
          <select className="rounded-md border bg-background px-3 py-2 text-sm" value={task} onChange={(e) => setTask(e.target.value)}>
            {AI_DRAFT_TASKS.map((t) => <option key={t} value={t}>{humanize(t)}</option>)}
          </select>
          <div>
            <div className="mb-1 text-xs text-muted-foreground">Source scope (shown before submission):</div>
            <div className="flex flex-wrap gap-1.5">
              {AI_SOURCE_SCOPES.map((s) => (
                <button key={s} onClick={() => toggle(s)} className={`rounded-full border px-2.5 py-1 text-xs ${scope.includes(s) ? 'border-[hsl(var(--proposed))] bg-[hsl(var(--proposed)/0.12)] text-[hsl(var(--proposed))]' : 'text-muted-foreground'}`}>{humanize(s)}</button>
              ))}
            </div>
          </div>
          <textarea rows={2} className="rounded-md border bg-background px-3 py-2 text-sm" placeholder="Instruction" value={prompt} onChange={(e) => setPrompt(e.target.value)} />
          <div className="flex gap-2">
            <Button size="sm" onClick={() => prompt && run(async () => { await aiDraft(caseId, data.id, task, prompt, scope); setPrompt(''); })} disabled={pending || !prompt}>Draft (mock)</Button>
            <Button size="sm" variant="outline" onClick={() => run(() => aiReviewDraft(caseId, data.id))} disabled={pending}>Review draft → queue</Button>
          </div>
        </div>
      </Panel>
      <Panel title={`AI draft history (${data.aiDraftRuns.length})`}>
        {data.aiDraftRuns.length === 0 ? <p className="text-sm text-muted-foreground">No AI drafts yet.</p> : data.aiDraftRuns.map((r: any) => (
          <div key={r.id} className="mb-2 rounded-md border bg-background p-3">
            <div className="text-xs text-muted-foreground">{humanize(r.task)} · {r.provider} · scope: {(JSON.parse(r.sourceScope) as string[]).map(humanize).join(', ') || 'none'}</div>
            <pre className="mt-1 whitespace-pre-wrap text-xs">{r.output}</pre>
          </div>
        ))}
      </Panel>
      <Panel title={`Draft review issues (${data.reviewIssues.length})`}>
        {data.reviewIssues.length === 0 ? <p className="text-sm text-muted-foreground">No review issues. Run “Review draft”.</p> : (
          <ul className="space-y-1 text-sm">
            {data.reviewIssues.map((r: any) => (
              <li key={r.id} className={`text-[hsl(var(--${r.severity === 'high' ? 'disputed' : r.severity === 'warning' ? 'unverified' : 'muted-foreground'}))]`}>• {humanize(r.issueType)} — {r.explanation} <Link href={`/case/${caseId}/verification-queue`} className="text-xs underline">review</Link></li>
            ))}
          </ul>
        )}
      </Panel>
    </div>
  );
}
