/**
 * Catalog reader — the ONE authoritative view of plans, prices, and
 * entitlements. The website, checkout, Stripe mapping, and entitlement
 * enforcement all read from here; no pricing lives in a component.
 *
 * `getPublicCatalog()` returns a public-safe representation (no cost budgets,
 * no vendor rates, no internal margins) for the pricing page.
 */
import { prisma } from '@/lib/prisma';
import { GB } from './money';

export type EntitlementSet = {
  activeCases: number;
  storageBytes: number;
  aiActions: number;
  processingPages: number;
  advancedWorkflows: number;
  macCompanion: string; // none | manual | automatic
  folderMonitoring: boolean;
  calendarSync: boolean;
  priorityProcessing: boolean;
  supportTier: string;
};

const ENTITLEMENT_DEFAULTS: EntitlementSet = {
  activeCases: 0, storageBytes: 0, aiActions: 0, processingPages: 0, advancedWorkflows: 0,
  macCompanion: 'none', folderMonitoring: false, calendarSync: false, priorityProcessing: false, supportTier: 'self-service',
};

/** Read a plan's entitlements from the DB rows into a typed set. */
export async function getPlanEntitlements(planCode: string): Promise<EntitlementSet> {
  const rows = await prisma.planEntitlement.findMany({ where: { planCode } });
  const e: EntitlementSet = { ...ENTITLEMENT_DEFAULTS };
  for (const r of rows) {
    switch (r.key) {
      case 'active-cases': e.activeCases = r.intValue ?? 0; break;
      case 'storage-gb': e.storageBytes = (r.intValue ?? 0) * GB; break;
      case 'ai-actions': e.aiActions = r.intValue ?? 0; break;
      case 'processing-pages': e.processingPages = r.intValue ?? 0; break;
      case 'advanced-workflows': e.advancedWorkflows = r.intValue ?? 0; break;
      case 'mac-companion': e.macCompanion = r.textValue ?? 'none'; break;
      case 'folder-monitoring': e.folderMonitoring = r.boolValue ?? false; break;
      case 'calendar-sync': e.calendarSync = r.boolValue ?? false; break;
      case 'priority-processing': e.priorityProcessing = r.boolValue ?? false; break;
      case 'support-tier': e.supportTier = r.textValue ?? 'self-service'; break;
    }
  }
  return e;
}

export async function getPlanPrice(planCode: string, interval: string, cadence: string) {
  return prisma.planPrice.findFirst({
    where: { planCode, interval, cadence, active: true },
    orderBy: { effectiveFrom: 'desc' },
  });
}

/** How many founding accounts remain (from authoritative subscription records). */
export async function foundingSeatsRemaining(): Promise<{ cap: number; used: number; remaining: number }> {
  const cfg = await prisma.foundingMemberConfig.findFirst();
  const cap = cfg?.cap ?? 100;
  const used = await prisma.foundingMemberGrant.count({ where: { active: true } });
  return { cap, used, remaining: Math.max(0, cap - used) };
}

/**
 * Public-safe catalog for the pricing website. Founding prices are included
 * only while seats remain. No internal cost/vendor/margin data is exposed.
 */
export async function getPublicCatalog() {
  const plans = await prisma.commercialPlan.findMany({ where: { active: true }, orderBy: { tierOrder: 'asc' } });
  const founding = await foundingSeatsRemaining();
  const result = [];
  for (const p of plans) {
    const ent = await getPlanEntitlements(p.code);
    const [mStd, aStd, mFound, aFound] = await Promise.all([
      getPlanPrice(p.code, 'monthly', 'standard'),
      getPlanPrice(p.code, 'annual', 'standard'),
      getPlanPrice(p.code, 'monthly', 'founding'),
      getPlanPrice(p.code, 'annual', 'founding'),
    ]);
    result.push({
      code: p.code,
      name: p.name,
      tagline: p.tagline,
      badge: p.badge,
      tierOrder: p.tierOrder,
      trialEligible: p.trialEligible,
      prices: {
        standard: { monthly: mStd?.amount ?? null, annual: aStd?.amount ?? null },
        founding: founding.remaining > 0 ? { monthly: mFound?.amount ?? null, annual: aFound?.amount ?? null } : null,
      },
      entitlements: {
        activeCases: ent.activeCases,
        storageGb: Math.round(ent.storageBytes / GB),
        aiActions: ent.aiActions,
        processingPages: ent.processingPages,
        advancedWorkflows: ent.advancedWorkflows,
        macCompanion: ent.macCompanion,
        folderMonitoring: ent.folderMonitoring,
        calendarSync: ent.calendarSync,
        priorityProcessing: ent.priorityProcessing,
        supportTier: ent.supportTier,
      },
    });
  }
  return {
    pricingVersion: plans[0]?.pricingVersion ?? null,
    founding: { remaining: founding.remaining, cap: founding.cap },
    plans: result,
  };
}

export async function getAddOns() {
  return prisma.addOnProduct.findMany({ where: { active: true }, orderBy: [{ kind: 'asc' }, { amount: 'asc' }] });
}
