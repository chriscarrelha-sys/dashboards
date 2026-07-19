import Link from 'next/link';
import { notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth/session';
import { TrustBadge } from '@/components/ui/badge';
import { ElementsMatrix, type ElementView } from '@/components/phase2/ElementsMatrix';
import { humanize } from '@/lib/enums';
import type { VerificationStatus } from '@/lib/enums';
import { ArrowLeft } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function LegalIssueDetail({
  params,
}: {
  params: Promise<{ id: string; issueId: string }>;
}) {
  const { id, issueId } = await params;
  const user = await getCurrentUser();
  const issue = await prisma.legalIssue.findFirst({
    where: { id: issueId, caseId: id, case: { userId: user.id } },
    include: {
      elements: { orderBy: { number: 'asc' } },
      evidenceLinks: { include: { evidence: { select: { id: true, title: true } } } },
      authorityLinks: { include: { authority: true } },
    },
  });
  if (!issue) notFound();

  const allEvidence = await prisma.evidenceItem.findMany({
    where: { caseId: id }, select: { id: true, title: true }, orderBy: { updatedAt: 'desc' },
  });

  // Group evidence links by element + relation for the matrix.
  const byElement = new Map<string, { supporting: { id: string; title: string }[]; adverse: { id: string; title: string }[] }>();
  const issueLevel = { supporting: [] as { id: string; title: string }[], adverse: [] as { id: string; title: string }[] };
  for (const link of issue.evidenceLinks) {
    const ev = { id: link.evidence.id, title: link.evidence.title };
    const bucket = link.relation === 'adverse' ? 'adverse' : 'supporting';
    if (link.elementId) {
      if (!byElement.has(link.elementId)) byElement.set(link.elementId, { supporting: [], adverse: [] });
      byElement.get(link.elementId)![bucket].push(ev);
    } else {
      issueLevel[bucket].push(ev);
    }
  }

  const elements: ElementView[] = issue.elements.map((el) => ({
    id: el.id, number: el.number, title: el.title, standard: el.standard, status: el.status,
    supporting: byElement.get(el.id)?.supporting ?? [],
    adverse: byElement.get(el.id)?.adverse ?? [],
  }));

  return (
    <div>
      <Link href={`/case/${id}/claims`} className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft size={14} /> Legal issues
      </Link>

      <div className="mb-6 border-b pb-5">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-xl font-semibold">{issue.title}</h1>
          <span className="rounded bg-muted px-2 py-0.5 text-xs text-muted-foreground">{humanize(issue.issueType)}</span>
          <TrustBadge status={issue.verificationStatus as VerificationStatus} />
        </div>
        <dl className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
          {issue.assertingParty && <span>Asserting: {issue.assertingParty}</span>}
          {issue.standard && <span>Standard: {issue.standard}</span>}
          {issue.requestedRelief && <span>Relief: {issue.requestedRelief}</span>}
          <span>Status: {humanize(issue.status)}</span>
        </dl>
      </div>

      <ElementsMatrix caseId={id} legalIssueId={issueId} elements={elements} allEvidence={allEvidence} />

      {(issueLevel.supporting.length > 0 || issueLevel.adverse.length > 0) && (
        <div className="mt-6">
          <h2 className="mb-2 text-base font-semibold">Issue-level evidence (not tied to a specific element)</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <IssueEvidence caseId={id} label="Supporting" tone="confirmed" items={issueLevel.supporting} />
            <IssueEvidence caseId={id} label="Adverse" tone="disputed" items={issueLevel.adverse} />
          </div>
        </div>
      )}

      {issue.authorityLinks.length > 0 && (
        <div className="mt-6">
          <h2 className="mb-2 text-base font-semibold">Authorities</h2>
          <ul className="space-y-1 text-sm">
            {issue.authorityLinks.map((al) => (
              <li key={al.id} className="flex items-center gap-2">
                <span className="font-mono">{al.authority.citation}</span>
                <TrustBadge status={al.authority.verificationStatus as VerificationStatus} />
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function IssueEvidence({ caseId, label, tone, items }: { caseId: string; label: string; tone: string; items: { id: string; title: string }[] }) {
  return (
    <div className="rounded-lg border bg-card p-3">
      <div className={`text-xs font-semibold text-[hsl(var(--${tone}))]`}>{label}</div>
      {items.length ? (
        <ul className="mt-1 space-y-0.5">
          {items.map((e) => <li key={e.id}><Link href={`/case/${caseId}/evidence`} className="text-sm hover:underline">{e.title}</Link></li>)}
        </ul>
      ) : <p className="mt-1 text-xs text-muted-foreground">None.</p>}
    </div>
  );
}
