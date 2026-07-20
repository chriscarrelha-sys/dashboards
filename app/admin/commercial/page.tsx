import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { marginReportByPlan } from '@/lib/commercial/cost';
import { foundingSeatsRemaining } from '@/lib/commercial/catalog';
import { formatCents, bpsToPercent } from '@/lib/commercial/money';

export const dynamic = 'force-dynamic';

/**
 * Administrator commercial dashboard (§23). MRR/ARR, plan mix, founding seats,
 * per-plan contribution margin, and cost anomalies. Estimated figures (infra +
 * support budgets, payment fees) are labeled — we do not present a planning
 * budget as an accounting actual.
 */
export default async function AdminCommercialPage() {
  const now = new Date();
  const periodStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const periodEnd = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));

  const rows = await marginReportByPlan(periodStart, periodEnd);
  const mrr = rows.reduce((s, r) => s + r.grossRevenue, 0);
  const founding = await foundingSeatsRemaining();
  const [trialing, active, pastDue, canceled] = await Promise.all([
    prisma.accountSubscription.count({ where: { status: 'trialing' } }),
    prisma.accountSubscription.count({ where: { status: 'active' } }),
    prisma.accountSubscription.count({ where: { status: 'past_due' } }),
    prisma.accountSubscription.count({ where: { status: { in: ['canceled', 'expired'] } } }),
  ]);

  // Cost anomalies: accounts whose AI cost this period exceeds 75% of their plan AI budget.
  const aiByUser = await prisma.aIProviderCostRecord.groupBy({
    by: ['userId'], _sum: { calculatedCost: true }, where: { createdAt: { gte: periodStart, lt: periodEnd } },
  });
  const budgets = await prisma.costBudget.findMany({ where: { active: true } });
  const budgetByPlan = new Map(budgets.map((b) => [b.planCode, b]));
  const anomalies = [];
  for (const a of aiByUser) {
    const sub = await prisma.accountSubscription.findUnique({ where: { userId: a.userId } });
    if (!sub) continue;
    const budget = budgetByPlan.get(sub.planCode);
    const spent = a._sum.calculatedCost ?? 0;
    if (budget && spent >= Math.round(budget.aiBudget * 0.75)) {
      anomalies.push({ userId: a.userId, plan: sub.planCode, spent, budget: budget.aiBudget });
    }
  }

  return (
    <main className="mx-auto max-w-5xl px-6 py-12">
      <div className="mb-8 flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Commercial dashboard</h1>
        <Link href="/" className="text-sm text-muted-foreground underline">← Back</Link>
      </div>

      <section className="mb-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Stat label="MRR" value={formatCents(mrr)} />
        <Stat label="ARR" value={formatCents(mrr * 12)} />
        <Stat label="Active / Trialing" value={`${active} / ${trialing}`} />
        <Stat label="Founding seats" value={`${founding.used} / ${founding.cap}`} />
      </section>

      <section className="mb-8">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Contribution margin by plan</h2>
          <span className="text-xs text-muted-foreground">Infra, support &amp; payment fees are <span className="font-medium">estimates</span></span>
        </div>
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full min-w-[720px] text-sm">
            <thead className="bg-muted/50 text-left">
              <tr>
                <th className="p-3 font-medium">Plan</th>
                <th className="p-3 font-medium">Subs</th>
                <th className="p-3 font-medium">MRR</th>
                <th className="p-3 font-medium">AI cost</th>
                <th className="p-3 font-medium">Variable COGS</th>
                <th className="p-3 font-medium">Contribution</th>
                <th className="p-3 font-medium">Margin</th>
              </tr>
            </thead>
            <tbody className="[&_tr]:border-t">
              {rows.map((r) => {
                const belowTarget = r.marginBps < r.targetMarginBps;
                return (
                  <tr key={r.planCode}>
                    <td className="p-3 font-medium">{r.planName}</td>
                    <td className="p-3">{r.subscribers}</td>
                    <td className="p-3">{formatCents(r.grossRevenue)}</td>
                    <td className="p-3">{formatCents(r.aiCost)}</td>
                    <td className="p-3">{formatCents(r.variableCogs)}</td>
                    <td className="p-3">{formatCents(r.contribution)}</td>
                    <td className={`p-3 font-medium ${belowTarget ? 'text-destructive' : ''}`}>
                      {bpsToPercent(r.marginBps)}% <span className="text-xs text-muted-foreground">/ {bpsToPercent(r.targetMarginBps)}% target</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <h2 className="mb-2 text-lg font-semibold">Cost anomalies</h2>
        {anomalies.length === 0 ? (
          <p className="rounded-lg border p-4 text-sm text-muted-foreground">No accounts over 75% of their AI budget this period.</p>
        ) : (
          <div className="overflow-x-auto rounded-lg border">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-left"><tr><th className="p-3 font-medium">Account</th><th className="p-3 font-medium">Plan</th><th className="p-3 font-medium">AI spend</th><th className="p-3 font-medium">AI budget</th></tr></thead>
              <tbody className="[&_tr]:border-t">
                {anomalies.map((a) => (
                  <tr key={a.userId}>
                    <td className="p-3 font-mono text-xs">{a.userId.slice(0, 12)}…</td>
                    <td className="p-3">{a.plan}</td>
                    <td className="p-3 font-medium text-destructive">{formatCents(a.spent)}</td>
                    <td className="p-3">{formatCents(a.budget)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <p className="mt-8 text-xs text-muted-foreground">
        Provider costs shown here are internal and never exposed to customers. Support allocation is a
        planning budget, not an accounting-system actual.
      </p>
    </main>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border p-4">
      <div className="text-xs uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="mt-1 text-xl font-semibold">{value}</div>
    </div>
  );
}
