/**
 * Centralized entitlement + usage service (§27, §28).
 *
 * EVERY product module goes through this service — no scattered plan-name
 * conditionals. Usage consumption is transaction-safe and idempotent:
 *   - included allowance is metered per billing period (UsageMeter);
 *   - purchased AI actions roll over (PurchasedActionGrant, oldest-expiry first);
 *   - every grant/consume/reverse is an append-only UsageLedgerEntry keyed by an
 *     idempotencyKey, so webhook/retry double-processing is impossible;
 *   - balances can never go negative.
 */
import { prisma } from '@/lib/prisma';
import { getPlanEntitlements, type EntitlementSet } from './catalog';

export type PeriodMeterKey = 'ai-actions' | 'processing-pages' | 'advanced-workflows';

export async function getSubscription(userId: string) {
  return prisma.accountSubscription.findUnique({ where: { userId } });
}

/** The plan whose entitlements apply right now. Trials use the trial plan. */
export async function effectivePlanCode(userId: string): Promise<string | null> {
  const sub = await getSubscription(userId);
  if (!sub) return null;
  if (['canceled', 'expired'].includes(sub.status)) return null;
  return sub.planCode;
}

export async function effectiveEntitlements(userId: string): Promise<EntitlementSet | null> {
  const code = await effectivePlanCode(userId);
  if (!code) return null;
  const ent = await getPlanEntitlements(code);
  // A trial caps some allowances below the plan default (§4).
  const sub = await getSubscription(userId);
  if (sub?.status === 'trialing') {
    const trial = await prisma.trial.findUnique({ where: { userId } });
    if (trial) {
      const cfg = JSON.parse(trial.configJson) as { maxCases: number; maxAiActions: number };
      return {
        ...ent,
        activeCases: Math.min(ent.activeCases, cfg.maxCases),
        aiActions: Math.min(ent.aiActions, cfg.maxAiActions),
        folderMonitoring: false, // trials never get folder monitoring
      };
    }
  }
  return ent;
}

/** The current billing period, from the subscription or the calendar month. */
export async function currentPeriod(userId: string): Promise<{ start: Date; end: Date }> {
  const sub = await getSubscription(userId);
  if (sub?.currentPeriodStart && sub?.currentPeriodEnd) {
    return { start: sub.currentPeriodStart, end: sub.currentPeriodEnd };
  }
  if (sub?.status === 'trialing' && sub.trialEndsAt) {
    return { start: sub.createdAt, end: sub.trialEndsAt };
  }
  const now = new Date();
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));
  return { start, end };
}

async function getOrCreateMeter(userId: string, key: PeriodMeterKey) {
  const ent = await effectiveEntitlements(userId);
  const limit = ent ? (key === 'ai-actions' ? ent.aiActions : key === 'processing-pages' ? ent.processingPages : ent.advancedWorkflows) : 0;
  const { start, end } = await currentPeriod(userId);
  const existing = await prisma.usageMeter.findUnique({ where: { userId_key_periodStart: { userId, key, periodStart: start } } });
  if (existing) {
    if (existing.includedLimit !== limit) {
      return prisma.usageMeter.update({ where: { id: existing.id }, data: { includedLimit: limit } });
    }
    return existing;
  }
  return prisma.usageMeter.create({ data: { userId, key, periodStart: start, periodEnd: end, includedLimit: limit, used: 0 } });
}

/** Live storage used (original files; derivatives tracked separately in snapshots). */
export async function storageBytesUsed(userId: string): Promise<number> {
  const agg = await prisma.document.aggregate({ _sum: { sizeBytes: true }, where: { case: { userId }, deletedAt: null } });
  return agg._sum.sizeBytes ?? 0;
}

/** Active (non-archived) case count. */
export async function activeCaseCount(userId: string): Promise<number> {
  return prisma.case.count({ where: { userId, status: { notIn: ['archived', 'closed'] } } });
}

/** Non-expired purchased AI-action balance. */
export async function purchasedActionBalance(userId: string): Promise<number> {
  const now = new Date();
  const grants = await prisma.purchasedActionGrant.findMany({ where: { userId, active: true, expiresAt: { gt: now } } });
  return grants.reduce((s, g) => s + g.remaining, 0);
}

export async function aiActionsBalance(userId: string): Promise<{ includedRemaining: number; purchased: number; total: number }> {
  const meter = await getOrCreateMeter(userId, 'ai-actions');
  const includedRemaining = Math.max(0, meter.includedLimit - meter.used);
  const purchased = await purchasedActionBalance(userId);
  return { includedRemaining, purchased, total: includedRemaining + purchased };
}

