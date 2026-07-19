import { notFound } from 'next/navigation';
import { getCaseOrThrow } from '@/lib/services/cases';
import { labelForSlug } from '@/lib/navigation';
import { EmptyState } from '@/components/EmptyState';
import { PageHeading } from '@/components/PageHeading';
import { DocumentsModule } from '@/components/modules/DocumentsModule';
import { ReviewQueueModule } from '@/components/modules/ReviewQueueModule';
import { TimelineModule } from '@/components/modules/TimelineModule';
import { DeadlinesModule } from '@/components/modules/DeadlinesModule';
import { AIWorkspaceModule } from '@/components/modules/AIWorkspaceModule';
import { IntegrationsModule } from '@/components/modules/IntegrationsModule';

export const dynamic = 'force-dynamic';

const DOC_CATEGORY_TITLES: Record<string, string> = {
  drafts: 'Drafts',
  filed: 'Filed Documents',
  orders: 'Orders',
  correspondence: 'Correspondence',
  research: 'Research',
};

export default async function CaseSection({
  params,
}: {
  params: Promise<{ id: string; section: string[] }>;
}) {
  const { id, section } = await params;
  try {
    await getCaseOrThrow(id);
  } catch {
    notFound();
  }
  const slug = section.join('/');

  // ---- Modules with real functionality ----
  if (slug === 'documents') return <DocumentsModule caseId={id} title="All Documents" />;
  if (slug.startsWith('documents/') && DOC_CATEGORY_TITLES[section[1]!]) {
    const cat = section[1]!;
    return <DocumentsModule caseId={id} category={cat} title={DOC_CATEGORY_TITLES[cat]!} />;
  }
  if (slug === 'review-queue')
    return (
      <ReviewQueueModule
        caseId={id}
        title="Document Review Queue"
        description="Documents whose automatic classification was uncertain. Approve, or open the document to reclassify."
      />
    );
  if (slug === 'verification-queue')
    return (
      <ReviewQueueModule
        caseId={id}
        title="Verification Queue"
        description="Proposed items awaiting your confirmation. Deadlines, hearing dates, and legal conclusions must always be verified here."
      />
    );
  if (slug === 'timeline') return <TimelineModule caseId={id} />;
  if (slug === 'deadlines') return <DeadlinesModule caseId={id} />;
  if (slug === 'ai') return <AIWorkspaceModule caseId={id} />;
  if (slug === 'integrations') return <IntegrationsModule />;

  // ---- Known nav sections without a dedicated module yet: polished empty state ----
  const label = labelForSlug(slug);
  if (label) {
    return (
      <div>
        <PageHeading title={label} />
        <EmptyState
          title={`${label} — coming soon`}
          description="This section is part of the case workspace architecture. Its dedicated module isn't built yet in this vertical slice."
          hint="The route, navigation, and data model support it — it's queued for a later build phase."
        />
      </div>
    );
  }

  notFound();
}
