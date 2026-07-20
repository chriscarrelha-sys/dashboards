import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';

vi.mock('next/cache', () => ({ revalidatePath: () => {} }));

import { prisma } from '@/lib/prisma';
import { seedCommercial } from '@/lib/commercial/seed';
import { getPublicCatalog, getPlanEntitlements, getPlanPrice, foundingSeatsRemaining } from '@/lib/commercial/catalog';
import {
  effectiveEntitlements, canCreateCase, canUploadBytes, canProcessPages, canRunAdvancedWorkflow,
  canRunAIAction, canUseFeature, consumeUsage, reverseUsage, grantPurchasedActions, aiActionsBalance,
  getUsageSummary, getUpgradeOptions,
} from '@/lib/commercial/entitlements';
import { estimateAiActions } from '@/lib/commercial/ai-actions';
import { recordAiCost, marginReportByPlan } from '@/lib/commercial/cost';
import { startTrial, expireTrial, subscribe, upgrade, scheduleDowngrade, applyScheduledChange, downgradeImpact, cancel } from '@/lib/commercial/subscription';
import { handleWebhookEvent, createCheckoutSession, stripeMode } from '@/lib/commercial/stripe';
import { dollars } from '@/lib/commercial/money';

let userId: string;

async function cleanUser(id: string) {
  await prisma.usageLedgerEntry.deleteMany({ where: { userId: id } });
  await prisma.usageMeter.deleteMany({ where: { userId: id } });
  await prisma.purchasedActionGrant.deleteMany({ where: { userId: id } });
  await prisma.accountAddOn.deleteMany({ where: { userId: id } });
  await prisma.accountSubscription.deleteMany({ where: { userId: id } });
  await prisma.subscriptionStatusHistory.deleteMany({ where: { userId: id } });
  await prisma.foundingMemberGrant.deleteMany({ where: { userId: id } });
  await prisma.trial.deleteMany({ where: { userId: id } });
  await prisma.trialUsage.deleteMany({ where: { userId: id } });
  await prisma.aIProviderCostRecord.deleteMany({ where: { userId: id } });
  await prisma.commercialAuditLog.deleteMany({ where: { userId: id } });
  await prisma.case.deleteMany({ where: { userId: id } });
  await prisma.user.deleteMany({ where: { id } });
}

beforeAll(async () => {
  await seedCommercial(prisma);
  const u = await prisma.user.create({ data: { email: `commercial-${Date.now()}@t.local` } });
  userId = u.id;
});

afterAll(async () => {
  await cleanUser(userId);
  await prisma.$disconnect();
});

describe('catalog (single source of truth)', () => {
  it('exposes the three plans with correct prices, badge, and entitlements', async () => {
    const cat = await getPublicCatalog();
    expect(cat.plans.map((p) => p.code)).toEqual(['ESSENTIALS', 'PRO', 'COMMAND']);
    const pro = cat.plans.find((p) => p.code === 'PRO')!;
    expect(pro.badge).toBe('Most Popular');
    expect(pro.prices.standard.monthly).toBe(dollars(179));
    expect(pro.prices.standard.annual).toBe(dollars(1790));
    const command = cat.plans.find((p) => p.code === 'COMMAND')!;
    expect(command.badge).toBe('Best for Complex Litigation');
    expect(command.entitlements.activeCases).toBe(15);
    expect(command.entitlements.aiActions).toBe(500);
    expect(command.entitlements.storageGb).toBe(200);
  });

  it('founding prices are present while seats remain', async () => {
    const cat = await getPublicCatalog();
    const { remaining } = await foundingSeatsRemaining();
    const ess = cat.plans.find((p) => p.code === 'ESSENTIALS')!;
    if (remaining > 0) expect(ess.prices.founding?.monthly).toBe(dollars(49));
  });

  it('reads plan prices for every interval/cadence', async () => {
    expect((await getPlanPrice('COMMAND', 'monthly', 'standard'))?.amount).toBe(dollars(399));
    expect((await getPlanPrice('COMMAND', 'annual', 'founding'))?.amount).toBe(dollars(3490));
    expect((await getPlanPrice('PRO', 'monthly', 'founding'))?.amount).toBe(dollars(149));
  });
});

describe('trials', () => {
  it('starts a Pro trial, caps allowances, and forbids a second trial', async () => {
    await startTrial(userId);
    const ent = await effectiveEntitlements(userId);
    expect(ent?.aiActions).toBe(10);  // capped below Pro's 150
    expect(ent?.activeCases).toBe(1);
    expect(ent?.folderMonitoring).toBe(false);
    await expect(startTrial(userId)).rejects.toThrow(/already been used/i);
  });

  it('expires into a read-only state that preserves export', async () => {
    await expireTrial(userId);
    const sub = await prisma.accountSubscription.findUnique({ where: { userId } });
    expect(sub?.status).toBe('read_only');
    expect(sub?.exportUntil).not.toBeNull();
  });
});

