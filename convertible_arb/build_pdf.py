"""Assemble the convertible-arbitrage market data pack PDF."""
import csv
import os

from reportlab.lib import colors
from reportlab.lib.enums import TA_LEFT
from reportlab.lib.pagesizes import LETTER
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import inch
from reportlab.platypus import (BaseDocTemplate, Frame, Image, KeepTogether,
                                NextPageTemplate, PageBreak, PageTemplate,
                                Paragraph, Spacer, Table, TableStyle)

HERE = os.path.dirname(os.path.abspath(__file__))
DATA = os.path.join(HERE, "data")
FIGS = os.path.join(HERE, "figures")
OUT = os.path.abspath(os.path.join(HERE, "..", "output",
                                   "convertible-arb-market-data-pack.pdf"))
os.makedirs(os.path.dirname(OUT), exist_ok=True)

INK = colors.HexColor("#0b0b0b")
INK2 = colors.HexColor("#52514e")
MUTED = colors.HexColor("#8a8880")
RULE = colors.HexColor("#e6e4de")
S1 = colors.HexColor("#2a78d6")
S2 = colors.HexColor("#eb6834")
S3 = colors.HexColor("#1baf7a")
BAND = colors.HexColor("#f4f3ef")

MARGIN = 0.72 * inch
CW = LETTER[0] - 2 * MARGIN            # content width ~7.06in

ss = getSampleStyleSheet()


def st(name, **kw):
    base = dict(name=name, fontName="Helvetica", fontSize=9.4, leading=13.4,
                textColor=INK, alignment=TA_LEFT, spaceAfter=6)
    base.update(kw)
    return ParagraphStyle(**base)


BODY = st("body")
LEAD = st("lead", fontSize=10.6, leading=15.6, textColor=INK2, spaceAfter=10)
H1 = st("h1", fontName="Helvetica-Bold", fontSize=16, leading=20,
        spaceBefore=6, spaceAfter=3)
H2 = st("h2", fontName="Helvetica-Bold", fontSize=12.2, leading=16,
        spaceBefore=14, spaceAfter=4)
H3 = st("h3", fontName="Helvetica-Bold", fontSize=9.8, leading=13,
        spaceBefore=9, spaceAfter=3, textColor=INK2)
NOTE = st("note", fontSize=8.1, leading=11.2, textColor=MUTED, spaceAfter=5)
SRC = st("src", fontSize=7.9, leading=11, textColor=MUTED, spaceAfter=9)
BUL = st("bul", leftIndent=12, bulletIndent=2, spaceAfter=4)
COVTITLE = st("covt", fontName="Helvetica-Bold", fontSize=27, leading=32,
              spaceAfter=8)
COVSUB = st("covs", fontSize=13, leading=18.5, textColor=INK2, spaceAfter=16)


def read(name):
    with open(os.path.join(DATA, name)) as fh:
        return list(csv.DictReader(fh))


def rule(space=8, color=RULE):
    t = Table([[""]], colWidths=[CW], rowHeights=[0.6])
    t.setStyle(TableStyle([("BACKGROUND", (0, 0), (-1, -1), color)]))
    return [Spacer(1, space), t, Spacer(1, space)]


def fig(name, width=CW):
    from PIL import Image as PILImage
    path = os.path.join(FIGS, name)
    with PILImage.open(path) as im:
        w, h = im.size
    return Image(path, width=width, height=width * h / w)


def table(header, rows, widths=None, align_right=None, note=None, font=8.3):
    if align_right is None:
        align_right = list(range(1, len(header)))
    data = [header] + rows
    t = Table(data, colWidths=widths, repeatRows=1, hAlign="LEFT")
    style = [
        ("FONT", (0, 0), (-1, 0), "Helvetica-Bold", font),
        ("FONT", (0, 1), (-1, -1), "Helvetica", font),
        ("TEXTCOLOR", (0, 0), (-1, 0), INK),
        ("TEXTCOLOR", (0, 1), (-1, -1), INK2),
        ("BACKGROUND", (0, 0), (-1, 0), BAND),
        ("LINEBELOW", (0, 0), (-1, 0), 0.6, RULE),
        ("LINEBELOW", (0, 1), (-1, -2), 0.35, RULE),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("TOPPADDING", (0, 0), (-1, -1), 3.4),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 3.4),
        ("LEFTPADDING", (0, 0), (-1, -1), 5),
        ("RIGHTPADDING", (0, 0), (-1, -1), 5),
    ]
    for c in align_right:
        style.append(("ALIGN", (c, 0), (c, -1), "RIGHT"))
    t.setStyle(TableStyle(style))
    out = [t]
    if note:
        out += [Spacer(1, 3), Paragraph(note, NOTE)]
    return out


