# Operations Protocol

Each step names the failure it prevents. A step whose failure you cannot state
is a step somebody will skip.

## A. Standing up a matter

1. `new_matter.py --slug --matter-id --name`. The slug is the directory; the
   matter id prefixes every assignment (`ASSIGN-<MATTER-ID>-###`).
2. Fill `matter-control.yaml` from sources, not memory. Every field that a
   source does not support reads `UNVERIFIED`.
   *Prevents:* a control file that looks authoritative and is half-remembered.
3. Fill `access-map.yaml`. Delete systems that do not apply. For each system
   left, set `session_access`; if it is `read` or `read-write`, set
   `verified_on` and `scope_note`.
   *Prevents:* a later reader assuming a source was searched when nobody could
   reach it.
4. Record every unreachable system under `known_inaccessible`, each with a
   `gap_ids` pointer.
   *Prevents:* an access limitation that is real but appears nowhere a
   specialist will look.
5. `validate_matter_pack.py <pack> --template` until the structure is sound;
   then without `--template` once the placeholders are gone.

## B. Intake

1. **Hash first.** SHA-256 before classification, before OCR, before anything.
   *Prevents:* being unable to prove, later, what arrived.
2. **Dedupe by hash, not by name.** Two files with the same bytes are one
   document; the second is an index row pointing at the first.
   *Prevents:* the same document counted twice in a chronology, then cited as
   two corroborating sources.
3. **Detect the text layer before OCR.** OCR over an existing text layer
   degrades it.
4. **OCR writes a new file.** New `SRC-` id, `derived_from` the parent,
   `authenticity_status: derived`, and a note that it has not been proofread.
   *Prevents:* a quotation taken from machine OCR and presented as the
   document's words.
5. **Classification records its evidence.** `classification_basis` holds the
   phrase that fired. No match means `UNCLASSIFIED`, not a plausible guess.
   *Prevents:* a mis-typed document silently routed to the wrong specialist.
6. **`doc_date` and `authenticity_status` arrive `UNVERIFIED`.** A date in a
   filename is not a date. Nothing is authenticated by being copied.
7. **Material that may not be copied** is registered with `--record-extract`:
   its own id, its own hash, `access_status: extract-only`, `derived_from` the
   parent. Every finding resting on it inherits that ceiling **in the prose as
   well as the register**.
   *Prevents:* a register that correctly says "extract only" beneath a
   narrative that reads as though the document was examined.
8. `validate_matter_pack.py --hash-check` after every intake. It records the
   baseline the first time and proves byte-identity every time after.

## C. Tracking

1. A task is written to `task-board.csv` **when it is planned**, not when it is
   issued. Wave 2 and Wave 3 tasks exist as `planned` rows from the moment the
   plan exists.
   *Prevents:* the failure that has already occurred here once — a dependent
   task that lived only in the plan and was never issued.
2. Every task names `decision_supported`. A task supporting no decision is not
   issued.
3. `depends_on` and `blocks` are both filled. The validator finds cycles; a
   cycle stalls a plan silently otherwise.
4. A task closes only with a `completed_date` **and** an `output_path`.
   *Prevents:* "done" pointing at nothing.
5. A task that completes while still carrying `unresolved_questions` is
   reported. Closing over an open question is sometimes right and must be
   visible.

## D. The gate

1. Nothing that files, serves, sends, publishes, deletes, renames or materially
   moves a litigation document happens without an `APR-` row.
2. The request states: the action, the target and its path, **why it is
   needed** (the order, rule or deadline that requires it), **what the human
   must review**, and how irreversible it is.
3. Filing, serving, sending, publishing and deleting are `irreversible`. The
   validator refuses to record them otherwise.
   *Prevents:* a human approving on a false premise about what can be undone.
4. A named human sets `human_decision` and `decided_by`. Nothing self-approves.
5. **The human performs the action.** This system never does. There is no
   execute path to misuse.
6. `executed: yes` before approval, or after denial, is a hard error. If it is
   ever raised, the action was taken outside the gate and that is the incident.

## E. The weekly cycle

Open with `command_center.py`. Work the five sections in order. Close by
regenerating it, so the next session starts from the state this one left.

Before relying on any date in section 1, check the live docket. The command
center is exactly as current as the registers, and the registers are exactly as
current as the last human who looked at the docket. It says so on its face;
that sentence is not decoration.
