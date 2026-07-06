import { advisors } from "@/lib/data/advisors";
import { activities } from "@/lib/data/activities";
import { sequences } from "@/lib/data/sequences";
import { openRate, replyRate } from "@/lib/scoring";
import { formatAum, formatPct } from "@/lib/format";
import { Card, CardHeader, StatTile, PageHeader } from "@/components/ui";

export default function AnalyticsPage() {
  const totalSent = advisors.reduce((s, a) => s + a.engagement.emailsSent, 0);
  const totalOpens = advisors.reduce((s, a) => s + a.engagement.opens, 0);
  const totalReplies = advisors.reduce((s, a) => s + a.engagement.replies, 0);
  const totalDownloads = advisors.reduce((s, a) => s + a.engagement.whitepaperDownloads, 0);
  const pipelineAum = advisors
    .filter((a) => ["Meeting Set", "Opportunity"].includes(a.stage))
    .reduce((s, a) => s + a.aum, 0);

  // Engagement by state
  const byState = Object.entries(
    advisors.reduce<Record<string, { aum: number; count: number }>>((acc, a) => {
      acc[a.state] = acc[a.state] || { aum: 0, count: 0 };
      acc[a.state].aum += a.aum;
      acc[a.state].count += 1;
      return acc;
    }, {}),
  ).sort((a, b) => b[1].aum - a[1].aum);
  const maxStateAum = Math.max(...byState.map(([, v]) => v.aum), 1);

  // Top engaged advisors
  const topEngaged = advisors
    .filter((a) => a.engagement.emailsSent > 0)
    .sort((a, b) => openRate(b) - openRate(a))
    .slice(0, 5);

  const complianceLog = [...activities]
    .filter((a) => ["email_sent", "meeting", "stage_change", "research"].includes(a.type))
    .sort((a, b) => (a.at < b.at ? 1 : -1))
    .slice(0, 10);

  return (
    <div>
      <PageHeader title="Analytics" subtitle="Campaign performance, engagement, and the compliance activity log." />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatTile label="Emails sent" value={String(totalSent)} sub={`${totalOpens} opens`} />
        <StatTile label="Open rate" value={formatPct(totalOpens / Math.max(totalSent, 1) / 2)} sub="Unique / sent" />
        <StatTile label="Replies" value={String(totalReplies)} sub={`${totalDownloads} downloads`} tone="positive" />
        <StatTile label="Pipeline AUM" value={formatAum(pipelineAum)} sub="Meeting set + opportunity" tone="positive" />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Campaign performance */}
        <Card>
          <CardHeader title="Campaign performance" />
          <div className="divide-y divide-border">
            {sequences.map((seq) => (
              <div key={seq.id} className="px-4 py-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">{seq.name}</span>
                  <span className="text-xs text-muted">{seq.enrolledCount} enrolled</span>
                </div>
                <div className="mt-1 text-xs text-muted">{seq.steps.length} steps · {seq.audience}</div>
              </div>
            ))}
          </div>
        </Card>

        {/* AUM by state (heat map style) */}
        <Card>
          <CardHeader title="AUM by state" />
          <div className="space-y-2.5 p-4">
            {byState.map(([state, v]) => (
              <div key={state} className="text-sm">
                <div className="mb-1 flex justify-between">
                  <span className="text-muted">{state} · {v.count} advisor{v.count > 1 ? "s" : ""}</span>
                  <span className="font-medium">{formatAum(v.aum)}</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-elevated">
                  <div className="h-full rounded-full bg-brand" style={{ width: `${(v.aum / maxStateAum) * 100}%` }} />
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Top engaged */}
        <Card>
          <CardHeader title="Most engaged advisors" />
          <table className="w-full text-sm">
            <thead className="text-left text-xs uppercase tracking-wide text-muted">
              <tr>
                <th className="px-4 py-2 font-medium">Advisor</th>
                <th className="px-4 py-2 font-medium">Open</th>
                <th className="px-4 py-2 font-medium">Reply</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {topEngaged.map((a) => (
                <tr key={a.id}>
                  <td className="px-4 py-2">
                    <div className="font-medium">{a.name}</div>
                    <div className="text-xs text-muted">{a.firm}</div>
                  </td>
                  <td className="px-4 py-2">{formatPct(openRate(a))}</td>
                  <td className="px-4 py-2">{formatPct(replyRate(a))}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>

        {/* Compliance log */}
        <Card>
          <CardHeader title="Compliance activity log" />
          <div className="divide-y divide-border text-sm">
            {complianceLog.map((act) => {
              const adv = advisors.find((a) => a.id === act.advisorId);
              return (
                <div key={act.id} className="flex items-start gap-3 px-4 py-2.5">
                  <span className="mt-0.5 font-mono text-xs text-muted">{act.at}</span>
                  <div>
                    <div>{act.summary}</div>
                    <div className="text-xs text-muted">{adv?.name} · {act.type}</div>
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
