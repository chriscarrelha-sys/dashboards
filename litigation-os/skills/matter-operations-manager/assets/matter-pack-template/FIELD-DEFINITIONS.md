# Matter Pack — Field Definitions v1.1

Read this before writing into any matter-pack file. Every column below has one
meaning. Where a column takes a controlled value, only those values are legal;
`validate_matter_pack.py` enforces them.

Three conventions run through every file:

- **`UNVERIFIED`** — write this literal string in any cell where you do not have
  a source. Never leave a substantive cell blank to mean "unknown," because a
  blank cell reads as "not applicable" to the next agent.
- **Source IDs** — `SRC-###`, always three digits, assigned in
  `source-manifest.csv` and never reused or renumbered. Multiple IDs in one cell
  are separated by `;` with no spaces (`SRC-001;SRC-004`).
- **Pinpoints** — the smallest locator the source supports, in the source's own
  vocabulary: `p.7`, `¶ 33`, `Ex. 20 at 2`, `Doc. 35 at 8`, `Bates SHELL-000412`,
  `row 22`, `DB 11187 p.717`. Never a bare page number when a paragraph exists.

---

## `00-control/matter-control.yaml`

The controlling document. A specialist that cannot find this file must stop and
report, not proceed.

| Key | Meaning | Rule |
|---|---|---|
| `matter_id` | Stable matter identifier | Uppercase, `SHORTNAME-YEAR`. Must match `matter_id` in every assignment and result. |
| `court.*` | The forum that controls procedure | `case_number` copied character-for-character from the court's own caption, including judge initials. |
| `court.related_cases` | Prior/parallel proceedings | Removal source, appeals, parallel state actions. Omitting a removal source is a common and serious error: pre-removal orders still govern. |
| `jurisdiction.governing_procedure` | Which rule sets bind | Must name local rules and standing orders, not just the national rules. |
| `jurisdiction.controlling_appellate_authority` | Whose opinions bind this court | This is what the research skill checks before calling anything "controlling." |
| `parties[].status` | Whether the entity is actually in the case | `disputed` when the parties disagree about party status — this happens more often than expected and changes service, unanimity, and notice analysis. |
| `procedural_posture.as_of` | Date the posture was last confirmed | If older than the newest docket entry, the posture is stale and must be re-derived. |
| `immediate_objectives` | What the attorney needs now | Ranked. The orchestrator turns these into assignments. |
| `controlling_deadlines[].status` | `express` \| `calculated` \| `UNVERIFIED` | `express` only when quoted from an order/rule/notice. Anything you worked out yourself is `calculated` and needs its method in `deadline-register.csv`. Anything you believe but cannot source is `UNVERIFIED` and is **not a deadline** — it is a verification task. |
| `authorized_source_locations` | Where reading is permitted | A specialist reading outside this list has exceeded its assignment. |
| `prohibited_actions` | Hard stops | Must include the four standing prohibitions. |
| `open_factual_questions` / `open_legal_questions` | The live unknowns | Each needs `why_it_matters`; a question nothing turns on is noise. |
| `last_verified` | Human confirmation | `method` must say what was actually read, not "reviewed." |

---

## `01-parties/parties.csv`

| Column | Meaning | Controlled values |
|---|---|---|
| `entity_id` | Stable ID | `ENT-###` |
| `name` | Exactly as captioned by the court | — |
| `role` | Position in the case | `plaintiff`, `defendant`, `intervenor`, `third-party`, `non-party`, `disputed` |
| `entity_type` | Legal form | `individual`, `LLC`, `corporation`, `trust`, `partnership`, `LLP`, `agency`, `unknown` |
| `captioned` | Whether the name appears in the operative caption | `yes`, `no`, `added-by-amendment`, `disputed`. A defendant named only in the body and not the caption is frequently held not to be a party — record this precisely. |
| `service_status` | Service of process | `served`, `not-served`, `waived`, `disputed`, `UNVERIFIED` |
| `party_status` | Whether still in the case | `active`, `dismissed`, `terminated`, `never-a-party`, `disputed` |
| `aliases` | d/b/a, n/k/a, merged-into names | `;`-separated. Servicer mergers and d/b/a names are a routine source of false "different entity" findings. |
| `relationship_notes` | How this entity relates to the others | e.g. "merged into ENT-003 in May 2024 per SRC-012" |

