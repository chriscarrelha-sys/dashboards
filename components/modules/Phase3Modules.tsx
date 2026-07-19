import { prisma } from '@/lib/prisma';
import { PageHeading } from '@/components/PageHeading';
import {
  CommunicationsClient, ServiceClient, ResearchClient, StrategyClient,
  DecisionLogClient, OpposingClient, SettlementClient, DamagesClient, RemediesClient,
} from '@/components/phase3/Phase3Clients';

export async function CommunicationsModule({ caseId }: { caseId: string }) {
  const rows = await prisma.communication.findMany({ where: { caseId }, orderBy: { occurredAt: 'desc' } });
  return (
    <div>
      <PageHeading title="Communications Center" description="Log emails, letters, calls, and settlement communications. Flag follow-ups and spin them into tasks." />
      <CommunicationsClient caseId={caseId} rows={rows.map((c) => ({ id: c.id, kind: c.kind, direction: c.direction, subject: c.subject, summary: c.summary, settlementComm: c.settlementComm, confidentiality: c.confidentiality, followUpRequired: c.followUpRequired, occurredAt: c.occurredAt?.toISOString() ?? c.createdAt.toISOString() }))} />
    </div>
  );
}

export async function ServiceModule({ caseId }: { caseId: string }) {
  const [recipients, events] = await Promise.all([
    prisma.serviceRecipient.findMany({ where: { caseId }, orderBy: { createdAt: 'desc' } }),
    prisma.serviceEvent.findMany({ where: { caseId }, orderBy: { createdAt: 'desc' } }),
  ]);
  return (
    <div>
      <PageHeading title="Service &amp; Service History" description="Reusable recipient profiles (with last-verified dates) and a full service-event log, mirrored to the timeline." />
      <ServiceClient caseId={caseId}
        recipients={recipients.map((r) => ({ id: r.id, name: r.name, role: r.role, email: r.email, serviceAddress: r.serviceAddress, lastVerified: r.lastVerified?.toISOString() ?? null }))}
        events={events.map((e) => ({ id: e.id, recipientName: e.recipientName, method: e.serviceMethod, date: e.serviceDate?.toISOString() ?? null, deliveryStatus: e.deliveryStatus }))} />
    </div>
  );
}

export async function ResearchModule({ caseId }: { caseId: string }) {
  const [authorities, questions, memos] = await Promise.all([
    prisma.authority.findMany({ where: { caseId }, orderBy: { createdAt: 'desc' } }),
    prisma.researchQuestion.findMany({ where: { caseId }, orderBy: { createdAt: 'desc' } }),
    prisma.researchMemorandum.findMany({ where: { caseId }, orderBy: { createdAt: 'desc' } }),
  ]);
  return (
    <div>
      <PageHeading title="Legal Research" description="Authorities with a verification workflow (unverified until you open the source), research questions, and memoranda." />
      <ResearchClient caseId={caseId}
        authorities={authorities.map((a) => ({ id: a.id, citation: a.citation, proposition: a.proposition, verificationStatus: a.verificationStatus }))}
        questions={questions.map((q) => ({ id: q.id, question: q.question, status: q.status }))}
        memos={memos.map((m) => ({ id: m.id, title: m.title, briefAnswer: m.briefAnswer }))} />
    </div>
  );
}

export async function StrategyModule({ caseId }: { caseId: string }) {
  const items = await prisma.strategyItem.findMany({ where: { caseId }, orderBy: { createdAt: 'desc' } });
  return (
    <div>
      <PageHeading title="Strategy Workspace" description="Source-linked strategy items — objectives, next moves, leverage, vulnerabilities — with supersession and snapshots. Distinct from confirmed facts." />
      <StrategyClient caseId={caseId} items={items.map((s) => ({ id: s.id, recordType: s.recordType, title: s.title, description: s.description, status: s.status, assumptions: s.assumptions, risks: s.risks }))} />
    </div>
  );
}

export async function DecisionLogModule({ caseId }: { caseId: string }) {
  const rows = await prisma.decisionLogEntry.findMany({ where: { caseId }, orderBy: { decidedAt: 'desc' } });
  return (
    <div>
      <PageHeading title="Decision Log" description="Immutable record of strategic/procedural decisions. Supersede rather than edit." />
      <DecisionLogClient caseId={caseId} rows={rows.map((d) => ({ id: d.id, title: d.title, decision: d.decision, rationale: d.rationale, supersededById: d.supersededById, decidedAt: d.decidedAt.toISOString() }))} />
    </div>
  );
}

export async function OpposingModule({ caseId }: { caseId: string }) {
  const rows = await prisma.opposingPosition.findMany({ where: { caseId }, orderBy: { createdAt: 'desc' } });
  return (
    <div>
      <PageHeading title="Opposing Party Positions" description="Track the other side's positions side-by-side with your response and their weaknesses." />
      <OpposingClient caseId={caseId} rows={rows.map((p) => ({ id: p.id, issue: p.issue, party: p.party, positionSummary: p.positionSummary, userResponse: p.userResponse }))} />
    </div>
  );
}

export async function SettlementModule({ caseId }: { caseId: string }) {
  const rows = await prisma.settlementRecord.findMany({ where: { caseId }, orderBy: { createdAt: 'desc' } });
  return (
    <div>
      <PageHeading title="Settlement &amp; Negotiation" description="Distinguish demands, offers, and counteroffers; compare terms. Any value comparison shows its assumptions." />
      <SettlementClient caseId={caseId} rows={rows.map((s) => ({ id: s.id, offerType: s.offerType, direction: s.direction, monetaryAmount: s.monetaryAmount, releaseScope: s.releaseScope, deadline: s.deadline?.toISOString() ?? null, status: s.status }))} />
    </div>
  );
}

export async function DamagesModule({ caseId }: { caseId: string }) {
  const rows = await prisma.damageItem.findMany({ where: { caseId }, orderBy: { createdAt: 'desc' } });
  return (
    <div>
      <PageHeading title="Damages" description="Organize claimed damages by category with calculation methods and assumptions. Organization, not a recoverability determination." />
      <DamagesClient caseId={caseId} rows={rows.map((d) => ({ id: d.id, label: d.label, category: d.category, amount: d.amount, calculationMethod: d.calculationMethod, assumptions: d.assumptions }))} />
    </div>
  );
}

export async function RemediesModule({ caseId }: { caseId: string }) {
  const rows = await prisma.remedy.findMany({ where: { caseId }, orderBy: { createdAt: 'desc' } });
  return (
    <div>
      <PageHeading title="Remedies" description="Requested remedies linked to legal basis and status." />
      <RemediesClient caseId={caseId} rows={rows.map((r) => ({ id: r.id, remedyType: r.remedyType, description: r.description, legalBasis: r.legalBasis, status: r.status }))} />
    </div>
  );
}
