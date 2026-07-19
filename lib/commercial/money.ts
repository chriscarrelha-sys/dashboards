/**
 * Money is ALWAYS integer minor units (US cents). No floating-point currency.
 * Token/vendor micro-prices use their own integer conventions documented at the
 * call site (e.g. "cents per 1,000,000 tokens").
 *
 * Single source of truth for money math across the commercial domain.
 */

export type Cents = number; // integer minor units (USD cents)

export function dollars(amount: number): Cents {
  // Convert a human dollar figure to integer cents without float drift.
  return Math.round(amount * 100);
}

export function formatCents(cents: Cents, currency = 'USD'): string {
  const neg = cents < 0;
  const abs = Math.abs(cents);
  const s = (abs / 100).toLocaleString('en-US', { style: 'currency', currency });
  return neg ? `-${s}` : s;
}

/** Basis points (1% = 100 bps). Margins are stored in bps to stay integer. */
export function marginBps(contribution: Cents, netRevenue: Cents): number {
  if (netRevenue <= 0) return 0;
  return Math.round((contribution / netRevenue) * 10000);
}

export function bpsToPercent(bps: number): number {
  return Math.round((bps / 100) * 10) / 10;
}

/** Stripe fee estimate: rate in bps + fixed cents (both configurable/effective-dated). */
export function estimateProcessingFee(amount: Cents, rateBps: number, fixed: Cents): Cents {
  return Math.round((amount * rateBps) / 10000) + fixed;
}

/** Cost of N tokens given a "cents per 1,000,000 tokens" integer rate. */
export function tokenCost(tokens: number, centsPerMillion: number): Cents {
  return Math.round((tokens * centsPerMillion) / 1_000_000);
}

/** Cost of N gigabytes given a "cents per GB-month" rate (may be fractional cents → round). */
export function storageCost(gigabytes: number, centsPerGb: number): Cents {
  return Math.round(gigabytes * centsPerGb);
}

export const GB = 1024 * 1024 * 1024;
export function bytesToGb(bytes: number): number {
  return bytes / GB;
}
