'use client';

import { useMemo, useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { TrustBadge } from '@/components/ui/badge';
import { createEvidence } from '@/lib/actions/phase2';
import { EVIDENCE_TYPES, EVIDENCE_POSTURES, humanize } from '@/lib/enums';
import { formatDate } from '@/lib/utils';
import type { VerificationStatus } from '@/lib/enums';
import { LayoutGrid, Table2, Plus, FileText, Scale } from 'lucide-react';

export type EvidenceRow = {
  id: string; title: string; proposition: string | null; evidenceType: string | null;
  posture: string | null; evidentiaryStatus: string | null; authenticationStatus: string | null;
  verificationStatus: string; disputed: boolean; createdBy: string | null;
  updatedAt: string; sourcePage: string | null;
  document: { id: string; label: string } | null;
  issues: { id: string; title: string; relation: string }[];
};
type Opt = { id: string; title: string };

export function EvidenceExplorer({
  caseId, rows, documents, legalIssues, presetDocumentId,
}: {
  caseId: string; rows: EvidenceRow[]; documents: Opt[]; legalIssues: Opt[]; presetDocumentId?: string;
}) {
  const [view, setView] = useState<'table' | 'card'>('table');
  const [q, setQ] = useState('');
  const [ftype, setFtype] = useState('');
  const [fposture, setFposture] = useState('');
  const [fsource, setFsource] = useState<'all' | 'ai' | 'user'>('all');
  const [showForm, setShowForm] = useState(false);

  const filtered = useMemo(() => rows.filter((r) => {
    if (ftype && r.evidenceType !== ftype) return false;
    if (fposture && r.posture !== fposture) return false;
    if (fsource !== 'all' && (r.createdBy ?? 'user') !== fsource) return false;
    if (q) {
      const hay = [r.title, r.proposition, r.evidenceType, r.document?.label, ...r.issues.map((i) => i.title)].join(' ').toLowerCase();
      if (!hay.includes(q.toLowerCase())) return false;
    }
    return true;
  }), [rows, q, ftype, fposture, fsource]);

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search evidence…"
          className="min-w-[180px] flex-1 rounded-md border bg-background px-3 py-2 text-sm" />
        <select value={ftype} onChange={(e) => setFtype(e.target.value)} className="rounded-md border bg-background px-2 py-2 text-sm">
          <option value="">All types</option>
          {EVIDENCE_TYPES.map((t) => <option key={t} value={t}>{humanize(t)}</option>)}
        </select>
        <select value={fposture} onChange={(e) => setFposture(e.target.value)} className="rounded-md border bg-background px-2 py-2 text-sm">
          <option value="">Any posture</option>
          {EVIDENCE_POSTURES.map((p) => <option key={p} value={p}>{humanize(p)}</option>)}
        </select>
        <select value={fsource} onChange={(e) => setFsource(e.target.value as never)} className="rounded-md border bg-background px-2 py-2 text-sm">
          <option value="all">AI + user</option>
          <option value="user">User-created</option>
          <option value="ai">AI-generated</option>
        </select>
        <div className="flex rounded-md border">
          <button onClick={() => setView('table')} className={`p-2 ${view === 'table' ? 'bg-accent' : ''}`} aria-label="Table view"><Table2 size={15} /></button>
          <button onClick={() => setView('card')} className={`p-2 ${view === 'card' ? 'bg-accent' : ''}`} aria-label="Card view"><LayoutGrid size={15} /></button>
        </div>
        <Button size="sm" onClick={() => setShowForm((s) => !s)}><Plus size={15} /> New evidence</Button>
      </div>

      {showForm && (
        <NewEvidenceForm caseId={caseId} documents={documents} legalIssues={legalIssues}
          presetDocumentId={presetDocumentId} onDone={() => setShowForm(false)} />
      )}

      {filtered.length === 0 ? (
        <p className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
          No evidence matches. Create an item, or use “Create Evidence Item” from a document.
        </p>
      ) : view === 'table' ? (
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full min-w-[720px] text-sm">
            <thead className="bg-muted/60 text-left text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-3 py-2 font-medium">Title / proposition</th>
                <th className="px-3 py-2 font-medium">Type</th>
                <th className="px-3 py-2 font-medium">Source</th>
                <th className="px-3 py-2 font-medium">Legal issues</th>
                <th className="px-3 py-2 font-medium">Status</th>
                <th className="px-3 py-2 font-medium">Trust</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => (
                <tr key={r.id} className="border-t align-top hover:bg-accent/40">
                  <td className="px-3 py-2.5">
                    <div className="font-medium">{r.title}</div>
                    {r.proposition && <div className="text-xs text-muted-foreground">{r.proposition}</div>}
                    {r.disputed && <span className="text-xs text-[hsl(var(--disputed))]">disputed</span>}
                  </td>
                  <td className="px-3 py-2.5 text-muted-foreground">{humanize(r.evidenceType)}<div className="text-xs">{humanize(r.posture)}</div></td>
                  <td className="px-3 py-2.5">
                    {r.document ? (
                      <Link href={`/case/${caseId}/document/${r.document.id}`} className="inline-flex items-center gap-1 text-[hsl(var(--proposed))] hover:underline">
                        <FileText size={12} /> {r.document.label}{r.sourcePage ? ` p.${r.sourcePage}` : ''}
                      </Link>
                    ) : <span className="text-muted-foreground">—</span>}
                  </td>
                  <td className="px-3 py-2.5">
                    {r.issues.length ? r.issues.map((i) => (
                      <Link key={i.id} href={`/case/${caseId}/legal-issue/${i.id}`} className="mr-1 inline-flex items-center gap-1 rounded bg-muted px-1.5 py-0.5 text-xs hover:bg-accent">
                        <Scale size={11} /> {i.title}<span className="text-muted-foreground">·{i.relation}</span>
                      </Link>
                    )) : <span className="text-muted-foreground">—</span>}
                  </td>
                  <td className="px-3 py-2.5 text-muted-foreground">{humanize(r.evidentiaryStatus)}</td>
                  <td className="px-3 py-2.5"><TrustBadge status={r.verificationStatus as VerificationStatus} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((r) => (
            <div key={r.id} className="rounded-lg border bg-card p-4">
              <div className="flex items-start justify-between gap-2">
                <span className="rounded bg-[hsl(var(--proposed)/0.15)] px-1.5 py-0.5 text-xs text-[hsl(var(--proposed))]">{humanize(r.evidenceType)}</span>
                <TrustBadge status={r.verificationStatus as VerificationStatus} />
              </div>
              <div className="mt-2 font-medium">{r.title}</div>
              {r.proposition && <p className="mt-1 text-sm text-muted-foreground">{r.proposition}</p>}
              {r.document && (
                <Link href={`/case/${caseId}/document/${r.document.id}`} className="mt-2 inline-flex items-center gap-1 text-xs text-[hsl(var(--proposed))] hover:underline">
                  <FileText size={11} /> {r.document.label}{r.sourcePage ? ` p.${r.sourcePage}` : ''}
                </Link>
              )}
              <div className="mt-2 flex flex-wrap gap-1">
                {r.issues.map((i) => (
                  <Link key={i.id} href={`/case/${caseId}/legal-issue/${i.id}`} className="rounded bg-muted px-1.5 py-0.5 text-xs hover:bg-accent">{i.title}</Link>
                ))}
              </div>
              <div className="mt-2 text-xs text-muted-foreground">Updated {formatDate(r.updatedAt)} · {r.createdBy === 'ai' ? 'AI' : 'user'}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function NewEvidenceForm({
  caseId, documents, legalIssues, presetDocumentId, onDone,
}: {
  caseId: string; documents: Opt[]; legalIssues: Opt[]; presetDocumentId?: string; onDone: () => void;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [f, setF] = useState({
    title: '', proposition: '', evidenceType: 'documentary', posture: 'supports-user',
    documentId: presetDocumentId ?? '', sourcePage: '', quotedText: '',
    legalIssueId: '', relation: 'supporting',
  });
  const [err, setErr] = useState<string | null>(null);

  const submit = () => {
    if (!f.title) { setErr('Title is required'); return; }
    setErr(null);
    start(async () => {
      try {
        await createEvidence(caseId, {
          title: f.title, proposition: f.proposition || undefined, evidenceType: f.evidenceType,
          posture: f.posture, documentId: f.documentId || undefined, sourcePage: f.sourcePage || undefined,
          quotedText: f.quotedText || undefined, legalIssueId: f.legalIssueId || undefined,
          relation: f.relation as never,
        });
        onDone();
        router.refresh();
      } catch (e) { setErr((e as Error).message); }
    });
  };

  return (
    <div className="mb-4 grid gap-3 rounded-lg border bg-card p-4">
      <input className="rounded-md border bg-background px-3 py-2 text-sm" placeholder="Evidence title *"
        value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} />
      <input className="rounded-md border bg-background px-3 py-2 text-sm" placeholder="Concise factual proposition"
        value={f.proposition} onChange={(e) => setF({ ...f, proposition: e.target.value })} />
      <div className="grid gap-2 sm:grid-cols-2">
        <select className="rounded-md border bg-background px-3 py-2 text-sm" value={f.evidenceType} onChange={(e) => setF({ ...f, evidenceType: e.target.value })}>
          {EVIDENCE_TYPES.map((t) => <option key={t} value={t}>{humanize(t)}</option>)}
        </select>
        <select className="rounded-md border bg-background px-3 py-2 text-sm" value={f.posture} onChange={(e) => setF({ ...f, posture: e.target.value })}>
          {EVIDENCE_POSTURES.map((p) => <option key={p} value={p}>{humanize(p)}</option>)}
        </select>
        <select className="rounded-md border bg-background px-3 py-2 text-sm" value={f.documentId} onChange={(e) => setF({ ...f, documentId: e.target.value })}>
          <option value="">— source document —</option>
          {documents.map((d) => <option key={d.id} value={d.id}>{d.title}</option>)}
        </select>
        <input className="rounded-md border bg-background px-3 py-2 text-sm" placeholder="Source page / range (e.g. 12-14)"
          value={f.sourcePage} onChange={(e) => setF({ ...f, sourcePage: e.target.value })} />
      </div>
      <textarea rows={2} className="rounded-md border bg-background px-3 py-2 text-sm" placeholder="Quoted / extracted text (optional)"
        value={f.quotedText} onChange={(e) => setF({ ...f, quotedText: e.target.value })} />
      <div className="grid gap-2 sm:grid-cols-2">
        <select className="rounded-md border bg-background px-3 py-2 text-sm" value={f.legalIssueId} onChange={(e) => setF({ ...f, legalIssueId: e.target.value })}>
          <option value="">— link to legal issue (optional) —</option>
          {legalIssues.map((i) => <option key={i.id} value={i.id}>{i.title}</option>)}
        </select>
        <select className="rounded-md border bg-background px-3 py-2 text-sm" value={f.relation} onChange={(e) => setF({ ...f, relation: e.target.value })}>
          <option value="supporting">Supporting</option>
          <option value="adverse">Adverse</option>
          <option value="impeachment">Impeachment</option>
        </select>
      </div>
      {err && <p className="text-sm text-[hsl(var(--disputed))]">{err}</p>}
      <div className="flex gap-2">
        <Button size="sm" onClick={submit} disabled={pending}>Save evidence</Button>
        <Button size="sm" variant="ghost" onClick={onDone}>Cancel</Button>
      </div>
    </div>
  );
}
