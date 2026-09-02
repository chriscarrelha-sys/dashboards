"""Render the convertible-arbitrage data-pack figures.

Palette and mark specs follow the dataviz reference palette (light mode,
surface #fcfcfb). Categorical slots 1-3 validated all-pairs; the aqua slot
carries a sub-3:1 contrast warning, so every series is direct-labelled and
every figure is backed by a data table in the PDF.
"""
import csv
import os
from datetime import datetime

import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
from matplotlib.ticker import FuncFormatter

HERE = os.path.dirname(os.path.abspath(__file__))
DATA = os.path.join(HERE, "data")
FIGS = os.path.join(HERE, "figures")
os.makedirs(FIGS, exist_ok=True)

SURFACE = "#fcfcfb"
INK = "#0b0b0b"
INK2 = "#52514e"
MUTED = "#8a8880"
GRID = "#e6e4de"
S1 = "#2a78d6"   # blue
S2 = "#eb6834"   # orange
S3 = "#1baf7a"   # aqua
NEG = "#e34948"  # diverging red
POS = "#2a78d6"  # diverging blue

plt.rcParams.update({
    "figure.facecolor": SURFACE,
    "axes.facecolor": SURFACE,
    "savefig.facecolor": SURFACE,
    "font.family": "DejaVu Sans",
    "font.size": 8.5,
    "axes.edgecolor": GRID,
    "axes.labelcolor": INK2,
    "text.color": INK,
    "xtick.color": INK2,
    "ytick.color": INK2,
    "axes.titlesize": 10.5,
    "axes.titleweight": "bold",
})


def read(name):
    with open(os.path.join(DATA, name)) as fh:
        return list(csv.DictReader(fh))


def d(s):
    return datetime.strptime(s, "%Y-%m-%d")


def f(v):
    return float(v) if v not in ("", None) else None


def style(ax, ylab=None):
    ax.set_axisbelow(True)
    ax.grid(axis="y", color=GRID, linewidth=0.7)
    ax.grid(axis="x", visible=False)
    for side in ("top", "right", "left"):
        ax.spines[side].set_visible(False)
    ax.spines["bottom"].set_color(GRID)
    ax.tick_params(length=0)
    if ylab:
        ax.set_ylabel(ylab, color=INK2, fontsize=8)


def titles(ax, title, subtitle=None, pad=30):
    """Title above subtitle above the plot, with reserved space for each."""
    ax.set_title(title, color=INK, loc="left", pad=pad if subtitle else 12)
    if subtitle:
        ax.text(0, 1.035, subtitle, transform=ax.transAxes, color=INK2,
                fontsize=8.2, va="bottom")


def save(fig, name):
    path = os.path.join(FIGS, name)
    fig.savefig(path, dpi=220, bbox_inches="tight", pad_inches=0.16)
    plt.close(fig)
    print("wrote", path)


# ---------------------------------------------------------------- 1. HY OAS
def fig_hy_oas():
    rows = read("hy_oas_month_end.csv")
    xs = [d(r["date"]) for r in rows]
    ys = [f(r["hy_oas_pct"]) for r in rows]
    fig, ax = plt.subplots(figsize=(9.4, 3.9))
    ax.plot(xs, ys, color=S1, linewidth=2.0, solid_capstyle="round", zorder=3)
    ax.scatter([xs[0], xs[-1]], [ys[0], ys[-1]], s=34, color=S1,
               edgecolor=SURFACE, linewidth=2, zorder=4)
    ax.annotate(f"Sep 2023  {ys[0]:.2f}%", (xs[0], ys[0]), textcoords="offset points",
                xytext=(6, -18), color=S1, fontsize=8.5, fontweight="bold")
    ax.annotate(f"{ys[-1]:.2f}%  Aug 2026\n(cycle low)", (xs[-1], ys[-1]),
                textcoords="offset points", xytext=(-4, -32), color=S1,
                fontsize=8.5, fontweight="bold", ha="right")
    # April 2025 tariff shock
    apr = d("2025-04-30")
    ax.scatter([apr], [3.94], s=40, facecolor=SURFACE, edgecolor=S2,
               linewidth=2, zorder=5)
    ax.annotate("Apr 2025 tariff shock\nmonth-end 3.94%  ·  4.61% intramonth (Apr 7)",
                (apr, 3.94), textcoords="offset points", xytext=(10, 22),
                color=S2, fontsize=8, fontweight="bold",
                arrowprops=dict(arrowstyle="-", color=S2, linewidth=1.1))
    peak = d("2023-10-31")
    ax.annotate("Oct 2023  4.42%\n(window high)", (peak, 4.42),
                textcoords="offset points", xytext=(8, 2), color=INK2, fontsize=8)
    style(ax, "Option-adjusted spread (%)")
    titles(ax, "ICE BofA US High Yield OAS, month-end — Sep 2023 to Aug 2026",
           "Credit risk compressed through the window; only the April 2025 tariff "
           "shock interrupts the grind tighter.")
    ax.yaxis.set_major_formatter(FuncFormatter(lambda v, _: f"{v:.1f}%"))
    ax.set_ylim(2.15, 4.95)
    save(fig, "01_hy_oas.png")


