# Convertible Arbitrage Market — Numeric Time-Series Data Pack

Deliverable: **`../output/convertible-arb-market-data-pack.pdf`** (15 pages, 8 figures,
14 data tables, coverage/confidence matrix, caveats, and source-refresh paths).

## Layout

```
convertible_arb/
  data/              14 CSVs — every number in the PDF lives here
  figures/           8 rendered PNGs (regenerated, not hand-edited)
  build_charts.py    CSVs -> figures/
  build_pdf.py       CSVs + figures/ -> output/…pdf
```

## Rebuild

```bash
pip install reportlab matplotlib pillow
python3 build_charts.py && python3 build_pdf.py
```

Charts and tables read the same CSVs, so they cannot drift apart. To refresh a
series, edit its CSV and re-run both scripts.

## Series and coverage

| CSV | Series | Coverage |
|---|---|---|
| `hy_oas_month_end.csv` | ICE BofA US HY OAS | complete, Sep 2023 – Aug 2026 (36 month-ends) |
| `move_monthly_2025.csv` | MOVE index | complete for 2025 |
| `move_anchors.csv` | MOVE index | anchors only for 2023, 2024, 2026 |
| `vix_annual_avg.csv` | CBOE VIX | annual averages 2022–2025 |
| `vix_monthly_recent.csv` | CBOE VIX | 4 confirmed monthly averages |
| `cheapness_quarterly.csv` | New-issue cheapness | 6 confirmed quarters |
| `cheapness_gaps.csv` | New-issue cheapness | the 7 unconfirmed quarters, named |
| `hfrx_convarb_annual.csv` | HFRX Convertible Arb | 2023–2025 |
| `hfrx_convarb_monthly.csv` | HFRX Convertible Arb | 8 confirmed monthly prints |
| `vxa0_annual.csv` | VXA0, S&P 500, Russell 2000 | annual TR 2023 – 2026 YTD |
| `vxa0_monthly_2025.csv` | VXA0 | complete for 2025 |
| `issuance_annual.csv` | Issuance | 2023–2026 by provider (US and global) |
| `issuance_quarterly.csv` | Issuance | Q1'23 – Q2'26, gaps left empty |
| `sp500_monthly.csv` | S&P 500 | 33 monthly closes; 2024 detail absent |

## Method

No cell is interpolated, smoothed, carried forward, or estimated. Where a period
could not be confirmed from a real source it is absent from the CSV, absent from
the chart, and named in §5 of the PDF. The only two exceptions are explicitly
labelled `anchor-approx` and `anchor-implied` in `move_anchors.csv`.

Two genuine gaps could not be closed from free sources: full daily/monthly VIX
before 2026, and MOVE month-ends for 2023–2024. FRED also now retains only a
rolling three-year window of the HY OAS series, so Jan–Aug 2023 month-ends sit
outside it. §7 of the PDF gives the refresh path for each.

## Colour

Charts use a colourblind-validated categorical palette (blue `#2a78d6`,
orange `#eb6834`, aqua `#1baf7a`; diverging blue/red for signed bars). The set
passes CVD separation, normal-vision separation, lightness-band and chroma
checks on an all-pairs basis. The aqua slot sits below 3:1 contrast on the light
surface, so every series carries a direct label and a backing data table —
identity is never conveyed by colour alone.
