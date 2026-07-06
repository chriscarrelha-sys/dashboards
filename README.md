# ISOS — AI Institutional Sales Operating System

An AI-native platform for institutional wholesalers: CRM, one-click advisor
research, workflow/sequence builder, an AI content studio, and a sales copilot —
in one application. Built around a single principle: **every advisor is one
unified profile**, and **workflows are the primary abstraction** (email is just
one step type).

This repository is **Phase 1** of the product spec: a runnable Next.js app that
implements the core modules against realistic seed data (RIAs / market-neutral /
`MMNIX`) so the whole system works with **zero external keys**, with clean
drop-in points for Supabase, Claude/OpenAI, and Resend.

## What's here

| Module | Route | Notes |
| --- | --- | --- |
| **Dashboard** | `/` | KPIs, pipeline funnel, today's actions, activity feed |
| **AI Copilot** | `/copilot` | Explainable daily priority queue — who to contact & why |
| **Advisors CRM** | `/advisors`, `/advisors/[id]` | Unified profile, fit signals, engagement, timeline |
| **Campaigns** | `/campaigns` | Multi-channel sequence builder (email, call, LinkedIn, research, approval gates) |
| **Content Studio** | `/content-studio` | Personalized draft generation, rewrite controls, approval gate |
| **Analytics** | `/analytics` | Campaign performance, AUM heat map, compliance log |

## Domain-specific capabilities (from the PRD)

- **Advisor-fit scoring for alternatives** (`src/lib/scoring.ts`) — blends product-fit signals (convert-arb / correlation / tax interest, alts allocation) with observed engagement.
- **AI Research Engine** (`/api/ai/research`) — synthesizes a brief with a recommended angle, confidence score, and cited sources. Integration point for Tavily + SEC Form ADV + LinkedIn enrichment.
- **Product knowledge base** (`src/lib/data/product.ts`) — reusable, compliance-aware MMNIX messaging that grounds the Writing Agent.
- **Smart search** (`src/lib/search.ts`) — parses queries like *"RIAs in GA, $300M–$700M on Schwab, no reply in 90 days."*

## AI: works with or without a key

The **Content Studio** and **Research Engine** run on a built-in
personalization engine (`src/lib/ai/generator.ts`) that produces genuinely
advisor-specific output from structured data — no API key required.

Set `ANTHROPIC_API_KEY` (see `.env.example`) and the same prompt is sent to
Claude instead (`src/lib/ai/anthropic.ts`), with automatic fallback to the local
engine on any error.

## Getting started

```bash
npm install
cp .env.example .env.local   # optional — add keys to enable real model calls
npm run dev                  # http://localhost:3000
```

```bash
npm run typecheck            # tsc --noEmit
npm run build                # production build
```

## Tech stack

Next.js 14 (App Router) · React 18 · TypeScript · Tailwind CSS. Deploys to
Vercel as-is. The seed-data modules in `src/lib/data/*` mirror the intended
Supabase/Postgres table shapes, so swapping in a real backend is a localized
change.

## Roadmap

- **Phase 1 (this repo):** CRM, AI drafting, research, manual campaigns, dashboards.
- **Phase 2:** Supabase persistence & auth, live email delivery (Resend), automated sequence execution, engagement webhooks.
- **Phase 3:** Branching workflow logic, forecasting, richer copilot with LLM-authored recommendations.
- **Phase 4:** CRM/calendar integrations, meeting intelligence, mobile, additional specialized agents.

> Figures and advisor records are illustrative seed data. Replace product
> messaging with approved, compliance-reviewed language before any real send.