## `01-parties/counsel.csv`

| Column | Meaning |
|---|---|
| `represents_entity_ids` | `ENT-###` list |
| `role` | `lead`, `local`, `of-counsel`, `foreclosure-counsel`, `pro-se-self` |
| `service_method` | How this person is served: `CM/ECF`, `email`, `US-mail`, `certified-mail` |
| `appearance_docket_no` | Docket number of the notice of appearance, or `UNVERIFIED` |

---

## `02-court/claims-defenses.csv`

| Column | Meaning | Controlled values |
|---|---|---|
| `type` | What this row is | `claim`, `defense`, `counterclaim`, `crossclaim` |
| `count_no` | Count number in the operative pleading | Integer or `n/a` |
| `legal_basis` | Statute, rule, or doctrine with citation | — |
| `asserted_against` | `ENT-###` list. **Required.** A claim that does not say which defendant it runs against is a pleading defect worth flagging. |
| `elements` | The elements, `;`-separated, each as the governing authority states them | — |
| `element_status` | Per-element proof state, same order as `elements`, `;`-separated | Each of `proved`, `supported`, `pleaded-only`, `gap`, `foreclosed` |
| `known_weaknesses` | The attack you expect | Write the strongest version of the other side's point, not a strawman. |
| `dispositive_rulings` | Any order already deciding this | Docket number + effect |
| `status` | `pleaded`, `dismissed`, `withdrawn`, `surviving`, `not-yet-asserted` |

---

## `03-sources/source-manifest.csv`

The backbone. Every other file's `source_id` must resolve here.

| Column | Meaning | Rule |
|---|---|---|
| `source_id` | `SRC-###` | Assigned once. **Never** reuse or renumber — every downstream citation would silently change meaning. |
| `doc_type` | Kind of document | `pleading`, `order`, `motion`, `correspondence`, `ledger`, `statement`, `credit-report`, `recorded-instrument`, `declaration`, `exhibit`, `docket-sheet`, `agency-record`, `transcript`, `photo`, `email`, `other` |
| `doc_date` | Date on the face of the document | `UNVERIFIED` if undated. Do **not** substitute the file's modification date. |
| `file_path` | Path relative to the matter pack | Files under `03-sources/raw/` are read-only. |
| `sha256` | Hash of the file as received | Lets a later run prove the original was not altered. |
| `derived_from` | Parent `SRC-###` if this is an OCR/extract/conversion | A derived text never inherits the parent's ID. It gets its own, and points back. |
| `ocr_status` | `native-text`, `ocr-clean`, `ocr-uncertain`, `image-only`, `n/a` | `ocr-uncertain` means at least one material character was ambiguous. |
| `ocr_confidence` | `high`, `medium`, `low`, `n/a` | Any figure, date, or account number read from an `ocr-uncertain` source is `medium` at best downstream. |
| `authenticity_status` | `self-authenticating`, `produced-by-opponent`, `party-created`, `unauthenticated`, `disputed` | A document in your own folder is not authenticated by being there. |
| `privilege_status` | `none`, `attorney-client`, `work-product`, `mixed`, `needs-review` | — |
| `access_status` | `full`, `partial`, `paywalled`, `missing-pages`, `unavailable` | `partial`/`missing-pages` must be reflected in any confidence that rests on it. |
| `bates_range` / `docket_no` / `exhibit_no` | Whichever identifiers the document actually carries | `n/a` when it carries none — not blank. |

---

## `04-docket/docket-register.csv`

