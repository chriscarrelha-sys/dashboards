import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth/session';
import { PageHeading } from '@/components/PageHeading';
import { CaseReviewClient, DocketClient, CompanionDevicesClient, AiPrivacyClient } from '@/components/phase5/Phase5Clients';

export async function CaseReviewModule({ caseId }: { caseId: string }) {
  const latest = await prisma.caseReview.findFirst({ where: { caseId }, orderBy: { version: 'desc' } });
  const review = latest ? { version: latest.version, createdAt: latest.createdAt.toISOString(), summary: latest.summary, sections: JSON.parse(latest.sections) } : null;
  return (
    <div>
      <PageHeading title="Advanced Case Review" description="A versioned, source-linked analysis of your confirmed case data — element gaps, adverse evidence, contradictions, procedural risks, and verification needs. Not legal advice; no win-probability score." />
      <CaseReviewClient caseId={caseId} review={review} />
    </div>
  );
}

/** Source Graph — derived from existing relationships, shown as structured lists. */
export async function SourceGraphModule({ caseId }: { caseId: string }) {
  const [evLinks, filingEv, contradictions, filingAuth] = await Promise.all([
    prisma.evidenceLegalIssueLink.findMany({ where: { legalIssue: { caseId } }, include: { evidence: { select: { title: true } }, legalIssue: { select: { title: true } } } }),
    prisma.filingEvidenceLink.findMany({ where: { filing: { caseId } }, include: { filing: { select: { title: true } }, evidence: { select: { title: true } } } }),
    prisma.contradiction.findMany({ where: { caseId }, include: { statements: { include: { document: { select: { title: true, standardizedName: true } } } } } }),
    prisma.filingAuthorityLink.findMany({ where: { filing: { caseId } }, include: { filing: { select: { title: true } }, authority: { select: { citation: true } } } }),
  ]);
  const edges: { from: string; rel: string; to: string }[] = [
    ...evLinks.map((l) => ({ from: l.evidence.title, rel: l.relation === 'adverse' ? 'contradicts' : 'supports', to: l.legalIssue.title })),
    ...filingEv.map((l) => ({ from: l.filing.title, rel: l.relation === 'adverse' ? 'must address' : 'relies on', to: l.evidence.title })),
    ...filingAuth.map((l) => ({ from: l.filing.title, rel: 'cites', to: l.authority.citation })),
    ...contradictions.flatMap((c) => c.statements.filter((s) => s.document).map((s) => ({ from: c.title || c.summary, rel: 'derived from', to: s.document!.title || s.document!.standardizedName }))),
  ];
  return (
    <div>
      <PageHeading title="Case Source Graph" description="Relationships across the case record, shown as structured edges (supports / contradicts / relies on / cites / derived from). Usability over novelty." />
      {edges.length === 0 ? <p className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">No relationships yet. Link evidence to issues and filings to build the graph.</p> : (
        <div className="space-y-1.5">
          {edges.map((e, i) => (
            <div key={i} className="flex flex-wrap items-center gap-2 rounded-lg border bg-card px-3 py-2 text-sm">
              <span className="font-medium">{e.from}</span>
              <span className="rounded bg-[hsl(var(--proposed)/0.12)] px-2 py-0.5 text-xs text-[hsl(var(--proposed))]">{e.rel}</span>
              <span className="text-muted-foreground">{e.to}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export async function DocketModule({ caseId }: { caseId: string }) {
  const [entries, monitor, documents] = await Promise.all([
    prisma.docketEntry.findMany({ where: { caseId }, orderBy: { createdAt: 'desc' } }),
    prisma.docketMonitor.findUnique({ where: { caseId } }),
    prisma.document.findMany({ where: { caseId, deletedAt: null }, select: { id: true, title: true, standardizedName: true } }),
  ]);
  return (
    <div>
      <PageHeading title="Court-Docket Monitoring" description="Record docket entries, import a docket sheet (proposals → Verification Queue), and configure monitoring — without misrepresenting portal capabilities." />
      <DocketClient caseId={caseId}
        entries={entries.map((e) => ({ id: e.id, title: e.title, entryNumber: e.entryNumber, filingParty: e.filingParty, filingDate: e.filingDate?.toISOString() ?? null, verificationStatus: e.verificationStatus, createdAt: e.createdAt.toISOString() }))}
        monitor={monitor ? { provider: monitor.provider, schedule: monitor.schedule, status: monitor.status } : null}
        documents={documents.map((d) => ({ id: d.id, label: d.title || d.standardizedName }))} />
    </div>
  );
}

export async function CompanionDevicesModule() {
  const user = await getCurrentUser();
  const devices = await prisma.companionDevice.findMany({ where: { userId: user.id }, orderBy: { registeredAt: 'desc' } });
  return (
    <div>
      <PageHeading title="Companion Devices" description="Register and revoke Mac companion devices. Tokens are device-scoped and stored hashed; your password is never handled by the companion." />
      <CompanionDevicesClient devices={devices.map((d) => ({ id: d.id, deviceName: d.deviceName, registeredAt: d.registeredAt.toISOString(), revokedAt: d.revokedAt?.toISOString() ?? null }))} />
    </div>
  );
}

export async function AiPrivacyModule({ caseId }: { caseId: string }) {
  const user = await getCurrentUser();
  const [setting, tfa] = await Promise.all([
    prisma.caseAiSetting.findUnique({ where: { caseId } }),
    prisma.twoFactorSecret.findUnique({ where: { userId: user.id } }),
  ]);
  return (
    <div>
      <PageHeading title="AI Privacy & 2FA" description="Per-case AI transmission controls (conservative defaults) and two-factor authentication scaffolding." />
      <AiPrivacyClient caseId={caseId} setting={setting ? { mode: setting.mode, allowConfidential: setting.allowConfidential } : null} twoFactorEnabled={tfa?.enabled ?? false} />
    </div>
  );
}
