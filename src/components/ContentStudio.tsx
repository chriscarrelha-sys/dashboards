"use client";

import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { advisors } from "@/lib/data/advisors";
import type { Draft, DraftRequest, DraftTone } from "@/lib/types";
import { Card, CardHeader, Badge } from "@/components/ui";

const TONES: { value: DraftTone; label: string }[] = [
  { value: "warm", label: "Warm" },
  { value: "professional", label: "Professional" },
  { value: "technical", label: "Technical" },
  { value: "concise", label: "Concise" },
];

const EMPHASIS_OPTIONS = [
  "convertible arbitrage",
  "correlation",
  "tax efficiency",
  "market volatility",
  "morningstar",
  "golf",
];

const STEP_OPTIONS = [
  "Email 1 — The correlation problem",
  "Email 2 — Ballast, not beta",
  "Email 3 — Case study",
  "Research update — Portfolio construction",
  "Breakup email",
  "LinkedIn connection note",
];

export function ContentStudio() {
  const params = useSearchParams();
  const preselected = params.get("advisor");

  const [advisorId, setAdvisorId] = useState(preselected && advisors.some((a) => a.id === preselected) ? preselected : advisors[0].id);
  const [stepTitle, setStepTitle] = useState(STEP_OPTIONS[0]);
  const [tone, setTone] = useState<DraftTone>("professional");
  const [emphasis, setEmphasis] = useState<string[]>(["correlation"]);
  const [instructions, setInstructions] = useState("");
  const [draft, setDraft] = useState<Draft | null>(null);
  const [loading, setLoading] = useState(false);
  const [approved, setApproved] = useState(false);

  const advisor = advisors.find((a) => a.id === advisorId)!;

  function toggleEmphasis(e: string) {
    setEmphasis((prev) => (prev.includes(e) ? prev.filter((x) => x !== e) : [...prev, e]));
  }

  async function generate(extraInstruction?: string) {
    setLoading(true);
    setApproved(false);
    const req: DraftRequest = {
      advisorId,
      stepTitle,
      tone,
      emphasis,
      instructions: [instructions, extraInstruction].filter(Boolean).join(" "),
    };
    try {
      const res = await fetch("/api/ai/draft", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(req),
      });
      const data = await res.json();
      if (data.draft) setDraft(data.draft);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
      {/* Controls */}
      <div className="lg:col-span-2">
        <Card>
          <CardHeader title="Compose" />
          <div className="space-y-4 p-4">
            <Field label="Advisor">
              <select
                value={advisorId}
                onChange={(e) => setAdvisorId(e.target.value)}
                className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-brand"
              >
                {advisors.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name} — {a.firm}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Step / message">
              <select
                value={stepTitle}
                onChange={(e) => setStepTitle(e.target.value)}
                className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-brand"
              >
                {STEP_OPTIONS.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Tone">
              <div className="flex flex-wrap gap-2">
                {TONES.map((t) => (
                  <button
                    key={t.value}
                    onClick={() => setTone(t.value)}
                    className={`rounded-lg border px-3 py-1.5 text-xs font-medium ${
                      tone === t.value ? "border-brand bg-brand/10 text-brand" : "border-border text-muted hover:bg-elevated"
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </Field>

            <Field label="Emphasize">
              <div className="flex flex-wrap gap-2">
                {EMPHASIS_OPTIONS.map((e) => (
                  <button
                    key={e}
                    onClick={() => toggleEmphasis(e)}
                    className={`rounded-full border px-3 py-1 text-xs ${
                      emphasis.includes(e) ? "border-brand bg-brand/10 text-brand" : "border-border text-muted hover:bg-elevated"
                    }`}
                  >
                    {e}
                  </button>
                ))}
              </div>
            </Field>

            <Field label="Extra instructions (optional)">
              <textarea
                value={instructions}
                onChange={(e) => setInstructions(e.target.value)}
                rows={2}
                placeholder="e.g. reference their recent custodian change"
                className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-brand"
              />
            </Field>

            <button
              onClick={() => generate()}
              disabled={loading}
              className="w-full rounded-lg bg-brand px-4 py-2.5 text-sm font-semibold text-brand-fg hover:opacity-90 disabled:opacity-60"
            >
              {loading ? "Generating…" : "✦ Generate draft"}
            </button>
          </div>
        </Card>
      </div>

      {/* Output */}
      <div className="lg:col-span-3">
        <Card>
          <CardHeader
            title="Draft"
            action={draft ? <Badge tone="neutral">{draft.model}</Badge> : undefined}
          />
          {!draft ? (
            <div className="flex h-64 flex-col items-center justify-center gap-2 p-8 text-center text-sm text-muted">
              <span className="text-3xl">✎</span>
              Configure the message and generate a personalized draft for{" "}
              <span className="font-medium text-fg">{advisor.name}</span>.
            </div>
          ) : (
            <div className="p-4">
              <div className="mb-3 rounded-lg border border-border bg-elevated p-3">
                <div className="text-xs text-muted">Subject</div>
                <div className="font-medium">{draft.subject}</div>
              </div>
              <textarea
                value={draft.body}
                onChange={(e) => setDraft({ ...draft, body: e.target.value })}
                rows={14}
                className="w-full rounded-lg border border-border bg-surface p-3 text-sm leading-relaxed outline-none focus:border-brand"
              />

              <div className="mt-3 rounded-lg border border-brand/30 bg-brand/5 p-3 text-xs">
                <span className="font-semibold text-brand">Why this angle: </span>
                {draft.rationale}
              </div>

              {/* Rewrite controls */}
              <div className="mt-4">
                <div className="mb-1.5 text-xs font-medium text-muted">Rewrite</div>
                <div className="flex flex-wrap gap-2">
                  {[
                    ["Shorter", "Make it noticeably shorter."],
                    ["Longer", "Add a bit more detail and a second supporting point."],
                    ["More technical", "Make it more technical and quantitative."],
                    ["More personal", "Make it warmer and more personal."],
                  ].map(([label, instr]) => (
                    <button
                      key={label}
                      onClick={() => generate(instr)}
                      disabled={loading}
                      className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium hover:bg-elevated disabled:opacity-60"
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Approval / send */}
              <div className="mt-5 flex flex-wrap items-center gap-2 border-t border-border pt-4">
                <button
                  onClick={() => setApproved(true)}
                  className="rounded-lg bg-positive px-4 py-2 text-sm font-semibold text-white hover:opacity-90"
                >
                  ✓ Approve & queue
                </button>
                <button className="rounded-lg border border-border px-4 py-2 text-sm font-medium hover:bg-elevated">
                  Schedule
                </button>
                <button className="rounded-lg border border-border px-4 py-2 text-sm font-medium hover:bg-elevated">
                  Add to sequence
                </button>
                {approved && (
                  <span className="ml-auto text-sm font-medium text-positive">
                    Queued for {advisor.name} — logged to compliance trail.
                  </span>
                )}
              </div>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1.5 block text-xs font-medium text-muted">{label}</label>
      {children}
    </div>
  );
}