| Column | Meaning | Rule |
|---|---|---|
| `docket_no` | The number the court assigned | Integer. Use `sub_no` for attachments (`26-1` is `docket_no` 26, `sub_no` 1). |
| `date_filed` vs `date_entered` | Filing date and docketing date | Frequently differ; deadlines can run from either depending on the rule. Record both or write `UNVERIFIED`. |
| `event_type` | `complaint`, `amended-complaint`, `answer`, `motion`, `response`, `reply`, `order`, `notice`, `report-recommendation`, `judgment`, `removal`, `remand`, `scheduling`, `other` |
| `issuing_judge` | For orders only | Which judge signed matters: a magistrate's order and a district judge's order have different review paths. |
| `operative_language` | The words that actually command something | Quote them. Paraphrase loses the trigger. If the order says "NO LATER THAN AUGUST 21, 2026," that string goes here verbatim. |
| `disposition` | What the entry did | `granted`, `denied`, `denied-as-moot`, `granted-in-part`, `deferred`, `n/a` |
| `affects_deadline_ids` | `DL-###` rows this entry creates, moves, or kills | Keeps the deadline register synchronized with the docket. |
| `verification_status` | `verified-from-document`, `from-docket-sheet-only`, `inferred-from-another-filing`, `UNVERIFIED` | An entry known only because another document mentioned it is **not** verified. |

---

## `05-chronology/chronology.csv`

| Column | Meaning | Rule |
|---|---|---|
| `event_date` | Date the event occurred | Not the date it was reported. If a letter dated 3/2/26 describes a 1/5/26 referral, that is a 1/5/26 event sourced to the 3/2/26 letter. |
| `date_precision` | `exact`, `month`, `year`, `on-or-about`, `range`, `UNVERIFIED` | `on-or-about` when the source itself hedges. |
| `actor` / `recipient` | `ENT-###` or a named person | Who did it, to whom. |
| `event_type` | `payment`, `reversal`, `fee`, `notice`, `communication`, `filing`, `order`, `hearing`, `transfer`, `assignment`, `recording`, `credit-furnishing`, `dispute`, `application`, `denial`, `representation`, `other` |
| `epistemic_label` | `[VERIFIED]`, `[ALLEGED]`, `[COURT-FOUND]`, `[INFERENCE]`, `[UNRESOLVED]` | See handoff standard §4. The commonest error is labeling a court's *recital of an allegation* as `[COURT-FOUND]`. |
| `conflicting_source_ids` | Sources that put this event on another date, or deny it | Populating this is what feeds the contradiction register. |
| `confidence` | `high`, `medium`, `low` | Never `high` on a source you did not read in full. |

---

## `06-issues/issue-register.csv`

| Column | Meaning | Controlled values |
|---|---|---|
| `issue_type` | What kind of question | `legal`, `factual`, `procedural`, `evidentiary`, `mixed` |
| `question` | Framed so it has a findable answer | "Does X?" not "X problem." |
| `owner_skill` | Which specialist should answer it | `legal-research-paralegal`, `evidence-chronology-paralegal`, `docket-deadline-paralegal`, `human` |
| `status` | `open`, `assigned`, `answered`, `blocked`, `moot` |
| `answer_basis` | Source IDs or authority supporting the current answer | `UNVERIFIED` if none yet. |

---

## `07-evidence/proposition-evidence.csv`

The three columns that carry the weight:

| Column | Meaning |
|---|---|
| `what_the_document_actually_shows` | Read the document as a hostile reader would. A servicing letter saying "we found no error" shows the servicer *said* that — not that no error occurred. |
| `what_is_claimed_from_it` | What a party (including your own side) asserts it proves. |
| `gap_between_the_two` | The distance. If there is none, write `none`. This column is where over-claiming gets caught before a court catches it. |

| Other column | Meaning | Controlled values |
|---|---|---|
| `proposition_type` | `element-fact`, `background`, `damages`, `credibility`, `procedural` |
| `proof_status` | `proved-by-document`, `supported`, `disputed`, `pleaded-only`, `unsupported`, `contradicted` |
| `admissibility_concerns` | Hearsay, authentication, completeness, best-evidence — named, not hand-waved | — |

## `07-evidence/contradiction-register.csv`

| Column | Meaning |
|---|---|
| `statement_a` / `statement_b` | The two assertions, quoted or closely paraphrased, each with its own source and pinpoint. |
| `is_genuine_conflict` | `yes`, `no`, `unresolved`. Answer `no` when an innocent explanation fully accounts for it (two loan numbers for one loan after a servicing transfer, for example) and say so in `innocent_explanations`. A register padded with non-conflicts destroys the credibility of the real ones. |
| `innocent_explanations` | The benign reading, stated fairly. Required whenever `is_genuine_conflict` is `yes` — if you cannot state the benign reading you have not tested the finding. |
| `who_is_bound_by_it` | Which party is stuck with which statement, and in what capacity (pleading admission, party admission, business record). |
| `materiality` | `dispositive`, `material`, `impeachment-only`, `immaterial` |
| `use_case` | `impeachment`, `judicial-admission`, `summary-judgment-dispute`, `discovery-target`, `none` |

