# Pre-Handover QC Checklist

Two lists. The first is run by `qc_document.py`. The second cannot be automated
and is the reason a document is handed to a **human**.

## Automated — `qc_document.py --images --strict`

- [ ] The PDF opens and its page count is known
- [ ] Extractable text is present, at a plausible density per page
- [ ] Court name appears in the rendered text
- [ ] Case number appears in the rendered text
- [ ] Party designations (Plaintiff / Defendant) appear
- [ ] Page numbers detected across a multi-page document
- [ ] Signature block present
- [ ] Certificate of service present where `document_kind` requires one
- [ ] Certificate states a method of service
- [ ] Every referenced exhibit is listed or said to be attached
- [ ] Internal cross-references resolve to a heading
- [ ] No `[BASIS-REQUIRED]`, TODO, TK, FIXME, `<PLACEHOLDER>` survives
- [ ] DRAFT overlay present on anything whose status is `draft`
- [ ] No redaction marker sits over still-extractable text
- [ ] The Word output named in the log exists on disk
- [ ] A page image was rendered for visual inspection

## Human — no script does these

- [ ] **Look at the page image.** Caption in two columns with a rule between
      them; nothing collapsed, nothing overlapping, nothing off the page.
- [ ] **The caption matches the operative caption**, including every `et al.`,
      every party added or dropped by amendment, and the correct division.
- [ ] **The case number matches the current one.** A removed case has a new
      federal number and the state number is no longer it.
- [ ] **The judge and magistrate initials are current.** Reassignment changes
      them mid-case.
- [ ] **Every record citation resolves** — to the docket number, the page, the
      paragraph actually cited. QC checks that a citation is *there*, never
      that it is *right*.
- [ ] **Every quotation has been checked against the source**, and appears in
      `09-research/citation-verification.csv` with a pincite.
- [ ] **Exhibits are actually attached**, in the order the document cites them,
      and each is legible.
- [ ] **Service list is current** — counsel appearing, withdrawn, or added
      since the last filing.
- [ ] **Redactions are removals, not overlays.** Select the text under the box.
      If it selects, it is not redacted.
- [ ] **Page limits.** Many courts cap brief length; some exclude the caption,
      certificate and exhibits from the count and some do not.
- [ ] **Filing deadline verified against the docket**, not against the register.
- [ ] **Signature** — a `/s/` is a signature only where the court's rules allow
      it and only for the person it names.

## Failure handling

`qc_status: fail` means it is not handed over. Fix the **source**, re-produce,
re-run QC. Editing the PDF or the Word file directly breaks the one-source rule
and the two outputs can then disagree without anything detecting it.

`pass-with-warnings` is a human decision, not an automatic pass. Each warning is
read and either resolved or recorded as accepted.
