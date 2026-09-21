# Pro Se Litigation Operations — Project Rules

This directory is a **Claude Code project root**. Open *this* folder (not the repository
root) so that `.claude/agents/` and `.claude/settings.json` load.

    cd pro_se_litigation_ops && claude

## What this is

A persistent litigation-operations system: a permanent library of 24 specialist subagents,
a reusable case template, a record layer, mandatory quality gates, and one master prompt
(`MASTER_PROMPT.md`) that executes the whole workflow in phases.

It is reusable across matters. `cases/_template/` is the blank matter. `cases/carrelha/`
is the live matter. Nothing case-specific belongs outside `cases/`.

## Who is the decision-maker

The user is a **self-represented (pro se) party**. Every agent produces work product *for
the user's own review, signature, and filing decision*. No agent is a lawyer, no output is
legal advice, and no agent may state or imply that a filing decision has been made on the
user's behalf. Agents recommend; the user decides and signs.

## The eight rules that are never waived

1. **Never draft an opposition, reply, or objection to a paper the system has not actually
   read.** If the operative document is not in `cases/<case>/01_record/`, the only lawful
   output is `BLOCKED BY MISSING OPERATIVE RECORD` naming the exact missing document.
2. **Never invent, paraphrase-as-quote, or approximate a citation.** Every authority cited
   in a draft must be verified by `citation-authority-checker` against a retrievable
   source, including pin cites and parentheticals. An unverified cite is deleted, not
   softened.
3. **Never treat evidence as pleaded.** Facts outside the operative complaint may not be
   argued as if pleaded. Extrinsic material is analyzed separately for whether it is
   properly considerable on a Rule 12 motion (incorporation by reference, judicial notice,
   central-and-undisputed) and for what purpose.
4. **Never assume a downloaded rule is current.** Local rules, standing orders, and judge
   instructions are re-verified against the court's own site before any filing is released.
   A cached PDF is evidence of what the rule *was*.
5. **One writer per filing.** No two agents edit the same document in `05_drafts/` or
   `07_final/`. Specialists write *reports*; only `final-editor` integrates.
6. **Never oppose a motion that has already been granted.** When an order exists, the
   question is the correct *post-order* vehicle (Rule 72(a) objection, motion to
   reconsider/modify, narrow targeted relief, or nothing), not an opposition brief.
7. **Distinguish nondispositive from dispositive.** A magistrate judge's nondispositive
   order is reviewed under Rule 72(a) ("clearly erroneous or contrary to law"). A report
   and recommendation on a dispositive motion runs under Rule 72(b) de novo objections.
   Never blend the two standards.
8. **Every deliverable ends in exactly one release state** (see `QUALITY_GATES.md`):
   `FILE`, `FILE AFTER SPECIFIED CORRECTION`, `DO NOT FILE`, or
   `BLOCKED BY MISSING OPERATIVE RECORD`.

## Record status vocabulary

Every document inventoried by `record-custodian` carries exactly one status:

`OPERATIVE` · `SUPERSEDED` · `MOOT` · `HISTORICAL` · `EXHIBIT` · `MISSING`

Only `OPERATIVE` documents drive present-tense argument. `SUPERSEDED` and `HISTORICAL`
documents are used for delta analysis and impeachment, never as the current pleading.

## Deadline discipline

`docket-deadline-clerk` owns every date. The chain is always shown:

    trigger event → method of service → governing rule → Rule 6(a)/6(d) computation
    → docket metadata → case-specific order → CONTROLLING DATE

PACER's calculated deadline is **data, not authority**. When the independent computation
and PACER disagree, the system records both, flags the conflict, and operates to the
**earliest** candidate date until the conflict is resolved.

## Case folder layout

    00_intake    raw incoming documents, unprocessed
    01_record    inventoried record; the only source agents may cite as "the record"
    02_procedure deadline computations, rules audits, standing orders
    03_research  legal research memos per issue
    04_analysis  element matrices, delta analyses, accounting reconstructions
    05_drafts    working drafts (one writer each)
    06_redteam   adversarial reviews and bench reviews
    07_final     released documents only — nothing enters without a passed gate sheet
    08_exhibits  exhibits with a cross-referenced index
    09_service   certificates of service and proof of filing

## File ownership map

| Folder | Who may write |
|---|---|
| `00_intake` | user only |
| `01_record` | `record-custodian` only |
| `02_procedure` | `docket-deadline-clerk`, `local-rules-procedure` |
| `03_research` / `04_analysis` | the owning specialist, one file each |
| `05_drafts` | the single assigned drafter per document |
| `06_redteam` | reviewers, one file each, never edits `05_drafts` |
| `07_final` | `final-editor` only |
| `09_service` | `filing-format-service-qc` |

## Tone and format defaults for court papers

Times New Roman 14pt, double-spaced body, margins of at least one inch on all sides
(top margin may be set to 1.5" as a conservative choice), consecutive page numbers
centered at the bottom, single-spaced block quotes and headings, real white space rather
than crowding the signature block, certificate of compliance, and certificate of service
on their own clean page. `filing-format-service-qc` re-verifies the governing local rule
immediately before release — the defaults above are a starting point, not the authority.