# ------------------------------------------------------------------ 2. MOVE
def fig_move():
    rows = read("move_monthly_2025.csv")
    xs = [d(r["date"]) for r in rows]
    ys = [f(r["move_close_bp"]) for r in rows]
    anchors = read("move_anchors.csv")
    fig, ax = plt.subplots(figsize=(9.4, 3.9))
    # confirmed 2025 monthly series
    ax.plot(xs, ys, color=S1, linewidth=2.0, solid_capstyle="round", zorder=4,
            label="2025 month-end closes (confirmed)")
    ax.scatter(xs, ys, s=26, color=S1, edgecolor=SURFACE, linewidth=1.6, zorder=5)
    # anchors / partials
    ax_x, ax_y, ax_lab = [], [], []
    for r in anchors:
        if r["date"].startswith("2025-12"):
            continue
        ax_x.append(d(r["date"]))
        ax_y.append(f(r["move_bp"]))
        ax_lab.append(r["confidence"])
    ax.scatter(ax_x, ax_y, s=64, marker="D", facecolor=SURFACE, edgecolor=S2,
               linewidth=1.8, zorder=6, label="Anchors / partials only (not a monthly series)")
    notes = {
        "2023-03-31": ("~199  Mar 2023 peak\n(SVB / Credit Suisse)", (8, -6), "left"),
        "2023-10-31": (">140 for weeks\nOct 2023 (30Y > 5%)", (8, 4), "left"),
        "2024-12-31": ("96.67  2024 close (implied)", (-10, 6), "right"),
        "2026-04-30": ("~67\nApr 26", (-2, -30), "center"),
        "2026-06-23": ("70.01", (0, 12), "center"),
        "2026-08-31": ("75.32\nAug 26", (9, -6), "left"),
    }
    for r in anchors:
        if r["date"] in notes:
            txt, off, ha = notes[r["date"]]
            ax.annotate(txt, (d(r["date"]), f(r["move_bp"])),
                        textcoords="offset points", xytext=off, ha=ha,
                        color=S2, fontsize=7.8, fontweight="bold")
    ax.annotate("91.76\nJan 25", (xs[0], ys[0]), textcoords="offset points",
                xytext=(-2, -28), color=S1, fontsize=8, ha="center", fontweight="bold")
    ax.annotate("63.96  Dec 2025 close\n(−33.8% on the year)", (xs[-1], ys[-1]),
                textcoords="offset points", xytext=(-4, -30), color=S1,
                fontsize=8, ha="right", fontweight="bold")
    # shade the coverage gap
    ax.axvspan(d("2023-01-01"), d("2024-12-01"), color="#f2f1ec", zorder=0)
    ax.text(d("2023-11-15"), 178, "2023–2024: no free month-end series\n(anchors only — see caveats)",
            color=MUTED, fontsize=8, ha="center", style="italic")
    style(ax, "MOVE index (basis points)")
    titles(ax, "ICE BofA MOVE index — confirmed 2025 monthly closes with 2023/24/26 anchors",
           "Rate volatility fell by two-thirds from the March-2023 banking peak to the "
           "December-2025 close.")
    ax.set_ylim(38, 218)
    ax.legend(frameon=False, loc="lower left", fontsize=8, labelcolor=INK2,
              bbox_to_anchor=(0.005, 0.005))
    save(fig, "02_move.png")


