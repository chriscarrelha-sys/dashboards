'use client';

import { useState } from 'react';
import { formatCents } from '@/lib/commercial/money';

type PlanCard = {
  code: string;
  name: string;
  tagline: string | null;
  badge: string | null;
  trialEligible: boolean;
  prices: {
    standard: { monthly: number | null; annual: number | null };
    founding: { monthly: number | null; annual: number | null } | null;
  };
  entitlements: {
    activeCases: number; storageGb: number; aiActions: number;
    processingPages: number; advancedWorkflows: number; macCompanion: string;
    folderMonitoring: boolean; calendarSync: boolean; supportTier: string;
  };
};

export function PricingCards({ catalog }: { catalog: { plans: PlanCard[]; founding: { remaining: number } } }) {
  const [interval, setInterval] = useState<'monthly' | 'annual'>('monthly');
  const foundingAvailable = catalog.founding.remaining > 0;

  return (
    <div>
      <div className="mb-8 flex items-center justify-center gap-3 text-sm">
        <button
          onClick={() => setInterval('monthly')}
          className={`rounded-md px-3 py-1.5 font-medium transition-colors ${interval === 'monthly' ? 'bg-primary text-primary-foreground' : 'border'}`}
        >Monthly</button>
        <button
          onClick={() => setInterval('annual')}
          className={`rounded-md px-3 py-1.5 font-medium transition-colors ${interval === 'annual' ? 'bg-primary text-primary-foreground' : 'border'}`}
        >Annual <span className="ml-1 text-xs opacity-80">2 months free</span></button>
      </div>

      <div className="grid gap-5 md:grid-cols-3">
        {catalog.plans.map((p) => {
          const standard = p.prices.standard[interval];
          const founding = foundingAvailable ? p.prices.founding?.[interval] ?? null : null;
          const highlight = p.badge === 'Most Popular';
          return (
            <div
              key={p.code}
              className={`relative flex flex-col rounded-xl border p-6 ${highlight ? 'border-primary shadow-lg ring-1 ring-primary/30' : 'shadow-sm'}`}
            >
              {p.badge && (
                <span className={`absolute -top-3 left-1/2 -translate-x-1/2 rounded-full px-3 py-1 text-xs font-semibold ${highlight ? 'bg-primary text-primary-foreground' : 'border bg-card'}`}>
                  {p.badge}
                </span>
              )}
              <h3 className="text-lg font-semibold">{p.name}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{p.tagline}</p>

              <div className="mt-4">
                {founding != null ? (
                  <>
                    <div className="flex items-baseline gap-2">
                      <span className="text-3xl font-semibold">{formatCents(founding)}</span>
                      <span className="text-sm text-muted-foreground">/{interval === 'annual' ? 'yr' : 'mo'}</span>
                    </div>
                    <div className="mt-1 text-sm text-muted-foreground">
                      <span className="font-medium text-primary">Founding price</span>
                      {standard != null && <span className="ml-2 line-through">{formatCents(standard)}</span>}
                    </div>
                  </>
                ) : (
                  <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-semibold">{standard != null ? formatCents(standard) : '—'}</span>
                    <span className="text-sm text-muted-foreground">/{interval === 'annual' ? 'yr' : 'mo'}</span>
                  </div>
                )}
              </div>

              <ul className="mt-5 space-y-2 text-sm">
                <Li>{p.entitlements.activeCases} active {p.entitlements.activeCases === 1 ? 'case' : 'cases'}</Li>
                <Li>{p.entitlements.storageGb} GB managed storage</Li>
                <Li><span className="font-medium">{p.entitlements.aiActions}</span> AI Case Actions / month</Li>
                <Li>{p.entitlements.processingPages.toLocaleString()} processing pages / month</Li>
                <Li>{p.entitlements.advancedWorkflows} advanced workflows / month</Li>
                <Li muted={p.entitlements.macCompanion === 'none'}>
                  {p.entitlements.macCompanion === 'automatic' ? 'Mac companion — automatic monitoring' : p.entitlements.macCompanion === 'manual' ? 'Mac companion — manual sync' : 'Mac companion — not included'}
                </Li>
                <Li muted={!p.entitlements.calendarSync}>{p.entitlements.calendarSync ? 'Calendar sync included' : 'Calendar sync — not included'}</Li>
                <Li>{p.entitlements.supportTier === 'priority' ? 'Priority support' : p.entitlements.supportTier === 'email' ? 'Email support' : 'Self-service support'}</Li>
              </ul>

              <a
                href="/settings/plan"
                className={`mt-6 rounded-md px-4 py-2 text-center text-sm font-medium ${highlight ? 'bg-primary text-primary-foreground' : 'border'}`}
              >
                {p.trialEligible ? 'Start free trial' : 'Choose plan'}
              </a>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Li({ children, muted }: { children: React.ReactNode; muted?: boolean }) {
  return (
    <li className={`flex items-start gap-2 ${muted ? 'text-muted-foreground' : ''}`}>
      <span aria-hidden className={muted ? 'text-muted-foreground' : 'text-primary'}>{muted ? '·' : '✓'}</span>
      <span>{children}</span>
    </li>
  );
}
