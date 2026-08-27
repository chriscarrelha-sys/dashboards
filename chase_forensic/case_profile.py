"""
Case facts for Carrelha v. JPMorgan Chase Bank, N.A.

Single source of truth for the identifiers, the two tradelines, the P0 target
list, and — critically — the superseded narratives that must never be promoted
back into the canonical evidence set.

Sourced from the Chase control page in Notion ("Deep Forensic Audit +
Pre-Litigation Case Mapping", 2026-08-26) and the retrieval brief.

If a case fact changes, change it here. Nothing else hard-codes these values.
"""

import re

CASE_NAME = "Carrelha v. JPMorgan Chase Bank, N.A."
FORUM = "Pre-suit -> N.D. Ga."
AUDIT_DATE = "2026-08-26"

# --------------------------------------------------------------------------
# The roadmap. Retrieval starts here: locate every source document this cites,
# then sweep the whole catalog by identifier.
# --------------------------------------------------------------------------

ROADMAP_DOC = ("~/CHASE MASTER CASE FILE/"
               "00 CHASE - Deep Forensic Audit + Pre-Litigation Case Mapping - "
               "2026-08-26.pdf")

PRESUIT_DEMAND_DOC = ("~/CHASE MASTER CASE FILE/02 SUBMISSIONS - NOTICES & DEMANDS/"
                      "2026-08-26 - Carrelha - Pre-Suit Settlement Demand to Chase "
                      "(READY TO SEND).pdf")

CANONICAL_ROOT = "~/CHASE MASTER CASE FILE"

# --------------------------------------------------------------------------
# The two tradelines. They carry different theories and are kept separate.
# --------------------------------------------------------------------------

TRADELINES = {
    "552475": {
        "key": "552475",
        "label": "Tradeline 552475 / card 3816",
        "card": "3816",
        "theory": "Charge-off / payment contradiction. Chase reports a "
                  "September 6, 2023 charge-off - six days before the first "
                  "payment attempt - while current TU/EX disclosures show $0 "
                  "and 'paid in full - was a charge-off'. The September 28, "
                  "2023 successful $18,703.85 debit has never been "
                  "ledger-accounted for.",
        "patterns": [re.compile(r"\b552475\b"), re.compile(r"\b3816\b")],
    },
    "414720": {
        "key": "414720",
        "label": "Tradeline 414720 / card 6974",
        "card": "6974",
        "theory": "The objectively-falsifiable field. Chase continues to report "
                  "an $8,045 balance that contradicts Chase's own February 9, "
                  "2026 settlement letter for $8,045.23.",
        "patterns": [re.compile(r"\b414720\b"), re.compile(r"\b6974\b")],
    },
}

# --------------------------------------------------------------------------
# Identifiers to sweep the entire indexed catalog for.
# --------------------------------------------------------------------------

IDENTIFIERS = [
    # (label, regex, why it matters)
    ("card 3816", re.compile(r"\b3816\b"),
     "Card number, tradeline 552475"),
    ("tradeline 552475", re.compile(r"\b552475\b"),
     "Charge-off / payment contradiction tradeline"),
    ("card 6974", re.compile(r"\b6974\b"),
     "Card number, tradeline 414720"),
    ("tradeline 414720", re.compile(r"\b414720\b"),
     "$8,045 falsifiable-field tradeline"),
    ("$18,703.85", re.compile(r"\$?\s*18[,.\s]?703[.,]\s?85"),
     "The single successful debit, September 28, 2023"),
    ("confirmation 6962374806", re.compile(r"6962[\s-]?374[\s-]?806"),
     "Chase payment confirmation number"),
    ("$8,045.23", re.compile(r"\$?\s*8[,.\s]?045[.,]\s?23"),
     "Chase's own settlement figure, February 9, 2026"),
    ("CFPB 260206-28594668", re.compile(r"260206[\s-]?28594668"),
     "CFPB complaint number"),
    ("1681g(e) ECW231003-00436-R1", re.compile(r"ECW\s?231003[\s-]?00436[\s-]?R1", re.I),
     "FCRA 1681g(e) request reference"),
]