# ------------------------------------------------------------------- 3. VIX
def fig_vix():
    ann = read("vix_annual_avg.csv")
    mon = read("vix_monthly_recent.csv")
    fig, (a1, a2) = plt.subplots(1, 2, figsize=(9.4, 3.3),
                                 gridspec_kw={"width_ratios": [1.25, 1]})
    yrs = [r["year"] for r in ann]
    vals = [f(r["vix_avg"]) for r in ann]
    bars = a1.bar(yrs, vals, color=[MUTED, S1, S1, S1], width=0.58, zorder=3)
    for b, v in zip(bars, vals):
        a1.annotate(f"{v:.2f}", (b.get_x() + b.get_width() / 2, v),
                    textcoords="offset points", xytext=(0, 4), ha="center",
                    color=INK, fontsize=9, fontweight="bold")
    style(a1, "Annual average of daily VIX")
    titles(a1, "VIX — annual average (FRED: VIXCLS)", pad=10)
    a1.set_ylim(0, 30)
    a1.text(0.0, -0.17, "2022 shown in grey for context (pre-window).",
            transform=a1.transAxes, color=MUTED, fontsize=7.5)

    lbl = ["Nov 25", "Dec 25", "Jan 26", "Feb 26"]
    mv = [f(r["vix_avg"]) for r in mon]
    b2 = a2.bar(lbl, mv, color=S1, width=0.55, zorder=3)
    for b, v in zip(b2, mv):
        a2.annotate(f"{v:.2f}", (b.get_x() + b.get_width() / 2, v),
                    textcoords="offset points", xytext=(0, 4), ha="center",
                    color=INK, fontsize=9, fontweight="bold")
    style(a2, "Monthly average")
    titles(a2, "VIX — confirmed recent monthly averages", pad=10)
    a2.set_ylim(0, 25)
    a2.text(0.0, -0.17, "Full 2023–26 monthly detail is downloadable from FRED\nbut was not transcribed here.",
            transform=a2.transAxes, color=MUTED, fontsize=7.5)
    fig.subplots_adjust(wspace=0.28)
    save(fig, "03_vix.png")


# ------------------------------------------------------------- 4. cheapness
def fig_cheapness():
    rows = read("cheapness_quarterly.csv")
    labels = [r["quarter"].replace("Q", " Q") for r in rows]
    vals = [f(r["points_cheap"]) for r in rows]
    fig, ax = plt.subplots(figsize=(9.4, 3.5))
    bars = ax.bar(labels, vals, color=S1, width=0.5, zorder=3)
    for b, v in zip(bars, vals):
        ax.annotate(f"{v:.1f} pts", (b.get_x() + b.get_width() / 2, v),
                    textcoords="offset points", xytext=(0, 4), ha="center",
                    color=INK, fontsize=9, fontweight="bold")
    style(ax, "Points cheap vs. theoretical value")
    titles(ax, "Convertible new-issue cheapness — Matthews South quarterly reviews",
           "New paper priced consistently cheap to model through 2023–2025 (FY2024 avg "
           "2.5 pts, FY2025 avg 2.0 pts), then converged toward fair value in early 2026.")
    ax.set_ylim(0, 3.2)
    ax.text(0.0, -0.19, "Quarters shown are the ones confirmed in sourcing. "
            "2023 Q1/Q3/Q4, 2024 Q1–Q3 and 2025 Q2 were not confirmed and are omitted "
            "rather than interpolated.", transform=ax.transAxes, color=MUTED, fontsize=7.5)
    save(fig, "04_cheapness.png")


