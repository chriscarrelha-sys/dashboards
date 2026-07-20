# Commercial systems — pricing, entitlements, usage, cost & billing

The commercial control layer. **One database-backed configuration is the single
source of truth** for the website, checkout, Stripe mappings, entitlements,
usage enforcement, cost accounting, and admin controls. No pricing constant is
duplicated in a component.

## Architecture (single source of truth)

```
DB catalog (CommercialPlan / PlanPrice / PlanEntitlement / AddOnProduct
            / AIActionDefinition / VendorPriceConfiguration / CostBudget)
        │  seeded idempotently by lib/commercial/seed.ts
        ▼
lib/commercial/catalog.ts   → getPublicCatalog()  ── public pricing page (/pricing)
        │                     getPlanEntitlements() ─┐
        ▼                                            │
lib/commercial/entitlements.ts  (canCreateCase, canRunAIAction, consumeUsage,
        │   reverseUsage, getUsageSummary, getUpgradeOptions) ── every product module
        ▼
lib/commercial/{ai-actions, cost, subscription, stripe}.ts
        ▼
lib/actions/commercial.ts  ('use server' wrappers) ── UI (/settings/plan, /admin/commercial)
```

Money is **always integer cents** (`lib/commercial/money.ts`) — no floating-point
currency. Prices and vendor rates are **effective-dated**; history is preserved.

## Plan catalog (2026.1)

| Plan | Monthly | Annual | Founding /mo | Cases | Storage | AI Actions | Proc. pages | Adv. workflows | Companion | Support |
|------|--------:|-------:|-------------:|------:|--------:|-----------:|------------:|---------------:|-----------|---------|
| Case Essentials | $59 | $590 | $49 | 1 | 10 GB | 30 | 750 | 3 | — | Self-service |
| **Litigation Pro** *(Most Popular)* | $179 | $1,790 | $149 | 5 | 50 GB | 150 | 4,000 | 30 | Manual sync | Email |
| Litigation Command *(Best for Complex Litigation)* | $399 | $3,990 | $349 | 15 | 200 GB | 500 | 15,000 | 150 | Automatic | Priority |

Change prices in `lib/commercial/seed.ts` (or via admin), never in the UI.

## Founding members

First **100** accounts (`FoundingMemberConfig.cap`, admin-editable). The cap is
enforced transactionally from authoritative `FoundingMemberGrant` records — not a
website counter. Founding pricing is **locked while the subscription stays
continuously active**; cancel/lapse ends it (`FoundingMemberGrant.active=false`).
Retained across upgrades only if the target plan has a founding price.

## Trial

Configurable `TrialConfig` (default: 7-day Litigation Pro, no card, 1 case, 25
documents, 10 AI actions, 1 basic binder, no folder monitoring, no bulk import,
no case-wide review, full export). One per verified user. At expiry the account
goes **read-only** with a 30-day export grace — files are never deleted immediately.

## AI Case Actions

The customer-facing unit. It **never** maps 1:1 to an API request, and tokens,
model prices, and API keys are **never** exposed. `estimateAiActions()` computes a
weighted charge from an `AIActionDefinition` (page/doc-count/token/web-research/
premium-model weights, cached discount), clamped to the action's `[min, max]`:

| Action | Charge |
|--------|--------|
| Rename & classify | 0 (background) |
| Summarize short doc | 1 |
| Analyze long pleading | 2–4 |
| Extract discovery set | 5–15 |
| Compare documents | 5–20 |
| Contradiction review | 10–30 |
| Complete case review | 25–75 |

The app **shows the estimate before running** and never charges more than the
displayed estimate without a fresh approval (charges above the action's
`manualApprovalThreshold` require confirmation). The final charge may be adjusted
**down**.

## Usage metering & the ledger (transaction-safe)

- Period allowances (AI actions, processing pages, advanced workflows) are metered
  in `UsageMeter`; storage and active cases are computed live.
- Every grant/consume/reverse is an append-only `UsageLedgerEntry` with a unique
  `idempotencyKey` — webhook/retry double-processing is impossible.
- AI actions consume **included allowance first**, then **purchased actions**
  (`PurchasedActionGrant`, oldest-expiry first; packs roll over 12 months).
- `consumeUsage` runs in a transaction and **hard-stops (throws, writes nothing)**
  on insufficient balance — no negative balances, no partial charges.
