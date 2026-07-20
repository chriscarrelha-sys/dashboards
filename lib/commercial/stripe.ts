/**
 * Stripe integration layer (§16, §17).
 *
 * HONEST STATUS: this is the mapping + bookkeeping layer. Internal records are
 * authoritative for features/limits; Stripe is authoritative only for payment
 * status. Live Stripe API calls require the Stripe SDK + `STRIPE_SECRET_KEY`
 * and are NOT wired in this build — `stripeMode()` returns 'mock' until then, so
 * we never represent a mock charge as a real one. Checkout/portal/webhook flows
 * here record intent and keep idempotency + fee accounting correct so the live
 * swap is a drop-in.
 */
import { prisma } from '@/lib/prisma';
import { getPlanPrice } from './catalog';
import { estimateStripeFee } from './cost';

export function stripeMode(): 'live' | 'mock' {
  // Live requires BOTH a secret key and an explicit opt-in; otherwise mock.
  return process.env.STRIPE_SECRET_KEY && process.env.STRIPE_LIVE === 'true' ? 'live' : 'mock';
}

/** Resolve the Stripe price id mapped to an internal price record (or null). */
export async function stripePriceIdFor(planCode: string, interval: string, cadence: string): Promise<string | null> {
  const price = await getPlanPrice(planCode, interval, cadence);
  return price?.stripePriceId ?? null;
}

/** Ensure a (mock) Stripe customer id is recorded for the account. */
export async function ensureStripeCustomer(userId: string): Promise<string> {
  const sub = await prisma.accountSubscription.findUnique({ where: { userId } });
  if (sub?.stripeCustomerId) return sub.stripeCustomerId;
  const id = stripeMode() === 'live'
    ? (() => { throw new Error('Live Stripe not wired: install the Stripe SDK and set STRIPE_SECRET_KEY.'); })()
    : `cus_mock_${userId.slice(0, 10)}`;
  if (sub) await prisma.accountSubscription.update({ where: { userId }, data: { stripeCustomerId: id } });
  return id;
}

/** Create a checkout session (mock). Records intent; returns an in-app URL. */
export async function createCheckoutSession(userId: string, planCode: string, interval: 'monthly' | 'annual', cadence: 'standard' | 'founding') {
  const price = await getPlanPrice(planCode, interval, cadence);
  if (!price) throw new Error('No active price to check out.');
  const rec = await prisma.checkoutSessionRecord.create({
    data: { userId, planCode, interval, cadence, mode: stripeMode(), status: 'created', amount: price.amount, stripeSessionId: stripeMode() === 'live' ? null : `cs_mock_${Date.now().toString(36)}` },
  });
  // In mock mode, checkout completes in-app (the subscribe action finalizes it).
  const url = `/settings/billing/checkout/${rec.id}`;
  return { id: rec.id, url, amount: price.amount, mode: rec.mode };
}

/** Create a billing-portal session (mock). */
export async function createBillingPortalSession(userId: string) {
  const rec = await prisma.billingPortalSessionRecord.create({ data: { userId, mode: stripeMode(), url: '/settings/billing' } });
  return { id: rec.id, url: rec.url!, mode: rec.mode };
}

/**
 * Handle a Stripe webhook event idempotently (§16). Returns { duplicate } when
 * the event id was already processed — a grant/charge is never applied twice.
 * Signature verification + live payload parsing are added with the live SDK.
 */
export async function handleWebhookEvent(eventId: string, type: string, payload: unknown) {
  return prisma.$transaction(async (tx) => {
    const existing = await tx.stripeWebhookEvent.findUnique({ where: { eventId } });
    if (existing?.processedAt) return { duplicate: true, type };
    if (!existing) {
      await tx.stripeWebhookEvent.create({ data: { eventId, type, payload: payload ? JSON.stringify(payload) : null } });
    }
    // (Live handlers map type → subscription status changes here.)
    await tx.stripeWebhookEvent.update({ where: { eventId }, data: { processedAt: new Date() } });
    return { duplicate: false, type };
  });
}

/** Record a billing event + estimated fees (used on invoice.paid, refunds, etc.). */
export async function recordBillingEvent(userId: string | null, type: string, amount: number, feeKind?: string) {
  const fees = amount > 0 ? await estimateStripeFee(amount) : { total: 0 };
  return prisma.billingEvent.create({ data: { userId, type, amount, feeAmount: fees.total, feeKind: feeKind ?? 'processing' } });
}
