'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { TrustBadge } from '@/components/ui/badge';
import { createContradiction, setContradictionStatus } from '@/lib/actions/phase2';
import { aiDetectContradictions } from '@/lib/actions/ai-extraction';
import { humanize } from '@/lib/enums';
import { formatDate } from '@/lib/utils';
import type { VerificationStatus } from '@/lib/enums';
import { Plus, Sparkles, FileText } from 'lucide-react';

export type Stmt = { label: string; text: string; author: string | null; sourcePage: string | null; documentId: string | null; documentLabel: string | null };
export type ContradictionView = {
  id: string; title: string | null; summary: string; explanation: string | null;
  materiality: string | null; status: string; verificationStatus: string; createdBy: string | null;
  createdAt: string; statements: Stmt[];
};
type Opt = { id: string; title: string };

export function ContradictionsClient({
  caseId, items, documents,
}: {
  caseId: string; items: ContradictionView[]; documents: Opt[];
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [open, setOpen] = useState(false);

  const detect = () => start(async () => {
    await aiDetectContradictions(caseId, documents.slice(0, 2).map((d) => d.id));
    router.refresh();
  });

  return (
    <div>
      <div className="mb-4 flex flex-wrap justify-end gap-2">
        <Button size="sm" variant="outline" onClick={detect} disabled={pending || documents.length === 0}>
          <Sparkles size={15} /> AI: detect (→ queue)
        </Button>
        <Button size="sm" variant={open ? 'subtle' : 'primary'} onClick={() => setOpen((o) => !o)}><Plus size={15} /> New</Button>
      </div>

      {open && <NewContradictionForm caseId={caseId} documents={documents} onDone={() => setOpen(false)} />}

      {items.length === 0 ? (
        <p className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
          No contradictions yet. Add one with two source statements, or run AI detection (proposals land in the Verification Queue).
        </p>
      ) : (
        <div className="space-y-4">
          {items.map((c) => (
            <div key={c.id} className="rounded-lg border bg-card p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="font-semibold">{c.title || c.summary}</span>
                  <TrustBadge status={c.verificationStatus as VerificationStatus} />
                  <span className="rounded bg-muted px-1.5 py-0.5 text-xs text-muted-foreground">{humanize(c.status)}</span>
                  {c.createdBy === 'ai' && <span className="text-xs text-[hsl(var(--unverified))]">AI</span>}
                </div>
                <span className="text-xs text-muted-foreground">{formatDate(c.createdAt)}{c.materiality ? ` · ${c.materiality} materiality` : ''}</span>
              </div>

              <div className="mt-3 grid gap-3 md:grid-cols-2">
                {c.statements.slice(0, 2).map((s, i) => (
                  <div key={i} className="rounded-md border bg-background p-3">
                    <div className="mb-1 text-xs font-semibold text-muted-foreground">Statement {s.label}</div>
                    <p className="text-sm">{s.text}</p>
                    <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                      {s.author && <span>{s.author}</span>}
                      {s.documentId ? (
                        <Link href={`/case/${caseId}/document/${s.documentId}`} className="inline-flex items-center gap-1 text-[hsl(var(--proposed))] hover:underline">
                          <FileText size={11} /> {s.documentLabel || 'source'}{s.sourcePage ? ` p.${s.sourcePage}` : ''}
                        </Link>
                      ) : <span>source page {s.sourcePage || 'unavailable'}</span>}
                    </div>
                  </div>
                ))}
              </div>

              {c.explanation && (
                <p className="mt-3 rounded-md bg-muted px-3 py-2 text-sm">
                  <span className="font-medium">Why they conflict: </span>{c.explanation}
                </p>
              )}

              {c.status !== 'confirmed' && c.status !== 'rejected' && (
                <div className="mt-3 flex gap-2">
                  <Button size="sm" onClick={() => start(async () => { await setContradictionStatus(caseId, c.id, 'confirmed'); router.refresh(); })} disabled={pending}>Confirm contradiction</Button>
                  <Button size="sm" variant="outline" onClick={() => start(async () => { await setContradictionStatus(caseId, c.id, 'rejected'); router.refresh(); })} disabled={pending}>Reject</Button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function NewContradictionForm({ caseId, documents, onDone }: { caseId: string; documents: Opt[]; onDone: () => void }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [f, setF] = useState({
    summary: '', explanation: '', materiality: 'medium',
    aText: '', aAuthor: '', aDoc: '', aPage: '',
    bText: '', bAuthor: '', bDoc: '', bPage: '',
  });
  const [err, setErr] = useState<string | null>(null);

  const submit = () => {
    if (!f.summary || !f.aText || !f.bText) { setErr('Summary and both statements are required.'); return; }
    setErr(null);
    start(async () => {
      try {
        await createContradiction(caseId, {
          summary: f.summary, explanation: f.explanation || undefined, materiality: f.materiality,
          statements: [
            { label: 'A', text: f.aText, author: f.aAuthor || undefined, documentId: f.aDoc || undefined, sourcePage: f.aPage || undefined },
            { label: 'B', text: f.bText, author: f.bAuthor || undefined, documentId: f.bDoc || undefined, sourcePage: f.bPage || undefined },
          ],
        });
        onDone(); router.refresh();
      } catch (e) { setErr((e as Error).message); }
    });
  };

  return (
    <div className="mb-4 grid gap-3 rounded-lg border bg-card p-4">
      <input className="rounded-md border bg-background px-3 py-2 text-sm" placeholder="Summary of the conflict *" value={f.summary} onChange={(e) => setF({ ...f, summary: e.target.value })} />
      <div className="grid gap-3 md:grid-cols-2">
        {(['a', 'b'] as const).map((side) => (
          <div key={side} className="grid gap-2 rounded-md border bg-background p-3">
            <div className="text-xs font-semibold text-muted-foreground">Statement {side.toUpperCase()}</div>
            <textarea rows={2} className="rounded-md border bg-background px-2 py-1.5 text-sm" placeholder="Exact statement *"
              value={f[`${side}Text`]} onChange={(e) => setF({ ...f, [`${side}Text`]: e.target.value })} />
            <input className="rounded-md border bg-background px-2 py-1.5 text-sm" placeholder="Author / speaker"
              value={f[`${side}Author`]} onChange={(e) => setF({ ...f, [`${side}Author`]: e.target.value })} />
            <div className="grid grid-cols-2 gap-2">
              <select className="rounded-md border bg-background px-2 py-1.5 text-sm" value={f[`${side}Doc`]} onChange={(e) => setF({ ...f, [`${side}Doc`]: e.target.value })}>
                <option value="">— source doc —</option>
                {documents.map((d) => <option key={d.id} value={d.id}>{d.title}</option>)}
              </select>
              <input className="rounded-md border bg-background px-2 py-1.5 text-sm" placeholder="Page"
                value={f[`${side}Page`]} onChange={(e) => setF({ ...f, [`${side}Page`]: e.target.value })} />
            </div>
          </div>
        ))}
      </div>
      <textarea rows={2} className="rounded-md border bg-background px-3 py-2 text-sm" placeholder="Why they conflict (optional)" value={f.explanation} onChange={(e) => setF({ ...f, explanation: e.target.value })} />
      {err && <p className="text-sm text-[hsl(var(--disputed))]">{err}</p>}
      <div className="flex gap-2"><Button size="sm" onClick={submit} disabled={pending}>Save contradiction</Button><Button size="sm" variant="ghost" onClick={onDone}>Cancel</Button></div>
    </div>
  );
}