- `reverseUsage` writes a compensating entry (idempotent); refunded purchased
  actions return as a fresh grant so rollover/expiry stays honest.

## Storage & processing

Storage is byte-accurate (original files; derivatives/temp/backup tracked in
`StorageUsageSnapshot`). Uploads are blocked over-limit unless an add-on/admin
grant applies — but **existing files are never blocked**. Processing pages are
metered separately from storage; re-opening an already-processed document is not a
new page.

## Add-ons

AI packs (25/$29, 100/$89, 300/$199 — roll over 12 months), storage
(+50/$10, +200/$29, +500/$59 mo), +1 active case ($39/mo), and services (guided
setup $199, complex migration from $499, white-glove from $1,499, live onboarding
$149). "Starting at" services create a **quote request** — no auto-fulfillment.

## Stripe (§16–17)

Internal records are authoritative for features/limits; **Stripe is authoritative
only for payment status**. `PlanPrice.stripePriceId` maps internal → Stripe.
Webhooks are idempotent (`StripeWebhookEvent.eventId` unique). Fees are estimated
from `StripeFeeConfig` (2.9% + $0.30 card, +0.7% Billing) and separated by kind.

> **Honest status:** the Stripe layer is the mapping + bookkeeping layer. Live
> Stripe API calls require the Stripe SDK + `STRIPE_SECRET_KEY` and `STRIPE_LIVE=true`
> — **not wired in this build**. `stripeMode()` returns `mock` until then, so a mock
> charge is never shown as real. In mock mode, "Subscribe" finalizes in-app,
> standing in for a completed checkout.

## Subscription statuses & dunning

`incomplete · trialing · active · past_due · restricted · read_only · paused ·
canceled · expired`. Default dunning (configurable): notice → retry → restricted
at 10 days → read-only at 14 → 30-day export grace after cancel/expiry. No
immediate permanent deletion.

## Upgrades / downgrades

- **Upgrade** is immediate; entitlements increase at once; founding retained per
  rule.
- **Downgrade** applies at period end (`scheduledPlanCode`); `downgradeImpact()`
  surfaces excess cases, storage over limit, and features that will stop. Excess
  higher-tier records become **read-only / archive-required — never deleted**.

## Cost accounting & margin (§9–11, §24)

Every AI request records tokens + internally-calculated cost (from effective-dated
`VendorPriceConfiguration`) in `AIProviderCostRecord`. **Provider cost is never
shown to customers.** `marginReportByPlan()` computes contribution = net revenue −
(AI + processing + budgeted infra + budgeted support + payment fees); margin is in
basis points. **Infra/support/fees are labeled estimates** — a planning budget is
never presented as an accounting actual. Admins update vendor rates without a
deploy (`updateVendorRate`, historical rows preserved).

Seed budgets: Essentials AI $6 / infra $8 / support $4 (target COGS $18, ≥60%
margin); Pro $25/$18/$12 ($55, ≥60%); Command $70/$45/$30 ($145, ≥55%).

## Admin & customer surfaces

- **Public pricing:** `/pricing` (monthly/annual toggle, founding while available,
  progressive-disclosure comparison, add-ons, trial, disclaimers).
- **Customer:** `/settings/plan` — plan, usage meters, AI balance (included +
  purchased), renewal, founding status, actions. No tokens/provider cost shown.
- **Admin:** `/admin/commercial` — MRR/ARR, plan mix, founding seats, per-plan
  contribution margin, cost anomalies (accounts over 75% of AI budget).

## Required environment variables (production billing)

`STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_LIVE=true` to enable live
billing; per-price `stripePriceId` values populated on `PlanPrice`. Without these,
billing runs in **mock** mode. Never expose secrets to the browser.

## Honest limitations

- Live Stripe API calls, webhook signature verification, and the billing portal
  redirect are **not wired** (mock records + idempotency + fee accounting are).
- Tax is not calculated/collected unless a tax provider is configured.
- Support-cost allocation is a planning budget, not an integrated accounting actual.
- Service products (migration/white-glove) are **manually fulfilled**.

## Post-launch validation

Do not treat these assumptions as final. Run a paid beta; after the first 25
paying customers or 60 days, recompute true COGS/margin by plan and revisit the
30/150/500 action allowances, the $59/$179/$399 prices, whether to close founding
pricing, and whether services are profitable.