# Bare $8,045 without the cents is the *disputed* figure, tracked separately
# from $8,045.23 because the difference between them is the whole point.
RE_8045_BARE = re.compile(r"\$?\s*8[,.\s]?045(?![.,]\s?23)(?:[.,]\d{2})?")
RE_8045_EXACT = re.compile(r"\$?\s*8[,.\s]?045[.,]\s?23")

RE_PAYMENT_AMOUNT = IDENTIFIERS[4][1]
RE_CONFIRMATION = IDENTIFIERS[5][1]
RE_CFPB = IDENTIFIERS[7][1]
RE_609E_REF = IDENTIFIERS[8][1]

# --------------------------------------------------------------------------
# Key dates.
# --------------------------------------------------------------------------

CHARGEOFF_DATE = "2023-09-06"          # Chase's reported charge-off, tradeline 552475
FIRST_PAYMENT_ATTEMPT = "2023-09-12"   # Six days AFTER the reported charge-off
SUCCESSFUL_DEBIT_DATE = "2023-09-28"   # The single successful $18,703.85 debit
SETTLEMENT_LETTER_DATE = "2026-02-09"  # Chase's $8,045.23 letter, tradeline 414720
EVIDENCE_AUDIT_DATE = "2026-08-15"     # The audit that corrected the narrative

RE_CHARGEOFF_DATE = re.compile(
    r"(?:09|9)[/\-.]0?6[/\-.](?:20)?23|sept?(?:ember)?\.?\s+6,?\s*2023", re.I)
RE_SETTLEMENT_LETTER_DATE = re.compile(
    r"(?:02|2)[/\-.]0?9[/\-.](?:20)?26|feb(?:ruary)?\.?\s+9,?\s*2026", re.I)

# --------------------------------------------------------------------------
# SUPERSEDED NARRATIVES - the guard rail.
#
# The August 15, 2026 evidence audit corrected the earlier consumer narrative:
# there was ONE successful $18,703.85 debit, NOT two successful debits totaling
# $37,407.70. Any document asserting the old figure is a superseded draft. It is
# preserved, never deleted, but it must never be promoted into the canonical
# evidence set or cited in a filing.
#
# The control page also directs that prior "SEND READY" packages be preserved
# as superseded and not sent.
# --------------------------------------------------------------------------

SUPERSEDED_NARRATIVES = [
    {
        "key": "TWO_PAYMENTS_37407",
        "pattern": re.compile(
            r"\$?\s*37[,.\s]?407[.,]\s?70"
            r"|two\s+successful\s+(?:payments|debits)"
            r"|both\s+payments\s+(?:were\s+)?(?:successful|posted|cleared)", re.I),
        "note": "SUPERSEDED NARRATIVE: asserts two successful payments totaling "
                "$37,407.70. The 2026-08-15 evidence audit determined there was "
                "ONE successful $18,703.85 debit. Preserve, but never cite.",
    },
    {
        "key": "PRIOR_SEND_READY",
        "pattern": re.compile(r"SEND[\s_-]?READY|READY[\s_-]?TO[\s_-]?SEND", re.I),
        "note": "Prior SEND-READY package. Per the control page, preserve as "
                "superseded and DO NOT SEND. Only the 2026-08-26 Pre-Suit "
                "Settlement Demand is current.",
    },
]

# The one current SEND-READY document, exempt from the superseded rule above.
RE_CURRENT_DEMAND = re.compile(
    r"2026-08-26.*Pre-?Suit\s+Settlement\s+Demand", re.I)

# A document that *corrects* the old narrative necessarily quotes it. The
# 2026-08-15 evidence audit is the clearest example: it states the $37,407.70
# figure in order to reject it. Such a document is the corrective record - a P0
# target - and must never be demoted as though it asserted the error.
RE_CORRECTIVE = re.compile(
    r"supersed|correct(?:ed|ion|s)\b|\bnot\s+two\b|only\s+one\b"
    r"|\bONE\s+successful\b|audit\s+(?:determined|found|corrected)"
    r"|rather\s+than\s+two|revised\s+narrative|earlier\s+narrative", re.I)


def is_corrective(blob):
    """True when the document corrects the superseded narrative rather than
    asserting it."""
    return bool(RE_CORRECTIVE.search(blob))


