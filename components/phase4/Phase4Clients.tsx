'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { TrustBadge } from '@/components/ui/badge';
import {
  createExhibitSet, addExhibitItem, setExhibitItemStatus, runBates, createBinder, validateBinder,
  connectCalendar, syncDeadline, setNotificationPrefs, generateReminders, generateDigest, ackNotification,
  createBackup, verifyBackup, restorePreview, createCaseExport, restoreItem, purgeItem, testIntegration,
  addSelectedFolder, revokeSession, addBinderItem,
} from '@/lib/actions/phase4';
import {
  EXHIBIT_NUMBERING_STYLES, REDACTION_STATUSES, AUTHENTICATION_STATUSES, BINDER_KINDS,
  CALENDAR_PROVIDERS, EXPORT_SCOPES, humanize,
} from '@/lib/enums';
import { formatDate, formatDateTime, relativeDeadline } from '@/lib/utils';
import type { VerificationStatus } from '@/lib/enums';
import { Plus } from 'lucide-react';

function useAct() {
  const router = useRouter();
  const [pending, start] = useTransition();
  return { pending, run: (fn: () => Promise<unknown>) => start(async () => { await fn(); router.refresh(); }), router };
}
function Empty({ msg }: { msg: string }) { return <p className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">{msg}</p>; }

/* ------------------------------------------------------------ Exhibits */
export function ExhibitsClient({ caseId, sets, batesJobs }: { caseId: string; sets: any[]; batesJobs: any[] }) {
  const { pending, run } = useAct();
  const [open, setOpen] = useState(false);
  const [f, setF] = useState({ title: '', kind: 'hearing', numberingStyle: 'numeric' });
  const [bates, setBates] = useState({ prefix: 'EX-', totalPages: '1' });
  return (
    <div className="space-y-6">
      <section>
        <div className="mb-3 flex items-center justify-between"><h2 className="text-base font-semibold">Exhibit sets</h2><Button size="sm" variant={open ? 'subtle' : 'primary'} onClick={() => setOpen(!open)}><Plus size={15} /> New set</Button></div>
        {open && (
          <div className="mb-3 grid gap-2 rounded-lg border bg-card p-4 sm:grid-cols-3">
            <input className="rounded-md border bg-background px-3 py-2 text-sm sm:col-span-3" placeholder="Set title *" value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} />
            <select className="rounded-md border bg-background px-3 py-2 text-sm" value={f.kind} onChange={(e) => setF({ ...f, kind: e.target.value })}>{['hearing', 'motion', 'deposition', 'discovery', 'trial', 'settlement', 'custom'].map((k) => <option key={k} value={k}>{humanize(k)}</option>)}</select>
            <select className="rounded-md border bg-background px-3 py-2 text-sm" value={f.numberingStyle} onChange={(e) => setF({ ...f, numberingStyle: e.target.value })}>{EXHIBIT_NUMBERING_STYLES.map((s) => <option key={s} value={s}>{humanize(s)}</option>)}</select>
            <Button size="sm" onClick={() => f.title && run(async () => { await createExhibitSet(caseId, f); setOpen(false); setF({ title: '', kind: 'hearing', numberingStyle: 'numeric' }); })} disabled={pending}>Create</Button>
          </div>
        )}
        {sets.length === 0 ? <Empty msg="No exhibit sets yet." /> : (
          <div className="space-y-2">{sets.map((s) => (
            <Link key={s.id} href={`/case/${caseId}/exhibit-set/${s.id}`} className="flex items-center gap-3 rounded-lg border bg-card p-3 hover:border-ring">
              <div className="flex-1"><span className="font-medium">{s.title}</span> <span className="text-xs text-muted-foreground">· {humanize(s.kind)} · {s.itemCount} exhibit(s)</span></div>
              <span className="text-xs text-muted-foreground">{humanize(s.numberingStyle)}</span>
            </Link>
          ))}</div>
        )}
      </section>

      <section>
        <h2 className="mb-2 text-base font-semibold">Bates numbering</h2>
        <p className="mb-2 rounded-md bg-muted px-3 py-2 text-xs text-muted-foreground">Bates numbering creates a new derivative document — the source file is never altered.</p>
        <div className="mb-3 flex flex-wrap items-end gap-2">
          <label className="text-sm"><span className="mb-1 block text-xs text-muted-foreground">Prefix</span><input className="rounded-md border bg-background px-3 py-2 text-sm" value={bates.prefix} onChange={(e) => setBates({ ...bates, prefix: e.target.value })} /></label>
          <label className="text-sm"><span className="mb-1 block text-xs text-muted-foreground">Total pages</span><input type="number" className="w-24 rounded-md border bg-background px-3 py-2 text-sm" value={bates.totalPages} onChange={(e) => setBates({ ...bates, totalPages: e.target.value })} /></label>
          <Button size="sm" onClick={() => run(() => runBates(caseId, { prefix: bates.prefix, totalPages: Number(bates.totalPages) }))} disabled={pending}>Apply Bates</Button>
        </div>
        {batesJobs.length > 0 && (
          <ul className="space-y-1 text-sm text-muted-foreground">{batesJobs.map((b) => <li key={b.id}>{b.firstNumber} – {b.lastNumber} · {b.totalPages} pages · {formatDate(b.createdAt)}</li>)}</ul>
        )}
      </section>
    </div>
  );
}

