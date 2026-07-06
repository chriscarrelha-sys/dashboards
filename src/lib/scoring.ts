import type { Advisor, InterestLevel } from "@/lib/types";

const interestWeight: Record<InterestLevel, number> = { Cold: 0, Warm: 1, Hot: 2 };

/**
 * Advisor-fit score for market-neutral / alternatives (0–100).
 * Combines product-fit signals with observed engagement. This is the
 * "advisor-fit scoring for alternatives" the PRD calls out as domain-specific.
 */
export function fitScore(a: Advisor): number {
  const f = a.fit;

  // Fit signals (0–60)
  let fit = 0;
  fit += interestWeight[f.convertibleArbInterest] * 8; // 0–16
  fit += interestWeight[f.correlationSensitivity] * 8; // 0–16
  fit += interestWeight[f.taxSensitivity] * 4; // 0–8
  // Sweet spot: some alts appetite but not saturated.
  fit += f.altsAllocationPct > 0 && f.altsAllocationPct <= 25 ? 12 : f.altsAllocationPct > 25 ? 6 : 0;
  fit += f.usesMarketNeutral ? 8 : 0;
  fit = Math.min(fit, 60);

  // Engagement (0–40)
  const e = a.engagement;
  const openRate = e.emailsSent ? e.opens / e.emailsSent : 0;
  let eng = 0;
  eng += Math.min(openRate * 6, 12); // rewards multi-open behavior
  eng += Math.min(e.replies * 8, 16);
  eng += Math.min(e.whitepaperDownloads * 4, 8);
  eng += Math.min(e.meetings * 4, 4);
  eng = Math.min(eng, 40);

  return Math.round(fit + eng);
}

export type Temperature = "Hot" | "Warm" | "Cold";

export function temperature(a: Advisor): Temperature {
  const s = fitScore(a);
  if (s >= 70) return "Hot";
  if (s >= 45) return "Warm";
  return "Cold";
}

export function openRate(a: Advisor): number {
  return a.engagement.emailsSent ? a.engagement.opens / a.engagement.emailsSent : 0;
}

export function replyRate(a: Advisor): number {
  return a.engagement.emailsSent ? a.engagement.replies / a.engagement.emailsSent : 0;
}
