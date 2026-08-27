# Advisor dashboards

Three tools for three moments in a client meeting: **`index.html`** for discovery,
**`proposal.html`** for building a proposal from scratch, and **`allocation-review.html`**
for presenting a finished one. Each is a single self-contained file, and they link to
each other.

---

# 1. Client Priorities Dashboard — `index.html`

An interactive dashboard for the moment in a client meeting when they tell you what
actually matters to them. Press what they said — *stability*, *income*, *growth*,
*don't lose money* — and the whole page rewrites itself around that answer: the
headline, the numbers on screen, the ranking of every portfolio, and the words to say.

Open `index.html` in any browser. No build step, no server, no dependencies — one
self-contained file you can email, put on a tablet, or run on a screen share. The
only external request is the IBM Plex webfont; offline it falls back to the system
sans and everything else still works.

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


---

# 2. Proposal Engine — `proposal.html`

A full current-vs-proposed proposal tool. Load a client's holdings, build the proposal
beside them, and run the whole case.

## Getting data in

Four ways, all local to the browser — nothing is uploaded anywhere:

- **Drop an Excel file.** `.xlsx` is unzipped and parsed in the page itself (no library):
  shared strings, header detection, Excel date serials. Header names are matched loosely,
  so `Symbol` / `Current Weight` / `Target Weight` works, as does `Ticker,Current %,Proposed %`.
  A second weight column becomes the proposed allocation.
- **Drop a CSV/TSV.**
- **Paste from Excel.** Every drop zone has a *Paste instead* box — copy the cells, paste,
  done. This is the reliable path in sandboxed viewers where the file picker is blocked.
- **Start from a model** and edit by hand.

Return history loads the same way: a date column and one column per ticker. Daily, weekly,
monthly or quarterly is **detected from the dates**, and every statistic annualises against
it. Percent and decimal returns are both understood. A long `Date,Ticker,Return` layout is
pivoted automatically.

## Editing allocations

Click any weight to open the picker: **0–23 are one click away without scrolling**, the grid
scrolls to 100, there are − / + buttons, and you can type a value. Over the weight itself,
the **mouse wheel** nudges it a point at a time; arrow keys and PageUp/PageDown work too.
The picker flips above the row when there is no room below it.

## Proxy data, and where it stops

Tickers without uploaded returns run on a **proxy**: factor loadings for US, developed and
emerging equity, Treasuries, credit, real assets and cash, derived from the holding's own
duration, spread duration and equity beta, plus its own idiosyncratic volatility. Roughly 100
common ETFs and funds are mapped out of the box; anything unrecognised gets an asset-class
dropdown on its row.

Proxy figures are **badged everywhere they appear**, and a banner counts them. Upload returns
and those holdings flip to `Live`. Asset-class settings still drive the stress tests even when
real returns are loaded, because duration and beta are not recoverable from a return series alone.

The proxy carries **real crisis structure**. Annual asset-class results are spread across the
periods inside each year, but named windows — the 2008 collapse, the 2009 rebound, the euro
crisis, the taper tantrum, Q4 2018, the COVID crash and rebound, the 2022 rate shock — are
pinned to their actual months first, and the rest of the year is then solved so the annual
total still compounds exactly to the published figure. Without this, an episode measured over
two months inside a positive year would be pure noise.

## What it produces

| Tab | What's there |
|---|---|
| **Build** | Holdings editor, five risk buckets (cash → bonds → credit → real assets → equity), and the exposure change: duration, spread duration, equity beta, inflation response, yield, cost |
| **Performance** | Growth of $1,000,000, trailing returns (YTD through 10 years), calendar years, drawdowns |
| **Risk & MPT** | Risk/return map, risk *contribution* vs capital weight, ~30 MPT statistics, return distribution, rolling 12-period returns |
| **Stress & scenarios** | Seven historical episodes measured from the series; five live shock sliders (rates, spreads, equity, inflation, volatility) with scenario presets; down-period analysis |
| **Optimization** | Long-only efficient frontier with a position cap, minimum-risk and best-Sharpe mixes, one click to adopt either |
| **Proposal** | A print-ready summary: the case in a paragraph, return/risk and exposure tables, what actually changes, the bad years, and what to say |