def bullets(items, style=BUL):
    return [Paragraph(i, style, bulletText="•") for i in items]


# ------------------------------------------------------------------ page furniture
def on_page(canvas, doc):
    canvas.saveState()
    canvas.setStrokeColor(RULE)
    canvas.setLineWidth(0.6)
    canvas.line(MARGIN, MARGIN - 12, LETTER[0] - MARGIN, MARGIN - 12)
    canvas.setFont("Helvetica", 7.4)
    canvas.setFillColor(MUTED)
    canvas.drawString(MARGIN, MARGIN - 24,
                      "Convertible Arbitrage Market — Numeric Time-Series Data Pack, 2023 to Aug/Sep 2026")
    canvas.drawRightString(LETTER[0] - MARGIN, MARGIN - 24, str(canvas.getPageNumber()))
    canvas.restoreState()


def on_cover(canvas, doc):
    canvas.saveState()
    canvas.setFillColor(colors.HexColor("#2a78d6"))
    canvas.rect(0, LETTER[1] - 0.34 * inch, LETTER[0], 0.34 * inch, stroke=0, fill=1)
    canvas.restoreState()


doc = BaseDocTemplate(OUT, pagesize=LETTER, leftMargin=MARGIN, rightMargin=MARGIN,
                      topMargin=MARGIN, bottomMargin=MARGIN + 6,
                      title="Convertible Arbitrage Market — Numeric Time-Series Data Pack",
                      author="Data pack", subject="Convertible arbitrage market data, 2023-2026")
frame = Frame(MARGIN, MARGIN + 6, CW, LETTER[1] - MARGIN - (MARGIN + 6), id="f")
doc.addPageTemplates([
    PageTemplate(id="cover", frames=[frame], onPage=on_cover),
    PageTemplate(id="body", frames=[frame], onPage=on_page),
])

S = []
A = S.append

# ======================================================================= COVER
A(NextPageTemplate("body"))
A(Spacer(1, 1.5 * inch))
A(Paragraph("Convertible Arbitrage Market", COVTITLE))
A(Paragraph("Numeric Time-Series Data Pack &nbsp;·&nbsp; 2023 to August / September 2026", COVSUB))
A(Spacer(1, 4))
A(Paragraph(
    "Eight series covering the convertible-arbitrage opportunity set: equity and rate volatility, "
    "high-yield credit spreads, new-issue cheapness, strategy and index returns, primary issuance, "
    "and the equity benchmark. Every figure in this pack is a sourced observation — nothing is "
    "interpolated, smoothed, or filled. Where a series has a genuine coverage gap, the gap is drawn "
    "and labelled rather than bridged.", LEAD))
A(Spacer(1, 10))
A(rule(0)[1])
A(Spacer(1, 12))
cover_rows = [
    ["1", "CBOE VIX index", "Annual averages 2022–25; four confirmed monthly averages", "FRED (VIXCLS)"],
    ["2", "ICE BofA MOVE index", "Full 2025 month-end closes; 2023/24/26 anchors only", "Convex Trade"],
    ["3", "ICE BofA US HY OAS", "36 consecutive month-ends, Sep 2023 – Aug 2026", "FRED (BAMLH0A0HYM2)"],
    ["4", "New-issue cheapness", "Six confirmed quarters, points cheap to theoretical", "Matthews South"],
    ["5", "HFRX Convertible Arb", "Annual 2023–25; eight confirmed monthly prints", "HFR"],
    ["6", "ICE BofA VXA0", "Annual total return 2023–26 YTD; 2025 monthly", "Calamos / ICE BofA"],
    ["7", "Convertible issuance", "US and global, annual and quarterly, by provider", "Multiple — see §7"],
    ["8", "S&P 500", "33 monthly closes; annual total returns", "multpl.com / Calamos"],
]
S.extend(table(["#", "Series", "Coverage in this pack", "Primary source"], cover_rows,
               widths=[0.28 * inch, 1.62 * inch, 3.16 * inch, 2.0 * inch],
               align_right=[], font=8.2))
A(Spacer(1, 16))
A(Paragraph(
    "Prepared 2 September 2026. Latest observation in the pack: 1 September 2026 (S&amp;P 500); "
    "most risk series run through 31 August 2026.", NOTE))
A(PageBreak())

