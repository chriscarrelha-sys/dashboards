/**
 * Authoritative commercial catalog seed (idempotent upserts).
 *
 * This is THE source of truth for plans, prices, entitlements, AI actions,
 * add-ons, vendor rates, cost budgets, trial + founding config. The website,
 * checkout, Stripe mappings, and entitlement enforcement all read from the
 * records this seed writes — no pricing constant is duplicated in a component.
 *
 * All money is integer cents. Change prices HERE (or via admin), never in UI.
 */
import type { PrismaClient } from '@prisma/client';
import { dollars } from './money';

export const PRICING_VERSION = '2026.1';

export async function seedCommercial(prisma: PrismaClient) {
  // ---- Pricing version -------------------------------------------------------
  await prisma.pricingVersion.upsert({
    where: { version: PRICING_VERSION },
    update: { active: true, name: 'Launch pricing 2026' },
    create: { version: PRICING_VERSION, name: 'Launch pricing 2026', active: true },
  });

  // ---- Plans -----------------------------------------------------------------
  const plans = [
    { code: 'ESSENTIALS', name: 'Case Essentials', tagline: 'For a single active matter.', tierOrder: 1, badge: null as string | null },
    { code: 'PRO', name: 'Litigation Pro', tagline: 'For active, multi-matter litigation.', tierOrder: 2, badge: 'Most Popular' },
    { code: 'COMMAND', name: 'Litigation Command', tagline: 'For complex, high-volume litigation.', tierOrder: 3, badge: 'Best for Complex Litigation' },
  ];
  for (const p of plans) {
    await prisma.commercialPlan.upsert({
      where: { code: p.code },
      update: { name: p.name, tagline: p.tagline, tierOrder: p.tierOrder, badge: p.badge, pricingVersion: PRICING_VERSION, active: true, trialEligible: true },
      create: { ...p, pricingVersion: PRICING_VERSION, trialEligible: true, active: true },
    });
  }

  // ---- Prices (standard + founding, monthly + annual) ------------------------
  const prices: { planCode: string; interval: string; cadence: string; amount: number }[] = [
    // Standard
    { planCode: 'ESSENTIALS', interval: 'monthly', cadence: 'standard', amount: dollars(59) },
    { planCode: 'ESSENTIALS', interval: 'annual', cadence: 'standard', amount: dollars(590) },
    { planCode: 'PRO', interval: 'monthly', cadence: 'standard', amount: dollars(179) },
    { planCode: 'PRO', interval: 'annual', cadence: 'standard', amount: dollars(1790) },
    { planCode: 'COMMAND', interval: 'monthly', cadence: 'standard', amount: dollars(399) },
    { planCode: 'COMMAND', interval: 'annual', cadence: 'standard', amount: dollars(3990) },
    // Founding (first 100 accounts, locked while continuously active)
    { planCode: 'ESSENTIALS', interval: 'monthly', cadence: 'founding', amount: dollars(49) },
    { planCode: 'ESSENTIALS', interval: 'annual', cadence: 'founding', amount: dollars(490) },
    { planCode: 'PRO', interval: 'monthly', cadence: 'founding', amount: dollars(149) },
    { planCode: 'PRO', interval: 'annual', cadence: 'founding', amount: dollars(1490) },
    { planCode: 'COMMAND', interval: 'monthly', cadence: 'founding', amount: dollars(349) },
    { planCode: 'COMMAND', interval: 'annual', cadence: 'founding', amount: dollars(3490) },
  ];
  // A stable effectiveFrom so upserts are idempotent across runs.
  const epoch = new Date('2026-01-01T00:00:00.000Z');
  for (const pr of prices) {
    await prisma.planPrice.upsert({
      where: { planCode_interval_cadence_effectiveFrom: { planCode: pr.planCode, interval: pr.interval, cadence: pr.cadence, effectiveFrom: epoch } },
      update: { amount: pr.amount, active: true },
      create: { ...pr, currency: 'USD', effectiveFrom: epoch, active: true },
    });
  }

  // ---- Entitlements (per plan) ----------------------------------------------
  // Storage limit stored in GB (fits Int); the entitlement service converts to bytes.
  const ent: Record<string, { activeCases: number; storageGb: number; aiActions: number; processingPages: number; advancedWorkflows: number; macCompanion: string; folderMonitoring: boolean; calendarSync: boolean; priorityProcessing: boolean; supportTier: string }> = {
    ESSENTIALS: { activeCases: 1, storageGb: 10, aiActions: 30, processingPages: 750, advancedWorkflows: 3, macCompanion: 'none', folderMonitoring: false, calendarSync: false, priorityProcessing: false, supportTier: 'self-service' },
    PRO: { activeCases: 5, storageGb: 50, aiActions: 150, processingPages: 4000, advancedWorkflows: 30, macCompanion: 'manual', folderMonitoring: false, calendarSync: true, priorityProcessing: false, supportTier: 'email' },
    COMMAND: { activeCases: 15, storageGb: 200, aiActions: 500, processingPages: 15000, advancedWorkflows: 150, macCompanion: 'automatic', folderMonitoring: true, calendarSync: true, priorityProcessing: true, supportTier: 'priority' },
  };
  const setEnt = async (planCode: string, key: string, v: { intValue?: number; boolValue?: boolean; textValue?: string }) => {
    await prisma.planEntitlement.upsert({
      where: { planCode_key: { planCode, key } },
      update: v,
      create: { planCode, key, ...v },
    });
  };
  for (const [planCode, e] of Object.entries(ent)) {
    await setEnt(planCode, 'active-cases', { intValue: e.activeCases });
    await setEnt(planCode, 'storage-gb', { intValue: e.storageGb });
    await setEnt(planCode, 'ai-actions', { intValue: e.aiActions });
    await setEnt(planCode, 'processing-pages', { intValue: e.processingPages });
    await setEnt(planCode, 'advanced-workflows', { intValue: e.advancedWorkflows });
    await setEnt(planCode, 'mac-companion', { textValue: e.macCompanion });
    await setEnt(planCode, 'folder-monitoring', { boolValue: e.folderMonitoring });
    await setEnt(planCode, 'calendar-sync', { boolValue: e.calendarSync });
    await setEnt(planCode, 'priority-processing', { boolValue: e.priorityProcessing });
    await setEnt(planCode, 'support-tier', { textValue: e.supportTier });
  }

  // ---- Feature definitions ---------------------------------------------------
  const features = [
    { code: 'mac-companion', name: 'Mac companion', category: 'integration' },
    { code: 'folder-monitoring', name: 'Automatic folder monitoring', category: 'integration' },
    { code: 'calendar-sync', name: 'Calendar synchronization', category: 'integration' },
    { code: 'priority-processing', name: 'Priority processing', category: 'processing' },
    { code: 'advanced-binder', name: 'Advanced binder capabilities', category: 'workflow' },
  ];
  for (const f of features) {
    await prisma.featureDefinition.upsert({ where: { code: f.code }, update: { name: f.name, category: f.category }, create: f });
  }

  // ---- Add-ons ---------------------------------------------------------------
  const addOns = [
    { code: 'ai-25', kind: 'ai-actions', name: '25 AI Case Actions', amount: dollars(29), interval: 'one-time', grantAmount: 25, grantUnit: 'actions', rolloverMonths: 12, quoteRequired: false },
    { code: 'ai-100', kind: 'ai-actions', name: '100 AI Case Actions', amount: dollars(89), interval: 'one-time', grantAmount: 100, grantUnit: 'actions', rolloverMonths: 12, quoteRequired: false },
    { code: 'ai-300', kind: 'ai-actions', name: '300 AI Case Actions', amount: dollars(199), interval: 'one-time', grantAmount: 300, grantUnit: 'actions', rolloverMonths: 12, quoteRequired: false },
    { code: 'storage-50', kind: 'storage', name: '+50 GB storage', amount: dollars(10), interval: 'monthly', grantAmount: 50, grantUnit: 'gb', quoteRequired: false },
    { code: 'storage-200', kind: 'storage', name: '+200 GB storage', amount: dollars(29), interval: 'monthly', grantAmount: 200, grantUnit: 'gb', quoteRequired: false },
    { code: 'storage-500', kind: 'storage', name: '+500 GB storage', amount: dollars(59), interval: 'monthly', grantAmount: 500, grantUnit: 'gb', quoteRequired: false },
    { code: 'case-1', kind: 'active-case', name: '+1 active case', amount: dollars(39), interval: 'monthly', grantAmount: 1, grantUnit: 'cases', quoteRequired: false },
    { code: 'svc-guided-setup', kind: 'service', name: 'Guided setup', amount: dollars(199), interval: 'one-time', quoteRequired: false },
    { code: 'svc-complex-migration', kind: 'service', name: 'Complex case migration', amount: dollars(499), interval: 'one-time', quoteRequired: true },
    { code: 'svc-white-glove', kind: 'service', name: 'White-glove case organization', amount: dollars(1499), interval: 'one-time', quoteRequired: true },
    { code: 'svc-live-onboarding', kind: 'service', name: 'Live onboarding session', amount: dollars(149), interval: 'one-time', quoteRequired: false },
  ];
  for (const a of addOns) {
    await prisma.addOnProduct.upsert({ where: { code: a.code }, update: { ...a, active: true }, create: { ...a, active: true } });
  }

  // ---- AI action definitions -------------------------------------------------
  const actions = [
    { code: 'rename-classify', name: 'Rename & classify document', minCharge: 0, maxCharge: 0, pageWeight: 0, docCountWeight: 0, tokenWeight: 0 },
    { code: 'short-summary', name: 'Summarize a short document', minCharge: 1, maxCharge: 1, pageWeight: 0, docCountWeight: 0, tokenWeight: 0 },
    { code: 'long-analysis', name: 'Analyze a long pleading', minCharge: 2, maxCharge: 4, pageWeight: 0.05, docCountWeight: 0, tokenWeight: 0 },
    { code: 'deadline-extract', name: 'Extract deadlines', minCharge: 1, maxCharge: 3, pageWeight: 0.03, docCountWeight: 0, tokenWeight: 0 },
    { code: 'discovery-extract', name: 'Extract one discovery set', minCharge: 5, maxCharge: 15, pageWeight: 0.1, docCountWeight: 0.5, tokenWeight: 0 },
    { code: 'doc-compare', name: 'Compare selected documents', minCharge: 5, maxCharge: 20, pageWeight: 0.05, docCountWeight: 2, tokenWeight: 0 },
    { code: 'contradiction-review', name: 'Run contradiction review', minCharge: 10, maxCharge: 30, pageWeight: 0.05, docCountWeight: 1, tokenWeight: 0 },
    { code: 'filing-review', name: 'Filing review', minCharge: 3, maxCharge: 10, pageWeight: 0.05, docCountWeight: 0, tokenWeight: 0 },
    { code: 'case-review', name: 'Run complete case review', minCharge: 25, maxCharge: 75, pageWeight: 0.02, docCountWeight: 0.5, tokenWeight: 0 },
    { code: 'counterargument', name: 'Counterargument analysis', minCharge: 5, maxCharge: 20, pageWeight: 0.03, docCountWeight: 0.5, tokenWeight: 0 },
    { code: 'research-synthesis', name: 'Research synthesis', minCharge: 5, maxCharge: 20, pageWeight: 0, docCountWeight: 0, tokenWeight: 0, webResearchWeight: 3 },
  ];
  for (const a of actions) {
    await prisma.aIActionDefinition.upsert({
      where: { code: a.code },
      update: { ...a, premiumModelWeight: 2, cachedDiscount: 0.5, enabled: true },
      create: { ...a, premiumModelWeight: 2, cachedDiscount: 0.5, enabled: true },
    });
  }

  // ---- Vendor price configuration (effective-dated; illustrative launch rates) ----
  // Token prices are cents per 1,000,000 tokens. These are INITIAL operating
  // assumptions, not vendor guarantees — admins update them without a deploy.
  const vendors = [
    { vendor: 'openai', service: 'chat', sku: 'gpt-standard', unitType: 'token', inputPerMillion: dollars(2.5), cachedInputPerMillion: dollars(1.25), outputPerMillion: dollars(10) },
    { vendor: 'anthropic', service: 'chat', sku: 'claude-standard', unitType: 'token', inputPerMillion: dollars(3), cachedInputPerMillion: dollars(0.3), outputPerMillion: dollars(15) },
    { vendor: 'gemini', service: 'chat', sku: 'gemini-standard', unitType: 'token', inputPerMillion: dollars(1.25), cachedInputPerMillion: dollars(0.3125), outputPerMillion: dollars(5) },
    { vendor: 'perplexity', service: 'search', sku: 'search-api', unitType: 'search', searchCallPrice: dollars(0.005) },
    { vendor: 'supabase', service: 'storage', sku: 'file-storage', unitType: 'storage-gb-month', storagePerGbMonth: 3 /* $0.0213 rounds to ~2-3c; use 3c */ },
    { vendor: 'processing', service: 'ocr', sku: 'ocr-page', unitType: 'ocr-page', ocrPagePrice: 1 },
  ];
  for (const v of vendors) {
    const existing = await prisma.vendorPriceConfiguration.findFirst({ where: { vendor: v.vendor, service: v.service, sku: v.sku, effectiveFrom: epoch } });
    if (existing) {
      await prisma.vendorPriceConfiguration.update({ where: { id: existing.id }, data: { ...v, active: true } });
    } else {
      await prisma.vendorPriceConfiguration.create({ data: { ...v, effectiveFrom: epoch, source: 'launch-assumption', active: true } });
    }
  }

  // ---- Cost budgets & margin targets ----------------------------------------
  const budgets = [
    { planCode: 'ESSENTIALS', aiBudget: dollars(6), infraBudget: dollars(8), supportBudget: dollars(4), targetCogs: dollars(18), minMarginBps: 6000 },
    { planCode: 'PRO', aiBudget: dollars(25), infraBudget: dollars(18), supportBudget: dollars(12), targetCogs: dollars(55), minMarginBps: 6000 },
    { planCode: 'COMMAND', aiBudget: dollars(70), infraBudget: dollars(45), supportBudget: dollars(30), targetCogs: dollars(145), minMarginBps: 5500 },
  ];
  for (const b of budgets) {
    await prisma.costBudget.upsert({
      where: { planCode_effectiveFrom: { planCode: b.planCode, effectiveFrom: epoch } },
      update: { ...b, warnBps: 7500, interventionBps: 10000, active: true },
      create: { ...b, warnBps: 7500, interventionBps: 10000, effectiveFrom: epoch, active: true },
    });
  }

  // ---- Stripe fee config -----------------------------------------------------
  const feeExists = await prisma.stripeFeeConfig.findFirst({ where: { active: true } });
  if (!feeExists) {
    await prisma.stripeFeeConfig.create({ data: { cardRateBps: 290, cardFixed: 30, billingBps: 70, active: true } });
  }

  // ---- Trial + founding config ----------------------------------------------
  const trialExists = await prisma.trialConfig.findFirst();
  if (!trialExists) await prisma.trialConfig.create({ data: {} }); // defaults match spec
  const foundingExists = await prisma.foundingMemberConfig.findFirst();
  if (!foundingExists) await prisma.foundingMemberConfig.create({ data: { cap: 100 } });

  return { plans: plans.length, prices: prices.length, addOns: addOns.length, actions: actions.length };
}
