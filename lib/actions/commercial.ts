'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth/session';
import {
  startTrial, subscribe, upgrade, scheduleDowngrade, cancel,
} from '@/lib/commercial/subscription';
import { grantPurchasedActions } from '@/lib/commercial/entitlements';
import { createCheckoutSession, createBillingPortalSession } from '@/lib/commercial/stripe';

async function audit(userId: string, action: string, entity: string, entityId?: string, detail?: string) {
  await prisma.commercialAuditLog.create({ data: { userId, actorType: 'user', action, entity, entityId: entityId ?? null, detail: detail ?? null } });
}

const subscribeSchema = z.object({
  planCode: z.enum(['ESSENTIALS', 'PRO', 'COMMAND']),
  interval: z.enum(['monthly', 'annual']),
  cadence: z.enum(['standard', 'founding']).default('standard'),
});

export async function startTrialAction() {
  const user = await getCurrentUser();
  const sub = await startTrial(user.id);
  revalidatePath('/settings/plan');
  return { status: sub.status };
}

/** Begin checkout — returns the (mock) checkout URL. Live Stripe swaps in here. */
export async function beginCheckout(input: z.infer<typeof subscribeSchema>) {
  const user = await getCurrentUser();
  const { planCode, interval, cadence } = subscribeSchema.parse(input);
  const session = await createCheckoutSession(user.id, planCode, interval, cadence);
  await audit(user.id, 'checkout.begin', 'CheckoutSessionRecord', session.id, `${planCode}/${interval}/${cadence}`);
  return session;
}

/** Finalize a subscription (in mock mode this stands in for a completed checkout). */
export async function subscribeAction(input: z.infer<typeof subscribeSchema>) {
  const user = await getCurrentUser();
  const data = subscribeSchema.parse(input);
  const sub = await subscribe(user.id, data);
  revalidatePath('/settings/plan');
  return { planCode: sub.planCode, status: sub.status, founding: sub.foundingMember };
}

export async function upgradeAction(planCode: 'ESSENTIALS' | 'PRO' | 'COMMAND') {
  const user = await getCurrentUser();
  const sub = await upgrade(user.id, planCode);
  revalidatePath('/settings/plan');
  return { planCode: sub.planCode };
}

export async function scheduleDowngradeAction(planCode: 'ESSENTIALS' | 'PRO' | 'COMMAND') {
  const user = await getCurrentUser();
  const sub = await scheduleDowngrade(user.id, planCode);
  revalidatePath('/settings/plan');
  return { scheduledPlanCode: sub.scheduledPlanCode };
}

export async function cancelAction() {
  const user = await getCurrentUser();
  await cancel(user.id);
  revalidatePath('/settings/plan');
  return { canceled: true };
}

const addOnSchema = z.object({ addOnCode: z.string().min(1), quantity: z.number().int().min(1).max(20).default(1) });

/** Purchase an add-on. AI packs grant rollover actions; storage/case add-ons attach to the account. */
export async function purchaseAddOn(input: z.infer<typeof addOnSchema>) {
  const user = await getCurrentUser();
  const { addOnCode, quantity } = addOnSchema.parse(input);
  const product = await prisma.addOnProduct.findUnique({ where: { code: addOnCode } });
  if (!product || !product.active) throw new Error('Add-on not available');
  if (product.quoteRequired) {
    // "Starting at" services: create a quote request, do not auto-fulfill.
    const rec = await prisma.accountAddOn.create({ data: { userId: user.id, addOnCode, quantity, status: 'quote-requested' } });
    await audit(user.id, 'addon.quote', 'AccountAddOn', rec.id, addOnCode);
    return { status: 'quote-requested' as const };
  }
  if (product.kind === 'ai-actions' && product.grantAmount) {
    await grantPurchasedActions(user.id, product.grantAmount * quantity, 'addon', product.rolloverMonths ?? 12);
  }
  const rec = await prisma.accountAddOn.create({ data: { userId: user.id, addOnCode, quantity, status: product.kind === 'service' ? 'fulfilled' : 'active' } });
  await audit(user.id, 'addon.purchase', 'AccountAddOn', rec.id, `${addOnCode} x${quantity}`);
  revalidatePath('/settings/plan');
  return { status: 'active' as const };
}

export async function openBillingPortal() {
  const user = await getCurrentUser();
  const session = await createBillingPortalSession(user.id);
  return session;
}

/* ------------------------------ Admin actions ------------------------------ */

const vendorRateSchema = z.object({
  vendor: z.string().min(1), service: z.string().min(1), sku: z.string().optional(),
  unitType: z.string().min(1),
  inputPerMillion: z.number().int().optional(), cachedInputPerMillion: z.number().int().optional(),
  outputPerMillion: z.number().int().optional(), requestPrice: z.number().int().optional(),
  searchCallPrice: z.number().int().optional(), storagePerGbMonth: z.number().int().optional(),
  ocrPagePrice: z.number().int().optional(), source: z.string().optional(),
});

/** Admin: publish a new effective-dated vendor rate (historical rows preserved). */
export async function updateVendorRate(input: z.infer<typeof vendorRateSchema>) {
  const user = await getCurrentUser();
  const data = vendorRateSchema.parse(input);
  // Deactivate the current active row for this vendor/service/sku; add a new one.
  await prisma.vendorPriceConfiguration.updateMany({
    where: { vendor: data.vendor, service: data.service, sku: data.sku ?? null, active: true },
    data: { active: false },
  });
  const row = await prisma.vendorPriceConfiguration.create({
    data: { ...data, effectiveFrom: new Date(), lastVerifiedAt: new Date(), active: true },
  });
  await audit(user.id, 'admin.vendor-rate.update', 'VendorPriceConfiguration', row.id, `${data.vendor}/${data.service}`);
  return { id: row.id };
}

/** Admin: change the founding-member cap. */
export async function setFoundingCap(cap: number) {
  const user = await getCurrentUser();
  if (cap < 0 || cap > 100000) throw new Error('Invalid cap');
  const cfg = (await prisma.foundingMemberConfig.findFirst()) ?? (await prisma.foundingMemberConfig.create({ data: { cap } }));
  await prisma.foundingMemberConfig.update({ where: { id: cfg.id }, data: { cap } });
  await audit(user.id, 'admin.founding-cap.set', 'FoundingMemberConfig', cfg.id, `cap=${cap}`);
  return { cap };
}