// ---- can* guards -----------------------------------------------------------

export async function canCreateCase(userId: string) {
  const ent = await effectiveEntitlements(userId);
  if (!ent) return { allowed: false, reason: 'no-subscription' as const };
  const used = await activeCaseCount(userId);
  // Additional active-case add-ons raise the limit.
  const extra = await activeCaseAddOnCount(userId);
  const limit = ent.activeCases + extra;
  return used < limit ? { allowed: true as const, used, limit } : { allowed: false as const, reason: 'case-limit' as const, used, limit };
}

async function activeCaseAddOnCount(userId: string): Promise<number> {
  const rows = await prisma.accountAddOn.findMany({ where: { userId, status: 'active', addOnCode: 'case-1' } });
  return rows.reduce((s, r) => s + r.quantity, 0);
}

async function storageAddOnBytes(userId: string): Promise<number> {
  const GBc = 1024 * 1024 * 1024;
  const rows = await prisma.accountAddOn.findMany({ where: { userId, status: 'active', addOnCode: { in: ['storage-50', 'storage-200', 'storage-500'] } } });
  const map: Record<string, number> = { 'storage-50': 50, 'storage-200': 200, 'storage-500': 500 };
  return rows.reduce((s, r) => s + (map[r.addOnCode] ?? 0) * r.quantity * GBc, 0);
}

export async function canUploadBytes(userId: string, bytes: number) {
  const ent = await effectiveEntitlements(userId);
  if (!ent) return { allowed: false, reason: 'no-subscription' as const };
  const used = await storageBytesUsed(userId);
  const limit = ent.storageBytes + (await storageAddOnBytes(userId));
  return used + bytes <= limit
    ? { allowed: true as const, used, limit }
    : { allowed: false as const, reason: 'storage-limit' as const, used, limit };
}

export async function canProcessPages(userId: string, pages: number) {
  const meter = await getOrCreateMeter(userId, 'processing-pages');
  const remaining = Math.max(0, meter.includedLimit - meter.used);
  return pages <= remaining
    ? { allowed: true as const, remaining, limit: meter.includedLimit }
    : { allowed: false as const, reason: 'processing-limit' as const, remaining, limit: meter.includedLimit };
}

export async function canRunAdvancedWorkflow(userId: string, units = 1) {
  const meter = await getOrCreateMeter(userId, 'advanced-workflows');
  const remaining = Math.max(0, meter.includedLimit - meter.used);
  return units <= remaining
    ? { allowed: true as const, remaining, limit: meter.includedLimit }
    : { allowed: false as const, reason: 'workflow-limit' as const, remaining, limit: meter.includedLimit };
}

export async function canRunAIAction(userId: string, estimate: number) {
  const bal = await aiActionsBalance(userId);
  return estimate <= bal.total
    ? { allowed: true as const, balance: bal }
    : { allowed: false as const, reason: 'ai-action-limit' as const, balance: bal };
}

export async function canUseFeature(userId: string, featureCode: string) {
  const ent = await effectiveEntitlements(userId);
  if (!ent) return { allowed: false, reason: 'no-subscription' as const };
  const map: Record<string, boolean> = {
    'folder-monitoring': ent.folderMonitoring,
    'calendar-sync': ent.calendarSync,
    'priority-processing': ent.priorityProcessing,
    'mac-companion': ent.macCompanion !== 'none',
    'mac-companion-automatic': ent.macCompanion === 'automatic',
  };
  const allowed = map[featureCode] ?? false;
  return allowed ? { allowed: true as const } : { allowed: false as const, reason: 'feature-locked' as const, feature: featureCode };
}

// ---- consume / reverse (transaction-safe, idempotent) ----------------------

export type ConsumeRequest = {
  meterKey: PeriodMeterKey;
  amount: number;
  idempotencyKey: string;
  refType?: string;
  refId?: string;
  allowPurchased?: boolean; // AI actions may spill into purchased grants
};

/**
 * Consume usage atomically. Returns { alreadyProcessed } when the idempotencyKey
 * was seen before (no double charge). Throws on insufficient balance.
 */