describe('AI action estimation', () => {
  it('estimates within the action band and flags approval for big jobs', async () => {
    const zero = await estimateAiActions('rename-classify', { pages: 5 });
    expect(zero.actions).toBe(0);
    const short = await estimateAiActions('short-summary', { pages: 2 });
    expect(short.actions).toBe(1);
    const review = await estimateAiActions('case-review', { pages: 2000, docCount: 40 });
    expect(review.actions).toBeGreaterThanOrEqual(25);
    expect(review.actions).toBeLessThanOrEqual(75);
    expect(review.needsApproval).toBe(true);
  });

  it('applies a cached discount', async () => {
    const fresh = await estimateAiActions('long-analysis', { pages: 60 });
    const cached = await estimateAiActions('long-analysis', { pages: 60, cached: true });
    expect(cached.actions).toBeLessThanOrEqual(fresh.actions);
  });
});

describe('entitlement enforcement + transaction-safe ledger', () => {
  beforeAll(async () => {
    // Move the user onto a real Pro subscription for enforcement tests.
    await subscribe(userId, { planCode: 'PRO', interval: 'monthly', cadence: 'standard' });
  });

  it('meters AI actions, is idempotent, and never double-charges', async () => {
    const before = await aiActionsBalance(userId);
    const r1 = await consumeUsage(userId, { meterKey: 'ai-actions', amount: 5, idempotencyKey: 'k-ai-1' });
    const r2 = await consumeUsage(userId, { meterKey: 'ai-actions', amount: 5, idempotencyKey: 'k-ai-1' });
    expect(r1.alreadyProcessed).toBe(false);
    expect(r2.alreadyProcessed).toBe(true); // same key → no second charge
    const after = await aiActionsBalance(userId);
    expect(after.includedRemaining).toBe(before.includedRemaining - 5);
  });

  it('consumes included allowance before purchased actions, respecting expiry', async () => {
    // Expired grant should not count.
    await prisma.purchasedActionGrant.create({ data: { userId, granted: 100, remaining: 100, source: 'addon', expiresAt: new Date(Date.now() - 1000), active: true } });
    let bal = await aiActionsBalance(userId);
    expect(bal.purchased).toBe(0);

    // Fresh grant of 100 that rolls over.
    await grantPurchasedActions(userId, 100, 'addon');
    bal = await aiActionsBalance(userId);
    expect(bal.purchased).toBe(100);

    // Drain included to 0, then a charge must spill into purchased.
    const included = bal.includedRemaining;
    await consumeUsage(userId, { meterKey: 'ai-actions', amount: included, idempotencyKey: 'k-drain', allowPurchased: true });
    const spill = await consumeUsage(userId, { meterKey: 'ai-actions', amount: 10, idempotencyKey: 'k-spill', allowPurchased: true });
    expect(spill.consumedIncluded).toBe(0);
    expect(spill.consumedPurchased).toBe(10);
    expect((await aiActionsBalance(userId)).purchased).toBe(90);
  });

  it('hard-stops (throws, writes nothing) when balance is insufficient', async () => {
    const bal = await aiActionsBalance(userId);
    await expect(consumeUsage(userId, { meterKey: 'ai-actions', amount: bal.total + 50, idempotencyKey: 'k-over', allowPurchased: true }))
      .rejects.toThrow(/INSUFFICIENT_BALANCE/);
    // Nothing consumed.
    expect((await aiActionsBalance(userId)).total).toBe(bal.total);
  });

  it('reverses a consumption (compensating entry)', async () => {
    const r = await consumeUsage(userId, { meterKey: 'processing-pages', amount: 100, idempotencyKey: 'k-proc-1' });
    const summ1 = await getUsageSummary(userId);
    expect(summ1.processingPages.used).toBeGreaterThanOrEqual(100);
    await reverseUsage(r.ledgerId);
    const again = await reverseUsage(r.ledgerId); // idempotent
    expect(again.alreadyProcessed).toBe(true);
    const summ2 = await getUsageSummary(userId);
    expect(summ2.processingPages.used).toBe(summ1.processingPages.used - 100);
  });

  it('enforces processing-page and advanced-workflow limits', async () => {
    const proc = await canProcessPages(userId, 999999);
    expect(proc.allowed).toBe(false);
    const wf = await canRunAdvancedWorkflow(userId, 999);
    expect(wf.allowed).toBe(false);
  });

  it('enforces active-case limits and honors a case add-on', async () => {
    // Pro allows 5 active cases.
    for (let i = 0; i < 5; i++) {
      await prisma.case.create({ data: { userId, shortName: `C${i}`, caption: `C${i}`, caseNumber: `C-${i}`, forum: 'state' } });
    }
    let can = await canCreateCase(userId);
    expect(can.allowed).toBe(false); // at limit
    await prisma.accountAddOn.create({ data: { userId, addOnCode: 'case-1', quantity: 1, status: 'active' } });
    can = await canCreateCase(userId);
    expect(can.allowed).toBe(true); // add-on raised the limit to 6
  });

  it('enforces storage limits and gates locked features', async () => {
    const smallOk = await canUploadBytes(userId, 1024);
    expect(smallOk.allowed).toBe(true);
    const huge = await canUploadBytes(userId, 500 * 1024 * 1024 * 1024);
    expect(huge.allowed).toBe(false);
    // Pro does NOT include folder monitoring; Command does.
    expect((await canUseFeature(userId, 'folder-monitoring')).allowed).toBe(false);
    expect((await canUseFeature(userId, 'calendar-sync')).allowed).toBe(true);
  });

  it('offers higher plans as upgrade options for a blocked feature', async () => {
    const opts = await getUpgradeOptions(userId, 'folder-monitoring');
    expect(opts.map((o) => o.code)).toContain('COMMAND');
  });
});

