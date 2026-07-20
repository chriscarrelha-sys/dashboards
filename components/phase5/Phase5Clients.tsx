'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { TrustBadge } from '@/components/ui/badge';
import {
  generateCaseReview, createDocketEntry, importDocketSheet, setDocketMonitor,
  createDeviceCode, revokeDevice, enroll2FA, enable2FA, setCaseAiMode,
} from '@/lib/actions/phase5';
import { DOCKET_MONITOR_SCHEDULES, AI_CASE_MODES, humanize } from '@/lib/enums';
import { formatDate, formatDateTime } from '@/lib/utils';
import { Sparkles, Plus, ShieldCheck } from 'lucide-react';

function useAct() {
  const router = useRouter();
  const [pending, start] = useTransition();
  return { pending, run: (fn: () => Promise<unknown>) => start(async () => { await fn(); router.refresh(); }), router };
}
function Empty({ msg }: { msg: string }) { return <p className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">{msg}</p>; }

const SOURCE_TONE: Record<string, string> = {
  'confirmed-fact': 'text-[hsl(var(--confirmed))]', 'verified-authority': 'text-[hsl(var(--confirmed))]',
  'user-assertion': 'text-foreground', 'opposing-assertion': 'text-[hsl(var(--disputed))]',
  'ai-inference': 'text-[hsl(var(--proposed))]', 'unverified': 'text-[hsl(var(--unverified))]',
};

/* ------------------------------------------------------------ Case Review */
export function CaseReviewClient({ caseId, review }: { caseId: string; review: any | null }) {
  const { pending, run } = useAct();
  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{review ? `Version ${review.version} · ${formatDateTime(review.createdAt)}` : 'No review generated yet.'}</p>
        <Button size="sm" onClick={() => run(() => generateCaseReview(caseId))} disabled={pending}><Sparkles size={15} /> {review ? 'Regenerate' : 'Generate'} review</Button>
      </div>
      <p className="mb-4 rounded-md bg-muted px-3 py-2 text-xs text-muted-foreground">
        Organizational analysis of your <strong>confirmed</strong> case data — not legal advice and not a win-probability score. Every finding links to source records and shows its status; interpretive narrative is mock AI (no live model).
      </p>
      {!review ? <Empty msg="Generate a review to see a source-linked, versioned analysis." /> : (
        <div className="space-y-4">
          <div className="rounded-lg border bg-card p-4"><div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Summary</div><p className="mt-1 text-sm">{review.summary}</p></div>
          {review.sections.map((s: any) => (
            <div key={s.key} className="rounded-lg border bg-card p-4">
              <h3 className="mb-2 text-sm font-semibold">{s.title}</h3>
              <ul className="space-y-2">
                {s.findings.map((f: any, i: number) => (
                  <li key={i} className="text-sm">
                    <span className={SOURCE_TONE[f.sourceType] ?? ''}>{f.text}</span>
                    <span className="ml-2 rounded bg-muted px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-muted-foreground">{humanize(f.sourceType)}</span>
                    {f.sourceRefs?.length > 0 && (
                      <span className="ml-2 text-xs text-muted-foreground">
                        {f.sourceRefs.slice(0, 3).map((r: any, j: number) => <span key={j} className="mr-1">↳ {r.label}</span>)}
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------ Docket */
export function DocketClient({ caseId, entries, monitor, documents }: { caseId: string; entries: any[]; monitor: any | null; documents: { id: string; label: string }[] }) {
  const { pending, run } = useAct();
  const [open, setOpen] = useState(false);
  const [importDoc, setImportDoc] = useState('');
  const [f, setF] = useState({ title: '', entryNumber: '', documentNumber: '', filingParty: '' });
  const [mon, setMon] = useState({ provider: monitor?.provider || 'manual', schedule: monitor?.schedule || 'manual' });
  const [err, setErr] = useState<string | null>(null);
  return (
    <div className="space-y-6">
      <section>
        <div className="mb-3 rounded-md bg-muted px-3 py-2 text-xs text-muted-foreground">
          PeachCourt/PACER are external portals — Pro Se Wins does not store portal passwords, log in for you, or claim automatic docket access. Import a docket sheet or record entries manually; extracted dates require confirmation.
        </div>
        <div className="mb-3 flex flex-wrap items-end gap-2">
          <select className="rounded-md border bg-background px-3 py-2 text-sm" value={importDoc} onChange={(e) => setImportDoc(e.target.value)}><option value="">— import docket sheet from document —</option>{documents.map((d) => <option key={d.id} value={d.id}>{d.label}</option>)}</select>
          <Button size="sm" variant="outline" onClick={() => run(() => importDocketSheet(caseId, importDoc || null))} disabled={pending}><Sparkles size={15} /> AI import (→ queue)</Button>
          <Button size="sm" variant={open ? 'subtle' : 'primary'} onClick={() => setOpen(!open)}><Plus size={15} /> Manual entry</Button>
        </div>
        {open && (
          <div className="mb-3 grid gap-2 rounded-lg border bg-card p-4 sm:grid-cols-4">
            <input className="rounded-md border bg-background px-3 py-2 text-sm sm:col-span-4" placeholder="Entry title *" value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} />
            <input className="rounded-md border bg-background px-3 py-2 text-sm" placeholder="Entry #" value={f.entryNumber} onChange={(e) => setF({ ...f, entryNumber: e.target.value })} />
            <input className="rounded-md border bg-background px-3 py-2 text-sm" placeholder="Doc #" value={f.documentNumber} onChange={(e) => setF({ ...f, documentNumber: e.target.value })} />
            <input className="rounded-md border bg-background px-3 py-2 text-sm" placeholder="Filing party" value={f.filingParty} onChange={(e) => setF({ ...f, filingParty: e.target.value })} />
            <Button size="sm" onClick={() => f.title && run(async () => { setErr(null); try { await createDocketEntry(caseId, { title: f.title, entryNumber: f.entryNumber || undefined, documentNumber: f.documentNumber || undefined, filingParty: f.filingParty || undefined }); setF({ title: '', entryNumber: '', documentNumber: '', filingParty: '' }); setOpen(false); } catch (e) { setErr((e as Error).message); } })} disabled={pending}>Add</Button>
          </div>
        )}
        {err && <p className="mb-2 text-sm text-[hsl(var(--disputed))]">{err}</p>}
        {entries.length === 0 ? <Empty msg="No docket entries yet. Import a sheet (proposals go to the queue) or add manually." /> : (
          <div className="space-y-2">
            {entries.map((e) => (
              <div key={e.id} className="flex flex-wrap items-center gap-2 rounded-lg border bg-card p-3 text-sm">
                {e.entryNumber && <span className="rounded bg-muted px-1.5 py-0.5 text-xs">#{e.entryNumber}</span>}
                <span className="font-medium">{e.title}</span>
                {e.filingParty && <span className="text-xs text-muted-foreground">{e.filingParty}</span>}
                <TrustBadge status={e.verificationStatus} />
                <span className="ml-auto text-xs text-muted-foreground">{e.filingDate ? formatDate(e.filingDate) : formatDate(e.createdAt)}</span>
              </div>
            ))}
          </div>
        )}
      </section>
      <section>
        <h2 className="mb-2 text-base font-semibold">Monitoring</h2>
        <div className="flex flex-wrap items-center gap-2 rounded-lg border bg-card p-3 text-sm">
          <select className="rounded-md border bg-background px-2 py-1.5 text-sm" value={mon.provider} onChange={(e) => setMon({ ...mon, provider: e.target.value })}>{['manual', 'pacer-external', 'peachcourt-external', 'public'].map((p) => <option key={p} value={p}>{humanize(p)}</option>)}</select>
          <select className="rounded-md border bg-background px-2 py-1.5 text-sm" value={mon.schedule} onChange={(e) => setMon({ ...mon, schedule: e.target.value })}>{DOCKET_MONITOR_SCHEDULES.map((s) => <option key={s} value={s}>{humanize(s)}</option>)}</select>
          <Button size="sm" variant="outline" onClick={() => run(() => setDocketMonitor(caseId, mon.provider, mon.schedule))} disabled={pending}>Save</Button>
          {monitor && <span className={`ml-auto rounded px-2 py-0.5 text-xs ${monitor.status === 'manual-only' ? 'bg-muted text-muted-foreground' : 'bg-[hsl(var(--unverified)/0.15)] text-[hsl(var(--unverified))]'}`}>{humanize(monitor.status)}</span>}
        </div>
        <p className="mt-1 text-xs text-muted-foreground">No authorized live monitoring provider is wired — non-manual providers show as unavailable, and the app shows the external portal workflow instead of pretending monitoring is active.</p>
      </section>
    </div>
  );
}

/* ------------------------------------------------------------ Companion Devices */
export function CompanionDevicesClient({ devices }: { devices: any[] }) {
  const { pending, run } = useAct();
  const [code, setCode] = useState<{ code: string; expiresAt: string } | null>(null);
  const [, start] = useTransition();
  const makeCode = () => start(async () => { const c = await createDeviceCode(); setCode(c); });
  return (
    <div>
      <div className="mb-4 rounded-lg border bg-card p-4">
        <h2 className="text-sm font-semibold">Register a Mac companion</h2>
        <p className="mt-1 text-xs text-muted-foreground">Create a one-time code, then in the companion (or reference agent) run registration. The token is device-scoped, stored hashed server-side, and revocable here. Your password is never handled by the companion.</p>
        <div className="mt-2 flex items-center gap-2">
          <Button size="sm" onClick={makeCode} disabled={pending}>Create registration code</Button>
          {code && <code className="rounded bg-muted px-2 py-1 text-sm">{code.code}</code>}
        </div>
        {code && <p className="mt-2 text-xs text-muted-foreground">Expires {formatDateTime(code.expiresAt)}. Reference agent: <code className="rounded bg-muted px-1">node scripts/companion-agent.mjs register {code.code}</code></p>}
      </div>
      {devices.length === 0 ? <Empty msg="No companion devices registered." /> : (
        <div className="space-y-2">
          {devices.map((d) => (
            <div key={d.id} className="flex items-center gap-2 rounded-lg border bg-card p-3 text-sm">
              <span className="font-medium">{d.deviceName}</span><span className="text-xs text-muted-foreground">registered {formatDate(d.registeredAt)}</span>
              {d.revokedAt ? <span className="ml-auto text-xs text-muted-foreground">revoked</span> : <Button size="sm" variant="outline" className="ml-auto" onClick={() => run(() => revokeDevice(d.id))} disabled={pending}>Revoke</Button>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------ AI Privacy + 2FA */
export function AiPrivacyClient({ caseId, setting, twoFactorEnabled }: { caseId: string; setting: any | null; twoFactorEnabled: boolean }) {
  const { pending, run } = useAct();
  const [mode, setMode] = useState(setting?.mode || 'manual');
  const [allowConf, setAllowConf] = useState(setting?.allowConfidential ?? false);
  const [recovery, setRecovery] = useState<string[] | null>(null);
  const [, start] = useTransition();
  const doEnroll = () => start(async () => { const r = await enroll2FA(); setRecovery(r.recoveryCodes); });
  return (
    <div className="space-y-6">
      <section>
        <h2 className="mb-2 text-base font-semibold">AI privacy (this case)</h2>
        <div className="grid gap-3 rounded-lg border bg-card p-4">
          <label className="text-sm"><span className="mb-1 block text-xs text-muted-foreground">Case AI mode</span>
            <select className="w-full rounded-md border bg-background px-3 py-2" value={mode} onChange={(e) => setMode(e.target.value)}>{AI_CASE_MODES.map((m) => <option key={m} value={m}>{humanize(m)}</option>)}</select>
          </label>
          <label className="flex items-center gap-1.5 text-sm text-muted-foreground"><input type="checkbox" checked={allowConf} onChange={(e) => setAllowConf(e.target.checked)} /> Allow confidential documents to be sent to configured providers</label>
          <p className="text-xs text-muted-foreground">Conservative default: <strong>manual</strong> mode, confidential documents excluded. Nothing is sent to any AI provider without a configured provider and an explicit action.</p>
          <div><Button size="sm" onClick={() => run(() => setCaseAiMode(caseId, mode, allowConf, []))} disabled={pending}>Save</Button></div>
        </div>
      </section>
      <section>
        <h2 className="mb-2 text-base font-semibold">Two-factor authentication</h2>
        <div className="rounded-lg border bg-card p-4 text-sm">
          <div className="flex items-center gap-2">
            <ShieldCheck size={16} className={twoFactorEnabled ? 'text-[hsl(var(--confirmed))]' : 'text-muted-foreground'} />
            <span>{twoFactorEnabled ? '2FA enabled' : '2FA not enabled'}</span>
            <span className="ml-auto flex gap-2">
              <Button size="sm" variant="outline" onClick={doEnroll} disabled={pending}>Enroll (generate secret + codes)</Button>
              {!twoFactorEnabled && <Button size="sm" onClick={() => run(() => enable2FA())} disabled={pending}>Enable</Button>}
            </span>
          </div>
          {recovery && (
            <div className="mt-3 rounded-md bg-muted p-3">
              <p className="text-xs font-semibold text-[hsl(var(--unverified))]">Recovery codes (shown once — store safely):</p>
              <div className="mt-1 grid grid-cols-2 gap-1 font-mono text-xs sm:grid-cols-4">{recovery.map((c) => <span key={c}>{c}</span>)}</div>
            </div>
          )}
          <p className="mt-2 text-xs text-muted-foreground">Scaffolding: TOTP secret + hashed recovery codes are stored server-side. Full verification + forced re-auth for sensitive operations (permanent delete, full export, credential changes, restore) is designed in docs/SECURITY.md and wired when production auth replaces dev-mode.</p>
        </div>
      </section>
    </div>
  );
}