def superseded_flags(blob, filename):
    """
    Return (notes, is_superseded).

    A document is superseded when it asserts a corrected figure or is a prior
    SEND-READY package. It is NOT superseded merely for mentioning the old
    figure while correcting it.
    """
    corrective = is_corrective(blob)
    notes = []
    for entry in SUPERSEDED_NARRATIVES:
        if not entry["pattern"].search(blob):
            continue
        if entry["key"] == "TWO_PAYMENTS_37407" and corrective:
            continue  # the correcting record, not a superseded draft
        if entry["key"] == "PRIOR_SEND_READY" and RE_CURRENT_DEMAND.search(
                filename + " " + blob[:4000]):
            continue  # the current 2026-08-26 demand
        notes.append(entry["note"])
    return notes, bool(notes)


# --------------------------------------------------------------------------
# Source evidence vs derivative / strategy material.
#
# Source evidence is what a court can be shown. Derivative material is our own
# analysis of it. Both are retained; only the first is citable as proof.
# --------------------------------------------------------------------------

RE_DERIVATIVE = re.compile(
    r"\bdraft\b|\bmemo(?:randum)?\b|\banalysis\b|\bstrateg|\bworksheet\b"
    r"|\bchronolog|\bcase\s+map|\bforensic\s+audit\b|\boutline\b|\bnotes?\b"
    r"|\bsummary\b|\bindex\b|\bshortlist\b|\bmatrix\b|\bworking\b", re.I)

RE_SOURCE = re.compile(
    r"\bstatement\b|\bletter\b|\bnotice\b|\bconfirmation\b|\breceipt\b"
    r"|\bdisclosure\b|\breport\b|\bledger\b|\btranscript\b|\bACDV\b"
    r"|\bcorrespondence\b|\bresponse\s+from\b|\bproduced\s+by\b", re.I)


def evidence_class(filename, path, blob, produced_by_chase):
    """
    Classify as SOURCE, DERIVATIVE, or UNDETERMINED.

    Anything Chase or a third party produced is source evidence regardless of
    what its filename looks like. Our own drafts and analysis are derivative
    even when they discuss source documents at length.
    """
    name_and_path = filename + " " + path
    if produced_by_chase == "YES":
        return "SOURCE"
    if RE_DERIVATIVE.search(name_and_path):
        return "DERIVATIVE"
    if RE_SOURCE.search(name_and_path):
        return "SOURCE"
    if RE_DERIVATIVE.search(blob[:4000]):
        return "DERIVATIVE"
    return "UNDETERMINED"


def tradeline_of(blob):
    """Return the tradeline tag for a document: one, BOTH, or UNATTRIBUTED."""
    hits = [tl["label"] for tl in TRADELINES.values()
            if any(rx.search(blob) for rx in tl["patterns"])]
    if len(hits) == 2:
        return "BOTH"
    if hits:
        return hits[0]
    # Amount-based fallback when no account number appears.
    if RE_PAYMENT_AMOUNT.search(blob) or RE_CONFIRMATION.search(blob):
        return TRADELINES["552475"]["label"] + " (inferred from amount)"
    if RE_8045_EXACT.search(blob) or RE_8045_BARE.search(blob):
        return TRADELINES["414720"]["label"] + " (inferred from amount)"
    return "UNATTRIBUTED"


# --------------------------------------------------------------------------
# The P0 target list, in the order given in the retrieval brief.
#
# `categories` is empty when a target may legitimately land in any category -
# such a probe matches on patterns alone.
# --------------------------------------------------------------------------

def _rx(p):
    return re.compile(p, re.I)


