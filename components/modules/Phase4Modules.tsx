import { prisma } from '@/lib/prisma';
import { PageHeading } from '@/components/PageHeading';
import { SearchClient } from '@/components/phase4/SearchClient';
import {
  ExhibitsClient, BinderClient, CalendarClient, NotificationsClient, BackupClient,
  ExportClient, TrashClient, SecurityClient, DiagnosticsClient, CompanionClient,
} from '@/components/phase4/Phase4Clients';
import { integrationsWithStatus } from '@/lib/integrations/registry';

export function SearchModule({ caseId }: { caseId: string }) {
  return (
    <div>
      <PageHeading title="Universal Search" description="Search this case or all your cases. Results are scoped to your account; confidential records are excluded unless you opt in; secrets are never indexed." />
      <SearchClient caseId={caseId} />
    </div>
  );
}

export async function ExhibitsModule({ caseId }: { caseId: string }) {
  const [sets, bates] = await Promise.all([
    prisma.exhibitSet.findMany({ where: { caseId }, orderBy: { createdAt: 'desc' }, include: { items: { select: { id: true } } } }),
    prisma.batesJob.findMany({ where: { caseId }, orderBy: { createdAt: 'desc' }, take: 10 }),
  ]);
  return (
    <div>
      <PageHeading title="Exhibit Builder" description="Assemble source documents and page ranges into exhibits without altering originals. Bates numbering creates a derivative." />
      <ExhibitsClient caseId={caseId}
        sets={sets.map((s) => ({ id: s.id, title: s.title, kind: s.kind, numberingStyle: s.numberingStyle, itemCount: s.items.length }))}
        batesJobs={bates.map((b) => ({ id: b.id, firstNumber: b.firstNumber, lastNumber: b.lastNumber, totalPages: b.totalPages, createdAt: b.createdAt.toISOString() }))} />
    </div>
  );
}

export async function BinderModule({ caseId }: { caseId: string }) {
  const binders = await prisma.binder.findMany({ where: { caseId }, orderBy: { createdAt: 'desc' }, include: { sections: { include: { items: { select: { id: true } } } } } });
  return (
    <div>
      <PageHeading title="Binder Builder" description="Assemble a bookmarked binder (hearing, motion, evidence, …). Validates source availability; exports as a structured manifest package." />
      <BinderClient caseId={caseId} binders={binders.map((b) => ({ id: b.id, title: b.title, kind: b.kind, sectionCount: b.sections.length, itemCount: b.sections.reduce((n, s) => n + s.items.length, 0) }))} />
    </div>
  );
}

export async function CalendarModule({ caseId }: { caseId: string }) {
  const [connections, deadlines] = await Promise.all([
    prisma.calendarConnection.findMany({}),
    prisma.deadline.findMany({ where: { caseId }, orderBy: { dueDate: 'asc' }, include: { calendarLinks: { where: { status: 'synced' }, select: { id: true } } } }),
  ]);
  return (
    <div>
      <PageHeading title="Calendar" description="Connect Apple/Google/Outlook (mock in this build). Only confirmed deadlines and hearings can be synced." />
      <CalendarClient caseId={caseId}
        connections={connections.map((c) => ({ provider: c.provider, status: c.status }))}
        deadlines={deadlines.map((d) => ({ id: d.id, title: d.title, dueDate: d.dueDate?.toISOString() ?? null, verificationStatus: d.verificationStatus, synced: d.calendarLinks.length > 0 }))} />
    </div>
  );
}

