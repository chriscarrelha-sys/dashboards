"use client";

import { useState } from "react";
import type { ResearchReport } from "@/lib/types";
import { Card, CardHeader, Badge } from "@/components/ui";

export function ResearchPanel({
  advisorId,
  initialReport,
}: {
  advisorId: string;
  initialReport?: ResearchReport;
}) {
  const [report, setReport] = useState<ResearchReport | undefined>(initialReport);
  const [loading, setLoading] = useState(false);

  async function research() {
    setLoading(true);
    try {
      const res = await fetch("/api/ai/research", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ advisorId }),
      });
      const data = await res.json();
      if (data.report) setReport(data.report);
    } finally {
      setLoading(false);
    }
  }

  if (!report) {
    return (
      <Card>
        <CardHeader title="AI Research Engine" />
        <div className="flex flex-col items-center gap-3 p-8 text-center">
          <p className="max-w-sm text-sm text-muted">
            No research on file. Aggregate ADV, website, LinkedIn, and public commentary into a
            one-click brief with a recommended angle.
          </p>
          <button
            onClick={research}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-lg bg-brand px-4 py-2 text-sm font-medium text-brand-fg hover:opacity-90 disabled:opacity-60"
          >
            {loading ? "Researching…" : "◎ Research advisor"}
          </button>
        </div>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader
        title="AI Research Engine"
        action={
          <div className="flex items-center gap-2">
            <Badge tone="positive">Confidence {report.confidence}%</Badge>
            <button onClick={research} disabled={loading} className="text-xs font-medium text-brand hover:underline">
              {loading ? "…" : "Refresh"}
            </button>
          </div>
        }
      />
      <div className="space-y-4 p-4 text-sm">
        <Section title="Summary">{report.summary}</Section>
        <div className="grid gap-4 sm:grid-cols-2">
          <Section title="Investment philosophy">{report.investmentPhilosophy}</Section>
          <Section title="Product fit">{report.productFit}</Section>
        </div>

        <div className="rounded-lg border border-brand/30 bg-brand/5 p-3">
          <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-brand">Recommended angle</div>
          <p>{report.recommendedAngle}</p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <List title="Conversation starters" items={report.conversationStarters} />
          <List title="Likely objections" items={report.likelyObjections} />
        </div>

        <div>
          <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted">Sources</div>
          <div className="flex flex-wrap gap-1.5">
            {report.sources.map((s, i) =>
              s.url ? (
                <a
                  key={i}
                  href={s.url}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-full bg-elevated px-2 py-0.5 text-[11px] text-brand hover:underline"
                >
                  {s.label} ↗
                </a>
              ) : (
                <span key={i} className="rounded-full bg-elevated px-2 py-0.5 text-[11px] text-muted">
                  {s.label}
                </span>
              ),
            )}
          </div>
        </div>
        <div className="text-xs text-muted">Generated {report.generatedAt}</div>
      </div>
    </Card>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted">{title}</div>
      <p>{children}</p>
    </div>
  );
}

function List({ title, items }: { title: string; items: string[] }) {
  return (
    <div>
      <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted">{title}</div>
      <ul className="space-y-1">
        {items.map((it, i) => (
          <li key={i} className="flex gap-2">
            <span className="text-brand">•</span>
            {it}
          </li>
        ))}
      </ul>
    </div>
  );
}