describe('upgrade / downgrade', () => {
  it('upgrades immediately with larger entitlements', async () => {
    await upgrade(userId, 'COMMAND');
    const ent = await effectiveEntitlements(userId);
    expect(ent?.activeCases).toBe(15);
    expect(ent?.folderMonitoring).toBe(true);
    expect((await canUseFeature(userId, 'folder-monitoring')).allowed).toBe(true);
  });

  it('schedules a downgrade, surfaces impact, and applies at period end', async () => {
    const impact = await downgradeImpact(userId, 'ESSENTIALS');
    expect(impact.excessCases).toBeGreaterThan(0); // has >1 active case
    expect(impact.losesFolderMonitoring).toBe(true);
    await scheduleDowngrade(userId, 'ESSENTIALS');
    let sub = await prisma.accountSubscription.findUnique({ where: { userId } });
    expect(sub?.scheduledPlanCode).toBe('ESSENTIALS');
    expect(sub?.planCode).toBe('COMMAND'); // unchanged until period end
    // Force the period to have ended, then apply.
    await prisma.accountSubscription.update({ where: { userId }, data: { currentPeriodEnd: new Date(Date.now() - 1000) } });
    await applyScheduledChange(userId);
    sub = await prisma.accountSubscription.findUnique({ where: { userId } });
    expect(sub?.planCode).toBe('ESSENTIALS');
    expect(sub?.scheduledPlanCode).toBeNull();
  });
});

describe('founding-member cap', () => {
  it('prevents exceeding the configured cap', async () => {
    const cfg = await prisma.foundingMemberConfig.findFirst();
    const activeNow = await prisma.foundingMemberGrant.count({ where: { active: true } });
    // Set cap so exactly one more founding seat is available.
    await prisma.foundingMemberConfig.update({ where: { id: cfg!.id }, data: { cap: activeNow + 1 } });
    const a = await prisma.user.create({ data: { email: `f-a-${Date.now()}@t.local` } });
    const b = await prisma.user.create({ data: { email: `f-b-${Date.now()}@t.local` } });
    await subscribe(a.id, { planCode: 'PRO', interval: 'monthly', cadence: 'founding' }); // takes the last seat
    await expect(subscribe(b.id, { planCode: 'PRO', interval: 'monthly', cadence: 'founding' }))
      .rejects.toThrow(/sold out/i);
    // Cancelling frees founding status.
    await cancel(a.id);
    expect((await prisma.foundingMemberGrant.findUnique({ where: { userId: a.id } }))?.active).toBe(false);
    // Cleanup + restore cap.
    await prisma.foundingMemberConfig.update({ where: { id: cfg!.id }, data: { cap: cfg!.cap } });
    await cleanUser(a.id); await cleanUser(b.id);
  });
});