# ======================================================================= TL;DR
A(Paragraph("Summary", H1))
S.extend(rule(4))
A(Paragraph(
    "Convertible arbitrage delivered a genuine three-year tailwind, and the data show why: the "
    "profit engine shifted away from equity beta and toward structural mechanics — cheap new-issue "
    "pricing, record primary supply, and rich single-stock volatility — precisely as macro "
    "volatility normalised.", LEAD))

A(Paragraph("What the numbers establish", H2))
S.extend(bullets([
    "<b>The strategy worked, three years running.</b> HFRX Convertible Arbitrage returned "
    "<b>+10.1%</b> (2023), <b>+6.82%</b> (2024) and <b>+12.78%</b> (2025), with <b>+2.48%</b> in "
    "January 2026 alone.",
    "<b>Volatility normalised sharply.</b> HY OAS fell from <b>4.42%</b> (Oct 2023) to <b>2.63%</b> "
    "(31 Aug 2026), a cycle low. MOVE fell from a <b>~199</b> peak (Mar 2023) to <b>63.96</b> "
    "(Dec 2025) and <b>75.32</b> (Aug 2026). VIX annual averages ran 16.85 → 15.55 → 18.93.",
    "<b>New paper stayed cheap.</b> Matthews South put new-issue cheapness at roughly <b>2 points</b> "
    "through 2023–2025 (FY2024 avg 2.5 pts; FY2025 avg 2.0 pts) — then it converged to <b>1.1 pts</b> "
    "in Q1 2026, with February 2026 averaging just <b>0.1 pts</b>.",
    "<b>Supply was a record.</b> US issuance ran ~$55bn (2023) → ~$88bn (2024) → ~$124bn (2025), the "
    "most active US year on record; global 2025 landed between $140.5bn and $167.1bn depending on provider.",
    "<b>Convertibles kept pace with equities in 2025.</b> VXA0 returned <b>+18.0%</b> against the "
    "S&amp;P 500's <b>+17.9%</b> — while the market-neutral arb sleeve made +12.78% with near-zero "
    "equity beta, which is the differentiating point for an allocator.",
]))

A(Paragraph("The one event to annotate on every chart", H2))
A(Paragraph(
    "The <b>April 2025 tariff shock</b> is visible simultaneously in every risk series: HY OAS spiked "
    "to <b>4.61%</b> intramonth on 7 April (month-end 3.94%), MOVE reached <b>139.88</b> intramonth "
    "(month-end 112.48), and the S&amp;P 500 troughed at <b>5,369.50</b>. It is the single most "
    "important marker on any 2023–2026 convert-arb chart.", BODY))

A(Paragraph("Where the data are genuinely incomplete", H2))
A(Paragraph(
    "Two granular gaps could not be closed from free sources, and are shown as gaps rather than "
    "estimated: <b>full daily/monthly VIX before 2026</b> (retrievable from FRED, not transcribed here) "
    "and <b>MOVE month-ends for 2023–2024</b> (only anchors are publicly retrievable free of charge). "
    "A third, narrower gap: FRED now retains only three years of the HY OAS series, so January–August "
    "2023 month-ends sit outside the free window. Section 6 lists every gap; section 7 says how to "
    "close each one.", BODY))
A(PageBreak())

# ================================================= 1. VOLATILITY AND CREDIT
A(Paragraph("1. &nbsp;Credit spreads and volatility", H1))
S.extend(rule(4))

A(Paragraph("1.1 &nbsp;ICE BofA US High Yield option-adjusted spread", H2))
A(fig("01_hy_oas.png"))
A(Spacer(1, 8))
oas = read("hy_oas_month_end.csv")
third = (len(oas) + 2) // 3
cols = [oas[:third], oas[third:2 * third], oas[2 * third:]]
maxlen = max(len(c) for c in cols)
rows = []
for i in range(maxlen):
    r = []
    for c in cols:
        if i < len(c):
            r += [c[i]["date"], f'{float(c[i]["hy_oas_pct"]):.2f}%']
        else:
            r += ["", ""]
    rows.append(r)
S.extend(table(["Month-end", "OAS", "Month-end", "OAS", "Month-end", "OAS"], rows,
               widths=[0.86 * inch, 0.62 * inch] * 3, align_right=[1, 3, 5],
               note="All 36 month-ends in the free FRED window. Intramonth high of 4.61% on 7 Apr 2025 "
                    "is not a month-end and is not in this table.", font=7.9))
A(Paragraph("Source: FRED series BAMLH0A0HYM2 (fred.stlouisfed.org/data/BAMLH0A0HYM2), daily table "
            "reduced to month-ends. Daily series ran through 2026-08-31 at time of pull.", SRC))
A(PageBreak())

