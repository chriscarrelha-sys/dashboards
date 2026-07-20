import Link from 'next/link';
import { getCurrentUser } from '@/lib/auth/session';
import { getUsageSummary } from '@/lib/commercial/entitlements';
import { getPublicCatalog } from '@/lib/commercial/catalog';
import { formatCents, GB } from '@/lib/commercial/money';
import { PlanActions } from '@/components/commercial/PlanActions';

export const dynamic = 'force-dynamic';

/**
 * Settings → Plan & Usage (§22). Reads the authoritative usage summary. Shows
 * allowances and remaining balances — never tokens, model prices, or provider
 * cost.
 */
export default async function PlanPage() {
  const user = await getCurrentUser();
  const summary = await getUsageSummary(user.id);
  const catalog = await getPublicCatalog();
  const planName = catalog.plans.find((p) => p.code === summary.plan)?.name ?? summary.plan ?? 'No plan';

  return (
    <main className="mx-auto max-w-4xl px-6 py-12">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Plan &amp; Usage</h1>
          <p className="text-sm text-muted-foreground">Your allowances reset each billing period. <Link href="/pricing" className="underline">Compare plans</Link>.</p>
        </div>
        <Link href="/" className="text-sm text-muted-foreground underline">← Back</Link>
      </div>

      <section className="mb-6 rounded-lg border p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="text-lg font-semibold">{planName}</div>
            <div className="mt-1 text-sm text-muted-foreground">
              {summary.status ? <>Status: <span className="font-medium">{summary.status}</span></> : 'No active subscription'}
              {summary.interval && <> · {summary.interval}</>}
              {summary.foundingMember && <> · <span className="text-primary font-medium">Founding member</span></>}
              {summary.renewalDate && <> · renews {new Date(summary.renewalDate).toISOString().slice(0, 10)}</>}
            </div>
          </div>
          <PlanActions hasSubscription={!!summary.status} status={summary.status} />
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2">
        <Meter label="Active cases" used={summary.activeCases.used} limit={summary.activeCases.limit} />
        <Meter label="Managed storage" used={Math.round(summary.storage.usedBytes / GB * 10) / 10} limit={Math.round(summary.storage.limitBytes / GB)} unit="GB" />
        <div className="rounded-lg border p-4">
          <div className="mb-1 flex items-center justify-between text-sm">
            <span className="font-medium">AI Case Actions</span>
            <span className="text-muted-foreground">{summary.aiActions.total} available</span>
          </div>
          <Bar used={(summary.aiActions.limit || 1) - summary.aiActions.includedRemaining} limit={summary.aiActions.limit || 1} />
          <div className="mt-2 text-xs text-muted-foreground">
            {summary.aiActions.includedRemaining} included left this period
            {summary.aiActions.purchased > 0 && <> · {summary.aiActions.purchased} purchased (roll over)</>}
          </div>
        </div>
        <Meter label="Processing pages" used={summary.processingPages.used} limit={summary.processingPages.limit} />
        <Meter label="Advanced workflows" used={summary.advancedWorkflows.used} limit={summary.advancedWorkflows.limit} />
        {summary.features && (
          <div className="rounded-lg border p-4 text-sm">
            <div className="mb-2 font-medium">Included features</div>
            <ul className="space-y-1 text-muted-foreground">
              <li>Mac companion: {summary.features.macCompanion === 'automatic' ? 'automatic monitoring' : summary.features.macCompanion === 'manual' ? 'manual sync' : 'not included'}</li>
              <li>Calendar sync: {summary.features.calendarSync ? 'included' : 'not included'}</li>
              <li>Support: {summary.features.supportTier}</li>
            </ul>
          </div>
        )}
      </section>

      <p className="mt-8 text-xs text-muted-foreground">
        You can export your complete case data at any time, including during a cancellation grace
        period. AI Case Actions measure work performed — not tokens or provider cost.
      </p>
    </main>
  );
}

function Meter({ label, used, limit, unit }: { label: string; used: number; limit: number; unit?: string }) {
  return (
    <div className="rounded-lg border p-4">
      <div className="mb-1 flex items-center justify-between text-sm">
        <span className="font-medium">{label}</span>
        <span className="text-muted-foreground">{used}{unit ? ` ${unit}` : ''} / {limit}{unit ? ` ${unit}` : ''}</span>
      </div>
      <Bar used={used} limit={limit || 1} />
    </div>
  );
}

function Bar({ used, limit }: { used: number; limit: number }) {
  const pct = Math.max(0, Math.min(100, Math.round((used / (limit || 1)) * 100)));
  const danger = pct >= 90;
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
      <div className={`h-full rounded-full ${danger ? 'bg-destructive' : 'bg-primary'}`} style={{ width: `${pct}%` }} />
    </div>
  );
}