## `07-evidence/missing-evidence.csv`

| Column | Meaning |
|---|---|
| `why_believed_to_exist` | The source that references it, or the rule/practice that requires it. Without this, the row is speculation. |
| `acquisition_route` | `discovery-request`, `subpoena`, `public-record`, `client-file`, `agency-FOIA`, `custodian-request`, `unknown` |
| `blocking` | `yes`/`no` — whether an objective cannot be met until this arrives. |

## `07-evidence/entity-index.csv`

| Column | Meaning |
|---|---|
| `personal_knowledge_of` | The specific facts this person could testify to from their own perception — not topics they are "involved in." |
| `witness_status` | `party`, `party-employee`, `third-party`, `expert`, `custodian`, `declarant`, `unknown` |

---

## `08-deadlines/deadline-register.csv`

The most safety-critical file in the pack.

| Column | Meaning | Rule |
|---|---|---|
| `deadline_type` | `express`, `calculated`, `estimated`, `conditional` | **`express`** = quoted from an order, rule, notice, or scheduling document. **`calculated`** = you computed it and every input below is filled. **`estimated`** = an input is missing; this is *not a date to rely on*. **`conditional`** = runs from an event that has not happened yet (e.g. "14 days after the amended complaint is filed"). |
| `date` | The date, or `NOT-COMPUTABLE` | Write `NOT-COMPUTABLE` — never a guess — when `deadline_type` is `estimated` and an input is missing. |
| `date_status` | `confirmed`, `needs-verification`, `ambiguous`, `superseded` | An uncertain deadline is `needs-verification` and is treated as a high-priority task, never as a date. |
| `triggering_event` + `triggering_event_date` | What starts the clock and when | If the triggering event has not occurred, the date is `NOT-COMPUTABLE` and the type is `conditional`. |
| `governing_rule` | The rule, statute, order, or local rule that sets the period | Cite it. "Standard practice" is not a governing rule. |
| `computation_method` | The arithmetic, shown | e.g. "FRCP 6(a)(1): exclude 7/31/26; count every day; 14th day = 8/14/26; not a weekend or holiday, so no 6(a)(1)(C) roll." A calculated deadline with an empty method is invalid. |
| `calendar_basis` | `calendar-days`, `business-days`, `court-days` | Getting this wrong is the classic malpractice trap. |
| `service_method` | `CM/ECF`, `personal`, `mail`, `email-consent`, `n/a` | Drives whether three days are added under FRCP 6(d) or its state analogue. |
| `ambiguity_flag` / `ambiguity_description` | `yes`/`no` + what is ambiguous | Any ambiguity forces `date_status: needs-verification`. |
| `conflicts_with` | Other `DL-###` this contradicts | Two orders setting different dates for the same event is a conflict to surface, not to silently resolve. |
| `verification_required` | What a human must check | e.g. "Confirm on PACER whether Doc. 36 was filed." |

## `09-research/research-tables/*.csv`

| Column | Meaning | Controlled values |
|---|---|---|
| `authority_type` | `constitution`, `statute`, `regulation`, `procedural-rule`, `local-rule`, `appellate-opinion`, `trial-court-opinion`, `agency-guidance`, `secondary` |
| `authority_rank` | 1–9 by the hierarchy in the research skill | Lower binds harder. |
| `binding_status` | `controlling`, `persuasive-in-circuit`, `persuasive-out-of-circuit`, `non-precedential`, `superseded`, `unknown` | `controlling` requires that the deciding court actually binds the forum. Check the forum first. |
| `holding_or_dicta` | `holding`, `dicta`, `mixed`, `unclear` | A statement not necessary to the judgment is dicta, however quotable. |
| `factual_comparison` | How the cited facts line up with ours — including where they do not | Factual similarity is not legal relevance, and the reverse is also true. |
| `still_good_law` | `yes`, `no`, `questioned`, `unchecked` | `unchecked` is honest and acceptable; a bare `yes` without a `verification_method` is not. |
| `verification_method` | How you confirmed the quotation, court, date, posture, and history | Name the tool or database. |
| `verified_fields` / `unverified_fields` | Which of {quotation, citation, court, date, posture, history, good-law} you actually confirmed | This is what lets an attorney know precisely what still needs a Shepard's/KeyCite pass. |
| `access_barrier` | `none`, `paywall`, `no-full-text`, `docket-unavailable`, `unpublished` | — |
| `adverse_authority` | Contrary authority found | `none-found` is a claim about your search, not about the law; say where you searched in `notes`. |

