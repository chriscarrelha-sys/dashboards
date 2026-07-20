# Pro Se Wins — Owner operating manual (Phase 6 §60)

A practical guide to running your cases day to day. Written for you, the owner —
no jargon, no assumptions.

> **Two rules that never change.** (1) The app **records** filings and service;
> it never files with a court. (2) AI output is a **proposal**, never verified
> legal fact — deadlines, hearings, and legal conclusions stay unconfirmed until
> you confirm them in the Verification Queue.

---

## Daily use

1. **Open the case** from the landing page ("Select a Matter").
2. **Review Next Action** and the **Next Court Date / Deadline** cards on the case homepage.
3. **Upload today's documents** (drag in, or via the Mac companion / Files app / camera capture). They auto-classify, get a standardized name, and land in the right folder; low-confidence ones go to Review.
4. **Search** for anything — a case number, a dollar amount, a phrase — scoped to the case or across all cases.
5. **Clear notifications** — deadline/hearing/task reminders.

## Weekly use

- Review **all deadlines** (confirm any newly proposed ones — nothing syncs to your calendar until you do).
- Work the **Verification Queue** (AI proposals: evidence, contradictions, docket entries, discovery imports).
- Review **discovery deficiencies** and any **pending filings**.
- Check **backup status** (Administration → System Health / Backup).
- Run a **Case Review** (AI → Case Review) for a source-linked, element-by-element gap analysis. It shows what's unsupported — it does **not** predict outcomes.

---

## Filing workflow

Draft → link evidence → link authorities → verify citations → run the readiness
checklist → assemble exhibits → prepare the certificate of service → open the
filing portal (PeachCourt/PACER, external) → **you file with the court** → record
the receipt and the filed-stamped copy → record service.

- Draft **versions are never overwritten**; you designate one "final for filing".
- Readiness **warnings** are operational (not legal advice); waiving one requires a reason and is logged.
- A filing package produces a downloadable **manifest** (structured text/JSON), not a merged PDF.

## New-case workflow

Create case → confirm caption → confirm court/division → confirm case number →
confirm judge → connect the portal link → map the iCloud folder → import
documents (dry-run inventory first) → review proposed deadlines.

Recommended iCloud folder layout (portable, for recovery/external access):

```
iCloud Drive/Pro Se Wins/[Case Short Name]/
  00 Intake/ 01 Pleadings/ 02 Orders/ 03 Motions/ 04 Discovery/
  05 Evidence/ 06 Exhibits/ 07 Correspondence/ 08 Service/ 09 Research/
  10 Strategy/ 11 Damages/ 12 Hearing Preparation/ 13 Filed Copies/
  14 Exports/ 15 Archive/
```

You don't navigate this for routine use — the app organizes for you. The folders
exist so your work stays yours even without the app.

---

## Security

- **Sessions & devices:** review and revoke under Administration → Security.
- **2FA:** enroll an authenticator; keep your recovery codes somewhere safe (they're shown once and stored only as hashes).
- **Integration permissions:** grant AI/calendar/email access one provider at a time; start conservative.
- **AI privacy (per case):** choose `disabled`, `manual` (default), or approved automation; privileged and settlement documents are never transmitted without explicit confirmation.

## Backup & recovery

- **Manual backup:** Administration → Backup → Create. Then **Verify** (checksum) and **Restore Preview**.
- **Full export:** builds a complete case archive (documents + machine-readable indexes + manifest) after a confidentiality review. Your exports are understandable **without** Pro Se Wins.

---

## Troubleshooting

| Symptom | What to do |
|---------|-----------|
| Upload failed | Retry; check file isn't password-protected; the original is never altered. |
| Search misses a scanned PDF | It may need OCR; confirm OCR ran (scanned-only PDFs have no text layer). |
| AI returned nothing / "[MOCK]" | No live provider key is set, or the case AI mode is `disabled`. |
| Calendar didn't update | Only **confirmed** deadlines sync; confirm it first. Calendar sync may be mock until authorized. |
| Companion won't sync | Re-register the device (one-time code); check the permitted folders; revoke and re-add if needed. |
| A deadline looks wrong | It's a proposal until you confirm — edit or reject it; it won't sync unconfirmed. |

For anything deeper (deploys, restores, provider outages), see the
[Administrator runbook](ADMIN-RUNBOOK.md).
