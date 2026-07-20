'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { TrustBadge } from '@/components/ui/badge';
import { createTimelineEvent, deleteTimelineEvent } from '@/lib/actions';
import { TIMELINE_EVENT_TYPES } from '@/lib/enums';
import { formatDate } from '@/lib/utils';
import type { VerificationStatus } from '@/lib/enums';
import { Plus, Trash2 } from 'lucide-react';

export type TLEvent = {
  id: string;
  date: string;
  title: string;
  eventType: string;
  description: string | null;
  verificationStatus: string;
};

export function TimelineClient({ caseId, events }: { caseId: string; events: TLEvent[] }) {
  const [showForm, setShowForm] = useState(false);
  const [pending, start] = useTransition();
  const router = useRouter();

  const [form, setForm] = useState({ date: '', title: '', eventType: 'filing', description: '' });

  const submit = () => {
    if (!form.date || !form.title) return;
    start(async () => {
      await createTimelineEvent(caseId, form);
      setForm({ date: '', title: '', eventType: 'filing', description: '' });
      setShowForm(false);
      router.refresh();
    });
  };
  const remove = (id: string) =>
    start(async () => {
      await deleteTimelineEvent(caseId, id);
      router.refresh();
    });

  return (
    <div>
      <div className="mb-4 flex justify-end">
        <Button size="sm" variant={showForm ? 'subtle' : 'primary'} onClick={() => setShowForm((s) => !s)}>
          <Plus size={15} /> Add event
        </Button>
      </div>

      {showForm && (
        <div className="mb-5 grid gap-3 rounded-lg border bg-card p-4 sm:grid-cols-2">
          <label className="text-sm">
            <span className="mb-1 block text-xs text-muted-foreground">Date</span>
            <input type="date" className="w-full rounded-md border bg-background px-3 py-2"
              value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
          </label>
          <label className="text-sm">
            <span className="mb-1 block text-xs text-muted-foreground">Event type</span>
            <select className="w-full rounded-md border bg-background px-3 py-2"
              value={form.eventType} onChange={(e) => setForm({ ...form, eventType: e.target.value })}>
              {TIMELINE_EVENT_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </label>
          <label className="text-sm sm:col-span-2">
            <span className="mb-1 block text-xs text-muted-foreground">Title</span>
            <input className="w-full rounded-md border bg-background px-3 py-2"
              value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="e.g. Answer filed" />
          </label>
          <label className="text-sm sm:col-span-2">
            <span className="mb-1 block text-xs text-muted-foreground">Description (optional)</span>
            <textarea rows={2} className="w-full rounded-md border bg-background px-3 py-2"
              value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </label>
          <div className="sm:col-span-2">
            <Button size="sm" onClick={submit} disabled={pending || !form.date || !form.title}>Save event</Button>
          </div>
        </div>
      )}

      {events.length === 0 ? (
        <p className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
          No timeline events yet. Add filings, hearings, service, orders, and factual events to build the case story.
        </p>
      ) : (
        <ol className="relative ml-3 border-l pl-6">
          {events.map((ev) => (
            <li key={ev.id} className="mb-5">
              <span className="absolute -left-[7px] mt-1.5 h-3 w-3 rounded-full border-2 border-background bg-[hsl(var(--proposed))]" />
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-xs text-muted-foreground">{formatDate(ev.date)} · {ev.eventType}</div>
                  <div className="flex items-center gap-2 font-medium">
                    {ev.title}
                    <TrustBadge status={ev.verificationStatus as VerificationStatus} />
                  </div>
                  {ev.description && <p className="mt-0.5 text-sm text-muted-foreground">{ev.description}</p>}
                </div>
                <button onClick={() => remove(ev.id)} className="rounded p-1 text-muted-foreground hover:bg-accent hover:text-[hsl(var(--disputed))]" aria-label="Delete">
                  <Trash2 size={15} />
                </button>
              </div>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
