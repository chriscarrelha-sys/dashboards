import type { Advisor, Draft, DraftRequest } from "@/lib/types";
import { productKnowledge } from "@/lib/data/product";
import { activitiesForAdvisor } from "@/lib/data/activities";

// Real-model adapter. Used only when ANTHROPIC_API_KEY is set. The same structured
// context is fed to both this and the local engine, so behavior is consistent —
// the model just writes better prose. Returns null on any failure so callers can
// fall back gracefully.

const API_URL = "https://api.anthropic.com/v1/messages";

function buildPrompt(a: Advisor, req: DraftRequest): string {
  const fund = productKnowledge.fund;
  const recentActivity = activitiesForAdvisor(a.id)
    .slice(0, 5)
    .map((x) => `- ${x.at}: ${x.summary}`)
    .join("\n");

  return [
    `You are the Writing Agent inside an institutional-sales platform. Write a personalized outreach email from a wholesaler ("Chris") to a financial advisor.`,
    ``,
    `ADVISOR`,
    `Name: ${a.name}, ${a.title} at ${a.firm} (${a.firmType}, ${a.custodian} custodian)`,
    `Current alts allocation: ${a.fit.altsAllocationPct}%; uses market-neutral: ${a.fit.usesMarketNeutral}`,
    `Personal notes: ${a.personalNotes.join("; ") || "none"}`,
    a.research ? `Research angle: ${a.research.recommendedAngle}` : ``,
    ``,
    `RECENT ACTIVITY`,
    recentActivity || "none",
    ``,
    `PRODUCT (${fund.ticker} — ${fund.name})`,
    fund.oneLiner,
    `Key points: ${fund.keyPoints.join(" | ")}`,
    `Compliance: ${fund.complianceReminders.join(" ")}`,
    ``,
    `TASK`,
    `Write "${req.stepTitle}". Tone: ${req.tone}. Emphasize: ${req.emphasis.join(", ") || "advisor's stated priorities"}.`,
    req.instructions ? `Extra instructions: ${req.instructions}` : ``,
    ``,
    `Rules: no performance guarantees; keep it under 180 words; end signed "Chris".`,
    `Respond ONLY with minified JSON: {"subject": "...", "body": "...", "rationale": "why you chose this angle"}.`,
  ]
    .filter(Boolean)
    .join("\n");
}

export async function anthropicDraft(a: Advisor, req: DraftRequest): Promise<Draft | null> {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) return null;
  const model = process.env.ANTHROPIC_MODEL || "claude-opus-4-8";

  try {
    const res = await fetch(API_URL, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": key,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model,
        max_tokens: 1024,
        messages: [{ role: "user", content: buildPrompt(a, req) }],
      }),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { content?: Array<{ text?: string }> };
    const text = data.content?.map((c) => c.text ?? "").join("") ?? "";
    const json = extractJson(text);
    if (!json) return null;
    return {
      subject: String(json.subject ?? ""),
      body: String(json.body ?? ""),
      rationale: String(json.rationale ?? ""),
      model,
    };
  } catch {
    return null;
  }
}

function extractJson(text: string): Record<string, unknown> | null {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end === -1) return null;
  try {
    return JSON.parse(text.slice(start, end + 1));
  } catch {
    return null;
  }
}
