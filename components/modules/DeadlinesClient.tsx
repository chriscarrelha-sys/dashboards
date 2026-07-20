'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { TrustBadge } from '@/components/ui/badge';
import {
  createDeadline, confirmDeadline, toggleDeadlineDone, deleteDeadline,
  createTask, setTaskStatus, deleteTask,
} from '@/lib/actions';
import { formatDate, relativeDeadline } from '@/lib/utils';
import type { VerificationStatus } from '@/lib/enums';
import { Plus, Trash2, Check } from 'lucide-react';

export type DeadlineRow = {
  id: string; title: string; dueDate: string | null; source: string;
  verificationStatus: string; governingRule: string | null; done: boolean;
};
export type TaskRow = {
  id: string; title: string; why: string | null; priority: string;
  dueDate: string | null; status: string; isNextAction: boolean;
};

export function DeadlinesClient({
  caseId, deadlines, tasks,
}: {
  caseId: string; deadlines: DeadlineRow[]; tasks: TaskRow[];
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const refresh = () => router.refresh();

  return (
    <div className="space-y-8">
      <DeadlinesSection caseId={caseId} deadlines={deadlines} pending={pending} start={start} refresh={refresh} />
      <TasksSection caseId={caseId} tasks={tasks} pending={pending} start={start} refresh={refresh} />
    </div>
  );
}

/* ---------------------------------------------------------------- Deadlines */

function DeadlinesSection({ caseId, deadlines, pending, start, refresh }: any) {
  const [open, setOpen] = useState(false);
  const [useCalc, setUseCalc] = useState(false);
  const [f, setF] = useState({ title: '', dueDate: '', triggerDate: '', days: '', method: 'calendar' });

  const submit = () => {
    if (!f.title) return;
    const input: Record<string, unknown> = { title: f.title, source: 'manual' };
    if (useCalc && f.triggerDate && f.days) {
      input.triggerDate = f.triggerDate; input.days = Number(f.days); input.method = f.method;
    } else if (f.dueDate) {
      input.dueDate = f.dueDate;
    }
    start(async () => {
      await createDeadline(caseId, input as any);
      setF({ title: '', dueDate: '', triggerDate: '', days: '', method: 'calendar' });
      setOpen(false); refresh();
    });
  };

  return (
    <section>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-base font-semibold">Deadlines</h2>
        <Button size="sm" variant={open ? 'subtle' : 'primary'} onClick={() => setOpen((o) => !o)}>
          <Plus size={15} /> Add deadline
        </Button>
      </div>

      {open && (
        <div className="mb-4 grid gap-3 rounded-lg border bg-card p-4">
          <input className="rounded-md border bg-background px-3 py-2 text-sm" placeholder="Title (e.g. Response to Motion to Dismiss)"
            value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} />
          <label className="flex items-center gap-2 text-sm text-muted-foreground">
            <input type="checkbox" checked={useCalc} onChange={(e) => setUseCalc(e.target.checked)} />
            Use the deadline calculator (result is always Unverified)
          </label>
          {useCalc ? (
            <div className="grid gap-2 sm:grid-cols-3">
              <input type="date" className="rounded-md border bg-background px-3 py-2 text-sm"
                value={f.triggerDate} onChange={(e) => setF({ ...f, triggerDate: e.target.value })} />
              <input type="number" placeholder="+ days" className="rounded-md border bg-background px-3 py-2 text-sm"
                value={f.days} onChange={(e) => setF({ ...f, days: e.target.value })} />
              <select className="rounded-md border bg-background px-3 py-2 text-sm"
                value={f.method} onChange={(e) => setF({ ...f, method: e.target.value })}>
                <option value="calendar">Calendar days</option>
                <option value="business">Business days</option>
              </select>
            </div>
          ) : (
            <input type="date" className="rounded-md border bg-background px-3 py-2 text-sm"
              value={f.dueDate} onChange={(e) => setF({ ...f, dueDate: e.target.value })} />
          )}
          <div>
            <Button size="sm" onClick={submit} disabled={pending || !f.title}>Save deadline</Button>
          </div>
        </div>
      )}

      {deadlines.length === 0 ? (
        <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">No deadlines yet.</p>
      ) : (
        <ul className="space-y-2">
          {deadlines.map((d: DeadlineRow) => {
            const rel = d.dueDate ? relativeDeadline(d.dueDate) : null;
            return (
              <li key={d.id} className={`flex items-center gap-3 rounded-lg border bg-card p-3 ${d.done ? 'opacity-60' : ''}`}>
                <input type="checkbox" checked={d.done}
                  onChange={(e) => start(async () => { await toggleDeadlineDone(caseId, d.id, e.target.checked); refresh(); })} />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`font-medium ${d.done ? 'line-through' : ''}`}>{d.title}</span>
                    <TrustBadge status={d.verificationStatus as VerificationStatus} />
                    <span className="text-xs text-muted-foreground">{d.source}</span>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {formatDate(d.dueDate)}{rel ? ` · ${rel.label}` : ''}{d.governingRule ? ` · ${d.governingRule}` : ''}
                  </div>
                </div>
                {d.verificationStatus === 'unverified' && (
                  <Button size="sm" variant="outline"
                    onClick={() => start(async () => { await confirmDeadline(caseId, d.id); refresh(); })}>
                    <Check size={14} /> Confirm
                  </Button>
                )}
                <button className="rounded p-1 text-muted-foreground hover:text-[hsl(var(--disputed))]"
                  onClick={() => start(async () => { await deleteDeadline(caseId, d.id); refresh(); })} aria-label="Delete">
                  <Trash2 size={15} />
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

/* ------------------------------------------------------------------- Tasks */

function TasksSection({ caseId, tasks, pending, start, refresh }: any) {
  const [open, setOpen] = useState(false);
  const [f, setF] = useState({ title: '', why: '', priority: 'normal', dueDate: '', isNextAction: false });

  const submit = () => {
    if (!f.title) return;
    start(async () => {
      await createTask(caseId, { ...f, priority: f.priority as any });
      setF({ title: '', why: '', priority: 'normal', dueDate: '', isNextAction: false });
      setOpen(false); refresh();
    });
  };

  return (
    <section>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-base font-semibold">Tasks</h2>
        <Button size="sm" variant={open ? 'subtle' : 'primary'} onClick={() => setOpen((o) => !o)}>
          <Plus size={15} /> Add task
        </Button>
      </div>

      {open && (
        <div className="mb-4 grid gap-3 rounded-lg border bg-card p-4">
          <input className="rounded-md border bg-background px-3 py-2 text-sm" placeholder="Task title"
            value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} />
          <textarea rows={2} className="rounded-md border bg-background px-3 py-2 text-sm" placeholder="Why it matters (optional)"
            value={f.why} onChange={(e) => setF({ ...f, why: e.target.value })} />
          <div className="grid gap-2 sm:grid-cols-2">
            <select className="rounded-md border bg-background px-3 py-2 text-sm"
              value={f.priority} onChange={(e) => setF({ ...f, priority: e.target.value })}>
              {['low', 'normal', 'high', 'critical'].map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
            <input type="date" className="rounded-md border bg-background px-3 py-2 text-sm"
              value={f.dueDate} onChange={(e) => setF({ ...f, dueDate: e.target.value })} />
          </div>
          <label className="flex items-center gap-2 text-sm text-muted-foreground">
            <input type="checkbox" checked={f.isNextAction} onChange={(e) => setF({ ...f, isNextAction: e.target.checked })} />
            Mark as the case&apos;s Next Action
          </label>
          <div><Button size="sm" onClick={submit} disabled={pending || !f.title}>Save task</Button></div>
        </div>
      )}

      {tasks.length === 0 ? (
        <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">No tasks yet.</p>
      ) : (
        <ul className="space-y-2">
          {tasks.map((t: TaskRow) => (
            <li key={t.id} className={`flex items-center gap-3 rounded-lg border bg-card p-3 ${t.status === 'done' ? 'opacity-60' : ''}`}>
              <input type="checkbox" checked={t.status === 'done'}
                onChange={(e) => start(async () => { await setTaskStatus(caseId, t.id, e.target.checked ? 'done' : 'open'); refresh(); })} />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className={`font-medium ${t.status === 'done' ? 'line-through' : ''}`}>{t.title}</span>
                  {t.isNextAction && <span className="rounded bg-[hsl(var(--proposed)/0.15)] px-1.5 py-0.5 text-xs text-[hsl(var(--proposed))]">Next Action</span>}
                  <span className="text-xs text-muted-foreground">{t.priority}</span>
                </div>
                {t.why && <div className="text-xs text-muted-foreground">{t.why}</div>}
                <div className="text-xs text-muted-foreground">{t.dueDate ? formatDate(t.dueDate) : 'no due date'}</div>
              </div>
              <button className="rounded p-1 text-muted-foreground hover:text-[hsl(var(--disputed))]"
                onClick={() => start(async () => { await deleteTask(caseId, t.id); refresh(); })} aria-label="Delete">
                <Trash2 size={15} />
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
