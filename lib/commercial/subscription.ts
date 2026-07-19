/**
 * Subscription lifecycle (§3, §4, §16, §18–20).
 *
 * Internal records are authoritative for features/limits; Stripe is authoritative
 * only for payment status. Founding pricing is capped at 100 active grants and
 * ends the moment the subscription lapses.
 */
import { prisma } from '@/lib/prisma';
import { getPlanPrice, foundingSeatsRemaining } from './catalog';

async function commercialAudit(userId: string | null, action: string, entity: string, entityId?: string, detail?: string, actorType = 'user') {
  await prisma.commercialAuditLog.create({ data: { userId, actorType, action, entity, entityId: entityId ?? null, detail: detail ?? null } });
}

async function setStatus(userId: string, toStatus: string, reason?: string) {
  const sub = await prisma.accountSubscription.findUnique({ where: { userId } });
  await prisma.subscriptionStatusHistory.create({ data: { userId, fromStatus: sub?.status ?? null, toStatus, reason } });
  return prisma.accountSubscription.update({ where: { userId }, data: { status: toStatus } });
}

function addDays(d: Date, days: number) { return new Date(d.getTime() + days * 24 * 3600 * 1000); }
function addMonths(d: Date, n: number) { const x = new Date(d); x.setUTCMonth(x.getUTCMonth() + n); return x; }

/* ------------------------------ Trials ------------------------------ */

export async function startTrial(userId: string) {
  const cfg = (await prisma.trialConfig.findFirst()) ?? (await prisma.trialConfig.create({ data: {} }));
  if (cfg.onePerUser) {
    const prior = await prisma.trial.findUnique({ where: { userId } });
    if (prior) throw new Error('A trial has already been used for this account.');
  }
  const now = new Date();
  const endsAt = addDays(now, cfg.days);
  const configJson = JSON.stringify({
    days: cfg.days, maxCases: cfg.maxCases, maxDocuments: cfg.maxDocuments, maxAiActions: cfg.maxAiActions,
    maxBinders: cfg.maxBinders, allowFolderMonitoring: cfg.allowFolderMonitoring, allowBulkImport: cfg.allowBulkImport,
    allowCaseWideReview: cfg.allowCaseWideReview, exportGraceDays: cfg.exportGraceDays,
  });
  await prisma.trial.create({ data: { userId, planCode: cfg.planCode, endsAt, status: 'active', configJson } });
  await prisma.trialUsage.upsert({ where: { userId }, update: {}, create: { userId } });
  const sub = await prisma.accountSubscription.upsert({
    where: { userId },
    update: { planCode: cfg.planCode, status: 'trialing', trialEndsAt: endsAt, cadence: 'standard' },
    create: { userId, planCode: cfg.planCode, interval: 'monthly', cadence: 'standard', status: 'trialing', trialEndsAt: endsAt },
  });
  await commercialAudit(userId, 'trial.start', 'Trial', sub.id, `${cfg.planCode} ${cfg.days}d`);
  return sub;
}

export async function expireTrial(userId: string) {
  const trial = await prisma.trial.findUnique({ where: { userId } });
  if (trial && trial.status === 'active') {
    await prisma.trial.update({ where: { userId }, data: { status: 'expired' } });
  }
  const cfg = await prisma.trialConfig.findFirst();
  const exportUntil = addDays(new Date(), cfg?.exportGraceDays ?? 30);
  await prisma.accountSubscription.update({ where: { userId }, data: { readOnlyAt: new Date(), exportUntil } });
  await setStatus(userId, 'read_only', 'trial-expired');
  await commercialAudit(userId, 'trial.expire', 'Trial', trial?.id, 'read-only; export preserved');
}

/* ---------------------------- Subscribe ----------------------------- */

export type SubscribeInput = { planCode: string; interval: 'monthly' | 'annual'; cadence: 'standard' | 'founding' };

