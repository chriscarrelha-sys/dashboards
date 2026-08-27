"""
Taxonomy for the Chase Forensic Evidence Retrieval Checklist.

Defines the 23 retrieval categories, their folder names, default priorities,
the classification patterns used to route documents, the seven
prove/contradict flags, and the P0 completion probes.

Nothing in this module touches the filesystem.
"""

import re

# --------------------------------------------------------------------------
# Case constants. These are the high-signal identifiers for the matter.
# --------------------------------------------------------------------------

PAYMENT_AMOUNT = "18,703.85"
PAYMENT_CONFIRMATION = "6962374806"
SEPARATE_TRADELINE_AMOUNT = "8,045"
ACCOUNT_FRAGMENTS = ("3816", "552475")

# Amount regexes tolerate OCR noise: optional $, optional comma, optional space.
RE_PAYMENT_AMOUNT = re.compile(r"\$?\s*18[,.\s]?703[.,]\s?85")
RE_CONFIRMATION = re.compile(r"6962[\s-]?374[\s-]?806")
RE_SEPARATE_AMOUNT = re.compile(r"\$?\s*8[,.\s]?045(?:[.,]\d{2})?")
RE_ACCOUNT_FRAG = re.compile(r"\b(?:3816|552475)\b")

# Dates that matter, in the several formats documents actually use.
RE_SEPT_2023_PAYMENT = re.compile(
    r"(?:09|9)[/\-.](?:2[5-9]|30)[/\-.](?:20)?23"
    r"|(?:sept?(?:ember)?)\.?\s+(?:2[5-9]|30),?\s*,?\s*2023",
    re.I,
)
RE_PIF_LETTER_DATE = re.compile(
    r"(?:11|nov(?:ember)?)\.?[/\-.\s]+0?8[,/\-.\s]+(?:20)?23", re.I
)

# --------------------------------------------------------------------------
# Prove / contradict flags (checklist item 7).
# --------------------------------------------------------------------------

FLAGS = {
    "PAYMENT": "the $18,703.85 payment",
    "CHARGEOFF": "charge-off accounting",
    "PIF": "paid-in-full status",
    "FURNISHING": "CRA furnishing",
    "REINVESTIGATION": "Chase reinvestigation",
    "FRAUD": "identity theft / fraud investigation",
    "AUTHENTICATION": "authentication / security records",
}

FLAG_PATTERNS = {
    "PAYMENT": [
        RE_PAYMENT_AMOUNT,
        RE_CONFIRMATION,
        re.compile(r"\bach\s+trace\b|\btrace\s*(?:no|number|#)\b", re.I),
        re.compile(r"payment\s+(?:confirmation|posted|applied|authoriz)", re.I),
    ],
    "CHARGEOFF": [
        re.compile(r"charge[\s-]?off|charged[\s-]?off|\bc/?o\s+date\b", re.I),
        re.compile(r"\brecovery\s+(?:balance|ledger|department|account)\b", re.I),
    ],
    "PIF": [
        re.compile(r"paid\s+in\s+full|paid[\s-]?in[\s-]?full|\bPIF\b"),
        re.compile(r"zero\s+balance|\$0\.00\s+balance|balance\s*:?\s*\$?0(?:\.00)?\b", re.I),
        re.compile(r"satisf(?:ied|action)|settled\s+in\s+full", re.I),
    ],
    "FURNISHING": [
        re.compile(r"metro\s*2|metro-?2\b", re.I),
        re.compile(r"furnish(?:er|ing|ed)", re.I),
        re.compile(r"account\s+status\s+code|payment\s+rating|compliance\s+condition", re.I),
    ],
    "REINVESTIGATION": [
        re.compile(r"reinvestigat|re-?investigat", re.I),
        re.compile(r"\bACDV\b|\bAUD\b|e-?OSCAR", re.I),
        re.compile(r"verified\s+as\s+accurate|investigation\s+results?", re.I),
    ],
    "FRAUD": [
        re.compile(r"identity\s+theft|\bID\s+theft\b|fraud\s+(?:claim|case|investigat|alert)", re.I),
        re.compile(r"FTC\s+identity|identity\s+theft\s+report|police\s+report", re.I),
    ],
    "AUTHENTICATION": [
        re.compile(r"\bMFA\b|\bOTP\b|one[\s-]time\s+pass|two[\s-]factor", re.I),
        re.compile(r"password\s+reset|device\s+registrat|trusted\s+device", re.I),
        re.compile(r"login|session\s+log|IP\s+address|authenticat", re.I),
    ],
}