Every figure is scoped by the **date range** at the top, which rescopes all six tabs at once.

### The statistics

Return (compound, arithmetic, total, best/worst 12), risk (standard deviation, downside
deviation, max drawdown, time under water, ulcer index, VaR95, CVaR95, worst period),
risk-adjusted (Sharpe, Sortino, Calmar, Martin, Omega, M²), benchmark-relative (beta, Jensen's
alpha, R², correlation, tracking error, information ratio, Treynor, up/down capture, batting
average), and distribution shape (positive periods, skewness, excess kurtosis).

### The stress model

Historical episodes are measured straight from the return series. The live sliders are
**first-order factor shocks**: duration × rate move, spread duration × spread move, beta ×
market move, inflation sensitivity × surprise, plus a volatility term for the gap risk beta
alone misses. They reprice instantly and say nothing about how long a loss lasts — the page
says so on the card.

### The optimiser

Long-only, fully invested, with a position cap you choose. Solved by projected gradient ascent
with an exact Euclidean projection onto the capped simplex, swept across risk aversion to trace
the frontier, plus the max-return corner. Verified against an independent 20,000-iteration
reference run: same weights, same volatility to seven significant figures. The tool ships four
caveats about mean-variance optimisation next to the chart, because they matter more than the chart does.


---

# 3. Allocation Review — `allocation-review.html`

The HTML version of an existing client workbook — the interactive form of
*Robert (Bucky) Leach — Interactive Portfolio Allocation Dashboard.xlsx*. Where
`proposal.html` is a general engine you build a proposal in, this is a finished
proposal you present from and hand over.

Two models (Strategic Income & Alternatives, Muni & Factor Growth), each with its real
holdings, sleeves and current-vs-proposed weights, across five tabs: Allocation, Metric
cards, Executive scorecard, Optimizer and Stress tests.

## Live versus input — the important distinction

The page is explicit about which numbers it stands behind:

**Live** — computed from the weights on the page, and re-computed the moment you change
one. Sleeve and asset-class totals, the trade (what funds what), allocation to the
strategies, securitized RMBS %, convertible arbitrage %, every change column, the header
KPIs, and the swap list. These carry a `Live` chip in the metric cards.

**Input** — carried over from the workbook and editable in place: returns, volatility,
Sharpe, Sortino, drawdowns, capture, correlations, duration, the sizing table and the
stress scenarios. Type over any of them and everything downstream follows.

**The page never models or simulates returns for a named fund.** The other two tools use
generated asset-class proxies with generic names; that would be inappropriate here, where
the tickers are real third-party products and the audience is a client. So where the
workbook left a cell blank, the page shows it blank and counts it: *"13 measures are still
blank."* An empty cell you can see beats a plausible number you can't source.

## What it does with the allocations

Click any weight for the same picker as the proposal engine — 0–23 one click away, scroll
for more, type it, or roll the mouse wheel over the weight. Sleeve subtotals, the total and
the checksum update live; positions going to zero are struck through and marked `exit`,
new positions are marked `new`, and the strategy rows are tinted.

The **trade panel** derives itself from the weight changes: what is being funded, what it
is funding, in points and in dollars on a stated account size.

**Apply recommended sizing** writes the workbook's suggested shifts into the proposed
column, funding them from the longest-duration and RMBS sleeves first.

## Re-pointing it at another client

Everything lives in one `WORKBOOK` block at the top of the script: `MODELS` (sleeves and
holdings), `METRICS` (the card values per model, `null` for blank), `CARDS` (which measures
each card shows and which are derived), `FRONTIER`, `SIZING`, `STRESS`, `SERIES_SEED` and
`TALKING_POINTS`. Change the client name in the header and the rest is data entry.

The growth and drawdown charts plot whatever series is loaded; the workbook ships five
placeholder months that only rise, which the page says out loud rather than drawing a
flat drawdown line and leaving you to wonder. Paste a real series to replace it.