export async function NotificationsModule({ caseId }: { caseId: string }) {
  const [pref, notifications, digest] = await Promise.all([
    prisma.notificationPreference.findFirst({ where: { scope: 'global' } }),
    prisma.notification.findMany({ where: { caseId }, orderBy: { createdAt: 'desc' }, take: 30 }),
    prisma.notificationDigest.findFirst({ orderBy: { createdAt: 'desc' } }),
  ]);
  return (
    <div>
      <PageHeading title="Notifications" description="Dashboard/email/digest channels (email & push are mock). Reminders fire for confirmed upcoming deadlines and are deduplicated." />
      <NotificationsClient caseId={caseId}
        prefs={pref ? JSON.parse(pref.channels) : null}
        notifications={notifications.map((n) => ({ id: n.id, title: n.title, priority: n.priority, status: n.status }))}
        digest={digest ? { period: digest.period, createdAt: digest.createdAt.toISOString(), content: JSON.parse(digest.content) } : null} />
    </div>
  );
}

export async function BackupModule() {
  const backups = await prisma.backup.findMany({ orderBy: { startedAt: 'desc' }, take: 20 });
  return (
    <div>
      <PageHeading title="Backup &amp; Recovery" description="Create, verify, and preview-restore backups. A backup isn't complete until verified (checksum + encryption + restore test)." />
      <BackupClient backups={backups.map((b) => ({ id: b.id, type: b.type, status: b.status, encrypted: b.encrypted, verifiedAt: b.verifiedAt?.toISOString() ?? null, restoreTestStatus: b.restoreTestStatus }))} />
    </div>
  );
}

export async function ExportModule({ caseId }: { caseId: string }) {
  const [confidentialCount, exports] = await Promise.all([
    prisma.communication.count({ where: { caseId, confidentiality: { not: 'public' } } }).then(async (c) => c + await prisma.strategyItem.count({ where: { caseId } })),
    prisma.caseExport.findMany({ where: { caseId }, orderBy: { createdAt: 'desc' }, take: 10 }),
  ]);
  return (
    <div>
      <PageHeading title="Full Case Export" description="Export a portable case archive (structured folders + JSON + manifest). Review confidential materials before exporting." />
      <ExportClient caseId={caseId} confidentialCount={confidentialCount} exports={exports.map((x) => ({ id: x.id, scope: x.scope, includesConfidential: x.includesConfidential }))} />
    </div>
  );
}

export async function TrashModule({ caseId }: { caseId: string }) {
  const [docs, evidence, filings, comms] = await Promise.all([
    prisma.document.findMany({ where: { caseId, deletedAt: { not: null } } }),
    prisma.evidenceItem.findMany({ where: { caseId, deletedAt: { not: null } } }),
    prisma.filing.findMany({ where: { caseId, deletedAt: { not: null } } }),
    prisma.communication.findMany({ where: { caseId, deletedAt: { not: null } } }),
  ]);
  const items = [
    ...docs.map((d) => ({ entity: 'document', id: d.id, label: d.title || d.standardizedName, deletedAt: d.deletedAt!.toISOString() })),
    ...evidence.map((e) => ({ entity: 'evidence', id: e.id, label: e.title, deletedAt: e.deletedAt!.toISOString() })),
    ...filings.map((f) => ({ entity: 'filing', id: f.id, label: f.title, deletedAt: f.deletedAt!.toISOString() })),
    ...comms.map((c) => ({ entity: 'communication', id: c.id, label: c.subject || c.kind, deletedAt: c.deletedAt!.toISOString() })),
  ];
  return (
    <div>
      <PageHeading title="Trash &amp; Restore" description="Soft-deleted records, recoverable for 30 days. Permanent deletion requires typing DELETE and only removes the app record — not external files." />
      <TrashClient caseId={caseId} items={items} />
    </div>
  );
}