# --------------------------------------------------------------------------
# The 23 categories.
#
# `name`     : destination folder name in the organized tree
# `priority` : default priority for documents landing here
# `patterns` : (regex, weight) pairs scored against filename, path and text
# --------------------------------------------------------------------------


def _p(pattern, weight=1):
    return (re.compile(pattern, re.I), weight)


CATEGORIES = [
    {
        "id": "01",
        "name": "01_Core_Account_Records",
        "title": "Core Account Records",
        "priority": "P1",
        "patterns": [
            _p(r"cardmember\s+agreement|card\s*member\s+agreement", 4),
            _p(r"account\s+(?:opening|application|agreement)", 3),
            _p(r"authorized\s+user|account\s+ownership", 3),
            _p(r"account\s+clos(?:ure|ed|ing)", 2),
            _p(r"replacement\s+card|account\s+number\s+change", 3),
            _p(r"transaction\s+history|account\s+ledger|balance\s+history", 2),
        ],
    },
    {
        "id": "02",
        "name": "02_Sept2023_Payment_Evidence",
        "title": "September 2023 Payment Evidence",
        "priority": "P0",
        "patterns": [
            (RE_CONFIRMATION, 6),
            (RE_PAYMENT_AMOUNT, 5),
            _p(r"payment\s+confirmation", 4),
            _p(r"ach\s+trace|trace\s+number", 3),
            _p(r"settlement\s+record|payment\s+batch", 3),
            _p(r"general\s+ledger|gl\s+entry|accounting\s+entry", 2),
            _p(r"posting|posted|applied\s+to\s+(?:the\s+)?account", 2),
        ],
    },
    {
        "id": "03",
        "name": "03_External_Bank_Proof_of_Payment",
        "title": "External Bank Proof of Payment",
        "priority": "P0",
        "patterns": [
            _p(r"source\s+bank|originating\s+(?:bank|account)", 4),
            _p(r"e\*?[\s-]?trade|etrade|regions\s+bank|regions\b", 3),
            _p(r"ach\s+(?:confirmation|credit|debit)|wire\s+(?:transfer|ledger)", 3),
            _p(r"debit\s+(?:of|for)\s+\$?18", 4),
            _p(r"bank\s+statement", 2),
        ],
    },
    {
        "id": "04",
        "name": "04_ChargeOff_and_Recovery_Records",
        "title": "Charge-Off and Recovery Records",
        "priority": "P0",
        "patterns": [
            _p(r"charge[\s-]?off\s+(?:date|amount|ledger|entry)", 5),
            _p(r"recovery\s+(?:ledger|balance|department|account|notes)", 4),
            _p(r"collection\s+notes|collections\s+(?:ledger|notes)", 3),
            _p(r"1099-?C|cancellation\s+of\s+debt", 4),
            _p(r"(?:sale|assignment|placement|transfer)\s+of\s+(?:the\s+)?(?:charged|account|debt)", 3),
            _p(r"debt\s+buyer|outside\s+collect", 3),
            _p(r"recall(?:ed)?\s+from\s+collect", 3),
        ],
    },
    {
        "id": "05",
        "name": "05_PaidInFull_Satisfaction_Evidence",
        "title": "Paid-in-Full / Satisfaction Evidence",
        "priority": "P0",
        "patterns": [
            _p(r"paid\s*[\s-]?in\s*[\s-]?full", 5),
            (RE_PIF_LETTER_DATE, 3),
            _p(r"zero\s+balance|\$0\s+balance", 4),
            _p(r"satisfaction\s+letter|settlement\s+completion", 4),
            _p(r"was\s+a\s+charge[\s-]?off", 4),
        ],
    },
    {
        "id": "06",
        "name": "06_CRA_TransUnion",
        "title": "Credit Reporting - TransUnion",
        "priority": "P1",
        "patterns": [
            _p(r"trans\s?union|\bTU\b", 5),
            _p(r"file\s+disclosure|suppression|blocking", 2),
        ],
    },
    {
        "id": "07",
        "name": "07_CRA_Experian",
        "title": "Credit Reporting - Experian",
        "priority": "P1",
        "patterns": [
            _p(r"experian|\bEXP\b", 5),
        ],
    },
    {
        "id": "08",
        "name": "08_CRA_Equifax",
        "title": "Credit Reporting - Equifax",
        "priority": "P1",
        "patterns": [
            _p(r"equifax|\bEFX\b|\bEQF\b", 5),
        ],
    },
    {
        "id": "09",
        "name": "09_Furnisher_eOSCAR_ACDV",
        "title": "Chase Furnisher / e-OSCAR / ACDV Records",
        "priority": "P0",
        "patterns": [
            _p(r"\bACDV\b", 6),
            _p(r"e-?OSCAR", 6),
            _p(r"\bAUD\b(?!IT)", 4),
            _p(r"dispute\s+reason\s+code|response\s+code", 4),
            _p(r"furnisher\s+(?:response|verification|investigation)", 3),
        ],
    },
    {
        "id": "10",
        "name": "10_Metro2_Furnishing_Records",
        "title": "Metro 2 Furnishing Records",
        "priority": "P0",
        "patterns": [
            _p(r"metro\s*-?\s*2\b", 6),
            _p(r"date\s+of\s+first\s+delinquenc|\bDOFD\b", 5),
            _p(r"payment\s+history\s+profile|payment\s+rating", 4),
            _p(r"compliance\s+condition\s+code|special\s+comment\s+code", 5),
            _p(r"portfolio\s+type|account\s+type\s+code", 3),
            _p(r"amount\s+past\s+due|current\s+balance\s+field", 3),
        ],
    },
    {
        "id": "11",
        "name": "11_Direct_Disputes_to_Chase",
        "title": "Direct Disputes Sent to Chase",
        "priority": "P1",
        "patterns": [
            _p(r"dispute\s+letter|direct\s+dispute", 4),
            _p(r"certified\s+mail|USPS\s+tracking|return\s+receipt|\b9[0-9]{19,21}\b", 4),
            _p(r"pre-?suit\s+demand|demand\s+letter", 4),
            _p(r"executive\s+office", 3),
            _p(r"proof\s+of\s+delivery", 3),
        ],
    },
    {
        "id": "12",
        "name": "12_Identity_Theft_Fraud_Records",
        "title": "Identity Theft / Fraud Records",
        "priority": "P0",
        "patterns": [
            _p(r"identity\s+theft", 6),
            _p(r"FTC\s+(?:identity|report)|identitytheft\.gov", 5),
            _p(r"police\s+report|sheriff(?:'s)?\s+report|incident\s+report", 4),
            _p(r"fraud\s+(?:claim|case|investigation|affidavit|alert)", 5),
            _p(r"\bMFA\b|\bOTP\b|password\s+reset|device\s+registrat|trusted\s+device", 3),
            _p(r"login|session\s+log|IP\s+address\s+log|authenticat", 2),
        ],
    },
    {
        "id": "13",
        "name": "13_FCRA_609e_Records",
        "title": "FCRA Section 609(e) Records",
        "priority": "P0",
        "patterns": [
            _p(r"609\s*\(?e\)?", 6),
            _p(r"section\s+609|15\s+U\.?S\.?C\.?\s*(?:§\s*)?1681g", 5),
            _p(r"business\s+transaction\s+records", 4),
            _p(r"victim\s+request|request\s+for\s+records", 2),
        ],
    },
    {
        "id": "14",
        "name": "14_Chase_Internal_Complaint_Records",
        "title": "Internal Chase Complaint Records",
        "priority": "P1",
        "patterns": [
            _p(r"executive\s+office\s+(?:complaint|file|response)", 5),
            _p(r"complaint\s+(?:case|intake|classification|allegation|closure)", 4),
            _p(r"escalation\s+(?:number|history)|supervisor\s+notes", 3),
        ],
    },
    {
        "id": "15",
        "name": "15_Regulatory_Complaints",
        "title": "CFPB / OCC / Regulatory Complaints",
        "priority": "P1",
        "patterns": [
            _p(r"\bCFPB\b|consumer\s+financial\s+protection", 5),
            _p(r"\bOCC\b|comptroller\s+of\s+the\s+currency", 5),
            _p(r"attorney\s+general|state\s+banking\s+regulator", 4),
            _p(r"better\s+business\s+bureau|\bBBB\b", 3),
            _p(r"georgia\s+department\s+of\s+banking", 4),
        ],
    },
    {
        "id": "16",
        "name": "16_Calls_and_Communications",
        "title": "Phone Calls and Communications",
        "priority": "P1",
        "patterns": [
            _p(r"call\s+(?:log|recording|transcript|notes)", 5),
            _p(r"secure\s+message|chat\s+transcript", 4),
            _p(r"agent\s+(?:name|id)\b", 3),
            _p(r"\.(?:mp3|m4a|wav|aiff)$", 5),
        ],
    },
    {
        "id": "17",
        "name": "17_Payment_Attempts_Before_Sept28",
        "title": "Payment Attempts Before September 28, 2023",
        "priority": "P1",
        "patterns": [
            _p(r"returned\s+payment|payment\s+returned|reversal", 5),
            _p(r"\bNSF\b|non-?sufficient\s+funds|insufficient\s+funds", 5),
            _p(r"rejected\s+payment|payment\s+reject|declined\s+payment", 5),
            _p(r"\bR0[1-9]\b|\bR[1-9][0-9]\b", 3),
            _p(r"re-?presentment|account\s+validation\s+fail", 4),
            _p(r"attempted\s+payment|payment\s+attempt", 4),
        ],
    },
    {
        "id": "18",
        "name": "18_Account_Timeline_Documents",
        "title": "Account Timeline Documents",
        "priority": "P1",
        "patterns": [
            _p(r"statement", 3),
            _p(r"(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\s*,?\s*20(?:23|24)", 2),
            _p(r"20(?:23|24)[-_]?(?:0[1-9]|1[0-2])", 2),
            _p(r"account\s+status\s+letter|collection\s+notice", 3),
        ],
    },
    {
        "id": "19",
        "name": "19_SEPARATE_JPMCB_8045_Tradeline_QUARANTINE",
        "title": "Separate / Possibly Unrelated Chase Tradeline",
        "priority": "P1",
        "patterns": [
            (RE_SEPARATE_AMOUNT, 6),
            _p(r"JPMCB(?!\s*card\s*services\s*3816)", 3),
            _p(r"second\s+(?:chase|JPMCB)\s+tradeline|separate\s+tradeline", 5),
        ],
    },
    {
        "id": "20",
        "name": "20_Litigation_PreSuit_Materials",
        "title": "Litigation / Pre-Suit Materials",
        "priority": "P3",
        "patterns": [
            _p(r"draft\s+complaint|complaint\s+draft|verified\s+complaint", 5),
            _p(r"legal\s+research|memorandum|memo\b", 4),
            _p(r"damages\s+worksheet|contradiction\s+memo", 4),
            _p(r"exhibit\s+(?:list|index)|evidence\s+index|chronolog", 4),
            _p(r"preservation\s+(?:demand|letter)|litigation\s+hold", 5),
            _p(r"notice\s+of\s+intent|arbitration\s+(?:provision|clause)", 4),
        ],
    },
    {
        "id": "21",
        "name": "21_Damages_Evidence",
        "title": "Damages Evidence",
        "priority": "P2",
        "patterns": [
            _p(r"adverse\s+action|credit\s+denial|denial\s+letter", 5),
            _p(r"loan\s+denial|credit\s+limit\s+reduc|account\s+closure\s+notice", 4),
            _p(r"credit\s+monitoring|out-?of-?pocket|postage|certified\s+mail\s+(?:fee|cost|receipt)", 3),
            _p(r"mortgage\s+(?:denial|impact|rate)|auto\s+loan\s+(?:denial|rate)", 4),
        ],
    },
    {
        "id": "22",
        "name": "22_Metadata_Provenance",
        "title": "Metadata / Provenance Materials",
        "priority": "P3",
        "patterns": [
            _p(r"chain\s+of\s+custody|provenance", 5),
            _p(r"hash\s+(?:index|manifest|log)|sha-?256\s+(?:index|manifest)", 5),
            _p(r"bates\s+(?:number|range|log)", 4),
        ],
    },
    {
        "id": "23",
        "name": "23_Existing_Catalogs_and_Indexes",
        "title": "Existing Catalogs and Indexes",
        "priority": "P1",
        "patterns": [
            _p(r"master\s+(?:file\s+)?index|document\s+index|evidence\s+inventory", 6),
            _p(r"priority\s+shortlist|high-?value\s+documents", 5),
            _p(r"payment\s+reconstruction|payment\s+reconciliation|cross-?case\s+ledger", 5),
            _p(r"duplicate\s+index|hash\s+index|OCR\s+index|search\s+index", 5),
            _p(r"cross-?reference\s+index", 5),
            _p(r"dispute\s+matrix|forensic\s+contradiction\s+report", 5),
        ],
    },
]