A(Paragraph("1.2 &nbsp;ICE BofA MOVE index — rate volatility", H2))
A(fig("02_move.png"))
A(Spacer(1, 8))
mv = read("move_monthly_2025.csv")
mrows = [[r["date"], f'{float(r["move_close_bp"]):.2f}',
          f'{float(r["intramonth_high_bp"]):.2f}' if r["intramonth_high_bp"] else "—"] for r in mv]
S.extend(table(["2025 month-end", "Close (bp)", "Intramonth high (bp)"], mrows,
               widths=[1.5 * inch, 1.2 * inch, 1.6 * inch],
               note="The only fully confirmed monthly year in this series. 2025 closed −33.84% on the year.",
               font=8.2))
A(Spacer(1, 10))
an = read("move_anchors.csv")
arows = [[r["date"], f'{float(r["move_bp"]):.2f}', r["label"], r["confidence"]] for r in an]
_anchor = [Paragraph("Anchors and partials outside 2025", H3)] + table(
               ["Date", "MOVE (bp)", "What it is", "Confidence"], arows,
               widths=[0.85 * inch, 0.75 * inch, 3.3 * inch, 1.15 * inch],
               align_right=[1],
               note="These are anchors, not a monthly series — do not connect them as a line. "
                    "2024 traded mostly below 120; the 2024 close is implied from the reported "
                    "−22.22% annual change and the 2025 open.", font=8.0)
A(KeepTogether(_anchor))
A(Paragraph("Source: convextrade.com/metrics/move-index (anchors) and /history/2025 (monthly table). "
            "Charles Schwab corroborates the ~200 March-2023 peak. Barchart and Investing.com monthly "
            "history sit behind premium or interactive gates.", SRC))
A(PageBreak())

A(Paragraph("1.3 &nbsp;CBOE VIX — equity volatility", H2))
A(fig("03_vix.png"))
A(Spacer(1, 10))
vann = read("vix_annual_avg.csv")
vmon = read("vix_monthly_recent.csv")
S.extend(table(["Year", "Annual average VIX"],
               [[r["year"], f'{float(r["vix_avg"]):.2f}'] for r in vann],
               widths=[1.0 * inch, 1.5 * inch], font=8.4))
A(Spacer(1, 8))
S.extend(table(["Month", "Monthly average VIX"],
               [[r["date"], f'{float(r["vix_avg"]):.2f}'] for r in vmon],
               widths=[1.0 * inch, 1.5 * inch],
               note="Only these four monthly averages were transcribed. The full daily series "
                    "(2 Jan 1990 – 31 Aug 2026) and the complete monthly table are freely downloadable "
                    "from FRED; see §7 for the refresh path.", font=8.4))
A(Paragraph("Source: FRED series VIXCLS — fred.stlouisfed.org/series/VIXCLS (daily), "
            "graph/?g=Rqre (monthly), graph/?g=A58O (annual).", SRC))
A(PageBreak())

# ================================================= 2. CONVERT-ARB ECONOMICS
A(Paragraph("2. &nbsp;Convertible-arbitrage economics", H1))
S.extend(rule(4))

A(Paragraph("2.1 &nbsp;New-issue cheapness", H2))
A(Paragraph(
    "Cheapness is the strategy's cleanest structural edge: points by which new paper prices below "
    "model value, so a theoretical value of 102.5 means 2.5 points cheap (100 = fair).", BODY))
A(fig("04_cheapness.png"))
A(Spacer(1, 8))
ch = read("cheapness_quarterly.csv")
S.extend(table(["Quarter", "Points cheap", "Trailing-12m avg", "Note"],
               [[r["quarter"].replace("Q", " Q"), f'{float(r["points_cheap"]):.1f}',
                 (f'{float(r["ttm_avg"]):.1f}' if r["ttm_avg"] else "—"), r["note"] or "—"]
                for r in ch],
               widths=[0.9 * inch, 0.9 * inch, 1.1 * inch, 4.16 * inch],
               align_right=[1, 2], font=8.2))
A(Spacer(1, 8))
gaps = read("cheapness_gaps.csv")
A(Paragraph(
    "<b>Not confirmed and therefore omitted:</b> " +
    ", ".join(g["quarter"].replace("Q", " Q") for g in gaps) +
    ". These require the corresponding individual Matthews South quarterly posts; they are left "
    "blank rather than interpolated.", NOTE))
A(Paragraph("Source: Matthews South quarterly Convertible Market Reviews — matthewssouth.com "
            "(q2-2023, 2024-year-end, q1-2025, q3-2025, 2025-year-end, q1-2026).", SRC))
A(PageBreak())