P0_TARGETS = [
    {
        "key": "T01_DEEP_FORENSIC_AUDIT",
        "label": "Deep Forensic Audit + Pre-Litigation Case Mapping (2026-08-26)",
        "categories": [],
        "patterns": [_rx(r"deep\s+forensic\s+audit"),
                     _rx(r"pre-?litigation\s+case\s+mapping")],
        "reference_patterns": [_rx(r"deep\s+forensic\s+audit")],
    },
    {
        "key": "T02_SETTLEMENT_LETTER_804523",
        "label": "February 9, 2026 Chase settlement letter for $8,045.23",
        "categories": [],
        "patterns": [RE_8045_EXACT],
        "reference_patterns": [RE_8045_EXACT, _rx(r"settlement\s+letter")],
    },
    {
        "key": "T03_SEPT28_DEBIT_SOURCE",
        "label": "Source records supporting the September 28, 2023 $18,703.85 debit",
        "categories": [],
        "patterns": [RE_PAYMENT_AMOUNT],
        "reference_patterns": [RE_PAYMENT_AMOUNT],
    },
    {
        "key": "T04_CHASE_SIDE_PAYMENT_RECORDS",
        "label": "Chase-side records mentioning the payment or confirmation 6962374806",
        "categories": [],
        "patterns": [RE_CONFIRMATION],
        "reference_patterns": [RE_CONFIRMATION],
    },
    {
        "key": "T05_LEDGER_3816",
        "label": "Statements / ledger for card 3816 (tradeline 552475)",
        "categories": [],
        "patterns": [_rx(r"\b(?:3816|552475)\b")],
        "reference_patterns": [_rx(r"\b(?:3816|552475)\b")],
    },
    {
        "key": "T06_LEDGER_6974",
        "label": "Statements / ledger for card 6974 (tradeline 414720)",
        "categories": [],
        "patterns": [_rx(r"\b(?:6974|414720)\b")],
        "reference_patterns": [_rx(r"\b(?:6974|414720)\b")],
    },
    {
        "key": "T07_TRANSUNION",
        "label": "TransUnion reports / results containing 552475 or 414720",
        "categories": ["06"],
        "patterns": [_rx(r"\b(?:552475|414720|3816|6974)\b")],
        "reference_patterns": [_rx(r"trans\s?union")],
    },
    {
        "key": "T08_EXPERIAN",
        "label": "Experian reports / results containing 552475 or 414720",
        "categories": ["07"],
        "patterns": [_rx(r"\b(?:552475|414720|3816|6974)\b")],
        "reference_patterns": [_rx(r"experian")],
    },
    {
        "key": "T09_EQUIFAX",
        "label": "Equifax reports / results containing 552475 or 414720",
        "categories": ["08"],
        "patterns": [_rx(r"\b(?:552475|414720|3816|6974)\b")],
        "reference_patterns": [_rx(r"equifax")],
    },
    {
        "key": "T10_CFPB_COMPLAINT",
        "label": "CFPB complaint 260206-28594668",
        "categories": [],
        "patterns": [RE_CFPB],
        "reference_patterns": [RE_CFPB],
    },
    {
        "key": "T11_CFPB_CHASE_RESPONSE",
        "label": "Chase's response to CFPB complaint 260206-28594668",
        "categories": [],
        "patterns": [_rx(r"(?:chase|jpmorgan).{0,80}(?:response|reply).{0,80}CFPB"
                         r"|CFPB.{0,80}(?:chase|jpmorgan).{0,80}response")],
        "reference_patterns": [_rx(r"CFPB\s+response")],
    },
    {
        "key": "T12_OCC_CAMP",
        "label": "OCC / CAMP complaint and response",
        "categories": [],
        "patterns": [_rx(r"\bOCC\b|\bCAMP\b|comptroller\s+of\s+the\s+currency")],
        "reference_patterns": [_rx(r"\bOCC\b|\bCAMP\b")],
    },
    {
        "key": "T13_609E_REQUEST",
        "label": "FCRA 1681g(e) request Ref. ECW231003-00436-R1",
        "categories": [],
        "patterns": [RE_609E_REF],
        "reference_patterns": [RE_609E_REF, _rx(r"1681g\(e\)|609\(e\)")],
    },
    {
        "key": "T14_609E_RESPONSE",
        "label": "Chase's response / production to the 1681g(e) request",
        "categories": ["13"],
        "patterns": [_rx(r"(?:response|production|denial|refus).{0,120}"
                         r"(?:1681g|609\(e\))"
                         r"|(?:1681g|609\(e\)).{0,120}(?:response|production|denial)")],
        "reference_patterns": [_rx(r"1681g\(e\)|609\(e\)")],
    },
    {
        "key": "T15_AUG15_EVIDENCE_AUDIT",
        "label": "August 15, 2026 Chase evidence audit (the correcting audit)",
        "categories": [],
        "patterns": [_rx(r"evidence\s+audit"),
                     _rx(r"(?:08|8)[/\-.]15[/\-.](?:20)?26|august\s+15,?\s*2026")],
        "reference_patterns": [_rx(r"evidence\s+audit")],
    },
    {
        "key": "T16_PAID_IN_FULL_LETTER",
        "label": "November 2023 paid-in-full / zero-balance letter, if present",
        "categories": ["05"],
        "patterns": [_rx(r"paid\s*[\s-]?in\s*[\s-]?full|zero\s+balance")],
        "reference_patterns": [_rx(r"paid[\s-]?in[\s-]?full\s+letter")],
    },
    {
        "key": "T17_ACDV_EOSCAR_REINVEST",
        "label": "ACDV / e-OSCAR / CRA reinvestigation / furnisher-verification records",
        "categories": ["09"],
        "patterns": [_rx(r"\bACDV\b|e-?OSCAR|\bAUD\b(?!IT)|reinvestigat"
                         r"|furnisher\s+verification")],
        "reference_patterns": [_rx(r"\bACDV\b|e-?OSCAR")],
    },
    {
        "key": "T18_METRO2",
        "label": "Metro 2 furnishing data",
        "categories": ["10"],
        "patterns": [_rx(r"metro\s*-?\s*2\b|date\s+of\s+first\s+delinquenc"
                         r"|compliance\s+condition\s+code")],
        "reference_patterns": [_rx(r"metro\s*-?\s*2\b")],
    },
    {
        "key": "T19_CHARGEOFF_RECOVERY_LEDGER",
        "label": "Charge-off / recovery ledger",
        "categories": ["04"],
        "patterns": [_rx(r"charge[\s-]?off\s+(?:ledger|entry|date|amount)"
                         r"|recovery\s+(?:ledger|balance)")],
        "reference_patterns": [_rx(r"charge[\s-]?off\s+ledger|recovery\s+ledger")],
    },
    {
        "key": "T20_AUG26_PRESUIT_PACKAGE",
        "label": "August 26, 2026 pre-suit package and exhibit index",
        "categories": [],
        "patterns": [_rx(r"pre-?suit\s+settlement\s+demand|exhibit\s+index")],
        "reference_patterns": [_rx(r"pre-?suit\s+(?:package|settlement\s+demand)"
                                   r"|exhibit\s+index")],
    },
]

