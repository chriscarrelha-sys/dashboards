/**
 * AI Case Action estimator (§8).
 *
 * "AI Case Action" is a customer-facing unit — it never maps 1:1 to an API
 * request, and tokens/model prices/API keys are NEVER exposed. Before running a
 * task the app shows the estimated charge; the final charge may be adjusted
 * DOWN (never up without a fresh approval).
 */
import { prisma } from '@/lib/prisma';

export type EstimateInputs = {
  pages?: number;
  docCount?: number;
  estimatedTokens?: number;
  webResearch?: boolean;
  premiumModel?: boolean;
  cached?: boolean; // a reusable summary exists
};

export type Estimate = {
  actionCode: string;
  name: string;
  actions: number;        // customer-facing charge
  min: number;
  max: number;
  needsApproval: boolean; // charge exceeds the manual-approval threshold
  breakdown: string;      // internal explanation (not shown raw to customer)
  available: boolean;     // action enabled + available on this plan/trial
};

export async function estimateAiActions(
  actionCode: string,
  inputs: EstimateInputs,
  opts?: { planCode?: string; trial?: boolean },
): Promise<Estimate> {
  const def = await prisma.aIActionDefinition.findUnique({ where: { code: actionCode } });
  if (!def) throw new Error(`Unknown AI action: ${actionCode}`);

  const pages = Math.max(0, inputs.pages ?? 0);
  const docCount = Math.max(0, inputs.docCount ?? 0);
  const tokens = Math.max(0, inputs.estimatedTokens ?? 0);

  let raw =
    def.minCharge +
    def.pageWeight * pages +
    def.docCountWeight * docCount +
    def.tokenWeight * (tokens / 1000) +
    (inputs.webResearch ? def.webResearchWeight : 0) +
    (inputs.premiumModel ? def.premiumModelWeight : 0);

  if (inputs.cached && def.cachedDiscount > 0) {
    raw = raw * (1 - def.cachedDiscount);
  }

  // Round UP so the estimate never undercharges, then clamp to [min, max].
  let actions = Math.ceil(raw);
  actions = Math.max(def.minCharge, Math.min(def.maxCharge, actions));

  // A zero-charge background op stays zero regardless of clamps.
  if (def.minCharge === 0 && def.maxCharge === 0) actions = 0;

  let available = def.enabled;
  if (opts?.trial && !def.trialAvailable) available = false;
  if (opts?.planCode) {
    try {
      const plans: string[] = JSON.parse(def.planAvailability);
      if (Array.isArray(plans) && !plans.includes(opts.planCode)) available = false;
    } catch { /* permissive if malformed */ }
  }

  return {
    actionCode: def.code,
    name: def.name,
    actions,
    min: def.minCharge,
    max: def.maxCharge,
    needsApproval: actions > def.manualApprovalThreshold,
    breakdown: `min ${def.minCharge} + pages ${(def.pageWeight * pages).toFixed(1)} + docs ${(def.docCountWeight * docCount).toFixed(1)} + tokens ${(def.tokenWeight * (tokens / 1000)).toFixed(1)}${inputs.webResearch ? ` + web ${def.webResearchWeight}` : ''}${inputs.premiumModel ? ` + premium ${def.premiumModelWeight}` : ''}${inputs.cached ? ` (−${Math.round(def.cachedDiscount * 100)}% cached)` : ''} → ${actions}`,
    available,
  };
}