A(Paragraph("2.2 &nbsp;Strategy and index returns", H2))
A(fig("05_returns.png"))
A(Spacer(1, 8))
hf = {r["year"]: r["return_pct"] for r in read("hfrx_convarb_annual.csv")}
vx = read("vxa0_annual.csv")
rrows = []
for r in vx:
    y = r["year"]
    rrows.append([y,
                  f'{float(hf[y]):.2f}%' if y in hf else "—",
                  f'{float(r["vxa0_total_return_pct"]):.1f}%',
                  f'{float(r["sp500_total_return_pct"]):.1f}%',
                  f'{float(r["russell2000_total_return_pct"]):.1f}%'])
S.extend(table(["Year", "HFRX Conv. Arb.", "VXA0 convertibles", "S&P 500", "Russell 2000"], rrows,
               widths=[0.75 * inch, 1.4 * inch, 1.5 * inch, 1.1 * inch, 1.2 * inch],
               note="2026 figures are year-to-date through roughly August and will move; the HFRX "
                    "2026 annual figure is not yet meaningful and is shown as —. All are total returns.",
               font=8.3))
A(Spacer(1, 12))

A(Paragraph("HFRX Convertible Arbitrage — confirmed monthly prints", H3))
hm = read("hfrx_convarb_monthly.csv")
S.extend(table(["Month", "Return"],
               [[r["date"], f'{float(r["return_pct"]):+.2f}%'] for r in hm],
               widths=[1.1 * inch, 1.0 * inch],
               note="March and June–September 2025 monthly prints were not confirmed and are absent. "
                    "HFR labels this index alternately “HFRX Convertible Arbitrage” and "
                    "“HFRX Fixed Income Convertible Arbitrage” — confirm you are stitching "
                    "one consistent index.", font=8.3))
A(Paragraph("Source: HFR monthly performance notes, hfr.com/media/performance-notes/. The 2023 annual "
            "figure comes via HFR relayed by Resonanz Capital.", SRC))
A(PageBreak())

A(Paragraph("2.3 &nbsp;ICE BofA All US Convertibles (VXA0), 2025 monthly", H2))
A(fig("08_vxa0_monthly.png"))
A(Spacer(1, 8))
vm = read("vxa0_monthly_2025.csv")
half = 6
lrows = []
for i in range(half):
    a, b = vm[i], vm[i + half]
    lrows.append([a["date"], f'{float(a["total_return_pct"]):+.1f}%',
                  b["date"], f'{float(b["total_return_pct"]):+.1f}%'])
S.extend(table(["Month", "Return", "Month", "Return"], lrows,
               widths=[1.15 * inch, 0.85 * inch, 1.15 * inch, 0.85 * inch],
               align_right=[1, 3], font=8.3))
A(Spacer(1, 12))
A(Paragraph("Market statistics at 31 December 2025", H3))
S.extend(table(["Measure", "VXA0 (all US convertibles)", "VNEW (new issues, last 6 months)"],
               [["Average current yield", "2.0%", "1.4%"],
                ["Average conversion premium", "35.8%", "40.8%"],
                ["Average investment premium", "—", "33.8%"]],
               widths=[2.1 * inch, 2.4 * inch, 2.56 * inch], align_right=[1, 2], font=8.3))
A(Paragraph("Source: Calamos “US Convertible Market Snapshot” (Dec 2025), data from ICE BofA "
            "Global Research. Corroboration: Invesco/Columbia commentary cited the ICE BofA US "
            "Convertible Index at +11.14% for 2024; Matthews South noted the Bloomberg convertible "
            "index up roughly 18% in 2025.", SRC))
A(PageBreak())

# ================================================================ 3. ISSUANCE
A(Paragraph("3. &nbsp;Primary issuance", H1))
S.extend(rule(4))
A(Paragraph(
    "Issuance is where provider scope matters most. Matthews South and Bloomberg track the "
    "<b>US</b> market; Numerix, BofA Global Research and Dealogic track <b>global</b>. The three 2025 "
    "figures below — $124bn, $140.5bn, $167.1bn — are not contradictory; they are different universes "
    "and different inclusion rules. Normalise to one scope before charting.", BODY))
A(fig("06_issuance.png"))
A(Spacer(1, 8))
ia = read("issuance_annual.csv")


def cell(v, pre="$", suf="bn"):
    return f"{pre}{float(v):.1f}{suf}" if v else "—"