# --------------------------------------------------------------------------
# Case-specific contradiction detectors.
# --------------------------------------------------------------------------

RE_CHARGED_OFF = re.compile(
    r"charge[\s-]?off|charged[\s-]?off|profit\s+and\s+loss|\bP&L\b", re.I)
RE_CRA_CONTEXT = re.compile(
    r"trans\s?union|experian|equifax|credit\s+report|tradeline|balance", re.I)


def case_contradictions(blob, doc_date, tradeline):
    """
    Contradiction detectors specific to this matter. Returns review prompts,
    never conclusions.
    """
    notes = []

    # The falsifiable field: a reported $8,045 against Chase's own $8,045.23.
    if RE_8045_BARE.search(blob) and not RE_8045_EXACT.search(blob) \
            and RE_CRA_CONTEXT.search(blob):
        notes.append(
            "FALSIFIABLE FIELD: reports $8,045 while Chase's own 2026-02-09 "
            "settlement letter states $8,045.23 - the 23-cent discrepancy is "
            "the strongest objectively-falsifiable field in the record")

    # The chronology puzzle: a charge-off dated before payments were attempted.
    if RE_CHARGEOFF_DATE.search(blob) and RE_CHARGED_OFF.search(blob):
        notes.append(
            "CHRONOLOGY: charge-off dated 2023-09-06, six days BEFORE the first "
            "payment attempt (2023-09-12) - review how an account charged off "
            "before any payment attempt was made")

    # The unaccounted debit.
    if RE_PAYMENT_AMOUNT.search(blob) and doc_date and doc_date >= "2023-09-28":
        if re.search(r"balance\s*:?\s*\$?\s*(?!0[.,]?0?0?\b)[1-9][\d,]{2,}", blob, re.I) \
                and RE_CHARGED_OFF.search(blob):
            notes.append(
                "UNACCOUNTED DEBIT: post-payment document still shows a "
                "charged-off balance - the $18,703.85 debit of 2023-09-28 has "
                "never been ledger-accounted for")

    return notes
