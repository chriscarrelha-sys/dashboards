import { prisma } from '@/lib/prisma';
import { PageHeading } from '@/components/PageHeading';
import {
  DeficienciesClient, MeetConferClient, WitnessesClient, SubpoenasClient,
} from '@/components/phase2/SimpleModules';

export async function DeficienciesModule({ caseId }: { caseId: string }) {
  const items = await prisma.discoveryDeficiency.findMany({
    where: { caseId }, orderBy: { createdAt: 'desc' },
    include: { discoveryRequest: { select: { shortTitle: true, title: true } } },
  });
  const rows = items.map((d) => ({
    id: d.id, title: d.title, category: d.category, explanation: d.explanation,
    resolutionStatus: d.resolutionStatus, verificationStatus: d.verificationStatus, createdBy: d.createdBy,
    requestTitle: d.discoveryRequest ? (d.discoveryRequest.shortTitle || d.discoveryRequest.title) : null,
    createdAt: d.createdAt.toISOString(),
  }));
  return (
    <div>
      <PageHeading title="Discovery Deficiency Tracker" description="Track deficiencies from proposal → raised → cured, with the governing basis and cure deadline." />
      <DeficienciesClient caseId={caseId} rows={rows} />
    </div>
  );
}

export async function MeetConferModule({ caseId }: { caseId: string }) {
  const items = await prisma.meetAndConferRecord.findMany({ where: { caseId }, orderBy: { createdAt: 'desc' } });
  const rows = items.map((m) => ({
    id: m.id, title: m.title, communicationType: m.communicationType, participants: m.participants,
    summary: m.summary, status: m.status, createdAt: m.createdAt.toISOString(),
  }));
  return (
    <div>
      <PageHeading title="Meet-and-Confer" description="Good-faith conferral records tied to deficiencies and motions to compel." />
      <MeetConferClient caseId={caseId} rows={rows} />
    </div>
  );
}

export async function WitnessesModule({ caseId }: { caseId: string }) {
  const items = await prisma.witness.findMany({
    where: { caseId }, orderBy: { createdAt: 'desc' },
    include: { evidenceItems: { select: { id: true } } },
  });
  const rows = items.map((w) => ({
    id: w.id, name: w.name, role: w.role, party: w.party,
    expectedTestimony: w.expectedTestimony, evidenceCount: w.evidenceItems.length,
  }));
  return (
    <div>
      <PageHeading title="Witnesses" description="Reusable witness records linked to evidence, contradictions, and depositions." />
      <WitnessesClient caseId={caseId} rows={rows} />
    </div>
  );
}

export async function SubpoenasModule({ caseId }: { caseId: string }) {
  const items = await prisma.subpoena.findMany({ where: { caseId }, orderBy: { createdAt: 'desc' } });
  const rows = items.map((s) => ({
    id: s.id, recipient: s.recipient, subpoenaType: s.subpoenaType, requested: s.requested,
    status: s.status, createdAt: s.createdAt.toISOString(),
  }));
  return (
    <div>
      <PageHeading title="Subpoenas" description="Structured subpoena tracking (issuance and service remain manual)." />
      <SubpoenasClient caseId={caseId} rows={rows} />
    </div>
  );
}

export async function AuditModule({ caseId }: { caseId: string }) {
  // Case-scoped audit: entities whose ids belong to this case are hard to filter
  // generically, so we show the most recent audit entries and label them.
  const logs = await prisma.auditLog.findMany({ orderBy: { createdAt: 'desc' }, take: 100 });
  return (
    <div>
      <PageHeading title="Audit History" description="Recent actions: creations, edits, verification approvals/rejections, and AI proposals." />
      {logs.length === 0 ? (
        <p className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">No audit entries yet.</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full min-w-[560px] text-sm">
            <thead className="bg-muted/60 text-left text-xs uppercase tracking-wide text-muted-foreground">
              <tr><th className="px-3 py-2 font-medium">When</th><th className="px-3 py-2 font-medium">Action</th><th className="px-3 py-2 font-medium">Entity</th><th className="px-3 py-2 font-medium">Detail</th></tr>
            </thead>
            <tbody>
              {logs.map((l) => (
                <tr key={l.id} className="border-t">
                  <td className="whitespace-nowrap px-3 py-2 text-muted-foreground">{l.createdAt.toLocaleString()}</td>
                  <td className="px-3 py-2 font-mono text-xs">{l.action}</td>
                  <td className="px-3 py-2 text-muted-foreground">{l.entity ?? '—'}</td>
                  <td className="px-3 py-2 text-muted-foreground">{l.detail ?? ''}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