export async function subscribe(userId: string, input: SubscribeInput) {
  const price = await getPlanPrice(input.planCode, input.interval, input.cadence);
  if (!price) throw new Error(`No active price for ${input.planCode}/${input.interval}/${input.cadence}`);

  let foundingMember = false;
  if (input.cadence === 'founding') {
    // Enforce the cap from authoritative subscription records, transactionally.
    foundingMember = await prisma.$transaction(async (tx) => {
      const cfg = await tx.foundingMemberConfig.findFirst();
      const cap = cfg?.cap ?? 100;
      const used = await tx.foundingMemberGrant.count({ where: { active: true } });
      if (used >= cap) throw new Error('Founding-member seats are sold out.');
      const existing = await tx.foundingMemberGrant.findUnique({ where: { userId } });
      if (existing) {
        if (!existing.active) await tx.foundingMemberGrant.update({ where: { userId }, data: { active: true, endedAt: null, endedReason: null } });
      } else {
        await tx.foundingMemberGrant.create({ data: { userId, active: true } });
      }
      return true;
    });
  }

  const now = new Date();
  const periodEnd = input.interval === 'annual' ? addMonths(now, 12) : addMonths(now, 1);
  const sub = await prisma.accountSubscription.upsert({
    where: { userId },
    update: { planCode: input.planCode, interval: input.interval, cadence: input.cadence, status: 'active', foundingMember, currentPeriodStart: now, currentPeriodEnd: periodEnd, trialEndsAt: null, readOnlyAt: null, restrictedAt: null, cancelAt: null, canceledAt: null, scheduledPlanCode: null },
    create: { userId, planCode: input.planCode, interval: input.interval, cadence: input.cadence, status: 'active', foundingMember, currentPeriodStart: now, currentPeriodEnd: periodEnd },
  });
  await prisma.subscriptionStatusHistory.create({ data: { userId, toStatus: 'active', reason: 'subscribe' } });
  // Convert an active trial.
  await prisma.trial.updateMany({ where: { userId, status: 'active' }, data: { status: 'converted' } });
  await commercialAudit(userId, 'subscription.subscribe', 'AccountSubscription', sub.id, `${input.planCode}/${input.interval}/${input.cadence}${foundingMember ? ' founding' : ''}`);
  return sub;
}

/* ------------------------- Upgrade / downgrade ---------------------- */

async function tierOrder(planCode: string): Promise<number> {
  const p = await prisma.commercialPlan.findUnique({ where: { code: planCode } });
  return p?.tierOrder ?? 0;
}

/** Immediate upgrade (§19). Entitlements increase now; founding retained per rule. */
export async function upgrade(userId: string, planCode: string) {
  const sub = await prisma.accountSubscription.findUnique({ where: { userId } });
  if (!sub) throw new Error('No subscription');
  if ((await tierOrder(planCode)) <= (await tierOrder(sub.planCode))) throw new Error('Not an upgrade — use scheduleDowngrade');
  // Founding cadence is retained across upgrades if a founding price exists for the target plan.
  let cadence = sub.cadence;
  if (sub.cadence === 'founding') {
    const foundingPrice = await getPlanPrice(planCode, sub.interval, 'founding');
    cadence = foundingPrice ? 'founding' : 'standard';
  }
  const updated = await prisma.accountSubscription.update({ where: { userId }, data: { planCode, cadence, scheduledPlanCode: null } });
  await commercialAudit(userId, 'subscription.upgrade', 'AccountSubscription', updated.id, `${sub.planCode} → ${planCode}`);
  return updated;
}

/** Schedule a downgrade at period end (§20). Entitlements unchanged until then. */
export async function scheduleDowngrade(userId: string, planCode: string) {
  const sub = await prisma.accountSubscription.findUnique({ where: { userId } });
  if (!sub) throw new Error('No subscription');
  if ((await tierOrder(planCode)) >= (await tierOrder(sub.planCode))) throw new Error('Not a downgrade — use upgrade');
  const updated = await prisma.accountSubscription.update({ where: { userId }, data: { scheduledPlanCode: planCode } });
  await commercialAudit(userId, 'subscription.downgrade.schedule', 'AccountSubscription', updated.id, `${sub.planCode} → ${planCode} at period end`);
  return updated;
}