describe('stripe mapping (mocked) + cost accounting', () => {
  it('creates a mock checkout session and processes webhooks idempotently', async () => {
    expect(stripeMode()).toBe('mock');
    const sess = await createCheckoutSession(userId, 'PRO', 'monthly', 'standard');
    expect(sess.amount).toBe(dollars(179));
    const evt = `evt_${userId}`;
    const w1 = await handleWebhookEvent(evt, 'invoice.paid', { a: 1 });
    const w2 = await handleWebhookEvent(evt, 'invoice.paid', { a: 1 });
    expect(w1.duplicate).toBe(false);
    expect(w2.duplicate).toBe(true); // never processed twice
  });

  it('computes internal AI cost from effective-dated vendor rates', async () => {
    const rec = await recordAiCost(userId, { provider: 'anthropic', model: 'claude-standard', inputTokens: 1_000_000, outputTokens: 1_000_000, actionsCharged: 5 });
    // 1M input @ $3 + 1M output @ $15 = $18 = 1800 cents.
    expect(rec.calculatedCost).toBe(dollars(18));
  });

  it('produces a margin report with per-plan contribution', async () => {
    const now = new Date();
    const rows = await marginReportByPlan(new Date(now.getTime() - 30 * 864e5), new Date(now.getTime() + 864e5));
    expect(rows.length).toBe(3);
    for (const r of rows) {
      expect(typeof r.marginBps).toBe('number');
      expect(r.estimatedFields).toContain('paymentFees');
    }
  });
});

describe('end-to-end commercial lifecycle (§29)', () => {
  it('trial → subscribe Pro → buy pack → expensive action → upgrade → downgrade → cancel (export preserved)', async () => {
    const u = await prisma.user.create({ data: { email: `e2e-${Date.now()}@t.local` } });
    const id = u.id;
    try {
      // 1. Start Pro trial. 2. "Upload" documents (as a case). 3. Consume trial AI actions.
      await startTrial(id);
      const c = await prisma.case.create({ data: { userId: id, shortName: 'E2E', caption: 'E2E', caseNumber: 'E-1', forum: 'state' } });
      await prisma.document.create({ data: { caseId: c.id, standardizedName: 'd.pdf', originalName: 'd.pdf', sizeBytes: 1024 } });
      const est = await estimateAiActions('short-summary', { pages: 2 }, { trial: true });
      await consumeUsage(id, { meterKey: 'ai-actions', amount: est.actions, idempotencyKey: `e2e-ai-${id}-1` });

      // 4. Reach trial limit (10 actions) → further consumption hard-stops.
      await expect(consumeUsage(id, { meterKey: 'ai-actions', amount: 100, idempotencyKey: `e2e-over-${id}` }))
        .rejects.toThrow(/INSUFFICIENT_BALANCE/);

      // 5-6. Subscribe to Pro → entitlements update to 150 actions.
      await subscribe(id, { planCode: 'PRO', interval: 'monthly', cadence: 'standard' });
      expect((await effectiveEntitlements(id))?.aiActions).toBe(150);

      // 7-9. Purchase an action pack; run an expensive action; usage + cost recorded.
      await grantPurchasedActions(id, 100, 'addon');
      const review = await estimateAiActions('case-review', { pages: 1500, docCount: 30 }, { planCode: 'PRO' });
      const consumed = await consumeUsage(id, { meterKey: 'ai-actions', amount: review.actions, idempotencyKey: `e2e-review-${id}`, allowPurchased: true });
      expect(consumed.consumedIncluded + consumed.consumedPurchased).toBe(review.actions);
      await recordAiCost(id, { provider: 'anthropic', model: 'claude-standard', inputTokens: 200000, outputTokens: 50000, actionCode: 'case-review', actionsCharged: review.actions });
      expect(await prisma.aIProviderCostRecord.count({ where: { userId: id } })).toBe(1);

      // 10-11. Upgrade to Command → storage + case limits increase.
      await upgrade(id, 'COMMAND');
      const cmd = await effectiveEntitlements(id);
      expect(cmd?.activeCases).toBe(15);
      expect(cmd?.storageBytes).toBe(200 * 1024 * 1024 * 1024);

      // 12-13. Schedule downgrade → excess cases flagged as archive-required.
      for (let i = 0; i < 2; i++) await prisma.case.create({ data: { userId: id, shortName: `X${i}`, caption: `X${i}`, caseNumber: `X-${i}`, forum: 'state' } });
      const impact = await downgradeImpact(id, 'ESSENTIALS');
      expect(impact.excessCases).toBeGreaterThan(0);
      await scheduleDowngrade(id, 'ESSENTIALS');

      // 14-15. Cancel → read-only grace; full export remains available.
      await cancel(id);
      const sub = await prisma.accountSubscription.findUnique({ where: { userId: id } });
      expect(sub?.status).toBe('canceled');
      expect(sub?.exportUntil).not.toBeNull();
      expect(sub!.exportUntil!.getTime()).toBeGreaterThan(Date.now());
    } finally {
      await cleanUser(id);
    }
  });
});
