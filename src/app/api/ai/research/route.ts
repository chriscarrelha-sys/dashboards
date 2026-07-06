import { NextResponse } from "next/server";
import { getAdvisor } from "@/lib/data/advisors";
import { localResearchNarrative } from "@/lib/ai/generator";
import { fitScore } from "@/lib/scoring";
import type { ResearchReport } from "@/lib/types";

// The AI Research Engine. Returns an existing report if one is on file; otherwise
// synthesizes one from structured signals. A production build fans out to Tavily,
// the SEC ADV API, and LinkedIn enrichment (see the PRD) before summarizing.
export async function POST(req: Request) {
  const { advisorId } = (await req.json()) as { advisorId?: string };
  if (!advisorId) return NextResponse.json({ error: "advisorId required" }, { status: 400 });
  const a = getAdvisor(advisorId);
  if (!a) return NextResponse.json({ error: "advisor not found" }, { status: 404 });

  if (a.research) return NextResponse.json({ report: a.research, cached: true });

  const report: ResearchReport = {
    generatedAt: "2026-07-06",
    summary: localResearchNarrative(a),
    investmentPhilosophy:
      a.fit.altsAllocationPct > 15
        ? "Already an active alternatives allocator; evaluates strategies on their marginal diversification benefit."
        : "Traditional allocation with limited alts exposure; will need the correlation/drawdown case made clearly.",
    productFit:
      a.fit.convertibleArbInterest === "Hot" || a.fit.correlationSensitivity === "Hot"
        ? "Strong — expressed interest maps directly to a market-neutral ballast sleeve."
        : "Moderate — no expressed pull yet; lead with education, not a pitch.",
    conversationStarters: [
      `Their ${a.custodian} platform and how a daily-liquid alt fits the model`,
      a.personalNotes[0] ? `Personal: ${a.personalNotes[0]}` : "Recent firm news or hires",
    ],
    likelyObjections: [
      a.fit.altsAllocationPct < 5 ? "Skepticism toward alternatives generally" : "Fit vs. their existing alts sleeve",
      "Liquidity and fee questions",
    ],
    recommendedAngle:
      a.fit.taxSensitivity === "Hot"
        ? "Lead with after-tax efficiency and correlation, not headline performance."
        : "Lead with drawdown protection and low correlation to their equity book.",
    confidence: Math.min(60 + Math.round(fitScore(a) / 4), 95),
    sources: [
      { label: "Firm ADV (SEC IAPD)", url: "https://adviserinfo.sec.gov" },
      { label: "Firm website" },
      a.linkedin ? { label: "LinkedIn profile", url: a.linkedin } : { label: "Public commentary" },
    ],
  };

  return NextResponse.json({ report, cached: false });
}