UNCLASSIFIED = {
    "id": "00",
    "name": "00_UNCLASSIFIED_NEEDS_REVIEW",
    "title": "Unclassified - manual review required",
    "priority": "P2",
    "patterns": [],
}

CATEGORY_BY_ID = {c["id"]: c for c in CATEGORIES}
CATEGORY_BY_ID[UNCLASSIFIED["id"]] = UNCLASSIFIED

# Minimum weighted score before a document is assigned to a category at all.
MIN_SCORE = 4.0

# --------------------------------------------------------------------------
# P0 completion probes.
#
# Retrieval is complete only when each of these is FOUND,
# CONFIRMED NOT PRESENT, or REFERENCED BUT SOURCE COPY NOT LOCATED.
# `reference_patterns` are the phrases that, when found *inside another
# document* (an index, a letter, a memo), prove the item exists somewhere.
# --------------------------------------------------------------------------

P0_PROBES = [
    {
        "key": "SEPT2023_PAYMENT_PROOF",
        "label": "September 2023 payment proof (confirmation 6962374806 / $18,703.85)",
        "categories": ["02", "03"],
        "patterns": [RE_CONFIRMATION, RE_PAYMENT_AMOUNT],
        "reference_patterns": [
            re.compile(r"confirmation\s*(?:no\.?|number|#)?\s*:?\s*6962", re.I),
            RE_PAYMENT_AMOUNT,
        ],
    },
    {
        "key": "CHASE_POSTING_LEDGER",
        "label": "Chase posting ledger / application of the payment",
        # Posting evidence is filed either as payment evidence or inside the
        # recovery/charge-off accounting, so both categories satisfy it.
        "categories": ["02", "04"],
        "patterns": [
            re.compile(r"post(?:ed|ing)\s+(?:to|of)|applied\s+to\s+(?:the\s+)?account", re.I),
            re.compile(r"general\s+ledger|GL\s+entry", re.I),
        ],
        "reference_patterns": [re.compile(r"posting\s+ledger|payment\s+posting", re.I)],
    },
    {
        "key": "CHARGEOFF_RECOVERY_ACCOUNTING",
        "label": "Charge-off / recovery accounting (date, amount, pre- and post-payment balance)",
        "categories": ["04", "02"],
        "patterns": [
            re.compile(r"charge[\s-]?off\s+(?:date|amount)", re.I),
            re.compile(r"recovery\s+balance", re.I),
        ],
        "reference_patterns": [re.compile(r"charge[\s-]?off\s+(?:ledger|accounting|entry)", re.I)],
    },
    {
        "key": "PAID_IN_FULL_LETTER",
        "label": "November 8, 2023 Chase paid-in-full letter",
        "categories": ["05"],
        "patterns": [
            re.compile(r"paid\s*[\s-]?in\s*[\s-]?full", re.I),
            RE_PIF_LETTER_DATE,
        ],
        "reference_patterns": [
            re.compile(r"paid[\s-]?in[\s-]?full\s+letter", re.I),
            re.compile(r"november\s+8,?\s*2023\s+letter", re.I),
        ],
    },
    {
        "key": "ACDV_EOSCAR",
        "label": "ACDV / AUD / e-OSCAR furnisher records",
        "categories": ["09"],
        "patterns": [re.compile(r"\bACDV\b|e-?OSCAR|\bAUD\b(?!IT)")],
        "reference_patterns": [re.compile(r"\bACDV\b|e-?OSCAR", re.I)],
    },
    {
        "key": "METRO2_DATA",
        "label": "Metro 2 furnishing data (field-level)",
        "categories": ["10"],
        "patterns": [
            re.compile(r"metro\s*-?\s*2\b", re.I),
            re.compile(r"date\s+of\s+first\s+delinquenc|compliance\s+condition\s+code", re.I),
        ],
        "reference_patterns": [re.compile(r"metro\s*-?\s*2\b", re.I)],
    },
    {
        "key": "CRA_REINVESTIGATION_RESULTS",
        "label": "CRA reinvestigation / investigation results (TU, EXP, EFX)",
        "categories": ["06", "07", "08"],
        "patterns": [
            re.compile(r"reinvestigat|investigation\s+results?|verified\s+as\s+accurate", re.I),
        ],
        "reference_patterns": [
            re.compile(r"(?:dispute|investigation)\s+results?", re.I),
        ],
    },
    {
        "key": "CHASE_FRAUD_INVESTIGATION",
        "label": "Chase fraud investigation (claim, notes, result)",
        "categories": ["12"],
        "patterns": [
            re.compile(r"fraud\s+(?:claim|case|investigation)", re.I),
        ],
        "reference_patterns": [re.compile(r"fraud\s+(?:claim|case)\s*(?:no\.?|number|#)", re.I)],
    },
    {
        "key": "IDENTITY_THEFT_RECORDS",
        "label": "Identity-theft records (FTC report, police report, Chase ID-theft submission)",
        "categories": ["12", "13"],
        "patterns": [
            re.compile(r"identity\s+theft|identitytheft\.gov|police\s+report", re.I),
        ],
        "reference_patterns": [re.compile(r"identity\s+theft\s+(?:report|affidavit)", re.I)],
    },
    {
        "key": "AUTHENTICATION_SECURITY_RECORDS",
        "label": "Authentication / security records (MFA, OTP, device, login, IP)",
        "categories": ["12"],
        "patterns": [
            re.compile(r"\bMFA\b|\bOTP\b|device\s+registrat|trusted\s+device|login\s+history|IP\s+address", re.I),
        ],
        "reference_patterns": [re.compile(r"authentication\s+records|device\s+history", re.I)],
    },
]

# Documents matching these are escalated to P0 regardless of category.
P0_ESCALATION = [RE_CONFIRMATION, RE_PAYMENT_AMOUNT]

MASTER_COLUMNS = [
    "Document ID", "Date", "Filename", "Category", "Source Path", "Account",
    "Amount", "Key Fact", "Contradiction", "Legal Relevance", "CRA",
    "Dispute Date", "Produced by Chase?", "Original/OCR", "Duplicate Status",
    "SHA-256", "Priority", "Notes",
]
