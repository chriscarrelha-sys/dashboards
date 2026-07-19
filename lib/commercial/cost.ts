/**
 * Internal cost accounting + margin reporting (§9–11, §17, §24).
 *
 * Provider costs are computed from effective-dated VendorPriceConfiguration and
 * stored per request. They are NEVER exposed on the customer interface. Margin
 * is contribution / net-collected-revenue, in basis points (integer).
 */
import { prisma } from '@/lib/prisma';
import { tokenCost, estimateProcessingFee, marginBps, type Cents } from './money';

/** Effective-dated vendor rate lookup (latest active rate at/ before `at`). */
export async function getVendorRate(vendor: string, service: string, sku: string | null, at = new Date()) {
  return prisma.vendorPriceConfiguration.findFirst({
    where: { vendor, service, sku: sku ?? undefined, active: true, effectiveFrom: { lte: at } },
    orderBy: { effectiveFrom: 'desc' },
  });
}

export type AiCostInputs = {
  caseId?: string | null;
  actionCode?: string | null;
  provider: string;   // openai | anthropic | gemini | perplexity
  model: string;
  service?: string;   // defaults 'chat'
  sku?: string;       // vendor sku; defaults to model
  requestId?: string;
  inputTokens?: number;
  cachedInputTokens?: number;
  outputTokens?: number;
  toolCalls?: number;
  searchCalls?: number;
  providerReportedCost?: Cents | null;
  success?: boolean;
  retry?: boolean;
  fallbackProvider?: string | null;
  actionsCharged?: number;
};

/** Compute + record the internal cost of one AI provider request. */
export async function recordAiCost(userId: string, inp: AiCostInputs, at = new Date()) {
  const service = inp.service ?? 'chat';
  const sku = inp.sku ?? inp.model;
  const rate = await getVendorRate(inp.provider, service, sku, at)
    ?? await getVendorRate(inp.provider, service, null, at);

  let calculated = 0;
  if (rate) {
    const cachedIn = inp.cachedInputTokens ?? 0;
    const freshIn = Math.max(0, (inp.inputTokens ?? 0) - cachedIn);
    if (rate.inputPerMillion) calculated += tokenCost(freshIn, rate.inputPerMillion);
    if (rate.cachedInputPerMillion) calculated += tokenCost(cachedIn, rate.cachedInputPerMillion);
    if (rate.outputPerMillion) calculated += tokenCost(inp.outputTokens ?? 0, rate.outputPerMillion);
  }
  // Search-call cost (e.g. Perplexity) from its own rate if provided separately.
  if (inp.searchCalls && inp.searchCalls > 0) {
    const searchRate = await getVendorRate(inp.provider, 'search', null, at);
    if (searchRate?.searchCallPrice) calculated += inp.searchCalls * searchRate.searchCallPrice;
  }

  return prisma.aIProviderCostRecord.create({
    data: {
      userId, caseId: inp.caseId ?? null, actionCode: inp.actionCode ?? null,
      provider: inp.provider, model: inp.model, requestId: inp.requestId ?? null,
      inputTokens: inp.inputTokens ?? 0, cachedInputTokens: inp.cachedInputTokens ?? 0,
      outputTokens: inp.outputTokens ?? 0, toolCalls: inp.toolCalls ?? 0, searchCalls: inp.searchCalls ?? 0,
      providerReportedCost: inp.providerReportedCost ?? null, calculatedCost: calculated,
      success: inp.success ?? true, retry: inp.retry ?? false, fallbackProvider: inp.fallbackProvider ?? null,
      actionsCharged: inp.actionsCharged ?? 0,
    },
  });
}

export async function recordProcessingUsage(userId: string, category: string, pages: number, caseId?: string, at = new Date()) {
  const rate = await getVendorRate('processing', 'ocr', 'ocr-page', at);
  const cost = rate?.ocrPagePrice ? rate.ocrPagePrice * pages : 0;
  return prisma.processingUsageRecord.create({ data: { userId, caseId: caseId ?? null, category, pages, cost } });
}