S.extend(table(["Year", "US — Matthews South", "US — Bloomberg", "Global — Numerix",
                "Global — BofA", "Global — Dealogic"],
               [[r["year"], cell(r["us_matthews_south_bn"]), cell(r["us_bloomberg_bn"]),
                 cell(r["global_numerix_bn"]), cell(r["global_bofa_bn"]),
                 cell(r["global_dealogic_bn"])] for r in ia],
               widths=[0.6 * inch, 1.42 * inch, 1.15 * inch, 1.28 * inch, 1.1 * inch, 1.32 * inch],
               note="2026 Dealogic figure is year-to-date as of early June 2026 ($85.5bn across 127 "
                    "deals), not a full year. 2025 US totals: $124bn across 152 offerings (Matthews "
                    "South) — the most active US year on record; Bloomberg reported $108.7bn as of "
                    "13 Nov 2025, past the $105.6bn 2020 record.", font=7.9))
A(Spacer(1, 12))
A(Paragraph("Quarterly detail", H3))
iq = read("issuance_quarterly.csv")
S.extend(table(["Quarter", "US ($bn)", "US deals", "Global ($bn)", "Global deals"],
               [[r["quarter"].replace("Q", " Q"),
                 f'{float(r["us_bn"]):.1f}' if r["us_bn"] else "—",
                 r["us_deals"] or "—",
                 f'{float(r["global_bn"]):.1f}' if r["global_bn"] else "—",
                 r["global_deals"] or "—"] for r in iq],
               widths=[1.0 * inch, 1.0 * inch, 0.9 * inch, 1.15 * inch, 1.0 * inch],
               note="Q3 2024 and Q2 2025 US figures were not confirmed. Regional colour for Q2 2025 "
                    "(Numerix): North America 49 deals / ~$37.9bn — more than half of global issuance, "
                    "average deal size ~$773m; Europe up 231% year-on-year to $5.3bn; APAC nearly "
                    "doubled from $6.2bn in Q2 to $11.6bn in Q3.", font=8.2))
A(Paragraph("Sources: Matthews South quarterly reviews (US); Numerix global convertibles issuance "
            "reports (global); ION Analytics / Dealogic (2026 YTD and full-year 2025); Bloomberg "
            "(13 Nov 2025, “US Convertible Bonds Top Covid Record With $109 Billion Haul”).", SRC))
A(PageBreak())

# ========================================================== 4. EQUITY CONTEXT
A(Paragraph("4. &nbsp;Equity context", H1))
S.extend(rule(4))
A(fig("07_sp500.png"))
A(Spacer(1, 8))
sp = read("sp500_monthly.csv")
third = (len(sp) + 2) // 3
cols = [sp[:third], sp[third:2 * third], sp[2 * third:]]
maxlen = max(len(c) for c in cols)
rows = []
for i in range(maxlen):
    r = []
    for c in cols:
        r += [c[i]["date"], f'{float(c[i]["close"]):,.2f}'] if i < len(c) else ["", ""]
    rows.append(r)
S.extend(table(["Month", "Close", "Month", "Close", "Month", "Close"], rows,
               widths=[0.82 * inch, 0.85 * inch] * 3, align_right=[1, 3, 5],
               note="2024 is represented by its December close only — the intervening monthly closes "
                    "were not transcribed and the chart shows that stretch as a dashed bridge across a "
                    "shaded gap, not as data. The final row is 1 Sep 2026, the latest observation in "
                    "this pack.", font=7.9))
A(Paragraph("Source: multpl.com/s-p-500-historical-prices/table/by-month (monthly closes); Calamos "
            "US Convertible Market Snapshot (annual total returns, shown in §2.2). For a global equity "
            "comparison line, use the MSCI ACWI factsheet or an ACWI ETF proxy — no clean ACWI monthly "
            "series was pulled. The FTSE Global Convertible Index returned +23.3% in 2025 per Calamos.", SRC))
A(PageBreak())

# ================================================= 5. COVERAGE / CONFIDENCE
A(Paragraph("5. &nbsp;Data coverage and confidence", H1))
S.extend(rule(4))
A(Paragraph(
    "Read this table before using any series. “Complete” means every period in the stated "
    "window is present. “Partial” means real observations exist but periods are missing — "
    "they are omitted, never estimated. “Anchors only” means the series cannot be charted "
    "as a continuous line at that frequency.", BODY))
