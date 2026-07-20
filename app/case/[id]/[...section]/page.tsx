import { notFound } from 'next/navigation';
import { getCaseOrThrow } from '@/lib/services/cases';
import { labelForSlug } from '@/lib/navigation';
import { EmptyState } from '@/components/EmptyState';
import { PageHeading } from '@/components/PageHeading';
import { DocumentsModule } from '@/components/modules/DocumentsModule';
import { TimelineModule } from '@/components/modules/TimelineModule';
import { DeadlinesModule } from '@/components/modules/DeadlinesModule';
import { AIWorkspaceModule } from '@/components/modules/AIWorkspaceModule';
import { IntegrationsModule } from '@/components/modules/IntegrationsModule';
import { EvidenceModule } from '@/components/modules/EvidenceModule';
import { LegalIssuesModule } from '@/components/modules/LegalIssuesModule';
import { ContradictionsModule } from '@/components/modules/ContradictionsModule';
import { AdmissionsModule } from '@/components/modules/AdmissionsModule';
import { DiscoveryModule } from '@/components/modules/DiscoveryModule';
import { VerificationQueueModule } from '@/components/modules/VerificationQueueModule';
import {
  DeficienciesModule, MeetConferModule, WitnessesModule, SubpoenasModule, AuditModule,
} from '@/components/modules/Phase2Modules';
import { FilingWorkspaceModule } from '@/components/modules/FilingWorkspaceModule';
import {
  CommunicationsModule, ServiceModule, ResearchModule, StrategyModule,
  DecisionLogModule, OpposingModule, SettlementModule, DamagesModule, RemediesModule,
} from '@/components/modules/Phase3Modules';
import {
  SearchModule, ExhibitsModule, BinderModule, CalendarModule, NotificationsModule,
  BackupModule, ExportModule, TrashModule, SecurityModule, DiagnosticsModule, CompanionModule, HealthModule,
} from '@/components/modules/Phase4Modules';
import {
  CaseReviewModule, SourceGraphModule, DocketModule, CompanionDevicesModule, AiPrivacyModule,
} from '@/components/modules/Phase5Modules';

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
      <VerificationQueueModule
        caseId={id} onlyDocClassification
        title="Document Review Queue"
        description="Documents whose automatic classification was uncertain. Approve, or open the document to reclassify."
      />
    );
  if (slug === 'verification-queue')
    return (
      <VerificationQueueModule
        caseId={id}
        title="Verification Queue"
        description="Every AI proposal — evidence, contradictions, admissions, legal issues, discovery, deficiencies — awaits your confirmation here. Approving creates the structured record and writes the audit log."
      />
    );
  if (slug === 'timeline') return <TimelineModule caseId={id} />;
  if (slug === 'deadlines') return <DeadlinesModule caseId={id} />;
  if (slug === 'ai') return <AIWorkspaceModule caseId={id} />;
  if (slug === 'integrations') return <IntegrationsModule />;

  // ---- Phase 2 modules ----
  if (slug === 'evidence') return <EvidenceModule caseId={id} />;
  if (slug === 'contradictions') return <ContradictionsModule caseId={id} />;
  if (slug === 'admissions') return <AdmissionsModule caseId={id} />;
  if (slug === 'claims') return <LegalIssuesModule caseId={id} issueType="claim" title="Claims" />;
  if (slug === 'counterclaims') return <LegalIssuesModule caseId={id} issueType="counterclaim" title="Counterclaims" />;
  if (slug === 'defenses') return <LegalIssuesModule caseId={id} issueType="defense" title="Defenses" />;
  if (slug === 'affirmative-defenses') return <LegalIssuesModule caseId={id} issueType="affirmative-defense" title="Affirmative Defenses" />;
  if (slug === 'procedural-issues') return <LegalIssuesModule caseId={id} issueType="procedural" title="Procedural Issues" />;
  if (slug === 'discovery') return <DiscoveryModule caseId={id} />;
  if (slug === 'discovery/deficiencies') return <DeficienciesModule caseId={id} />;
  if (slug === 'discovery/meet-confer') return <MeetConferModule caseId={id} />;
  if (slug === 'discovery/subpoenas') return <SubpoenasModule caseId={id} />;
  if (slug === 'people/witnesses' || slug === 'witnesses') return <WitnessesModule caseId={id} />;
  if (slug === 'admin/audit') return <AuditModule caseId={id} />;

  // ---- Phase 3 modules ----
  if (slug === 'filing-workspace' || slug === 'filings/packages') return <FilingWorkspaceModule caseId={id} />;
  if (slug === 'comms/emails' || slug === 'comms/letters' || slug === 'comms/calls') return <CommunicationsModule caseId={id} />;
  if (slug === 'comms/service-history') return <ServiceModule caseId={id} />;
  if (slug === 'research' || slug === 'research/sources' || slug === 'authorities') return <ResearchModule caseId={id} />;
  if (slug === 'strategy' || slug === 'strategy/objectives' || slug === 'strategy/next-moves' || slug === 'strategy/leverage') return <StrategyModule caseId={id} />;
  if (slug === 'strategy/decision-log') return <DecisionLogModule caseId={id} />;
  if (slug === 'strategy/opposing') return <OpposingModule caseId={id} />;
  if (slug === 'strategy/settlement' || slug === 'strategy/negotiation') return <SettlementModule caseId={id} />;
  if (slug === 'strategy/damages') return <DamagesModule caseId={id} />;
  if (slug === 'strategy/remedies') return <RemediesModule caseId={id} />;

  // ---- Phase 4 modules ----
  if (slug === 'search') return <SearchModule caseId={id} />;
  if (slug === 'exhibits') return <ExhibitsModule caseId={id} />;
  if (slug === 'filings/hearing-binders') return <BinderModule caseId={id} />;
  if (slug === 'calendar') return <CalendarModule caseId={id} />;
  if (slug === 'admin/notifications') return <NotificationsModule caseId={id} />;
  if (slug === 'admin/backup') return <BackupModule />;
  if (slug === 'admin/export') return <ExportModule caseId={id} />;
  if (slug === 'admin/trash') return <TrashModule caseId={id} />;
  if (slug === 'admin/security') return <SecurityModule />;
  if (slug === 'admin/diagnostics') return <DiagnosticsModule />;
  if (slug === 'admin/file-locations') return <CompanionModule />;
  if (slug === 'admin/health') return <HealthModule />;

  // ---- Phase 5 modules ----
  if (slug === 'ai/case-review') return <CaseReviewModule caseId={id} />;
  if (slug === 'ai/source-graph') return <SourceGraphModule caseId={id} />;
  if (slug === 'docket') return <DocketModule caseId={id} />;
  if (slug === 'admin/devices') return <CompanionDevicesModule />;
  if (slug === 'admin/ai-privacy') return <AiPrivacyModule caseId={id} />;

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