export async function recordWorkflowUsage(userId: string, workflowCode: string, units = 1, caseId?: string) {
  return prisma.workflowUsageRecord.create({ data: { userId, caseId: caseId ?? null, workflowCode, units } });
}

/** Estimate the Stripe fee for a charge using the active fee config. */
export async function estimateStripeFee(amount: Cents): Promise<{ processing: Cents; billing: Cents; total: Cents }> {
  const cfg = await prisma.stripeFeeConfig.findFirst({ where: { active: true }, orderBy: { effectiveFrom: 'desc' } });
  const rateBps = cfg?.cardRateBps ?? 290;
  const fixed = cfg?.cardFixed ?? 30;
  const billingBps = cfg?.billingBps ?? 70;
  const processing = estimateProcessingFee(amount, rateBps, fixed);
  const billing = Math.round((amount * billingBps) / 10000);
  return { processing, billing, total: processing + billing };
}

/**
 * Contribution-margin report by plan (§24). Estimated — support allocation and
 * infra come from CostBudget planning figures unless a real integration exists.
 * Every estimated figure is labeled by the caller.
 */
export async function marginReportByPlan(periodStart: Date, periodEnd: Date) {
  const plans = await prisma.commercialPlan.findMany({ where: { active: true }, orderBy: { tierOrder: 'asc' } });
  const rows = [];
  for (const p of plans) {
    const subs = await prisma.accountSubscription.findMany({ where: { planCode: p.code, status: { in: ['active', 'trialing', 'past_due'] } } });
    const userIds = subs.map((s) => s.userId);

    // Net collected revenue (monthly-normalized from the active price).
    let grossRevenue = 0;
    for (const s of subs) {
      const price = await prisma.planPrice.findFirst({ where: { planCode: p.code, interval: s.interval, cadence: s.cadence, active: true }, orderBy: { effectiveFrom: 'desc' } });
      if (!price) continue;
      grossRevenue += s.interval === 'annual' ? Math.round(price.amount / 12) : price.amount;
    }

    // Variable COGS: real AI + processing costs, budgeted infra/support, payment fees.
    const aiAgg = await prisma.aIProviderCostRecord.aggregate({ _sum: { calculatedCost: true }, where: { userId: { in: userIds.length ? userIds : ['__none__'] }, createdAt: { gte: periodStart, lt: periodEnd } } });
    const procAgg = await prisma.processingUsageRecord.aggregate({ _sum: { cost: true }, where: { userId: { in: userIds.length ? userIds : ['__none__'] }, createdAt: { gte: periodStart, lt: periodEnd } } });
    const aiCost = aiAgg._sum.calculatedCost ?? 0;
    const procCost = procAgg._sum.cost ?? 0;

    const budget = await prisma.costBudget.findFirst({ where: { planCode: p.code, active: true }, orderBy: { effectiveFrom: 'desc' } });
    const infraBudget = (budget?.infraBudget ?? 0) * subs.length;      // budgeted (estimate)
    const supportBudget = (budget?.supportBudget ?? 0) * subs.length;  // budgeted (estimate)
    const fees = await estimateStripeFee(grossRevenue);

    const variableCogs = aiCost + procCost + infraBudget + supportBudget + fees.total;
    const contribution = grossRevenue - variableCogs;

    rows.push({
      planCode: p.code, planName: p.name, subscribers: subs.length,
      grossRevenue, aiCost, procCost, infraBudget, supportBudget, paymentFees: fees.total,
      variableCogs, contribution, marginBps: marginBps(contribution, grossRevenue),
      targetMarginBps: budget?.minMarginBps ?? 6000,
      estimatedFields: ['infraBudget', 'supportBudget', 'paymentFees'],
    });
  }
  return rows;
}