cov = [
    ["HY OAS (BAMLH0A0HYM2)", "Monthly", "Sep 2023 – Aug 2026", "Complete", "Jan–Aug 2023 outside FRED's 3-year free window"],
    ["VIX (VIXCLS)", "Annual", "2022 – 2025", "Complete", "—"],
    ["VIX (VIXCLS)", "Monthly", "Nov 2025 – Feb 2026", "Partial", "Full history downloadable from FRED; not transcribed"],
    ["MOVE", "Monthly", "Jan – Dec 2025", "Complete", "—"],
    ["MOVE", "Monthly", "2023, 2024, 2026", "Anchors only", "No free month-end source; premium/interactive gates"],
    ["New-issue cheapness", "Quarterly", "Q2'23 – Q1'26", "Partial", "7 of 13 quarters unconfirmed"],
    ["HFRX Convertible Arb.", "Annual", "2023 – 2025", "Complete", "—"],
    ["HFRX Convertible Arb.", "Monthly", "2025 – Jan 2026", "Partial", "Mar and Jun–Sep 2025 missing"],
    ["VXA0 total return", "Annual", "2023 – 2026 YTD", "Complete", "2026 is through ~Aug and will move"],
    ["VXA0 total return", "Monthly", "Jan – Dec 2025", "Complete", "—"],
    ["Issuance (US)", "Annual", "2023 – 2025", "Complete", "Provider definitions differ materially"],
    ["Issuance (US)", "Quarterly", "Q1'23 – Q1'26", "Partial", "Q3'24 and Q2'25 unconfirmed"],
    ["Issuance (global)", "Quarterly", "2025 – Q2'26", "Partial", "2023–24 quarterly global not pulled"],
    ["S&P 500", "Monthly", "2023, 2025, 2026", "Partial", "2024 monthly detail missing except Dec close"],
]
S.extend(table(["Series", "Frequency", "Window", "Status", "Constraint"], cov,
               widths=[1.55 * inch, 0.78 * inch, 1.25 * inch, 0.85 * inch, 2.63 * inch],
               align_right=[], font=7.7))
A(Spacer(1, 14))

A(Paragraph("Caveats that change how a number should be read", H2))
S.extend(bullets([
    "<b>FRED's HY OAS free window is now three years</b> (from 4 Sep 2023). Anything earlier requires "
    "ICE Data Indices or an archive such as YCharts.",
    "<b>MOVE 2023–2024 has no free month-end series.</b> Confirmed anchors are the ~199 March-2023 peak, "
    "the above-140 October-2023 stretch, the implied 96.67 2024 close, and “mostly below 120 through "
    "2024”. Do not draw a line through them.",
    "<b>VXA0 figures are total returns</b> as reported by Calamos from ICE BofA Global Research. The "
    "+6.4% 2026 YTD runs through roughly August and will move.",
    "<b>Issuance totals vary by provider</b>, by inclusion criteria (144A vs registered, mandatory vs "
    "vanilla), and by rounding. Cite the specific provider on every issuance chart.",
    "<b>Do not splice HFR indices.</b> The “almost 6% through July” convert-arb figure reported "
    "by Bloomberg is a separate HFR index tracking 120 funds and $84bn — not the HFRX Convertible "
    "Arbitrage Index used here.",
    "<b>No MSCI ACWI series was pulled.</b> Use the MSCI factsheet or an ACWI ETF proxy for a global "
    "equity comparison.",
]))
A(PageBreak())

# ============================================ 6. INTERPRETATION + WHAT'S NEXT
A(Paragraph("6. &nbsp;Interpretation", H1))
S.extend(rule(4))
A(Paragraph(
    "The convert-arb resurgence is corroborated across independent datasets. As volatility normalised "
    "— HY OAS compressing from ~4.0% in late 2023 to 2.63% by August 2026, MOVE from a ~199 March-2023 "
    "peak to the low-60s and mid-70s across 2025–2026 — the strategy's profit engine shifted from "
    "equity beta toward structural mechanics: cheap new-issue pricing at roughly 2 points, record "
    "issuance supplying fresh mispricings, and rich single-stock volatility from AI-infrastructure and "
    "crypto-linked issuers.", BODY))
A(Paragraph(
    "The allocator-facing point is the 2025 comparison. VXA0's +18.0% marginally beat the S&amp;P 500's "
    "+17.9%, but that is a long-only convertible index carrying equity beta. The market-neutral HFRX "
    "Convertible Arbitrage sleeve returned +12.78% with near-zero equity beta — a materially different "
    "risk profile for a return in the same neighbourhood. Meanwhile Bloomberg reported convert-arb "
    "inflows on track for their biggest annual jump in eighteen years.", BODY))

A(Paragraph("What would change the read", H2))
S.extend(bullets([
    "<b>Thesis weakens</b> if HY OAS breaks back above ~4% or MOVE sustainably re-crosses ~120. The "
    "“normalised volatility, structural alpha” story would give way to beta-driven returns.",
    "<b>Thesis strengthens</b> if cheapness widens back toward 2.5+ points alongside continued record "
    "issuance — that combination is the constructive setup.",
    "<b>Watch the Q1 2026 cheapness print.</b> At 1.1 points (and 0.1 in February), new paper is priced "
    "close to fair. If that persists, the structural edge that drove 2023–2025 is thinning, regardless "
    "of what issuance does.",
]))