---

## `11-decisions/attorney-decision-log.csv`

| Column | Meaning |
|---|---|
| `authorizes_action` | The specific thing the human has approved — e.g. "draft (do not file) opposition to MTD." Nothing outbound happens without a row here. |
| `expires` | When the authorization lapses, or `n/a`. Approval to draft is not approval to file next month. |
| `decided_by` | A human name. A skill may never populate this. |

---

# Phase 3 — the operating layer

## `00-control/access-map.yaml`

Not a CSV. See `matter-operations-manager/references/access-map-protocol.md`
for the full protocol. The rule that matters most: `credential_holder` names a
**person or role** and `credential_location` names a **place**. Neither ever
holds a key. Nothing anywhere in the pack does.

| Field | Meaning |
|---|---|
| `key` | Short stable name for the system, used in prose and registers. |
| `kind` | `cloud-storage`, `workspace`, `court-record`, `court-efiling`, `correspondence`, `legal-research`. |
| `reached_via` | The route — a connector, a URL, "human login". Never the key. |
| `session_access` | `none`, `read`, or `read-write`. What **this session** actually had, not what exists. |
| `verified_on` | The date access was actually exercised. Required whenever access is claimed; access never exercised is not access. |
| `scope_note` | What was in scope, and what the source's nature limits. RECAP mirrors only what somebody purchased; a client folder shows what the client kept. |
| `write_permitted` | Always `no` for court systems and anything holding originals. |
| `known_inaccessible[].gap_ids` | Every unreachable system needs a `GAP-` row. An access gap that is not a gap row is one nobody will close. |

## `00-control/task-board.csv`

| Column | Meaning |
|---|---|
| `task_id` | `TSK-###`. |
| `title` | What the task is, in a line. |
| `specialist` | Which registered specialist owns it. |
| `assignment_id` | The `ASSIGN-` document. Required once status leaves `planned`. |
| `wave` | 1, 2 or 3 — which dependency tier. |
| `status` | `planned`, `issued`, `in-progress`, `blocked`, `returned`, `complete`, `cancelled`. A task is written as `planned` **when it is planned**, not when it is issued. |
| `depends_on` / `blocks` | `TSK-` ids. The validator reports dependency cycles. |
| `completed_date` / `output_path` | Both required to close. "Done" pointing at nothing is not done. |
| `unresolved_questions` | `OFQ-`/`OLQ-`/`ISS-`/`HD-` ids still open. Closing over an open question is sometimes right and must be visible. |
| `decision_supported` | Required. A task supporting no decision is output nobody will read, and is not issued. |

## `03-sources/source-index.csv`

The intake record behind the manifest. The manifest says what a source *is*;
the index says how it *got here* and what was done to it.