export async function consumeUsage(userId: string, req: ConsumeRequest) {
  if (req.amount < 0) throw new Error('amount must be >= 0');
  // Compute period + limit outside the tx (reads), then enforce inside.
  const { start, end } = await currentPeriod(userId);
  const ent = await effectiveEntitlements(userId);
  const limit = ent ? (req.meterKey === 'ai-actions' ? ent.aiActions : req.meterKey === 'processing-pages' ? ent.processingPages : ent.advancedWorkflows) : 0;

  return prisma.$transaction(async (tx) => {
    // Idempotency: one ledger row per key.
    const existing = await tx.usageLedgerEntry.findUnique({ where: { idempotencyKey: req.idempotencyKey } });
    if (existing) return { alreadyProcessed: true, ledgerId: existing.id, consumedIncluded: 0, consumedPurchased: 0 };

    if (req.amount === 0) {
      const zero = await tx.usageLedgerEntry.create({ data: { userId, meterKey: req.meterKey, kind: 'consume', delta: 0, idempotencyKey: req.idempotencyKey, refType: req.refType, refId: req.refId, note: 'no-op' } });
      return { alreadyProcessed: false, ledgerId: zero.id, consumedIncluded: 0, consumedPurchased: 0 };
    }

    const meter = (await tx.usageMeter.findUnique({ where: { userId_key_periodStart: { userId, key: req.meterKey, periodStart: start } } }))
      ?? (await tx.usageMeter.create({ data: { userId, key: req.meterKey, periodStart: start, periodEnd: end, includedLimit: limit, used: 0 } }));

    const includedRemaining = Math.max(0, meter.includedLimit - meter.used);
    let need = req.amount;
    const consumedIncluded = Math.min(includedRemaining, need);
    need -= consumedIncluded;

    let consumedPurchased = 0;
    const grantConsumption: { id: string; take: number }[] = [];
    if (need > 0 && req.allowPurchased) {
      const now = new Date();
      const grants = await tx.purchasedActionGrant.findMany({
        where: { userId, active: true, remaining: { gt: 0 }, expiresAt: { gt: now } },
        orderBy: { expiresAt: 'asc' }, // burn soonest-to-expire first
      });
      for (const g of grants) {
        if (need <= 0) break;
        const take = Math.min(g.remaining, need);
        grantConsumption.push({ id: g.id, take });
        need -= take;
        consumedPurchased += take;
      }
    }

    if (need > 0) {
      // Insufficient — hard stop. Nothing is written (tx rolls back on throw).
      throw new Error(`INSUFFICIENT_BALANCE:${req.meterKey}:short=${need}`);
    }

    // Apply included consumption to the meter.
    if (consumedIncluded > 0) {
      await tx.usageMeter.update({ where: { id: meter.id }, data: { used: meter.used + consumedIncluded } });
    }
    // Apply purchased consumption to grants.
    for (const gc of grantConsumption) {
      const g = await tx.purchasedActionGrant.findUnique({ where: { id: gc.id } });
      const remaining = (g?.remaining ?? 0) - gc.take;
      await tx.purchasedActionGrant.update({ where: { id: gc.id }, data: { remaining, active: remaining > 0 } });
    }
    const ledger = await tx.usageLedgerEntry.create({
      data: {
        userId, meterKey: req.meterKey, kind: 'consume', delta: -req.amount,
        idempotencyKey: req.idempotencyKey, refType: req.refType, refId: req.refId,
        note: `included=${consumedIncluded} purchased=${consumedPurchased}`,
      },
    });
    return { alreadyProcessed: false, ledgerId: ledger.id, consumedIncluded, consumedPurchased };
  });
}

/** Reverse a prior consumption (compensating entry). Refunds included usage; for
 *  purchased actions it credits a fresh grant so rollover/expiry stays honest. */
export async function reverseUsage(ledgerEntryId: string) {
  return prisma.$transaction(async (tx) => {
    const entry = await tx.usageLedgerEntry.findUnique({ where: { id: ledgerEntryId } });
    if (!entry) throw new Error('Ledger entry not found');
    if (entry.kind !== 'consume') throw new Error('Only consume entries can be reversed');
    const reverseKey = `reverse:${entry.id}`;
    const already = await tx.usageLedgerEntry.findUnique({ where: { idempotencyKey: reverseKey } });
    if (already) return { alreadyProcessed: true, ledgerId: already.id };

    // Parse how much was included vs purchased.
    const m = /included=(\d+) purchased=(\d+)/.exec(entry.note ?? '');
    const included = m ? parseInt(m[1] ?? '0', 10) : Math.abs(entry.delta);
    const purchased = m ? parseInt(m[2] ?? '0', 10) : 0;

    if (included > 0) {
      const { start } = await currentPeriodTx(tx, entry.userId);
      const meter = await tx.usageMeter.findUnique({ where: { userId_key_periodStart: { userId: entry.userId, key: entry.meterKey, periodStart: start } } });
      if (meter) await tx.usageMeter.update({ where: { id: meter.id }, data: { used: Math.max(0, meter.used - included) } });
    }
    if (purchased > 0) {
      const in12mo = new Date(Date.now() + 365 * 24 * 3600 * 1000);
      await tx.purchasedActionGrant.create({ data: { userId: entry.userId, granted: purchased, remaining: purchased, source: 'refund', expiresAt: in12mo, active: true } });
    }
    const rev = await tx.usageLedgerEntry.create({
      data: { userId: entry.userId, meterKey: entry.meterKey, kind: 'reverse', delta: Math.abs(entry.delta), idempotencyKey: reverseKey, refType: 'ledger', refId: entry.id, note: `reversal of ${entry.id}` },
    });
    return { alreadyProcessed: false, ledgerId: rev.id };
  });
}

