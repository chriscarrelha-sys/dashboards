import { sequences } from "@/lib/data/sequences";
import { Card, CardHeader, Badge, PageHeader } from "@/components/ui";
import type { StepChannel } from "@/lib/types";

const channelIcon: Record<StepChannel, string> = {
  email: "✉",
  linkedin: "in",
  call: "☎",
  voicemail: "◔",
  task: "✓",
  research: "◎",
  meeting: "◇",
};

const channelLabel: Record<StepChannel, string> = {
  email: "Email",
  linkedin: "LinkedIn",
  call: "Call",
  voicemail: "Voicemail",
  task: "Task",
  research: "Research",
  meeting: "Meeting",
};

export default function CampaignsPage() {
  return (
    <div>
      <PageHeader
        title="Campaigns & Sequences"
        subtitle="Workflows are the primary abstraction — email is just one step type. Same engine runs calls, LinkedIn, research, and approval gates."
        action={
          <button className="rounded-lg border border-border px-3 py-2 text-sm font-medium hover:bg-elevated">
            + New sequence
          </button>
        }
      />

      <div className="space-y-6">
        {sequences.map((seq) => (
          <Card key={seq.id}>
            <CardHeader
              title={seq.name}
              action={
                <div className="flex items-center gap-2">
                  <Badge tone="neutral">{seq.enrolledCount} enrolled</Badge>
                  <Badge tone={seq.active ? "positive" : "neutral"}>{seq.active ? "Active" : "Paused"}</Badge>
                </div>
              }
            />
            <div className="p-4">
              <p className="text-sm text-muted">{seq.description}</p>
              <p className="mt-1 text-xs text-muted">
                <span className="font-medium text-fg">Audience:</span> {seq.audience}
              </p>

              {/* Horizontal step flow */}
              <div className="mt-4 flex gap-3 overflow-x-auto pb-2">
                {seq.steps.map((step, i) => (
                  <div key={step.id} className="flex items-stretch gap-3">
                    <div className="flex w-56 shrink-0 flex-col rounded-lg border border-border bg-elevated p-3">
                      <div className="flex items-center justify-between">
                        <span className="flex h-6 w-6 items-center justify-center rounded-md bg-brand/15 text-xs font-semibold text-brand">
                          {channelIcon[step.channel]}
                        </span>
                        <span className="text-[11px] font-medium text-muted">Day {step.dayOffset}</span>
                      </div>
                      <div className="mt-2 text-[11px] font-medium uppercase tracking-wide text-muted">
                        {channelLabel[step.channel]}
                      </div>
                      <div className="text-sm font-medium leading-snug">{step.title}</div>
                      <div className="mt-1 text-xs text-muted">{step.description}</div>
                      {step.requiresApproval && (
                        <div className="mt-2">
                          <Badge tone="Warm">Approval gate</Badge>
                        </div>
                      )}
                    </div>
                    {i < seq.steps.length - 1 && (
                      <div className="flex items-center text-muted">→</div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