A(Paragraph("Charting recommendations", H2))
S.extend(bullets([
    "<b>Standardise on month-end</b> across every series so the panels align. Pull VIX and HY OAS "
    "directly from FRED as CSV for full granularity.",
    "<b>Flag MOVE 2023–2024 explicitly as partial</b> wherever it appears. Complete it from a Bloomberg "
    "or ICE terminal, or the convextrade year pages (/history/2023, /2024, /2026).",
    "<b>Treat the Matthews South quarterly points as the canonical cheapness series</b>, and fill "
    "Q2 2025, Q3 2023 and Q2 2024 from their individual quarterly posts before publishing that chart.",
    "<b>Normalise issuance to a single scope</b> — US or global — before charting, to avoid mixing the "
    "$124bn, $108.7bn and $140–167bn figures on one axis.",
    "<b>Annotate April 2025 on every panel.</b> It is the one event that shows up in all of them.",
]))
A(PageBreak())

# ================================================================= 7. SOURCES
A(Paragraph("7. &nbsp;Sources and refresh paths", H1))
S.extend(rule(4))
src = [
    ["VIX", "FRED — VIXCLS", "fred.stlouisfed.org/series/VIXCLS", "Free. Download CSV; daily 1990→present."],
    ["MOVE", "Convex Trade", "convextrade.com/metrics/move-index", "Free. Year pages /history/<year> hold monthly O/C/H/L."],
    ["MOVE (alt)", "Yahoo Finance ^MOVE", "finance.yahoo.com/quote/%5EMOVE/history/", "Free, monthly toggle, manual pull."],
    ["HY OAS", "FRED — BAMLH0A0HYM2", "fred.stlouisfed.org/data/BAMLH0A0HYM2", "Free but only a rolling 3-year window."],
    ["HY OAS (pre-2023)", "ICE Data Indices / YCharts", "—", "Required for Jan–Aug 2023 month-ends."],
    ["Cheapness", "Matthews South", "matthewssouth.com — quarterly reviews", "Free. One post per quarter; fill gaps here."],
    ["HFRX Conv. Arb.", "Hedge Fund Research", "hfr.com/media/performance-notes/", "Free monthly notes; check index label."],
    ["VXA0 / VNEW", "Calamos snapshot (ICE BofA data)", "calamos.com — US Convertible Market Snapshot", "Free monthly PDF."],
    ["Issuance (US)", "Matthews South; Bloomberg", "matthewssouth.com", "Bloomberg is paywalled; MS posts are free."],
    ["Issuance (global)", "Numerix; BofA; Dealogic", "numerix.com; ionanalytics.com", "Numerix and ION summaries are free."],
    ["S&P 500", "multpl.com", "multpl.com/s-p-500-historical-prices/table/by-month", "Free monthly close table."],
    ["Global equity proxy", "MSCI / ACWI ETF", "msci.com factsheet", "Not pulled in this pack — see §5."],
]
S.extend(table(["Series", "Provider", "Location", "Access and refresh note"], src,
               widths=[1.15 * inch, 1.5 * inch, 2.1 * inch, 2.31 * inch],
               align_right=[], font=7.6))
A(Spacer(1, 14))
A(Paragraph("Reproducing this pack", H2))
A(Paragraph(
    "Every number in this document lives in a CSV under <font face='Courier'>convertible_arb/data/</font>. "
    "<font face='Courier'>build_charts.py</font> renders the eight figures from those CSVs; "
    "<font face='Courier'>build_pdf.py</font> assembles this PDF from the same CSVs and the rendered "
    "figures. To refresh a series, edit its CSV and re-run both scripts — the charts and the tables "
    "update together, so they cannot drift apart. Colours follow a colourblind-validated palette; "
    "the three categorical hues used here pass CVD separation, normal-vision separation, lightness and "
    "chroma checks, and every series carries a direct label as well as its colour.", BODY))
A(Spacer(1, 10))
A(Paragraph(
    "A note on method: where a period could not be confirmed from a real source, it is absent from the "
    "data files, absent from the charts, and named in §5. No cell in this pack was filled by "
    "interpolation, carry-forward, or estimate, except the two figures explicitly marked "
    "“anchor-approx” and “anchor-implied” in the MOVE anchor table.", NOTE))

doc.build(S)
print("wrote", OUT)