# --------------------------------------------------------------- 5. returns
def fig_returns():
    hf = {r["year"]: f(r["return_pct"]) for r in read("hfrx_convarb_annual.csv")}
    vx = read("vxa0_annual.csv")
    years = ["2023", "2024", "2025"]
    conv = [hf[y] for y in years]
    vxa = [f(r["vxa0_total_return_pct"]) for r in vx if r["year"] in years]
    spx = [f(r["sp500_total_return_pct"]) for r in vx if r["year"] in years]
    w = 0.26
    x = range(len(years))
    fig, ax = plt.subplots(figsize=(9.4, 3.8))
    sets = [
        ([i - w for i in x], conv, S1, "HFRX Convertible Arbitrage"),
        ([i for i in x], vxa, S2, "ICE BofA All US Convertibles (VXA0)"),
        ([i + w for i in x], spx, S3, "S&P 500 total return"),
    ]
    for xs, ys, col, lab in sets:
        bars = ax.bar(xs, ys, width=w - 0.02, color=col, label=lab, zorder=3)
        for b, v in zip(bars, ys):
            ax.annotate(f"{v:.1f}", (b.get_x() + b.get_width() / 2, v),
                        textcoords="offset points", xytext=(0, 3), ha="center",
                        color=INK, fontsize=8, fontweight="bold")
    ax.set_xticks(list(x))
    ax.set_xticklabels(years)
    style(ax, "Total return (%)")
    titles(ax, "Annual total return — convert-arb strategy, convertible index, and equities",
           "In 2025 the convertible index (+18.0%) edged out the S&P 500 (+17.9%), while the "
           "market-neutral arb sleeve made +12.78% with near-zero equity beta.")
    ax.set_ylim(0, 31)
    ax.legend(frameon=False, fontsize=8, labelcolor=INK2, loc="upper right",
              bbox_to_anchor=(1.0, 1.0), ncol=1)
    save(fig, "05_returns.png")


# -------------------------------------------------------------- 6. issuance
def fig_issuance():
    ann = read("issuance_annual.csv")
    qtr = read("issuance_quarterly.csv")
    fig, (a1, a2) = plt.subplots(1, 2, figsize=(9.8, 3.8),
                                 gridspec_kw={"width_ratios": [1, 1.3]})
    yrs = ["2023", "2024", "2025"]
    us = [f(next(r["us_matthews_south_bn"] for r in ann if r["year"] == y)) for y in yrs]
    bars = a1.bar(yrs, us, color=S1, width=0.55, zorder=3)
    for b, v in zip(bars, us):
        a1.annotate(f"${v:.0f}bn", (b.get_x() + b.get_width() / 2, v),
                    textcoords="offset points", xytext=(0, 4), ha="center",
                    color=INK, fontsize=9, fontweight="bold")
    a1.scatter([2.42], [108.7], s=52, marker="D", facecolor=SURFACE, edgecolor=S2,
               linewidth=1.8, zorder=5)
    a1.annotate("Bloomberg (US)\n$108.7bn", (2.42, 108.7), textcoords="offset points",
                xytext=(8, -3), ha="left", color=S2, fontsize=7.4, fontweight="bold")
    a1.scatter([2.42], [140.5], s=52, marker="D", facecolor=SURFACE, edgecolor=S3,
               linewidth=1.8, zorder=5)
    a1.annotate("Dealogic (global)\n$140.5bn", (2.42, 140.5), textcoords="offset points",
                xytext=(8, -3), ha="left", color=S3, fontsize=7.4, fontweight="bold")
    a1.scatter([2.42], [167.1], s=52, marker="D", facecolor=SURFACE, edgecolor=MUTED,
               linewidth=1.8, zorder=5)
    a1.annotate("Numerix (global)\n$167.1bn", (2.42, 167.1), textcoords="offset points",
                xytext=(8, -3), ha="left", color=INK2, fontsize=7.4, fontweight="bold")
    style(a1, "US issuance (US$bn)")
    titles(a1, "Annual issuance (US bars)", pad=10)
    a1.set_ylim(0, 195)
    a1.set_xlim(-0.6, 3.5)

    qs = [r for r in qtr if r["us_bn"]]
    labs = [r["quarter"].replace("Q", " Q") for r in qs]
    vals = [f(r["us_bn"]) for r in qs]
    b2 = a2.bar(labs, vals, color=S1, width=0.6, zorder=3)
    for b, v in zip(b2, vals):
        a2.annotate(f"{v:.1f}", (b.get_x() + b.get_width() / 2, v),
                    textcoords="offset points", xytext=(0, 3), ha="center",
                    color=INK, fontsize=7.5, fontweight="bold")
    a2.tick_params(axis="x", labelrotation=60, labelsize=7.2)
    style(a2, "US issuance (US$bn)")
    titles(a2, "US quarterly issuance (confirmed quarters)", pad=10)
    a2.set_ylim(0, 40)
    a2.text(0.0, -0.42, "Q3 2024 and Q2 2025 not confirmed — omitted, not interpolated.",
            transform=a2.transAxes, color=MUTED, fontsize=7.5)
    fig.subplots_adjust(wspace=0.34)
    save(fig, "06_issuance.png")