export async function SecurityModule() {
  const [events, sessions] = await Promise.all([
    prisma.securityEvent.findMany({ orderBy: { createdAt: 'desc' }, take: 40 }),
    prisma.appSession.findMany({ orderBy: { lastActiveAt: 'desc' }, take: 20 }),
  ]);
  return (
    <div>
      <PageHeading title="Security" description="Security events and active sessions. Secrets are stored server-side only and never returned to the browser." />
      <SecurityClient sessions={sessions.map((s) => ({ id: s.id, device: s.device, ip: s.ip, lastActiveAt: s.lastActiveAt.toISOString(), revokedAt: s.revokedAt?.toISOString() ?? null }))} />
      <h2 className="mb-2 mt-6 text-base font-semibold">Security events</h2>
      {events.length === 0 ? <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">No security events yet.</p> : (
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full min-w-[520px] text-sm">
            <thead className="bg-muted/60 text-left text-xs uppercase tracking-wide text-muted-foreground"><tr><th className="px-3 py-2">When</th><th className="px-3 py-2">Type</th><th className="px-3 py-2">Detail</th></tr></thead>
            <tbody>{events.map((e) => <tr key={e.id} className="border-t"><td className="whitespace-nowrap px-3 py-2 text-muted-foreground">{e.createdAt.toLocaleString()}</td><td className="px-3 py-2 font-mono text-xs">{e.type}</td><td className="px-3 py-2 text-muted-foreground">{e.detail}</td></tr>)}</tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export async function DiagnosticsModule() {
  const integrations = integrationsWithStatus();
  return (
    <div>
      <PageHeading title="Integration Diagnostics" description="Live status and a test-connection action per integration. Mocked integrations are never labeled connected." />
      <DiagnosticsClient integrations={integrations.map((i) => ({ key: i.key, name: i.name, purpose: i.purpose, status: i.status }))} />
    </div>
  );
}

export async function CompanionModule() {
  const folders = await prisma.selectedFolder.findMany({ orderBy: { createdAt: 'desc' } });
  return (
    <div>
      <PageHeading title="iCloud / Local File Companion" description="Companion-app protocol (mock). Design specification in docs/; no real folder is monitored yet." />
      <CompanionClient folders={folders.map((f) => ({ id: f.id, provider: f.provider, path: f.path, status: f.status }))} />
    </div>
  );
}

export async function HealthModule() {
  const [dbCases, lastBackup, failedJobs, searchEntries, secEvents] = await Promise.all([
    prisma.case.count(),
    prisma.backup.findFirst({ where: { status: 'completed' }, orderBy: { startedAt: 'desc' } }),
    prisma.backgroundJob.count({ where: { status: 'failed' } }),
    prisma.searchIndexEntry.count(),
    prisma.securityEvent.count(),
  ]);
  const rows = [
    ['Database', 'ok', `${dbCases} cases`],
    ['Search index', searchEntries > 0 ? 'ok' : 'empty', `${searchEntries} entries`],
    ['Last successful backup', lastBackup ? 'ok' : 'none', lastBackup ? lastBackup.startedAt.toLocaleString() : 'no backups yet'],
    ['Restore test', lastBackup?.restoreTestStatus === 'passed' ? 'ok' : 'untested', lastBackup?.restoreTestStatus ?? '—'],
    ['Background jobs', failedJobs === 0 ? 'ok' : 'degraded', `${failedJobs} failed`],
    ['Security events', 'ok', `${secEvents} recorded`],
    ['App / schema version', 'ok', 'v0.1.0 / phase4'],
  ] as const;
  return (
    <div>
      <PageHeading title="System Health" description="Operational status of the database, search index, backups, jobs, and security. Restrained and factual — not an analytics dashboard." />
      <div className="overflow-hidden rounded-lg border">
        <table className="w-full text-sm">
          <tbody>
            {rows.map(([label, status, detail]) => (
              <tr key={label} className="border-t first:border-t-0">
                <td className="px-4 py-2.5 font-medium">{label}</td>
                <td className="px-4 py-2.5"><span className={`rounded-full px-2 py-0.5 text-xs ${status === 'ok' ? 'bg-[hsl(var(--confirmed)/0.15)] text-[hsl(var(--confirmed))]' : status === 'degraded' ? 'bg-[hsl(var(--disputed)/0.15)] text-[hsl(var(--disputed))]' : 'bg-[hsl(var(--unverified)/0.15)] text-[hsl(var(--unverified))]'}`}>{status}</span></td>
                <td className="px-4 py-2.5 text-muted-foreground">{detail}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
