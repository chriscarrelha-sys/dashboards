import Link from "next/link";
import { notFound } from "next/navigation";
import { getAdvisor, advisors } from "@/lib/data/advisors";
import { activitiesForAdvisor } from "@/lib/data/activities";
import { getSequence } from "@/lib/data/sequences";
import { fitScore, openRate, replyRate, temperature } from "@/lib/scoring";
import { formatAum, formatPct, initials } from "@/lib/format";
import { Card, CardHeader, Badge } from "@/components/ui";
import { ResearchPanel } from "@/components/ResearchPanel";
import type { InterestLevel } from "@/lib/types";

export function generateStaticParams() {
  return advisors.map((a) => ({ id: a.id }));
}

const interestTone: Record<InterestLevel, string> = { Hot: "Hot", Warm: "Warm", Cold: "Cold" };

export default function AdvisorDetailPage({ params }: { params: { id: string } }) {
  const a = getAdvisor(params.id);
  if (!a) notFound();

  const timeline = activitiesForAdvisor(a.id);
  const sequence = a.currentSequenceId ? getSequence(a.currentSequenceId) : undefined;
  const currentStep =
    sequence && a.currentStepIndex != null ? sequence.steps[a.currentStepIndex] : undefined;

  return (
    <div>
      {/* Header */}
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-start gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-brand/15 text-lg font-semibold text-brand">
            {initials(a.name)}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-semibold">{a.name}</h1>
              <Badge tone={temperature(a)}>{temperature(a)} · fit {fitScore(a)}</Badge>
            </div>
            <div className="text-sm text-muted">
              {a.title} · {a.firm}
            </div>
            <div className="mt-1 flex flex-wrap gap-1.5">
              {a.tags.map((t) => (
                <Badge key={t} tone="neutral">{t}</Badge>
              ))}
            </div>
          </div>
        </div>
        <Link
          href={`/content-studio?advisor=${a.id}`}
          className="inline-flex items-center gap-1 rounded-lg bg-brand px-3 py-2 text-sm font-medium text-brand-fg hover:opacity-90"
        >
          ✎ Generate outreach
        </Link>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Left column */}
        <div className="space-y-6 lg:col-span-2">
          <ResearchPanel advisorId={a.id} initialReport={a.research} />

          {/* Activity timeline */}
          <Card>
            <CardHeader title="Interaction timeline" />
            <div className="p-4">
              {timeline.length === 0 ? (
                <p className="text-sm text-muted">No activity yet. Research and enroll to get started.</p>
              ) : (
                <ol className="relative space-y-4 border-l border-border pl-5">
                  {timeline.map((act) => (
                    <li key={act.id} className="relative">
                      <span className="absolute -left-[22px] top-1 h-2.5 w-2.5 rounded-full bg-brand" />
                      <div className="text-sm font-medium">{act.summary}</div>
                      {act.detail && <div className="text-xs text-muted">{act.detail}</div>}
                      <div className="text-xs text-muted">{act.at}</div>
                    </li>
                  ))}
                </ol>
              )}
            </div>
          </Card>
        </div>

        {/* Right column */}
        <div className="space-y-6">
          {/* Firm facts */}
          <Card>
            <CardHeader title="Profile" />
            <dl className="divide-y divide-border text-sm">
              <Row label="Firm type" value={a.firmType} />
              <Row label="AUM" value={formatAum(a.aum)} />
              <Row label="Custodian" value={a.custodian} />
              <Row label="Location" value={`${a.city}, ${a.state}`} />
              {a.crd && <Row label="CRD #" value={a.crd} />}
              <Row label="Email" value={a.email} />
              <Row label="Stage" value={a.stage} />
              {a.nextFollowUpAt && <Row label="Next follow-up" value={a.nextFollowUpAt} />}
            </dl>
          </Card>

          {/* Fit signals */}
          <Card>
            <CardHeader title="Alts fit signals" />
            <div className="space-y-3 p-4 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-muted">Current alts allocation</span>
                <span className="font-medium">{a.fit.altsAllocationPct}%</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted">Uses market-neutral</span>
                <span className="font-medium">{a.fit.usesMarketNeutral ? "Yes" : "No"}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted">Convertible arbitrage</span>
                <Badge tone={interestTone[a.fit.convertibleArbInterest]}>{a.fit.convertibleArbInterest}</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted">Correlation sensitivity</span>
                <Badge tone={interestTone[a.fit.correlationSensitivity]}>{a.fit.correlationSensitivity}</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted">Tax sensitivity</span>
                <Badge tone={interestTone[a.fit.taxSensitivity]}>{a.fit.taxSensitivity}</Badge>
              </div>
              {a.strategiesUsed.length > 0 && (
                <div>
                  <div className="mb-1 text-muted">Strategies used</div>
                  <div className="flex flex-wrap gap-1.5">
                    {a.strategiesUsed.map((s) => (
                      <Badge key={s} tone="neutral">{s}</Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </Card>

          {/* Engagement */}
          <Card>
            <CardHeader title="Engagement" />
            <div className="grid grid-cols-2 gap-px overflow-hidden rounded-b-xl bg-border text-sm">
              <Metric label="Open rate" value={formatPct(openRate(a))} />
              <Metric label="Reply rate" value={formatPct(replyRate(a))} />
              <Metric label="Emails sent" value={String(a.engagement.emailsSent)} />
              <Metric label="Downloads" value={String(a.engagement.whitepaperDownloads)} />
            </div>
          </Card>

          {/* Current sequence */}
          {sequence && (
            <Card>
              <CardHeader
                title="Current sequence"
                action={
                  <Link href="/campaigns" className="text-xs font-medium text-brand hover:underline">
                    View →
                  </Link>
                }
              />
              <div className="p-4 text-sm">
                <div className="font-medium">{sequence.name}</div>
                {currentStep && (
                  <div className="mt-2 rounded-lg border border-border bg-elevated p-3">
                    <div className="text-xs text-muted">Next step · day {currentStep.dayOffset}</div>
                    <div className="font-medium">{currentStep.title}</div>
                    <div className="mt-1 text-xs text-muted">{currentStep.description}</div>
                  </div>
                )}
              </div>
            </Card>
          )}

          {a.personalNotes.length > 0 && (
            <Card>
              <CardHeader title="Personal notes" />
              <ul className="space-y-1.5 p-4 text-sm text-muted">
                {a.personalNotes.map((n, i) => (
                  <li key={i} className="flex gap-2">
                    <span className="text-brand">•</span>
                    {n}
                  </li>
                ))}
              </ul>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between px-4 py-2.5">
      <dt className="text-muted">{label}</dt>
      <dd className="max-w-[60%] truncate text-right font-medium">{value}</dd>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-surface px-4 py-3">
      <div className="text-lg font-semibold">{value}</div>
      <div className="text-xs text-muted">{label}</div>
    </div>
  );
}
