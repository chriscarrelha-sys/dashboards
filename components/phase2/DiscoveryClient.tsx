'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { TrustBadge } from '@/components/ui/badge';
import { createDiscoverySet } from '@/lib/actions/phase2';
import { aiExtractDiscovery } from '@/lib/actions/ai-extraction';
import { DISCOVERY_TYPES, humanize } from '@/lib/enums';
import type { VerificationStatus } from '@/lib/enums';
import { Plus, Sparkles, FolderOpen } from 'lucide-react';

export type SetRow = {
  id: string; title: string; discoveryType: string; servingParty: string | null;
  respondingParty: string | null; status: string; verificationStatus: string; requestCount: number;
};
type Opt = { id: string; title: string };

export function DiscoveryClient({
  caseId, sets, documents, stats,
}: {
  caseId: string; sets: SetRow[]; documents: Opt[]; stats: Record<string, number>;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [open, setOpen] = useState(false);
  const [importDoc, setImportDoc] = useState('');
  const [f, setF] = useState({ title: '', discoveryType: 'interrogatories', servingParty: '', respondingParty: '' });

  const create = () => {
    if (!f.title) return;
    start(async () => {
      await createDiscoverySet(caseId, f);
      setF({ title: '', discoveryType: 'interrogatories', servingParty: '', respondingParty: '' });
      setOpen(false); router.refresh();
    });
  };
  const runImport = () => {
    if (!importDoc) return;
    start(async () => { await aiExtractDiscovery(caseId, importDoc); router.refresh(); });
  };

  return (
    <div>
      <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          ['Sets', stats.sets], ['Requests', stats.requests], ['Responses received', stats.responses],
          ['Deficiencies', stats.deficiencies],
        ].map(([label, n]) => (
          <div key={label as string} className="rounded-lg border bg-card p-3">
            <div className="text-2xl font-semibold">{n as number}</div>
            <div className="text-xs text-muted-foreground">{label as string}</div>
          </div>
        ))}
      </div>

      <div className="mb-4 flex flex-wrap items-center justify-end gap-2">
        <select className="rounded-md border bg-background px-2 py-2 text-sm" value={importDoc} onChange={(e) => setImportDoc(e.target.value)}>
          <option value="">— import from document —</option>
          {documents.map((d) => <option key={d.id} value={d.id}>{d.title}</option>)}
        </select>
        <Button size="sm" variant="outline" onClick={runImport} disabled={pending || !importDoc}><Sparkles size={15} /> AI import (→ queue)</Button>
        <Button size="sm" variant={open ? 'subtle' : 'primary'} onClick={() => setOpen((o) => !o)}><Plus size={15} /> New set</Button>
      </div>

      {open && (
        <div className="mb-4 grid gap-3 rounded-lg border bg-card p-4">
          <input className="rounded-md border bg-background px-3 py-2 text-sm" placeholder="Set title (e.g. Plaintiff’s First Interrogatories) *" value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} />
          <div className="grid gap-2 sm:grid-cols-3">
            <select className="rounded-md border bg-background px-3 py-2 text-sm" value={f.discoveryType} onChange={(e) => setF({ ...f, discoveryType: e.target.value })}>
              {DISCOVERY_TYPES.map((t) => <option key={t} value={t}>{humanize(t)}</option>)}
            </select>
            <input className="rounded-md border bg-background px-3 py-2 text-sm" placeholder="Serving party" value={f.servingParty} onChange={(e) => setF({ ...f, servingParty: e.target.value })} />
            <input className="rounded-md border bg-background px-3 py-2 text-sm" placeholder="Responding party" value={f.respondingParty} onChange={(e) => setF({ ...f, respondingParty: e.target.value })} />
          </div>
          <div><Button size="sm" onClick={create} disabled={pending || !f.title}>Create set</Button></div>
        </div>
      )}

      {sets.length === 0 ? (
        <p className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">No discovery sets. Create one, or AI-import from a discovery document (proposal enters the Verification Queue).</p>
      ) : (
        <div className="space-y-2">
          {sets.map((s) => (
            <Link key={s.id} href={`/case/${caseId}/discovery-set/${s.id}`} className="flex items-center gap-3 rounded-lg border bg-card p-3 hover:border-ring">
              <FolderOpen size={16} className="text-[hsl(var(--proposed))]" />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-medium">{s.title}</span>
                  <span className="rounded bg-muted px-1.5 py-0.5 text-xs text-muted-foreground">{humanize(s.discoveryType)}</span>
                  <TrustBadge status={s.verificationStatus as VerificationStatus} />
                </div>
                <div className="text-xs text-muted-foreground">
                  {s.servingParty ? `${s.servingParty} → ${s.respondingParty ?? '—'} · ` : ''}{s.requestCount} request(s) · {humanize(s.status)}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
