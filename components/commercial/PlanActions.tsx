'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { startTrialAction, subscribeAction, cancelAction, openBillingPortal } from '@/lib/actions/commercial';

/**
 * Client actions for the Plan & Usage page. In mock Stripe mode, "Subscribe"
 * finalizes the subscription in-app (standing in for a completed checkout).
 */
export function PlanActions({ hasSubscription, status }: { hasSubscription: boolean; status: string | null }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [err, setErr] = useState<string | null>(null);

  const run = (fn: () => Promise<unknown>) => start(async () => {
    setErr(null);
    try { await fn(); router.refresh(); } catch (e) { setErr(e instanceof Error ? e.message : 'Something went wrong'); }
  });

  const canceled = status === 'canceled' || status === 'expired';
  const trialing = status === 'trialing';

  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex flex-wrap justify-end gap-2">
        {!hasSubscription && (
          <button disabled={pending} onClick={() => run(startTrialAction)} className="rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground disabled:opacity-60">
            Start Pro trial
          </button>
        )}
        {(trialing || !hasSubscription || canceled) && (
          <button disabled={pending} onClick={() => run(() => subscribeAction({ planCode: 'PRO', interval: 'monthly', cadence: 'standard' }))} className="rounded-md border px-3 py-1.5 text-sm font-medium disabled:opacity-60">
            Subscribe to Pro
          </button>
        )}
        {hasSubscription && !canceled && (
          <>
            <button disabled={pending} onClick={() => run(async () => { const s = await openBillingPortal(); window.location.href = s.url; })} className="rounded-md border px-3 py-1.5 text-sm font-medium disabled:opacity-60">
              Manage billing
            </button>
            <button disabled={pending} onClick={() => { if (confirm('Cancel your subscription? Your data stays exportable during a 30-day grace period.')) run(cancelAction); }} className="rounded-md border px-3 py-1.5 text-sm font-medium text-destructive disabled:opacity-60">
              Cancel
            </button>
          </>
        )}
      </div>
      {err && <p className="text-xs text-destructive">{err}</p>}
    </div>
  );
}