| Column | Meaning |
|---|---|
| `index_id` | `IDX-###`. |
| `original_system` / `original_location` | Where it came from. For read-in-place material, "read in place — not copied". |
| `sha256` | 64 hex characters, taken **before** anything else happens. A source with no fingerprint cannot be shown to be unchanged. For a `read-in-place` source — examined at its own location and never copied — this reads `NOT-COPIED`, and `original_location` must say where it was read. Bytes never held cannot be fingerprinted, and a hash of a substitute would be worse than none. |
| `content_hash_group` | First 12 of the hash — a readable handle for a duplicate set. |
| `dedupe_status` | The intake disposition: `unique`, `duplicate`, `extract`, `read-in-place`, `superseded`. Dedupe is by **bytes**, never by filename; when two files are identical, the one whose name does not read as a copy becomes canonical. |
| `duplicate_of` | The `IDX-` this duplicates. Required when `dedupe_status: duplicate`. |
| `text_layer` | `native-text`, `yes`, `no`, `n/a`. Detected before OCR, because OCR over an existing text layer degrades it. |
| `ocr_status` | `not-required`, `pending`, `ocr-complete`, `ocr-unavailable`, `ocr-derived`, `n/a`. `text_layer: no` can never sit beside `not-required`. |
| `classification` | The detected `doc_type`, or `UNCLASSIFIED`. Never a plausible guess. |
| `classification_basis` | The phrase that fired the classifier. A classification nobody can argue with is a guess. |
| `source_id` | The `SRC-` this became in the manifest. A `unique` intake with no `source_id` never reached the manifest. |
| `original_preserved` | Always `yes`. Anything else means case material was modified, which is prohibited. |

## `09-research/citation-verification.csv`

| Column | Meaning |
|---|---|
| `cv_id` | `CV-###`. |
| `cited_as` | The citation **exactly as it will appear in the filing**. That string is what is being checked. |
| `authority_type` | `case`, `statute`, `regulation`, `federal-rule`, `local-rule`, `standing-order`, `constitutional`, `secondary`. |
| `verification_target` | `quotation`, `pincite`, `holding`, `existence`, `text`, `subsequent-history`, `effective-date`. |
| `target_text_verbatim` | The words actually read. Required for any verified quotation. |
| `located_in` | Where it was read — reporter page, slip op., `SRC-` id, database. A quotation with no located_in is a memory. |
| `pincite` | Required for a quotation. A quotation without a page is a paraphrase; label it one or find the page. |
| `subsequent_history_checked` / `history_result` | Checked separately from good law. Record what was found, including "nothing adverse located". |
| `still_good_law` | `yes` requires a stated `verification_method`. Without a commercial citator the honest ceiling is **CITATOR-LIMITED MEDIUM**, never high. |
| `version_checked` / `effective_or_amendment_date` | Required for statutes, regulations and federal, local and standing rules. These texts change; the operative one is the one in force at the relevant time. |
| `unverified_fields` | What was not confirmed. `confidence: high` cannot sit beside a non-empty value here. |
| `verified_by` | A name. A verification nobody signed is not a verification. |

## `11-decisions/approval-requests.csv`

| Column | Meaning |
|---|---|
| `approval_id` | `APR-###`. |
| `action_type` | `file`, `serve`, `send`, `publish`, `delete`, `rename`, `move`, `other`. |
| `why_needed` | The order, rule or deadline that requires it. |
| `irreversibility` | `irreversible`, `hard-to-reverse`, `reversible`. Filing, serving, sending, publishing and deleting may **never** be recorded as reversible — a human asked to approve on that premise is being misled. |
| `what_human_must_review` | Exactly what to look at before deciding. |
| `human_decision` | `pending`, `approved`, `approved-with-conditions`, `denied`, `withdrawn`. |
| `decided_by` | A human name. A skill may never populate this. |
| `conditions` | Required when `approved-with-conditions`. |
| `executed` / `executed_date` | Set by the human **after they perform the action**. `executed: yes` without approval, or after denial, is a hard error and means the gate was bypassed. |

## `12-workproduct/production-log.csv`

| Column | Meaning |
|---|---|
| `doc_id` | `WP-###`. |
| `doc_kind` | Drives QC: a `response`, `motion`, `brief` or `letter` is served and requires a certificate of service; a `work-product`, `report`, `analysis` or `internal-memo` is not. |
| `source_markdown` | The single source both outputs were rendered from. Editing a PDF or Word file directly breaks that and is not permitted. |
| `page_count` / `searchable_text` | Measured from the finished PDF by `qc_document.py`, not asserted. |
| `qc_status` | `not-run`, `pass`, `pass-with-warnings`, `fail`. A `fail` is not handed to a human; it is fixed at source and re-produced. |
| `approval_id` | The `APR-` that authorises anything outward-facing. Empty means nothing outward-facing has been authorised. |
| `status` | `draft` until an approved gate entry says otherwise. Everything in `drafts/` carries a DRAFT overlay. |