/** Apply any scheduled downgrade whose period has ended (called by a job/tick). */
export async function applyScheduledChange(userId: string) {
  const sub = await prisma.accountSubscription.findUnique({ where: { userId } });
  if (!sub?.scheduledPlanCode) return sub;
  const now = new Date();
  if (sub.currentPeriodEnd && sub.currentPeriodEnd > now) return sub; // not yet
  const updated = await prisma.accountSubscription.update({
    where: { userId },
    data: { planCode: sub.scheduledPlanCode, scheduledPlanCode: null, currentPeriodStart: now, currentPeriodEnd: sub.interval === 'annual' ? addMonths(now, 12) : addMonths(now, 1) },
  });
  await commercialAudit(userId, 'subscription.downgrade.apply', 'AccountSubscription', updated.id, `now ${updated.planCode}`);
  return updated;
}

/** Cases above the new active-case limit that must be archived before downgrade. */
export async function downgradeImpact(userId: string, targetPlanCode: string) {
  const [{ getPlanEntitlements }, activeCases] = await Promise.all([
    import('./catalog'),
    prisma.case.count({ where: { userId, status: { notIn: ['archived', 'closed'] } } }),
  ]);
  const ent = await getPlanEntitlements(targetPlanCode);
  const excessCases = Math.max(0, activeCases - ent.activeCases);
  const storageUsed = (await prisma.document.aggregate({ _sum: { sizeBytes: true }, where: { case: { userId }, deletedAt: null } }))._sum.sizeBytes ?? 0;
  return {
    excessCases,
    storageOverLimit: storageUsed > ent.storageBytes,
    losesFolderMonitoring: !ent.folderMonitoring,
    losesCalendarSync: !ent.calendarSync,
    losesMacCompanion: ent.macCompanion === 'none',
  };
}

/* ------------------------------ Cancel ------------------------------ */

/** Cancel — start read-only grace, preserve export, end founding entitlement. */
export async function cancel(userId: string, graceDays = 30) {
  const now = new Date();
  const exportUntil = addDays(now, graceDays);
  await prisma.accountSubscription.update({ where: { userId }, data: { canceledAt: now, cancelAt: now, readOnlyAt: now, exportUntil } });
  await setStatus(userId, 'canceled', 'user-cancel');
  // Founding pricing ends when the subscription lapses.
  await prisma.foundingMemberGrant.updateMany({ where: { userId, active: true }, data: { active: false, endedAt: now, endedReason: 'canceled' } });
  await commercialAudit(userId, 'subscription.cancel', 'AccountSubscription', userId, `read-only; export until ${exportUntil.toISOString().slice(0, 10)}`);
}

/* --------------------- Payment-failure transitions ------------------ */

export async function markPastDue(userId: string) { await setStatus(userId, 'past_due', 'payment-failed'); await commercialAudit(userId, 'subscription.past_due', 'AccountSubscription', userId); }
export async function markRestricted(userId: string) { await prisma.accountSubscription.update({ where: { userId }, data: { restrictedAt: new Date() } }); await setStatus(userId, 'restricted', 'dunning-10d'); }
export async function markReadOnly(userId: string) { const exportUntil = addDays(new Date(), 30); await prisma.accountSubscription.update({ where: { userId }, data: { readOnlyAt: new Date(), exportUntil } }); await setStatus(userId, 'read_only', 'dunning-14d'); }
export async function reactivate(userId: string) { await prisma.accountSubscription.update({ where: { userId }, data: { restrictedAt: null, readOnlyAt: null } }); await setStatus(userId, 'active', 'payment-recovered'); }