export function ExhibitSetClient({ caseId, setId, numberingStyle, items, documents }: { caseId: string; setId: string; numberingStyle: string; items: any[]; documents: { id: string; label: string }[] }) {
  const { pending, run } = useAct();
  const [f, setF] = useState({ exhibitNumber: '', documentId: '', pageRange: '', title: '' });
  const [err, setErr] = useState<string | null>(null);
  const add = (allowDuplicate = false) => {
    if (!f.exhibitNumber) return;
    setErr(null);
    run(async () => {
      try { await addExhibitItem(caseId, setId, { ...f, allowDuplicate, documentId: f.documentId || undefined, pageRange: f.pageRange || undefined }); setF({ exhibitNumber: '', documentId: '', pageRange: '', title: '' }); }
      catch (e) { setErr((e as Error).message); }
    });
  };
  return (
    <div>
      <div className="mb-4 grid gap-2 rounded-lg border bg-card p-4 sm:grid-cols-4">
        <input className="rounded-md border bg-background px-3 py-2 text-sm" placeholder={`Exhibit # (${humanize(numberingStyle)})`} value={f.exhibitNumber} onChange={(e) => setF({ ...f, exhibitNumber: e.target.value })} />
        <select className="rounded-md border bg-background px-3 py-2 text-sm" value={f.documentId} onChange={(e) => setF({ ...f, documentId: e.target.value })}><option value="">— source document —</option>{documents.map((d) => <option key={d.id} value={d.id}>{d.label}</option>)}</select>
        <input className="rounded-md border bg-background px-3 py-2 text-sm" placeholder="Page range (e.g. 1-3)" value={f.pageRange} onChange={(e) => setF({ ...f, pageRange: e.target.value })} />
        <Button size="sm" onClick={() => add(false)} disabled={pending}>Add exhibit</Button>
      </div>
      {err && (
        <div className="mb-3 flex items-center gap-3 rounded-md border border-[hsl(var(--unverified)/0.4)] bg-[hsl(var(--unverified)/0.1)] px-3 py-2 text-sm text-[hsl(var(--unverified))]">
          {err} <Button size="sm" variant="outline" onClick={() => add(true)}>Allow duplicate</Button>
        </div>
      )}
      {items.length === 0 ? <Empty msg="No exhibits in this set. The source file is never modified." /> : (
        <div className="space-y-2">
          {items.map((it) => (
            <div key={it.id} className="rounded-lg border bg-card p-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded bg-[hsl(var(--proposed)/0.15)] px-2 py-0.5 text-xs font-medium text-[hsl(var(--proposed))]">{it.exhibitNumber}</span>
                <span className="font-medium">{it.title || it.documentLabel || '(no document)'}</span>
                {it.pageRange && <span className="text-xs text-muted-foreground">pp. {it.pageRange}</span>}
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-3">
                <label className="text-xs text-muted-foreground">Auth:
                  <select className="ml-1 rounded border bg-background px-1 py-0.5 text-xs" value={it.authenticationStatus} onChange={(e) => run(() => setExhibitItemStatus(caseId, it.id, 'authenticationStatus', e.target.value))}>{AUTHENTICATION_STATUSES.map((s) => <option key={s} value={s}>{humanize(s)}</option>)}</select>
                </label>
                <label className="text-xs text-muted-foreground">Redaction:
                  <select className="ml-1 rounded border bg-background px-1 py-0.5 text-xs" value={it.redactionStatus} onChange={(e) => run(() => setExhibitItemStatus(caseId, it.id, 'redactionStatus', e.target.value))}>{REDACTION_STATUSES.map((s) => <option key={s} value={s}>{humanize(s)}</option>)}</select>
                </label>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------ Binders */
export function BinderClient({ caseId, binders }: { caseId: string; binders: any[] }) {
  const { pending, run } = useAct();
  const [open, setOpen] = useState(false);
  const [f, setF] = useState({ title: '', kind: 'hearing', batesEnabled: false });
  const [validation, setValidation] = useState<Record<string, any>>({});
  const validate = (id: string) => run(async () => { const v = await validateBinder(caseId, id); setValidation((prev) => ({ ...prev, [id]: v })); });
  return (
    <div>
      <div className="mb-4 flex justify-end"><Button size="sm" variant={open ? 'subtle' : 'primary'} onClick={() => setOpen(!open)}><Plus size={15} /> New binder</Button></div>
      {open && (
        <div className="mb-4 grid gap-2 rounded-lg border bg-card p-4 sm:grid-cols-3">
          <input className="rounded-md border bg-background px-3 py-2 text-sm sm:col-span-2" placeholder="Binder title *" value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} />
          <select className="rounded-md border bg-background px-3 py-2 text-sm" value={f.kind} onChange={(e) => setF({ ...f, kind: e.target.value })}>{BINDER_KINDS.map((k) => <option key={k} value={k}>{humanize(k)}</option>)}</select>
          <label className="flex items-center gap-1.5 text-sm text-muted-foreground"><input type="checkbox" checked={f.batesEnabled} onChange={(e) => setF({ ...f, batesEnabled: e.target.checked })} /> Bates numbering</label>
          <Button size="sm" onClick={() => f.title && run(async () => { await createBinder(caseId, f); setOpen(false); setF({ title: '', kind: 'hearing', batesEnabled: false }); })} disabled={pending}>Create (seeds sections)</Button>
        </div>
      )}
      {binders.length === 0 ? <Empty msg="No binders yet. Creating one seeds the standard sections." /> : (
        <div className="space-y-2">
          {binders.map((b) => (
            <div key={b.id} className="rounded-lg border bg-card p-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-medium">{b.title}</span><span className="rounded bg-muted px-1.5 py-0.5 text-xs text-muted-foreground">{humanize(b.kind)}</span>
                <span className="text-xs text-muted-foreground">{b.sectionCount} sections · {b.itemCount} items</span>
                <Button size="sm" variant="outline" className="ml-auto" onClick={() => validate(b.id)} disabled={pending}>Validate</Button>
              </div>
              {validation[b.id] && (
                <div className="mt-2 rounded-md bg-muted/60 p-2 text-xs">
                  {validation[b.id].blockers.length > 0 && <p className="text-[hsl(var(--disputed))]">Blocked: {validation[b.id].blockers.join('; ')}</p>}
                  {validation[b.id].warnings.map((w: string, i: number) => <p key={i} className="text-[hsl(var(--unverified))]">! {w}</p>)}
                  <p className={validation[b.id].canExport ? 'text-[hsl(var(--confirmed))]' : 'text-[hsl(var(--disputed))]'}>{validation[b.id].canExport ? 'Ready to export (as manifest package).' : 'Export blocked until source files resolve.'}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------ Calendar */
export function CalendarClient({ caseId, connections, deadlines }: { caseId: string; connections: any[]; deadlines: any[] }) {
  const { pending, run } = useAct();
  const [err, setErr] = useState<string | null>(null);
  const sync = (id: string) => run(async () => { setErr(null); try { await syncDeadline(caseId, id); } catch (e) { setErr((e as Error).message); } });
  return (
    <div className="space-y-6">
      <section>
        <h2 className="mb-2 text-base font-semibold">Calendar connections</h2>
        <div className="flex flex-wrap gap-2">
          {CALENDAR_PROVIDERS.map((p) => {
            const c = connections.find((x) => x.provider === p);
            return (
              <div key={p} className="flex items-center gap-2 rounded-lg border bg-card px-3 py-2 text-sm">
                <span className="font-medium">{humanize(p)} Calendar</span>
                <span className={`rounded px-1.5 py-0.5 text-xs ${c ? 'bg-[hsl(var(--unverified)/0.15)] text-[hsl(var(--unverified))]' : 'bg-muted text-muted-foreground'}`}>{c ? 'Mocked' : 'Not configured'}</span>
                {!c && <Button size="sm" variant="outline" onClick={() => run(() => connectCalendar(p))} disabled={pending}>Connect (mock)</Button>}
              </div>
            );
          })}
        </div>
      </section>
      <section>
        <h2 className="mb-2 text-base font-semibold">Deadlines &amp; hearings</h2>
        <p className="mb-2 rounded-md bg-muted px-3 py-2 text-xs text-muted-foreground">Only <strong>confirmed</strong> deadlines can be synced. Unverified/calculated deadlines are blocked from auto-sync.</p>
        {err && <p className="mb-2 text-sm text-[hsl(var(--disputed))]">{err}</p>}
        {deadlines.length === 0 ? <Empty msg="No deadlines." /> : (
          <div className="space-y-2">
            {deadlines.map((d) => {
              const rel = d.dueDate ? relativeDeadline(d.dueDate) : null;
              return (
                <div key={d.id} className="flex flex-wrap items-center gap-2 rounded-lg border bg-card p-3 text-sm">
                  <span className="font-medium">{d.title}</span>
                  <TrustBadge status={d.verificationStatus as VerificationStatus} />
                  <span className="text-xs text-muted-foreground">{formatDate(d.dueDate)}{rel ? ` · ${rel.label}` : ''}</span>
                  {d.synced ? <span className="ml-auto rounded bg-[hsl(var(--confirmed)/0.15)] px-2 py-0.5 text-xs text-[hsl(var(--confirmed))]">synced (mock)</span>
                    : d.verificationStatus === 'confirmed' ? <Button size="sm" variant="outline" className="ml-auto" onClick={() => sync(d.id)} disabled={pending}>Sync to calendar</Button>
                    : <span className="ml-auto text-xs text-[hsl(var(--unverified))]">confirm to enable sync</span>}
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}

/* ------------------------------------------------------------ Notifications */
export function NotificationsClient({ caseId, prefs, notifications, digest }: { caseId: string; prefs: any; notifications: any[]; digest: any }) {
  const { pending, run } = useAct();
  const [p, setP] = useState(prefs || { dashboard: true, email: false, push: false, digestDaily: true, digestWeekly: false });
  return (
    <div className="space-y-6">
      <section>
        <h2 className="mb-2 text-base font-semibold">Preferences</h2>
        <div className="flex flex-wrap gap-4 rounded-lg border bg-card p-4 text-sm">
          {(['dashboard', 'email', 'push', 'digestDaily', 'digestWeekly'] as const).map((k) => (
            <label key={k} className="flex items-center gap-1.5 text-muted-foreground"><input type="checkbox" checked={!!p[k]} onChange={(e) => setP({ ...p, [k]: e.target.checked })} /> {humanize(k)}</label>
          ))}
          <Button size="sm" onClick={() => run(() => setNotificationPrefs(p))} disabled={pending}>Save</Button>
        </div>
        <p className="mt-1 text-xs text-muted-foreground">Push is not natively implemented; email/push are mock channels in this build. No confidential content is placed in subject lines.</p>
      </section>
      <section>
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-base font-semibold">Reminders &amp; digest</h2>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={() => run(() => generateReminders(caseId))} disabled={pending}>Generate reminders</Button>
            <Button size="sm" variant="outline" onClick={() => run(() => generateDigest('daily'))} disabled={pending}>Generate digest</Button>
          </div>
        </div>
        {digest && (
          <div className="mb-3 rounded-lg border bg-card p-3 text-sm">
            <div className="text-xs font-semibold text-muted-foreground">{humanize(digest.period)} digest · {formatDate(digest.createdAt)}</div>
            <p className="text-muted-foreground">Open deadlines: {digest.content.openDeadlines} · Open deficiencies: {digest.content.openDeficiencies} · Unverified authorities: {digest.content.unverifiedAuthorities}</p>
          </div>
        )}
        {notifications.length === 0 ? <Empty msg="No notifications. Generate reminders for confirmed upcoming deadlines." /> : (
          <div className="space-y-2">
            {notifications.map((n) => (
              <div key={n.id} className={`flex items-center gap-2 rounded-lg border bg-card p-3 text-sm ${n.status !== 'unread' ? 'opacity-60' : ''}`}>
                <span className={`rounded px-1.5 py-0.5 text-xs ${n.priority === 'critical' ? 'bg-[hsl(var(--disputed)/0.15)] text-[hsl(var(--disputed))]' : 'bg-muted text-muted-foreground'}`}>{n.priority}</span>
                <span className="font-medium">{n.title}</span>
                <span className="ml-auto flex gap-1">
                  {n.status === 'unread' && <button className="text-xs text-[hsl(var(--proposed))] hover:underline" onClick={() => run(() => ackNotification(n.id, 'read'))} disabled={pending}>mark read</button>}
                  <button className="text-xs text-muted-foreground hover:underline" onClick={() => run(() => ackNotification(n.id, 'dismissed'))} disabled={pending}>dismiss</button>
                </span>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

/* ------------------------------------------------------------ Backup */
export function BackupClient({ backups }: { backups: any[] }) {
  const { pending, run } = useAct();
  const [preview, setPreview] = useState<any>(null);
  return (
    <div>
      <div className="mb-4 flex gap-2"><Button size="sm" onClick={() => run(() => createBackup('manual'))} disabled={pending}>Create backup</Button></div>
      {preview && <div className="mb-3 rounded-md border bg-card p-3 text-sm"><div className="text-xs font-semibold text-muted-foreground">Restore preview (simulated)</div><pre className="mt-1 whitespace-pre-wrap text-xs">{JSON.stringify(preview, null, 2)}</pre></div>}
      {backups.length === 0 ? <Empty msg="No backups yet." /> : (
        <div className="space-y-2">
          {backups.map((b) => (
            <div key={b.id} className="flex flex-wrap items-center gap-2 rounded-lg border bg-card p-3 text-sm">
              <span className="font-medium">{humanize(b.type)}</span>
              <span className={`rounded px-1.5 py-0.5 text-xs ${b.status === 'completed' ? 'bg-[hsl(var(--confirmed)/0.15)] text-[hsl(var(--confirmed))]' : 'bg-[hsl(var(--disputed)/0.15)] text-[hsl(var(--disputed))]'}`}>{b.status}</span>
              {b.encrypted && <span className="text-xs text-muted-foreground">encrypted</span>}
              <span className="text-xs text-muted-foreground">{b.verifiedAt ? `verified (${b.restoreTestStatus})` : 'unverified'}</span>
              <span className="ml-auto flex gap-1.5">
                {!b.verifiedAt && <Button size="sm" variant="outline" onClick={() => run(() => verifyBackup(b.id))} disabled={pending}>Verify</Button>}
                {b.status === 'completed' && <Button size="sm" variant="ghost" onClick={() => run(async () => { const p = await restorePreview(b.id); setPreview(p); })} disabled={pending}>Preview restore</Button>}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------ Export */
export function ExportClient({ caseId, confidentialCount, exports }: { caseId: string; confidentialCount: number; exports: any[] }) {
  const { pending, run } = useAct();
  const [scope, setScope] = useState('external-sharing');
  const [includeConf, setIncludeConf] = useState(false);
  return (
    <div>
      <div className="mb-4 grid gap-3 rounded-lg border bg-card p-4">
        <div className="rounded-md bg-[hsl(var(--unverified)/0.1)] px-3 py-2 text-sm text-[hsl(var(--unverified))]">
          Confidentiality review: this case has <strong>{confidentialCount}</strong> confidential/privileged/settlement record(s). The default <em>external-sharing</em> export excludes internal strategy and privileged materials unless you include them.
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <select className="rounded-md border bg-background px-3 py-2 text-sm" value={scope} onChange={(e) => setScope(e.target.value)}>{EXPORT_SCOPES.map((s) => <option key={s} value={s}>{humanize(s)}</option>)}</select>
          <label className="flex items-center gap-1.5 text-sm text-muted-foreground"><input type="checkbox" checked={includeConf} onChange={(e) => setIncludeConf(e.target.checked)} /> Include confidential materials</label>
          <Button size="sm" onClick={() => run(() => createCaseExport(caseId, scope as any, includeConf))} disabled={pending}>Generate export</Button>
        </div>
      </div>
      {exports.length === 0 ? <Empty msg="No exports yet." /> : (
        <div className="space-y-2">
          {exports.map((x) => (
            <div key={x.id} className="flex flex-wrap items-center gap-2 rounded-lg border bg-card p-3 text-sm">
              <span className="font-medium">{humanize(x.scope)}</span>
              {x.includesConfidential && <span className="text-xs text-[hsl(var(--disputed))]">includes confidential</span>}
              <a className="ml-auto text-xs text-[hsl(var(--proposed))] hover:underline" href={`/case/${caseId}/export/${x.id}/manifest`} target="_blank" rel="noopener noreferrer">Download manifest</a>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------ Trash */
export function TrashClient({ caseId, items }: { caseId: string; items: any[] }) {
  const { pending, run } = useAct();
  return items.length === 0 ? <Empty msg={`Trash is empty. Deleted records are recoverable for 30 days.`} /> : (
    <div className="space-y-2">
      {items.map((it) => (
        <div key={`${it.entity}-${it.id}`} className="flex flex-wrap items-center gap-2 rounded-lg border bg-card p-3 text-sm">
          <span className="rounded bg-muted px-1.5 py-0.5 text-xs text-muted-foreground">{humanize(it.entity)}</span>
          <span className="font-medium">{it.label}</span>
          <span className="text-xs text-muted-foreground">deleted {formatDate(it.deletedAt)}</span>
          <span className="ml-auto flex gap-1.5">
            <Button size="sm" variant="outline" onClick={() => run(() => restoreItem(caseId, it.entity, it.id))} disabled={pending}>Restore</Button>
            <Button size="sm" variant="ghost" onClick={() => { const c = prompt('Type DELETE to permanently remove this record:'); if (c) run(() => purgeItem(caseId, it.entity, it.id, c)); }} disabled={pending}>Delete forever</Button>
          </span>
        </div>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------ Security */
export function SecurityClient({ sessions }: { sessions: any[] }) {
  const { pending, run } = useAct();
  return (
    <div>
      <h2 className="mb-2 text-base font-semibold">Sessions</h2>
      {sessions.length === 0 ? <Empty msg="No active sessions recorded." /> : (
        <div className="space-y-2">
          {sessions.map((s) => (
            <div key={s.id} className="flex items-center gap-2 rounded-lg border bg-card p-3 text-sm">
              <span className="font-medium">{s.device || 'Device'}</span><span className="text-xs text-muted-foreground">{s.ip} · active {formatDateTime(s.lastActiveAt)}</span>
              {s.revokedAt ? <span className="ml-auto text-xs text-muted-foreground">revoked</span> : <Button size="sm" variant="outline" className="ml-auto" onClick={() => run(() => revokeSession(s.id))} disabled={pending}>Revoke</Button>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------ Diagnostics */
export function DiagnosticsClient({ integrations }: { integrations: any[] }) {
  const { pending } = useAct();
  const [, start] = useTransition();
  const [results, setResults] = useState<Record<string, any>>({});
  const test = (key: string) => start(async () => { const r = await testIntegration(key); setResults((prev) => ({ ...prev, [key]: r })); });
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {integrations.map((i) => (
        <div key={i.key} className="rounded-lg border bg-card p-3">
          <div className="flex items-center justify-between"><span className="font-medium">{i.name}</span><span className={`rounded-full px-2 py-0.5 text-xs ${i.status === 'connected' ? 'bg-[hsl(var(--confirmed)/0.15)] text-[hsl(var(--confirmed))]' : i.status === 'mock' ? 'bg-[hsl(var(--unverified)/0.15)] text-[hsl(var(--unverified))]' : 'bg-muted text-muted-foreground'}`}>{i.status}</span></div>
          <p className="mt-1 text-xs text-muted-foreground">{i.purpose}</p>
          <div className="mt-2 flex items-center gap-2">
            <Button size="sm" variant="outline" onClick={() => test(i.key)} disabled={pending}>Test connection</Button>
            {results[i.key] && <span className="text-xs text-muted-foreground">{results[i.key].message}</span>}
          </div>
        </div>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------ Companion (iCloud/local) */
export function CompanionClient({ folders }: { folders: any[] }) {
  const { pending, run } = useAct();
  const [f, setF] = useState({ provider: 'icloud', path: '' });
  return (
    <div>
      <p className="mb-3 rounded-md bg-muted px-3 py-2 text-xs text-muted-foreground">
        A browser app cannot continuously browse iCloud Drive. The future Mac companion uses per-device tokens, least-privilege folder access, and explicit folder selection. This is a <strong>mock</strong> of that protocol — no real folder is monitored.
      </p>
      <div className="mb-4 flex flex-wrap items-end gap-2">
        <select className="rounded-md border bg-background px-3 py-2 text-sm" value={f.provider} onChange={(e) => setF({ ...f, provider: e.target.value })}>{['icloud', 'local', 'onedrive'].map((p) => <option key={p} value={p}>{humanize(p)}</option>)}</select>
        <input className="flex-1 rounded-md border bg-background px-3 py-2 text-sm" placeholder="Selected folder path" value={f.path} onChange={(e) => setF({ ...f, path: e.target.value })} />
        <Button size="sm" onClick={() => f.path && run(async () => { await addSelectedFolder(f.provider, f.path); setF({ provider: 'icloud', path: '' }); })} disabled={pending}>Add folder (mock)</Button>
      </div>
      {folders.length === 0 ? <Empty msg="No selected folders." /> : (
        <div className="space-y-2">{folders.map((x) => (
          <div key={x.id} className="flex items-center gap-2 rounded-lg border bg-card p-3 text-sm"><span className="rounded bg-muted px-1.5 py-0.5 text-xs">{humanize(x.provider)}</span><span className="font-mono text-xs">{x.path}</span><span className="ml-auto text-xs text-[hsl(var(--unverified))]">{x.status}</span></div>
        ))}</div>
      )}
    </div>
  );
}
