'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { TrustBadge } from '@/components/ui/badge';
import { createAdmission } from '@/lib/actions/phase2';
import { ADMISSION_CATEGORIES, humanize } from '@/lib/enums';
import { formatDate } from '@/lib/utils';
import type { VerificationStatus } from '@/lib/enums';
import { Plus, FileText } from 'lucide-react';

export type AdmissionRow = {
  id: string; title: string | null; statement: string; category: string | null;
  admittingParty: string | null; verificationStatus: string; createdAt: string; sourcePage: string | null;
  document: { id: string; label: string } | null;
};
type Opt = { id: string; title: string };

export function AdmissionsClient({ caseId, rows, documents }: { caseId: string; rows: AdmissionRow[]; documents: Opt[] }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [open, setOpen] = useState(false);
  const [f, setF] = useState({ statement: '', category: 'pleading', admittingParty: '', documentId: '', sourcePage: '', verbatimText: '' });
  const [fParty, setFparty] = useState('');

  const submit = () => {
    if (!f.statement) return;
    start(async () => {
      await createAdmission(caseId, {
        statement: f.statement, category: f.category, admittingParty: f.admittingParty || undefined,
        documentId: f.documentId || undefined, sourcePage: f.sourcePage || undefined, verbatimText: f.verbatimText || undefined,
      });
      setF({ statement: '', category: 'pleading', admittingParty: '', documentId: '', sourcePage: '', verbatimText: '' });
      setOpen(false); router.refresh();
    });
  };

  const shown = fParty ? rows.filter((r) => r.admittingParty === fParty) : rows;

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-end gap-2">
        {rows.length > 0 && (
          <select className="rounded-md border bg-background px-2 py-2 text-sm" value={fParty} onChange={(e) => setFparty(e.target.value)}>
            <option value="">All parties</option>
            {[...new Set(rows.map((r) => r.admittingParty).filter(Boolean))].map((p) => <option key={p as string} value={p as string}>{p}</option>)}
          </select>
        )}
        <Button size="sm" variant={open ? 'subtle' : 'primary'} onClick={() => setOpen((o) => !o)}><Plus size={15} /> New admission</Button>
      </div>

      {open && (
        <div className="mb-4 grid gap-3 rounded-lg border bg-card p-4">
          <textarea rows={2} className="rounded-md border bg-background px-3 py-2 text-sm" placeholder="The admission (exact or concise paraphrase) *" value={f.statement} onChange={(e) => setF({ ...f, statement: e.target.value })} />
          <textarea rows={2} className="rounded-md border bg-background px-3 py-2 text-sm" placeholder="Verbatim source text (optional)" value={f.verbatimText} onChange={(e) => setF({ ...f, verbatimText: e.target.value })} />
          <div className="grid gap-2 sm:grid-cols-2">
            <select className="rounded-md border bg-background px-3 py-2 text-sm" value={f.category} onChange={(e) => setF({ ...f, category: e.target.value })}>
              {ADMISSION_CATEGORIES.map((c) => <option key={c} value={c}>{humanize(c)}</option>)}
            </select>
            <input className="rounded-md border bg-background px-3 py-2 text-sm" placeholder="Admitting party" value={f.admittingParty} onChange={(e) => setF({ ...f, admittingParty: e.target.value })} />
            <select className="rounded-md border bg-background px-3 py-2 text-sm" value={f.documentId} onChange={(e) => setF({ ...f, documentId: e.target.value })}>
              <option value="">— source document —</option>
              {documents.map((d) => <option key={d.id} value={d.id}>{d.title}</option>)}
            </select>
            <input className="rounded-md border bg-background px-3 py-2 text-sm" placeholder="Source page" value={f.sourcePage} onChange={(e) => setF({ ...f, sourcePage: e.target.value })} />
          </div>
          <div><Button size="sm" onClick={submit} disabled={pending || !f.statement}>Save admission</Button></div>
        </div>
      )}

      {shown.length === 0 ? (
        <p className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">No admissions recorded.</p>
      ) : (
        <div className="space-y-2">
          {shown.map((a) => (
            <div key={a.id} className="rounded-lg border bg-card p-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded bg-muted px-1.5 py-0.5 text-xs text-muted-foreground">{humanize(a.category)}</span>
                {a.admittingParty && <span className="text-xs text-muted-foreground">by {a.admittingParty}</span>}
                <TrustBadge status={a.verificationStatus as VerificationStatus} />
                <span className="ml-auto text-xs text-muted-foreground">{formatDate(a.createdAt)}</span>
              </div>
              <p className="mt-1.5 text-sm">{a.statement}</p>
              {a.document && (
                <Link href={`/case/${caseId}/document/${a.document.id}`} className="mt-1 inline-flex items-center gap-1 text-xs text-[hsl(var(--proposed))] hover:underline">
                  <FileText size={11} /> {a.document.label}{a.sourcePage ? ` p.${a.sourcePage}` : ''}
                </Link>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
