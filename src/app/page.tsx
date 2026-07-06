import Link from "next/link";
import { advisors } from "@/lib/data/advisors";
import { activities } from "@/lib/data/activities";
import { dailyPriorities, copilotDigest } from "@/lib/copilot";
import { fitScore, openRate, temperature } from "@/lib/scoring";
import { formatAum, formatPct, initials } from "@/lib/format";
import { Card, CardHeader, StatTile, Badge, PageHeader, Avatar } from "@/components/ui";
import type { PipelineStage } from "@/lib/types";

const STAGES: PipelineStage[] = ["New", "Researching", "Engaged", "Meeting Set", "Opportunity", "Won"];

export default function DashboardPage() {
  const digest = copilotDigest();
  const priorities = dailyPriorities().slice(0, 5);

  const totalAum = advisors.reduce((s, a) => s + a.aum, 0);
  const pipelineAum = advisors
    .filter((a) => ["Meeting Set", "Opportunity"].includes(a.stage))
    .reduce((s, a) => s + a.aum, 0);
  const avgOpen =
    advisors.reduce((s, a) => s + openRate(a), 0) / advisors.filter((a) => a.engagement.emailsSent > 0).length;
  const meetings = advisors.reduce((s, a) => s + a.engagement.meetings, 0);

  const byStage = STAGES.map((stage) => ({
    stage,
    count: advisors.filter((a) => a.stage === stage).length,
  }));
  const maxStage = Math.max(...byStage.map((s) => s.count), 1);

  const recent = [...activities].sort((a, b) => (a.at < b.at ? 1 : -1)).slice(0, 8);

  return (
    <div>
      <PageHeader
        title="Dashboard"
        subtitle="Your book at a glance — Wednesday, July 6, 2026"
      />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatTile label="Advisors" value={String(advisors.length)} sub={`${formatAum(totalAum)} total AUM`} />
        <StatTile label="In Pipeline" value={formatAum(pipelineAum)} sub="Meeting set + opportunity" tone="positive" />
        <StatTile label="Avg Open Rate" value={formatPct(avgOpen)} sub="Across active sequences" />
        <StatTile label="Meetings" value={String(meetings)} sub="Booked to date" />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Copilot digest */}
        <Card className="lg:col-span-2">
          <CardHeader
            title="✦ Copilot — what to do today"
            action={
              <Link href="/copilot" className="text-xs font-medium text-brand hover:underline">
                Open Copilot →
              </Link>
            }
          />
          <div className="p-4">
            <p className="text-sm font-medium">{digest.headline}</p>
            <ul className="mt-3 space-y-2">
              {digest.bullets.map((b, i) => (
                <li key={i} className="flex gap-2 text-sm text-muted">
                  <span className="text-brand">•</span>
                  {b}
                </li>
              ))}
            </ul>
          </div>
        </Card>

        {/* Pipeline funnel */}
        <Card>
          <CardHeader title="Pipeline" />
          <div className="space-y-2 p-4">
            {byStage.map((s) => (
              <div key={s.stage} className="text-sm">
                <div className="mb-1 flex justify-between">
                  <span className="text-muted">{s.stage}</span>
                  <span className="font-medium">{s.count}</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-elevated">
                  <div
                    className="h-full rounded-full bg-brand"
                    style={{ width: `${(s.count / maxStage) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Today's priority actions */}
        <Card>
          <CardHeader
            title="Today's priority actions"
            action={
              <Link href="/advisors" className="text-xs font-medium text-brand hover:underline">
                All advisors →
              </Link>
            }
          />
          <div className="divide-y divide-border">
            {priorities.map(({ advisor, action, reason }) => (
              <Link
                key={advisor.id}
                href={`/advisors/${advisor.id}`}
                className="flex items-center gap-3 px-4 py-3 hover:bg-elevated"
              >
                <Avatar initials={initials(advisor.name)} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="truncate text-sm font-medium">{advisor.name}</span>
                    <Badge tone={temperature(advisor)}>{temperature(advisor)}</Badge>
                  </div>
                  <div className="truncate text-xs text-muted">{action} — {reason}</div>
                </div>
                <span className="text-xs font-medium text-brand">{fitScore(advisor)}</span>
              </Link>
            ))}
          </div>
        </Card>

        {/* Recent activity */}
        <Card>
          <CardHeader title="Recent activity" />
          <div className="divide-y divide-border">
            {recent.map((act) => {
              const adv = advisors.find((a) => a.id === act.advisorId);
              return (
                <div key={act.id} className="flex items-start gap-3 px-4 py-3">
                  <span className="mt-0.5 text-xs text-muted">{act.at.slice(5)}</span>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm">{act.summary}</div>
                    {adv && <div className="text-xs text-muted">{adv.name} · {adv.firm}</div>}
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      </div>
    </div>
  );
}
