'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { updateDocument } from '@/lib/actions';
import { DOCUMENT_TYPES, DOCUMENT_STATUSES } from '@/lib/enums';

export function ReclassifyForm({
  caseId, docId, initial,
}: {
  caseId: string;
  docId: string;
  initial: { title: string; docType: string; docStatus: string; party: string; notes: string };
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [f, setF] = useState(initial);
  const [saved, setSaved] = useState(false);

  const save = () =>
    start(async () => {
      await updateDocument(caseId, docId, {
        title: f.title || undefined,
        docType: f.docType || undefined,
        docStatus: f.docStatus || null,
        party: f.party || null,
        notes: f.notes || undefined,
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 1600);
      router.refresh();
    });

  return (
    <div className="space-y-3">
      <label className="block text-sm">
        <span className="mb-1 block text-xs text-muted-foreground">Title</span>
        <input className="w-full rounded-md border bg-background px-3 py-2" value={f.title}
          onChange={(e) => setF({ ...f, title: e.target.value })} />
      </label>
      <div className="grid grid-cols-2 gap-3">
        <label className="block text-sm">
          <span className="mb-1 block text-xs text-muted-foreground">Type</span>
          <select className="w-full rounded-md border bg-background px-3 py-2" value={f.docType}
            onChange={(e) => setF({ ...f, docType: e.target.value })}>
            {DOCUMENT_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </label>
        <label className="block text-sm">
          <span className="mb-1 block text-xs text-muted-foreground">Status</span>
          <select className="w-full rounded-md border bg-background px-3 py-2" value={f.docStatus}
            onChange={(e) => setF({ ...f, docStatus: e.target.value })}>
            <option value="">—</option>
            {DOCUMENT_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </label>
      </div>
      <label className="block text-sm">
        <span className="mb-1 block text-xs text-muted-foreground">Filing / sending party</span>
        <input className="w-full rounded-md border bg-background px-3 py-2" value={f.party}
          onChange={(e) => setF({ ...f, party: e.target.value })} />
      </label>
      <label className="block text-sm">
        <span className="mb-1 block text-xs text-muted-foreground">Notes</span>
        <textarea rows={3} className="w-full rounded-md border bg-background px-3 py-2" value={f.notes}
          onChange={(e) => setF({ ...f, notes: e.target.value })} />
      </label>
      <div className="flex items-center gap-2">
        <Button size="sm" onClick={save} disabled={pending}>Save &amp; mark reviewed</Button>
        {saved && <span className="text-xs text-[hsl(var(--confirmed))]">Saved</span>}
      </div>
    </div>
  );
}
