import Link from 'next/link';
import { getPublicCatalog, getAddOns } from '@/lib/commercial/catalog';
import { PricingCards } from '@/components/commercial/PricingCards';
import { formatCents } from '@/lib/commercial/money';

export const dynamic = 'force-dynamic';

/**
 * Public pricing page. Reads the SAME authoritative plan/price/entitlement
 * records used by checkout and entitlement enforcement (getPublicCatalog) — no
 * pricing is hard-coded here. Founding prices appear only while seats remain.
 */
export default async function PricingPage() {
  const catalog = await getPublicCatalog();
  const addOns = await getAddOns();
  const actionPacks = addOns.filter((a) => a.kind === 'ai-actions');
  const storage = addOns.filter((a) => a.kind === 'storage');
  const services = addOns.filter((a) => a.kind === 'service');

  return (
    <main className="mx-auto max-w-6xl px-6 py-16">
      <div className="mb-10 text-center">
        <div className="mb-3 inline-flex items-center gap-2 text-xl font-semibold tracking-tight">
          <span aria-hidden className="grid h-8 w-8 place-items-center rounded-lg bg-primary text-primary-foreground">⚖</span>
          Pro Se Wins
        </div>
        <h1 className="text-3xl font-semibold tracking-tight">Plans that scale with your litigation</h1>
        <p className="mx-auto mt-3 max-w-2xl text-sm text-muted-foreground">
          A private command center for your active matters. Cancel anytime — your data is always
          exportable. Not legal advice; Pro Se Wins records filings and never files with a court.
        </p>
        {catalog.founding.remaining > 0 && (
          <p className="mt-4 inline-block rounded-full border border-primary/40 bg-primary/10 px-4 py-1.5 text-sm font-medium text-primary">
            Founding pricing — {catalog.founding.remaining} of {catalog.founding.cap} seats left. Locked while your subscription stays active.
          </p>
        )}
      </div>

      <PricingCards catalog={catalog} />

      {/* Progressive disclosure: full comparison */}
      <section className="mt-16">
        <h2 className="mb-4 text-lg font-semibold">Compare plans</h2>
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full min-w-[640px] text-sm">
            <thead className="bg-muted/50 text-left">
              <tr>
                <th className="p-3 font-medium">Included</th>
                {catalog.plans.map((p) => <th key={p.code} className="p-3 font-medium">{p.name}</th>)}
              </tr>
            </thead>
            <tbody className="[&_tr]:border-t">
              <Row label="Active cases" values={catalog.plans.map((p) => String(p.entitlements.activeCases))} />
              <Row label="Managed storage" values={catalog.plans.map((p) => `${p.entitlements.storageGb} GB`)} />
              <Row label="AI Case Actions / month" values={catalog.plans.map((p) => String(p.entitlements.aiActions))} />
              <Row label="Document-processing pages / month" values={catalog.plans.map((p) => p.entitlements.processingPages.toLocaleString())} />
              <Row label="Advanced workflow runs / month" values={catalog.plans.map((p) => String(p.entitlements.advancedWorkflows))} />
              <Row label="Mac companion" values={catalog.plans.map((p) => p.entitlements.macCompanion === 'automatic' ? 'Automatic monitoring' : p.entitlements.macCompanion === 'manual' ? 'Manual sync' : 'No')} />
              <Row label="Calendar sync" values={catalog.plans.map((p) => p.entitlements.calendarSync ? 'Included' : '—')} />
              <Row label="Support" values={catalog.plans.map((p) => p.entitlements.supportTier === 'priority' ? 'Priority' : p.entitlements.supportTier === 'email' ? 'Email' : 'Self-service')} />
            </tbody>
          </table>
        </div>
      </section>

      {/* Add-ons */}
      <section className="mt-14 grid gap-8 md:grid-cols-3">
        <AddOnList title="AI Case Action packs" note="Roll over 12 months while active." items={actionPacks.map((a) => ({ name: a.name, price: `${formatCents(a.amount)}` }))} />
        <AddOnList title="Extra storage" items={storage.map((a) => ({ name: a.name, price: `${formatCents(a.amount)}/mo` }))} extra="+1 active case — $39/mo" />
        <AddOnList title="Migration & onboarding" note="Services are fulfilled manually." items={services.map((a) => ({ name: a.name, price: `${a.quoteRequired ? 'from ' : ''}${formatCents(a.amount)}` }))} />
      </section>

      <section className="mt-14 rounded-lg border bg-muted/30 p-6 text-sm text-muted-foreground">
        <h2 className="mb-2 text-base font-semibold text-foreground">Start free</h2>
        <p>
          Try Litigation Pro free for 7 days — no card required. One case, 25 documents, 10 AI Case
          Actions, one basic binder, and full export rights. Automatic folder monitoring and
          full-record analysis are not included in the trial.
        </p>
        <div className="mt-4 flex flex-wrap gap-3">
          <Link href="/settings/plan" className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground">Start free trial</Link>
          <Link href="/settings/plan" className="rounded-md border px-4 py-2 text-sm font-medium">Manage plan</Link>
        </div>
        <p className="mt-4 text-xs">
          AI output is assistance, not verified legal fact, and is never presented as a court filing.
          PeachCourt/PACER are external links. Taxes are not included unless configured.
        </p>
      </section>
    </main>
  );
}

function Row({ label, values }: { label: string; values: string[] }) {
  return (
    <tr>
      <td className="p-3 text-muted-foreground">{label}</td>
      {values.map((v, i) => <td key={i} className="p-3 font-medium">{v}</td>)}
    </tr>
  );
}

function AddOnList({ title, items, note, extra }: { title: string; items: { name: string; price: string }[]; note?: string; extra?: string }) {
  return (
    <div className="rounded-lg border p-5">
      <h3 className="mb-3 text-sm font-semibold">{title}</h3>
      <ul className="space-y-2 text-sm">
        {items.map((it, i) => (
          <li key={i} className="flex items-center justify-between gap-4">
            <span className="text-muted-foreground">{it.name}</span>
            <span className="font-medium">{it.price}</span>
          </li>
        ))}
        {extra && <li className="flex items-center justify-between gap-4"><span className="text-muted-foreground">{extra}</span></li>}
      </ul>
      {note && <p className="mt-3 text-xs text-muted-foreground">{note}</p>}
    </div>
  );
}