async function currentPeriodTx(tx: any, userId: string): Promise<{ start: Date; end: Date }> {
  const sub = await tx.accountSubscription.findUnique({ where: { userId } });
  if (sub?.currentPeriodStart && sub?.currentPeriodEnd) return { start: sub.currentPeriodStart, end: sub.currentPeriodEnd };
  const now = new Date();
  return { start: new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)), end: new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1)) };
}

/** Grant purchased AI actions (from an add-on purchase or admin adjustment). */
export async function grantPurchasedActions(userId: string, amount: number, source = 'addon', rolloverMonths = 12) {
  const expiresAt = new Date(Date.now() + rolloverMonths * 30 * 24 * 3600 * 1000);
  return prisma.$transaction(async (tx) => {
    const grant = await tx.purchasedActionGrant.create({ data: { userId, granted: amount, remaining: amount, source, expiresAt, active: true } });
    await tx.usageLedgerEntry.create({ data: { userId, meterKey: 'ai-actions', kind: 'purchase-grant', delta: amount, balanceAfter: amount, idempotencyKey: `grant:${grant.id}`, refType: 'grant', refId: grant.id, expiresAt, note: `+${amount} actions (${source})` } });
    return grant;
  });
}

// ---- summaries + upgrade options -------------------------------------------

export async function getUsageSummary(userId: string) {
  const sub = await getSubscription(userId);
  const ent = await effectiveEntitlements(userId);
  const [aiBal, storageUsed, cases, procMeter, wfMeter] = await Promise.all([
    aiActionsBalance(userId),
    storageBytesUsed(userId),
    activeCaseCount(userId),
    getOrCreateMeter(userId, 'processing-pages'),
    getOrCreateMeter(userId, 'advanced-workflows'),
  ]);
  const period = await currentPeriod(userId);
  return {
    plan: sub?.planCode ?? null,
    status: sub?.status ?? null,
    interval: sub?.interval ?? null,
    cadence: sub?.cadence ?? null,
    foundingMember: sub?.foundingMember ?? false,
    renewalDate: sub?.currentPeriodEnd ?? sub?.trialEndsAt ?? null,
    period,
    activeCases: { used: cases, limit: ent?.activeCases ?? 0 },
    storage: { usedBytes: storageUsed, limitBytes: ent?.storageBytes ?? 0 },
    aiActions: { includedRemaining: aiBal.includedRemaining, purchased: aiBal.purchased, total: aiBal.total, limit: ent?.aiActions ?? 0 },
    processingPages: { used: procMeter.used, limit: procMeter.includedLimit },
    advancedWorkflows: { used: wfMeter.used, limit: wfMeter.includedLimit },
    features: ent ? { macCompanion: ent.macCompanion, folderMonitoring: ent.folderMonitoring, calendarSync: ent.calendarSync, priorityProcessing: ent.priorityProcessing, supportTier: ent.supportTier } : null,
  };
}

/** Which higher plans unlock a blocked feature/limit — for contextual upgrade prompts. */
export async function getUpgradeOptions(userId: string, blockedFeature: string) {
  const current = await effectivePlanCode(userId);
  const plans = await prisma.commercialPlan.findMany({ where: { active: true }, orderBy: { tierOrder: 'asc' } });
  const currentOrder = plans.find((p) => p.code === current)?.tierOrder ?? 0;
  const options = [];
  for (const p of plans) {
    if (p.tierOrder <= currentOrder) continue;
    const ent = await getPlanEntitlements(p.code);
    options.push({ code: p.code, name: p.name, badge: p.badge, entitlements: ent, blockedFeature });
  }
  return options;
}
