# Client Priorities Dashboard

An interactive dashboard for the moment in a client meeting when they tell you what
actually matters to them. Press what they said — *stability*, *income*, *growth*,
*don't lose money* — and the whole page rewrites itself around that answer: the
headline, the numbers on screen, the ranking of every portfolio, and the words to say.

Open `index.html` in any browser. No build step, no server, no dependencies, no
network calls — one self-contained file you can email, put on a tablet, or run on a
screen share.

## What it does

**Step 1 — press the priorities.** Eight client-language priorities, each phrased the
way a client says it (*"I don't want it bouncing around."*). Press one or several;
press again to remove.

**Step 2 — the numbers behind that.** The stat tiles are not fixed. They swap to
whichever metrics feed the priorities that are pressed, each with a plain-English
explanation and a comparison against a classic 60/40 anchor.

**Step 3 — the ranking.** Every portfolio scored 0–100 on the pressed priorities and
ranked, so the client sees *why* one mix comes out on top rather than being told.

**Step 4 — compare side by side.** Pick up to three portfolios and read them across
four charts: growth of $100,000, the drawdown chart (the one clients actually feel),
calendar-year returns, and a risk-vs-return map of all eight.

**Talk track.** A collapsible panel with a line to say for each pressed priority, and
the specific figures from this data to back it up.

**Reference table.** Every metric for every portfolio, with the rows feeding the
current priorities highlighted.

Also: a period filter that rescopes every figure and chart at once (since 2005 / 15 /
10 / 5 years), a data-table view behind every chart, light and dark themes, a print
layout, and no horizontal scrolling down to phone width.

## Making it live — swap in your own data

Everything on the page is derived, so you only touch the `DATA` block at the top of
the `<script>`:

| Constant | What to change |
|---|---|
| `ASSET_YEARS` | Annual total returns per asset class. Add or remove years freely — the axes, tables and periods follow. |
| `ASSET_TRAITS` | Yield and income-reliability per asset class. |
| `PORTFOLIOS` | Your real models or funds: weights (must total 100), expense ratio, liquidity, tax score, turnover, and the blurb used in the answer band. |
| `PRIORITIES` | The pressable priorities and, for each, which metrics score it and how heavily. `dir: 1` = higher is better, `dir: -1` = lower is better. |
| `TALK` | The sentence to say for each priority, built from the winning portfolio's own numbers. |

Adding a ninth portfolio or a new priority needs no other change. If you want to feed
in real monthly return streams instead of annualised figures, replace `SERIES[id]`
with your own arrays of monthly decimal returns — every metric, chart and score is
computed from those arrays and nothing else.

### How the scoring works

Each priority names a handful of metrics with a weight and a direction. For each
metric, the portfolios on screen are min–max normalised against each other, flipped
where lower is better, and combined into a 0–100 score. Press several priorities and
the scores are averaged. **A score is relative to the portfolios on the page** — 100
means best of this group, not perfect — and the dashboard says so on screen.

## About the data

The portfolios are model asset-class mixes, not real funds. Their monthly return
streams are generated deterministically (a seeded generator, so the page is identical
on every load) from published-style annual asset-class results for 2005–2025, with
each year's months solved to compound exactly to that year's figure. Every number on
the page — CAGR, volatility, drawdowns, capture ratios, inflation beta — is computed
from those streams, so the figures are internally consistent and reproducible. They
are an illustration of how different mixes behave, not the track record of any
specific product.

**Nothing here is investment advice**, a recommendation, an offer, or a projection.
Past performance does not predict future results. If you put this in front of real
clients, swap in your own data and your own compliance disclosure first.

## Accessibility and chart conventions

Charts follow a validated categorical palette (checked for colour-vision deficiency
separation and contrast in both light and dark modes), use a single hue with direct
labels wherever more than three series would be needed, never use a second y-axis,
and every chart has a data-table twin so no value is reachable by colour or hover
alone.
