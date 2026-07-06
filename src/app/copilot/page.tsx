import Link from "next/link";
import { dailyPriorities, copilotDigest } from "@/lib/copilot";
import { fitScore, temperature } from "@/lib/scoring";
import { initials } from "@/lib/format";
import { Card, CardHeader, Badge, PageHeader } from "@/components/ui";

export default function CopilotPage() {
  const digest = copilotDigest();
  const priorities = dailyPriorities();

  return (
    <div>
      <PageHeader
        title="AI Copilot"
        subtitle="Your daily plan — who to contact, why, and the next best action. Every call is explainable."
      />

      <Card className="mb-6 border-brand/30 bg-brand/5">
        <div className="p-5">
          <div className="flex items-center gap-2 text-sm font-semibold text-brand">✦ Today's briefing</div>
          <p className="mt-2 text-base font-medium">{digest.headline}</p>
          <ul className="mt-3 space-y-1.5">
            {digest.bullets.map((b, i) => (
              <li key={i} className="flex gap-2 text-sm">
                <span className="text-brand">•</span>
                {b}
              </li>
            ))}
          </ul>
        </div>
      </Card>

      <Card>
        <CardHeader title={`Prioritized queue (${priorities.length})`} />
        <div className="divide-y divide-border">
          {priorities.map(({ advisor, action, reason, priority }) => (
            <div key={advisor.id} className="flex items-center gap-4 px-4 py-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand/15 text-xs font-semibold text-brand">
                {initials(advisor.name)}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <Link href={`/advisors/${advisor.id}`} className="truncate font-medium hover:underline">
                    {advisor.name}
                  </Link>
                  <Badge tone={temperature(advisor)}>{temperature(advisor)}</Badge>
                  <span className="hidden text-xs text-muted sm:inline">{advisor.firm}</span>
                </div>
                <div className="mt-0.5 text-sm text-brand">{action}</div>
                <div className="truncate text-xs text-muted">Why: {reason}</div>
              </div>
              <div className="flex flex-col items-end gap-1">
                <span className="text-xs text-muted">priority {priority}</span>
                <Link
                  href={`/content-studio?advisor=${advisor.id}`}
                  className="rounded-md border border-border px-2 py-1 text-xs font-medium hover:bg-elevated"
                >
                  Draft →
                </Link>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
