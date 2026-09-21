# Discovery Analyst — Output Formats

## 1. Discovery roadmap → in the result

Opens with the gate, always:

```markdown
### Discovery gate status
Conference that opens discovery: occurred / not occurred / UNVERIFIED
Scheduling order: entered / none of record / UNVERIFIED
Discovery period: [dates] / not yet opened / UNVERIFIED
Numerical limits: [limits] / UNVERIFIED
Stay in effect: yes / no / UNVERIFIED
**Nothing in this roadmap may be served until the gate is confirmed.**
```

Then phases, each with what it is for and what must finish before it starts:

```markdown
| Phase | What | Directed to | Depends on | Timing | Why this order |
|---|---|---|---|---|---|
| 0 | Preservation and self-help | n/a | nothing | immediate | Costs nothing; obtainable without discovery |
| 1 | Core documents | each party | gate open | … | … |
| 2 | Interrogatories | … | … | … | … |
| 3 | Third-party subpoenas | non-parties | … | … | Non-parties are slow |
| 4 | Requests for admission | … | phase 1-2 returns | … | Needs to know what is disputed |
| 5 | Depositions | … | documents complete | … | … |
```

Phase 0 is always present and always first. It is the work that needs no
discovery at all, and in most matters it closes more gaps than phase 1.

## 2. Custodian and source map → `07-evidence/custodian-map.csv`

| Column | Meaning |
|---|---|
| `name`, `entity_id`, `role` | Who |
| `document_categories_held` | What they are believed to hold |
| `basis_for_belief` | **Required.** The source saying so, or the practice implying it. Without it the row is a guess |
| `party_or_third_party` | Determines the instrument |
| `possession_custody_control_notes` | Especially for affiliates, prior servicers, trustees |

## 3. Request-to-issue matrix → `09-research/discovery/request-to-issue.csv`

Columns as set out in SKILL.md Step 5. Sorted by `priority`, then `phase`.

`impact_if_refused` is not filler. For some requests a refusal is the useful
outcome — a servicer that will not produce its transaction-code key has told you
something, and has set up the motion.

## 4. Deposition plan → in the result

```markdown
### [Deponent] — [role] — [individual | 30(b)(6)]
**Objective:** one sentence.
**Why this witness:** what they signed, decided, or perceived.
**Topics:** numbered; for 30(b)(6), drafted as they would be noticed.
**Exhibits:** SRC-### list, in order of use.
**The three answers needed:** what the deposition must produce to be worth taking.
**If the answer is unhelpful:** the follow-up.
**Prerequisites:** documents that must be in hand first.
```

## 5. Anticipated-objection analysis → in the matrix, summarised in the result

```markdown
| Objection | Requests affected | Force | Response | Narrowing applied |
|---|---|---|---|---|
```

`Force` is `strong` / `moderate` / `weak` — assessed as the responding party's
counsel would assess it, not as we would wish. A `strong` objection with no
narrowing applied is a request that should not be served.

## Cross-cutting rules

- Every request traces to a gap **and** an element. Untraceable requests are cut,
  not filed under "background."
- Every request is directed to one party, with a stated basis for believing that
  party has the material.
- The roadmap states the gate status in its first lines, every time.
- Nothing is served. The result's *Human decisions required* says so explicitly.
