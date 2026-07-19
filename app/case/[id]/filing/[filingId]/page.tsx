import Link from 'next/link';
import { notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth/session';
import { FilingDetail } from '@/components/phase3/FilingDetail';
import { ArrowLeft } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function FilingPage({ params }: { params: Promise<{ id: string; filingId: string }> }) {
  const { id, filingId } = await params;
  const user = await getCurrentUser();
  const filing = await prisma.filing.findFirst({
    where: { id: filingId, caseId: id, case: { userId: user.id } },
    include: {
      stageHistory: { orderBy: { createdAt: 'asc' } },
      legalIssueLinks: { include: { legalIssue: { select: { id: true, title: true } } } },
      evidenceLinks: { include: { evidence: { select: { id: true, title: true } } } },
      authorityLinks: { include: { authority: { select: { id: true, citation: true, verificationStatus: true } } } },
      discoveryLinks: { include: { discoveryRequest: { select: { id: true, title: true, shortTitle: true } } } },
      documentLinks: { include: { document: { select: { id: true, title: true, standardizedName: true } } } },
      checklistItems: { orderBy: { createdAt: 'asc' } },
      versions: { orderBy: { versionNumber: 'asc' } },
      submissions: { orderBy: { createdAt: 'desc' } },
      certificates: { orderBy: { createdAt: 'desc' } },
      serviceEvents: { orderBy: { createdAt: 'desc' } },
      packages: { include: { items: { orderBy: { order: 'asc' } } } },
      aiDraftRuns: { orderBy: { createdAt: 'desc' } },
      draftReviewIssues: { orderBy: { createdAt: 'desc' } },
    },
  });
  if (!filing) notFound();

  // Option lists for linking (case-scoped).
  const [issues, evidence, authorities, discovery, documents, recipients] = await Promise.all([
    prisma.legalIssue.findMany({ where: { caseId: id }, select: { id: true, title: true } }),
    prisma.evidenceItem.findMany({ where: { caseId: id }, select: { id: true, title: true } }),
    prisma.authority.findMany({ where: { caseId: id }, select: { id: true, citation: true } }),
    prisma.discoveryRequest.findMany({ where: { caseId: id }, select: { id: true, title: true, shortTitle: true } }),
    prisma.document.findMany({ where: { caseId: id }, select: { id: true, title: true, standardizedName: true } }),
    prisma.serviceRecipient.findMany({ where: { caseId: id }, select: { id: true, name: true } }),
  ]);

  const data = {
    id: filing.id,
    title: filing.title,
    filingType: filing.filingType,
    filingParty: filing.filingParty,
    stage: filing.stage,
    dueDate: filing.dueDate ? filing.dueDate.toISOString() : null,
    requestedRelief: filing.requestedRelief,
    portalUrl: filing.portalUrl,
    docketNumber: filing.docketNumber,
    stageHistory: filing.stageHistory.map((h) => ({ toStage: h.toStage, note: h.note, at: h.createdAt.toISOString() })),
    links: {
      issues: filing.legalIssueLinks.map((l) => ({ linkId: l.id, id: l.legalIssue.id, label: l.legalIssue.title })),
      evidence: filing.evidenceLinks.map((l) => ({ linkId: l.id, id: l.evidence.id, label: l.evidence.title, relation: l.relation })),
      authorities: filing.authorityLinks.map((l) => ({ linkId: l.id, id: l.authority.id, label: l.authority.citation, verificationStatus: l.authority.verificationStatus })),
      discovery: filing.discoveryLinks.map((l) => ({ linkId: l.id, id: l.discoveryRequest.id, label: l.discoveryRequest.shortTitle || l.discoveryRequest.title })),
      documents: filing.documentLinks.map((l) => ({ linkId: l.id, id: l.document.id, label: l.document.title || l.document.standardizedName, role: l.role })),
    },
    checklist: filing.checklistItems.map((c) => ({ id: c.id, category: c.category, label: c.label, status: c.status, isWarning: c.isWarning, overrideReason: c.overrideReason })),
    versions: filing.versions.map((v) => ({ id: v.id, versionNumber: v.versionNumber, label: v.label, approvalStatus: v.approvalStatus, changesSummary: v.changesSummary, createdAt: v.createdAt.toISOString(), hasContent: !!v.contentText })),
    submissions: filing.submissions.map((s) => ({ id: s.id, portal: s.portal, status: s.status, confirmationNumber: s.confirmationNumber, docketNumber: s.docketNumber, submittedAt: s.submittedAt?.toISOString() ?? null })),
    certificates: filing.certificates.map((c) => ({ id: c.id, statementText: c.statementText, filedStatus: c.filedStatus, verificationStatus: c.verificationStatus })),
    serviceEvents: filing.serviceEvents.map((s) => ({ id: s.id, recipientName: s.recipientName, method: s.serviceMethod, date: s.serviceDate?.toISOString() ?? null, deliveryStatus: s.deliveryStatus })),
    packages: filing.packages.map((p) => ({ id: p.id, title: p.title, itemCount: p.items.length })),
    aiDraftRuns: filing.aiDraftRuns.map((r) => ({ id: r.id, task: r.task, provider: r.provider, sourceScope: r.sourceScope, output: r.output, createdAt: r.createdAt.toISOString() })),
    reviewIssues: filing.draftReviewIssues.map((r) => ({ id: r.id, issueType: r.issueType, explanation: r.explanation, severity: r.severity, status: r.status })),
  };

  const options = {
    issues: issues.map((x) => ({ id: x.id, label: x.title })),
    evidence: evidence.map((x) => ({ id: x.id, label: x.title })),
    authorities: authorities.map((x) => ({ id: x.id, label: x.citation })),
    discovery: discovery.map((x) => ({ id: x.id, label: x.shortTitle || x.title })),
    documents: documents.map((x) => ({ id: x.id, label: x.title || x.standardizedName })),
    recipients: recipients.map((x) => ({ id: x.id, label: x.name })),
  };

  return (
    <div>
      <Link href={`/case/${id}/filing-workspace`} className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft size={14} /> Filing Workspace
      </Link>
      <FilingDetail caseId={id} data={data} options={options} />
    </div>
  );
}
