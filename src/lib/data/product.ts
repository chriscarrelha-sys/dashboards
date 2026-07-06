// Reusable product knowledge. This is the grounding context the Writing Agent and
// Product Expert agent draw on so generated content stays accurate and on-message.
// Figures are illustrative placeholders for the demo — replace with approved,
// compliance-reviewed marketing language before any real send.

export const productKnowledge = {
  fund: {
    ticker: "MMNIX",
    name: "Market-Neutral Institutional Strategy",
    category: "Alternative — Equity Market Neutral",
    oneLiner:
      "A hedged, low-beta strategy designed to deliver an uncorrelated return stream that acts as ballast to a traditional equity/fixed-income portfolio.",
    returnDrivers: [
      "Convertible arbitrage — capturing the spread between convertible bonds and the underlying equity/hedge",
      "Relative-value equity — long/short pairs with minimal net market exposure",
      "Volatility and correlation dislocations",
    ],
    keyPoints: [
      "Targets near-zero beta to broad equities, so it diversifies rather than amplifies drawdowns.",
      "Historically low correlation to both equities and duration — genuine portfolio ballast.",
      "Daily liquidity in a mutual-fund wrapper — addresses the gating concerns advisors have with private alts.",
      "Fits as a 5–10% sleeve funded from the equity side to improve risk-adjusted efficiency.",
    ],
    complianceReminders: [
      "No performance guarantees or forward return promises.",
      "Always pair claims with 'past performance does not guarantee future results.'",
      "Reference the prospectus for risks; alternative strategies can lose value.",
    ],
  },
  concepts: {
    "convertible arbitrage":
      "A market-neutral strategy that buys a convertible bond and hedges the equity, isolating the bond's optionality and credit/vol spread while neutralizing directional market risk.",
    correlation:
      "The degree to which a holding moves with the rest of the portfolio. Low-correlation sleeves reduce total portfolio volatility more than a same-Sharpe high-correlation sleeve would.",
    "market neutral":
      "Balancing long and short exposure so the strategy's return is driven by security selection and spreads rather than market direction (near-zero beta).",
    ballast:
      "An allocation whose job is to steady the portfolio in drawdowns rather than maximize return — improving the efficiency of the whole book.",
  },
} as const;

export type ProductKnowledge = typeof productKnowledge;