# --------------------------------------------------------------- 7. S&P 500
def fig_sp500():
    rows = read("sp500_monthly.csv")
    xs = [d(r["date"]) for r in rows]
    ys = [f(r["close"]) for r in rows]
    a = [(x, y) for x, y in zip(xs, ys) if x.year == 2023]
    b = [(x, y) for x, y in zip(xs, ys) if x.year >= 2024]
    fig, ax = plt.subplots(figsize=(9.4, 3.6))
    ax.plot([p[0] for p in a], [p[1] for p in a], color=S1, linewidth=2.0, zorder=3)
    ax.plot([p[0] for p in b], [p[1] for p in b], color=S1, linewidth=2.0, zorder=3)
    ax.plot([a[-1][0], b[0][0]], [a[-1][1], b[0][1]], color=S1, linewidth=1.4,
            linestyle=(0, (3, 3)), zorder=2)
    ax.axvspan(d("2024-01-15"), d("2024-12-15"), color="#f2f1ec", zorder=0)
    ax.text(d("2024-07-01"), 4400, "2024 monthly detail\nnot transcribed\n(Dec-24 close only)",
            color=MUTED, fontsize=8, ha="center", style="italic")
    ax.scatter([xs[-1]], [ys[-1]], s=36, color=S1, edgecolor=SURFACE, linewidth=2, zorder=5)
    ax.annotate("7,700.57\nSep 1 2026", (xs[-1], ys[-1]), textcoords="offset points",
                xytext=(-6, -4), ha="right", color=S1, fontsize=8.5, fontweight="bold")
    ax.annotate("3,960.66\nJan 2023", (xs[0], ys[0]), textcoords="offset points",
                xytext=(8, 6), color=S1, fontsize=8.5, fontweight="bold")
    ax.annotate("Apr 2025 tariff trough 5,369.50", (d("2025-04-30"), 5369.50),
                textcoords="offset points", xytext=(6, -24), color=S2,
                fontsize=8, fontweight="bold",
                arrowprops=dict(arrowstyle="-", color=S2, linewidth=1.1))
    style(ax, "Index level")
    titles(ax, "S&P 500 monthly closing level (multpl.com)",
           "Month-end closes; 2024 detail beyond the December close was not transcribed.")
    ax.yaxis.set_major_formatter(FuncFormatter(lambda v, _: f"{v:,.0f}"))
    save(fig, "07_sp500.png")


# ------------------------------------------------------- 8. VXA0 monthly '25
def fig_vxa0_monthly():
    rows = read("vxa0_monthly_2025.csv")
    labs = [d(r["date"]).strftime("%b") for r in rows]
    vals = [f(r["total_return_pct"]) for r in rows]
    cols = [POS if v >= 0 else NEG for v in vals]
    fig, ax = plt.subplots(figsize=(9.4, 3.2))
    bars = ax.bar(labs, vals, color=cols, width=0.58, zorder=3)
    for b, v in zip(bars, vals):
        ax.annotate(f"{v:+.1f}", (b.get_x() + b.get_width() / 2, v),
                    textcoords="offset points", xytext=(0, 4 if v >= 0 else -12),
                    ha="center", color=INK, fontsize=8.5, fontweight="bold")
    ax.axhline(0, color=INK2, linewidth=1.0, zorder=4)
    style(ax, "Monthly total return (%)")
    titles(ax, "ICE BofA All US Convertibles (VXA0) — 2025 monthly total return",
           "Nine of twelve months positive; the Feb–Mar drawdown and the Nov–Dec fade "
           "bracket a strong Q2–Q3.")
    ax.set_ylim(-4.2, 5.4)
    save(fig, "08_vxa0_monthly.png")


for fn in (fig_hy_oas, fig_move, fig_vix, fig_cheapness, fig_returns,
           fig_issuance, fig_sp500, fig_vxa0_monthly):
    fn()
print("done")
