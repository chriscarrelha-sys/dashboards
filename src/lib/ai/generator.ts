import type { Advisor, Draft, DraftRequest } from "@/lib/types";
import { productKnowledge } from "@/lib/data/product";
import { fitScore, temperature } from "@/lib/scoring";
import { formatAum } from "@/lib/format";

// The built-in personalization engine. It produces genuinely advisor-specific
// drafts from structured data + product knowledge, so the Content Studio works
// with zero API keys. When ANTHROPIC_API_KEY is present the API route swaps this
// for a real model call (see src/lib/ai/anthropic.ts) using the same prompt.

const toneOpeners: Record<DraftRequest["tone"], (a: Advisor) => string> = {
  warm: (a) => `Hi ${firstName(a)},`,
  professional: (a) => `Hello ${firstName(a)},`,
  technical: (a) => `${firstName(a)} —`,
  concise: (a) => `${firstName(a)},`,
};

function firstName(a: Advisor): string {
  return a.name.split(" ")[0];
}

function emphasisLine(a: Advisor, emphasis: string[]): string[] {
  const lines: string[] = [];
  const has = (k: string) => emphasis.map((e) => e.toLowerCase()).includes(k);

  if (has("convertible arbitrage")) {
    lines.push(
      `The convertible-arbitrage sleeve is the differentiator — ${productKnowledge.concepts["convertible arbitrage"]} It's a return stream your current lineup likely doesn't own.`,
    );
  }
  if (has("correlation")) {
    lines.push(
      `Given how much your book moves with equities right now, a near-zero-beta sleeve does more for total-portfolio volatility than another same-Sharpe equity strategy would.`,
    );
  }
  if (has("tax efficiency") || has("tax")) {
    lines.push(`Happy to show the after-tax picture — I know that's how you evaluate every allocation.`);
  }
  if (has("market volatility")) {
    lines.push(`With valuations where they are, the question isn't return — it's what steadies the book on the down days.`);
  }
  if (has("morningstar")) {
    lines.push(`I can pull the Morningstar category comparison so you can see the correlation profile head-to-head.`);
  }
  if (has("golf") && a.personalNotes.some((n) => /golf|east lake/i.test(n))) {
    lines.push(`Also — still owe you a round. East Lake when the summer heat breaks?`);
  }
  return lines;
}

export function localDraft(a: Advisor, req: DraftRequest): Draft {
  const opener = toneOpeners[req.tone](a);
  const temp = temperature(a);
  const fund = productKnowledge.fund;

  const hook =
    a.research?.recommendedAngle ??
    `You've built ${a.firm} into a ${formatAum(a.aum)} book — the question I keep coming back to for firms like yours is downside protection without giving up efficiency.`;

  const paras: string[] = [];
  paras.push(hook);
  paras.push(
    `That's the case for a small market-neutral sleeve. ${fund.oneLiner} We'd size it as a ${"5–10%"} allocation funded from the equity side.`,
  );
  paras.push(...emphasisLine(a, req.emphasis));
  paras.push(
    temp === "Hot"
      ? `You've been engaging with the last few notes — worth 15 minutes this week to walk through where it fits your allocation?`
      : `No pitch here — just want to send the one-pager on the drawdown and correlation math. Worth a look?`,
  );
  paras.push(`Best,\nChris`);

  const body = `${opener}\n\n${paras.join("\n\n")}`;

  const subject = subjectFor(req, a);

  const rationale = buildRationale(a, req, temp);

  return { subject, body, model: "local-personalization-engine", rationale };
}

function subjectFor(req: DraftRequest, a: Advisor): string {
  const e = req.emphasis.map((x) => x.toLowerCase());
  if (e.includes("convertible arbitrage")) return `A return stream ${a.firm} probably doesn't own`;
  if (e.includes("correlation")) return `The correlation problem in your equity book`;
  if (e.includes("tax efficiency") || e.includes("tax")) return `Ballast, after tax`;
  return `Ballast, not beta — for ${a.firm}`;
}

function buildRationale(a: Advisor, req: DraftRequest, temp: string): string {
  const bits = [
    `Advisor is ${temp.toLowerCase()} (fit score ${fitScore(a)}).`,
    a.research ? `Used research angle: "${a.research.recommendedAngle}"` : "No research on file — used a generic downside-protection hook.",
    req.emphasis.length ? `Emphasized: ${req.emphasis.join(", ")}.` : "No specific emphasis requested.",
    `Tone: ${req.tone}.`,
    `Closed with a ${temp === "Hot" ? "direct meeting ask" : "low-friction collateral offer"} to match engagement level.`,
  ];
  return bits.join(" ");
}

// Research generation used by /api/ai/research when no model key is set.
export function localResearchNarrative(a: Advisor): string {
  const f = a.fit;
  return [
    `${a.firm} is a ${formatAum(a.aum)} ${a.firmType} in ${a.city}, ${a.state}, custodied at ${a.custodian}.`,
    `Current alternatives allocation is roughly ${f.altsAllocationPct}%${f.usesMarketNeutral ? ", and they already use a market-neutral strategy" : ", with no market-neutral exposure today"}.`,
    `Interest signals — convertible arbitrage: ${f.convertibleArbInterest}; correlation sensitivity: ${f.correlationSensitivity}; tax sensitivity: ${f.taxSensitivity}.`,
    `Recommended angle: ${a.research?.recommendedAngle ?? "lead with correlation and drawdown math rather than performance."}`,
  ].join(" ");
}
