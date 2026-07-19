/**
 * Seed data — clearly-marked DEMONSTRATION cases (fictitious).
 * Provides one Georgia state-court matter (PeachCourt) and one federal matter
 * (PACER), plus enough related records to exercise the vertical slice.
 */
import { PrismaClient } from '@prisma/client';
import { generateStandardizedName } from '../lib/documents/filename';
import { seedCommercial } from '../lib/commercial/seed';

const prisma = new PrismaClient();

function daysFromNow(n: number): Date {
  const d = new Date();
  d.setUTCHours(12, 0, 0, 0);
  d.setUTCDate(d.getUTCDate() + n);
  return d;
}

async function main() {
  // Fresh start for the demo dataset.
  await prisma.user.deleteMany({});

  const user = await prisma.user.create({
    data: { email: 'owner@prosewins.local', name: 'Case Owner' },
  });

  // ---- Integrations (status is recomputed live; store definitions) ----
  // (Integration status is derived at runtime from env; no seed needed.)

  // ============================ CASE 1: Georgia / PeachCourt ============================
  const forsyth = await prisma.court.create({
    data: {
      name: 'Superior Court of Forsyth County',
      system: 'state',
      division: 'Forsyth County',
      state: 'GA',
    },
  });
  const judgeSmith = await prisma.judge.create({
    data: { name: 'Hon. Philip C. Smith', title: 'Superior Court Judge', courtId: forsyth.id },
  });

  const regions = await prisma.case.create({
    data: {
      userId: user.id,
      shortName: 'Regions',
      caption: 'Regions Bank v. [DEMO Defendant], et al.',
      captionShort: 'Regions Bank v. Defendant',
      caseNumber: '25CV-DEMO-0783',
      caseType: 'foreclosure',
      forum: 'state',
      courtId: forsyth.id,
      judgeId: judgeSmith.id,
      portal: {
        create: {
          kind: 'peachcourt',
          label: 'Open in PeachCourt',
          url: 'https://peachcourt.com/',
        },
      },
      parties: {
        create: [
          { name: 'Regions Bank', role: 'plaintiff' },
          { name: 'Case Owner (self-represented)', role: 'defendant', isSelf: true },
        ],
      },
      caseNotes: {
        create: [{ body: 'DEMO case. Replace with real matter details when ready.' }],
      },
    },
  });

  // Documents for Regions (one auto-applied, one that would need review).
  const answerDate = new Date(Date.UTC(2026, 4, 12));
  const answerDoc = await prisma.document.create({
    data: {
      caseId: regions.id,
      originalName: 'answer_and_counterclaims_final.pdf',
      standardizedName: generateStandardizedName({
        date: answerDate, caseShortName: 'Regions',
        title: 'Answer and Counterclaims', party: 'Defendants', status: 'Filed', ext: 'pdf',
      }),
      title: 'Answer and Counterclaims',
      docType: 'Answer', category: 'filed', docDate: answerDate,
      party: 'Defendants', docStatus: 'filed',
      mimeType: 'application/pdf', sizeBytes: 148_221,
      aiSummary: 'Answer denying the material allegations and asserting counterclaims. (Demo summary.)',
      confidence: 0.91, verificationStatus: 'confirmed', reviewStatus: 'reviewed',
      sourceLabel: 'upload',
    },
  });
  const verifDoc = await prisma.document.create({
    data: {
      caseId: regions.id,
      originalName: 'scan0007.pdf',
      standardizedName: generateStandardizedName({
        date: null, caseShortName: 'Regions', title: 'Unclassified Scan', ext: 'pdf',
      }),
      title: null, docType: 'Other', category: null,
      mimeType: 'application/pdf', sizeBytes: 512_004,
      confidence: 0.34, verificationStatus: 'proposed', reviewStatus: 'queued',
      sourceLabel: 'upload',
    },
  });
  await prisma.reviewQueueItem.create({
    data: {
      caseId: regions.id, kind: 'document-classification',
      title: 'Classify “scan0007.pdf”', confidence: 0.34, provider: 'mock',
      sourceDocId: verifDoc.id,
      proposal: JSON.stringify({ docType: 'Other', reason: 'No strong filename signal' }),
    },
  });

  // Deadlines: one calculated (unverified), one manual milestone.
  await prisma.deadline.create({
    data: {
      caseId: regions.id, title: 'Response to Motion to Dismiss',
      source: 'calculated', triggeringEvent: 'Service of motion (2026-07-08)',
      governingRule: 'EXAMPLE RULE — verify against USCR / local rules',
      calcMethod: 'calendar', dueDate: daysFromNow(6),
      confidence: 0.6, verificationStatus: 'unverified',
    },
  });
  await prisma.deadline.create({
    data: {
      caseId: regions.id, title: 'Serve discovery requests',
      source: 'manual', dueDate: daysFromNow(20), verificationStatus: 'confirmed',
      isMilestone: true,
    },
  });

  // Tasks (one is the Next Action).
  await prisma.task.create({
    data: {
      caseId: regions.id, title: 'Draft response to Motion to Dismiss',
      why: 'A missed response risks the motion being granted by default.',
      priority: 'high', dueDate: daysFromNow(6), isNextAction: true, status: 'in-progress',
    },
  });

  // Timeline events.
  await prisma.timelineEvent.createMany({
    data: [
      { caseId: regions.id, date: new Date(Date.UTC(2026, 3, 2)), title: 'Complaint filed', eventType: 'filing', verificationStatus: 'confirmed' },
      { caseId: regions.id, date: answerDate, title: 'Answer and Counterclaims filed', eventType: 'filing', verificationStatus: 'confirmed' },
      { caseId: regions.id, date: daysFromNow(13), title: 'Motion to Dismiss hearing', eventType: 'hearing', verificationStatus: 'proposed' },
    ],
  });

  // Strategy + posture.
  await prisma.strategyNote.createMany({
    data: [
      { caseId: regions.id, category: 'objective', title: 'Primary objective', body: 'Defeat the motion and preserve counterclaims. (Demo.)' },
      { caseId: regions.id, category: 'opposing-position', title: "Opposing party's position", body: 'Plaintiff seeks dismissal of counterclaims. (Demo.)' },
    ],
  });

  // ---------------------- Phase 2 demo data (Regions) ----------------------
  // Witness
  const witnessFarr = await prisma.witness.create({
    data: { caseId: regions.id, name: 'A. Farr (records custodian)', role: 'Records custodian', party: 'Plaintiff', expectedTestimony: 'Authenticity of the account ledger. (Demo.)' },
  });

  // Legal issues: a defense (claim by plaintiff) + a counterclaim, with elements.
  const standingDefense = await prisma.legalIssue.create({
    data: {
      caseId: regions.id, title: 'Lack of standing to enforce the note', issueType: 'defense',
      assertingParty: 'Defendant (self)', opposingParty: 'Regions Bank', status: 'asserted',
      standard: 'Holder or party entitled to enforce', verificationStatus: 'confirmed', createdBy: 'user',
      elements: {
        create: [
          { number: 1, title: 'Plaintiff is the current holder of the note', standard: 'Possession + indorsement', status: 'disputed' },
          { number: 2, title: 'Unbroken chain of assignment', standard: 'Recorded assignments', status: 'missing-evidence' },
        ],
      },
    },
    include: { elements: true },
  });
  const gfbpaClaim = await prisma.legalIssue.create({
    data: {
      caseId: regions.id, title: 'Counterclaim: unfair business practice', issueType: 'counterclaim',
      assertingParty: 'Defendant (self)', opposingParty: 'Regions Bank', status: 'asserted',
      standard: 'GFBPA — deceptive act in trade/commerce', requestedRelief: 'Actual damages, fees',
      verificationStatus: 'confirmed', createdBy: 'user',
      elements: {
        create: [
          { number: 1, title: 'Unfair or deceptive act', status: 'partially-supported' },
          { number: 2, title: 'Reliance / causation', status: 'unsupported' },
        ],
      },
    },
    include: { elements: true },
  });

  // Evidence items (6+, incl. one adverse), source-linked.
  const evSpecs = [
    { title: 'Assignment gap in chain of title', proposition: 'No recorded assignment from originator to plaintiff. (Demo.)', evidenceType: 'documentary', posture: 'supports-user', doc: verifDoc.id, page: '3', issue: standingDefense.id, element: standingDefense.elements[1]!.id, relation: 'supporting' },
    { title: 'Account ledger produced by plaintiff', proposition: 'Ledger shows the claimed balance. (Demo.)', evidenceType: 'business-record', posture: 'adverse', doc: answerDoc.id, page: '5', issue: standingDefense.id, element: standingDefense.elements[0]!.id, relation: 'adverse' },
    { title: 'Demand letter with conflicting balance', proposition: 'Earlier balance differs from the ledger. (Demo.)', evidenceType: 'communication', posture: 'supports-user', doc: answerDoc.id, page: '2', issue: gfbpaClaim.id, element: gfbpaClaim.elements[0]!.id, relation: 'supporting' },
    { title: 'Robo-signed verification', proposition: 'Verification appears non-personalized. (Demo.)', evidenceType: 'impeachment', posture: 'supports-user', doc: verifDoc.id, page: '1', issue: standingDefense.id, element: null, relation: 'supporting' },
    { title: 'Payment history screenshot', proposition: 'Payments credited late. (Demo.)', evidenceType: 'digital', posture: 'mixed', doc: null, page: null, issue: gfbpaClaim.id, element: null, relation: 'supporting' },
    { title: 'Servicing transfer notice', proposition: 'Transfer notice omitted required disclosures. (Demo.)', evidenceType: 'documentary', posture: 'supports-user', doc: answerDoc.id, page: '7', issue: gfbpaClaim.id, element: gfbpaClaim.elements[0]!.id, relation: 'supporting' },
  ] as const;
  for (const s of evSpecs) {
    const ev = await prisma.evidenceItem.create({
      data: {
        caseId: regions.id, title: s.title, proposition: s.proposition, evidenceType: s.evidenceType,
        posture: s.posture, documentId: s.doc, sourcePage: s.page, createdBy: 'user', creationSource: s.doc ? 'document' : 'manual',
        evidentiaryStatus: 'reviewed', verificationStatus: 'confirmed', relatedWitnessId: s.evidenceType === 'business-record' ? witnessFarr.id : null,
      },
    });
    await prisma.evidenceLegalIssueLink.create({ data: { evidenceId: ev.id, legalIssueId: s.issue, elementId: s.element, relation: s.relation } });
    if (s.doc) await prisma.evidenceDocumentLink.create({ data: { evidenceId: ev.id, documentId: s.doc, page: s.page } });
  }

  // Admission
  await prisma.admission.create({
    data: {
      caseId: regions.id, statement: 'Plaintiff acquired servicing rights on 2025-11-01. (Demo.)', category: 'pleading',
      admittingParty: 'Regions Bank', documentId: answerDoc.id, sourcePage: '1', verificationStatus: 'confirmed', createdBy: 'user',
    },
  });

  // Contradictions (2) with source statements
  await prisma.contradiction.create({
    data: {
      caseId: regions.id, summary: 'Balance stated differs between demand letter and ledger', explanation: 'Two plaintiff documents state different balances. (Demo.)',
      materiality: 'high', status: 'confirmed', verificationStatus: 'confirmed', createdBy: 'user',
      statements: {
        create: [
          { label: 'A', text: 'Balance due: $128,400. (Demo.)', documentId: answerDoc.id, sourcePage: '2', author: 'Regions Bank' },
          { label: 'B', text: 'Balance due: $131,050. (Demo.)', documentId: verifDoc.id, sourcePage: '5', author: 'Regions Bank' },
        ],
      },
    },
  });
  await prisma.contradiction.create({
    data: {
      caseId: regions.id, summary: 'Assignment date inconsistent with servicing-transfer notice', explanation: 'Dates do not line up. (Demo.)',
      materiality: 'medium', status: 'proposed', verificationStatus: 'proposed', createdBy: 'ai', aiProvider: 'mock', confidence: 0.62,
      relatedWitnessId: witnessFarr.id,
      statements: {
        create: [
          { label: 'A', text: 'Assignment executed 2025-10-15. (Demo.)', documentId: answerDoc.id, sourcePage: '6', author: 'Regions Bank' },
          { label: 'B', text: 'Servicing transferred 2025-11-01. (Demo.)', documentId: answerDoc.id, sourcePage: '7', author: 'Regions Bank' },
        ],
      },
    },
  });

  // Discovery set with 5 requests, responses to some, 2 deficiencies, meet-and-confer, subpoena.
  const set1 = await prisma.discoverySet.create({
    data: {
      caseId: regions.id, title: 'Defendant’s First Interrogatories to Plaintiff', discoveryType: 'interrogatories',
      servingParty: 'Defendant', respondingParty: 'Regions Bank', status: 'deficient', verificationStatus: 'confirmed',
      responseDeadline: daysFromNow(-5), createdBy: 'user',
    },
  });
  const reqSpecs = [
    { n: 1, text: 'Identify each person with knowledge of the account.', resp: 'See objections. (Demo evasive response.)' },
    { n: 2, text: 'State the complete chain of assignment of the note.', resp: null },
    { n: 3, text: 'Identify all documents supporting the claimed balance.', resp: 'Objection: overly broad. (Demo.)' },
    { n: 4, text: 'Describe all communications with the defendant.', resp: 'Responsive documents to be produced. (Demo.)' },
    { n: 5, text: 'State the basis for the servicing transfer date.', resp: null },
  ];
  const reqs = [] as { id: string; n: number }[];
  for (const r of reqSpecs) {
    const req = await prisma.discoveryRequest.create({
      data: {
        caseId: regions.id, setId: set1.id, kind: 'interrogatory', title: `Interrogatory ${r.n}`,
        shortTitle: `ROG ${r.n}`, requestNumber: r.n, requestText: r.text, responseText: r.resp,
        status: r.resp ? 'received' : 'open', verificationStatus: 'confirmed',
        deficiencyStatus: r.n === 1 || r.n === 2 ? 'confirmed' : null,
      },
    });
    reqs.push({ id: req.id, n: r.n });
  }
  await prisma.discoveryDeficiency.createMany({
    data: [
      { caseId: regions.id, discoveryRequestId: reqs[0]!.id, title: 'Evasive response to ROG 1', category: 'evasive', explanation: 'Non-responsive; refers only to objections. (Demo.)', resolutionStatus: 'raised', verificationStatus: 'confirmed', createdBy: 'user', dateIdentified: new Date() },
      { caseId: regions.id, discoveryRequestId: reqs[1]!.id, title: 'No response to ROG 2', category: 'no-response', explanation: 'No answer to the chain-of-assignment interrogatory. (Demo.)', resolutionStatus: 'confirmed', verificationStatus: 'confirmed', createdBy: 'user', dateIdentified: new Date() },
    ],
  });
  // Link evidence to a discovery request (missing-proof → discovery).
  const firstEvidence = await prisma.evidenceItem.findFirst({ where: { caseId: regions.id }, orderBy: { createdAt: 'asc' } });
  if (firstEvidence) await prisma.evidenceDiscoveryLink.create({ data: { evidenceId: firstEvidence.id, discoveryRequestId: reqs[1]!.id } });

  await prisma.meetAndConferRecord.create({
    data: {
      caseId: regions.id, title: 'Deficiency letter re: ROG 1 & 2', communicationType: 'letter',
      participants: 'Self; opposing counsel', summary: 'Demanded supplemental responses. (Demo.)',
      demand: 'Supplement ROG 1 and 2 within 10 days', status: 'awaiting-response', communicationDate: new Date(),
    },
  });
  await prisma.subpoena.create({
    data: { caseId: regions.id, recipient: 'Prior loan servicer', subpoenaType: 'documents', requested: 'Complete servicing file and assignment records. (Demo.)', status: 'draft' },
  });

  // ---------------------- Phase 3 demo data (Regions) ----------------------
  const someEvidence = await prisma.evidenceItem.findMany({ where: { caseId: regions.id }, take: 2, orderBy: { createdAt: 'asc' } });

  // Filing 1: motion in drafting (with versions, links, checklist, package, cert).
  const motion = await prisma.filing.create({
    data: {
      caseId: regions.id, title: 'Motion to Dismiss Plaintiff’s Complaint', formalTitle: 'Defendant’s Motion to Dismiss',
      filingType: 'motion', filingParty: 'Defendant', stage: 'authorities-linked', dueDate: daysFromNow(6),
      requestedRelief: 'Dismissal of the complaint for lack of standing. (Demo.)', portalType: 'peachcourt', portalUrl: 'https://peachcourt.com/',
      createdBy: 'user',
      stageHistory: { create: [{ toStage: 'planned', note: 'Created' }, { toStage: 'initial-draft' }, { toStage: 'evidence-linked' }, { toStage: 'authorities-linked' }] },
      checklistItems: { create: [
        { category: 'case-identity', label: 'Full caption matches the case profile', status: 'complete' },
        { category: 'content', label: 'Legal issues linked', status: 'complete' },
        { category: 'content', label: 'Authorities linked and citations verified', status: 'needs-review' },
        { category: 'components', label: 'Certificate of service prepared', status: 'incomplete' },
        { category: 'service', label: 'Recipients identified and addresses verified', status: 'incomplete' },
      ] },
      versions: { create: [
        { versionNumber: 1, label: 'initial-draft', contentText: 'DRAFT — Motion to Dismiss. [INSERT statement of facts]. (Demo placeholder.)', reviewStatus: 'reviewed', approvalStatus: 'pending', createdBy: 'user', changesSummary: 'First draft' },
        { versionNumber: 2, label: 'revised-draft', contentText: 'REVISED DRAFT — Motion to Dismiss. Argument section expanded. (Demo.)', reviewStatus: 'reviewed', approvalStatus: 'pending', createdBy: 'user', changesSummary: 'Expanded argument' },
      ] },
    },
  });
  await prisma.filingLegalIssueLink.create({ data: { filingId: motion.id, legalIssueId: standingDefense.id } });
  if (someEvidence[0]) await prisma.filingEvidenceLink.create({ data: { filingId: motion.id, evidenceId: someEvidence[0].id, relation: 'supporting' } });
  if (someEvidence[1]) await prisma.filingEvidenceLink.create({ data: { filingId: motion.id, evidenceId: someEvidence[1].id, relation: 'adverse' } });

  // Authorities (4; one adverse, one unverified).
  const auth1 = await prisma.authority.create({ data: { caseId: regions.id, citation: 'Reese v. Provident, 259 Ga. App. 744 (2003)', court: 'Ga. Ct. App.', jurisdiction: 'GA', year: 2003, proposition: 'Party seeking to enforce must show it is the holder. (Demo.)', verificationStatus: 'controlling', dateVerified: new Date() } });
  await prisma.authority.create({ data: { caseId: regions.id, citation: 'You v. JP Morgan, 293 Ga. 67 (2013)', court: 'Ga.', jurisdiction: 'GA', year: 2013, proposition: 'Non-parties to a security deed. (Demo.)', verificationStatus: 'persuasive', dateVerified: new Date() } });
  await prisma.authority.create({ data: { caseId: regions.id, citation: 'Adverse Auth., 300 Ga. 1 (2016)', court: 'Ga.', jurisdiction: 'GA', year: 2016, proposition: 'ADVERSE: servicer may enforce. (Demo.)', treatment: 'distinguished', verificationStatus: 'adverse', dateVerified: new Date() } });
  const authUnverified = await prisma.authority.create({ data: { caseId: regions.id, citation: '[MOCK] 123 Ga. App. 456 (2021)', proposition: 'Unverified proposition — open the source. (Demo.)', verificationStatus: 'unverified' } });
  await prisma.authorityVerification.create({ data: { authorityId: auth1.id, step: 'exists', status: 'confirmed' } });
  await prisma.filingAuthorityLink.create({ data: { filingId: motion.id, authorityId: auth1.id, pinpoint: 'at 746' } });
  await prisma.filingAuthorityLink.create({ data: { filingId: motion.id, authorityId: authUnverified.id } });

  // Certificate + package with exhibits.
  await prisma.certificateOfService.create({ data: { caseId: regions.id, filingId: motion.id, servingParty: 'Defendant', method: 'efile', recipientsText: 'Counsel for Regions Bank', statementText: 'I certify that I served a copy of the Motion to Dismiss by e-file. (Draft.)', filedStatus: 'draft', verificationStatus: 'proposed', createdBy: 'user' } });
  const pkg = await prisma.filingPackage.create({ data: { caseId: regions.id, filingId: motion.id, title: 'Motion to Dismiss — filing package', portal: 'peachcourt' } });
  await prisma.filingPackageItem.createMany({ data: [
    { packageId: pkg.id, order: 0, label: 'Motion to Dismiss', documentId: verifDoc.id },
    { packageId: pkg.id, order: 1, label: 'Exhibit A — Assignment records', documentId: answerDoc.id, exhibitDesignation: 'Ex. A', separateUpload: true },
  ] });

  // Filing 2: response (planned).
  await prisma.filing.create({ data: { caseId: regions.id, title: 'Response to Plaintiff’s Motion for Summary Judgment', filingType: 'response', filingParty: 'Defendant', stage: 'planned', dueDate: daysFromNow(18), createdBy: 'user', stageHistory: { create: { toStage: 'planned' } } } });

  // Filing 3: completed (filed) with submission + filed-stamped version + service.
  const completed = await prisma.filing.create({
    data: {
      caseId: regions.id, title: 'Answer and Counterclaims', filingType: 'answer', filingParty: 'Defendant',
      stage: 'served', status: 'filed', actualFilingDate: new Date(Date.UTC(2026, 4, 12)), docketNumber: 'DOC-12',
      createdBy: 'user', certificateOfService: true,
      stageHistory: { create: [{ toStage: 'ready-to-file' }, { toStage: 'filed' }, { toStage: 'filed-stamped' }, { toStage: 'served' }] },
      versions: { create: [{ versionNumber: 1, label: 'filed-stamped', reviewStatus: 'approved', approvalStatus: 'final-for-filing', createdBy: 'user', changesSummary: 'Filed-stamped copy' }] },
      submissions: { create: { portal: 'peachcourt', submittedAt: new Date(Date.UTC(2026, 4, 12)), confirmationNumber: 'PC-99231', docketNumber: 'DOC-12', status: 'accepted' } },
    },
  });
  const recip1 = await prisma.serviceRecipient.create({ data: { caseId: regions.id, name: 'McCalla Raymer (counsel for Regions)', role: 'Opposing counsel', email: 'service@example.com', serviceAddress: '1544 Old Alabama Rd', preferredMethod: 'efile', sourceOfAddress: 'Complaint signature block', lastVerified: new Date(Date.UTC(2026, 3, 2)) } });
  await prisma.serviceEvent.createMany({ data: [
    { caseId: regions.id, filingId: completed.id, recipientId: recip1.id, recipientName: 'McCalla Raymer', serviceMethod: 'efile', serviceDate: new Date(Date.UTC(2026, 4, 12)), deliveryStatus: 'delivered', verificationStatus: 'confirmed' },
    { caseId: regions.id, filingId: completed.id, recipientName: 'Regions Bank (courtesy copy)', serviceMethod: 'mail', serviceDate: new Date(Date.UTC(2026, 4, 13)), deliveryStatus: 'sent', verificationStatus: 'confirmed' },
  ] });

  // Communications (several; one needs follow-up).
  await prisma.communication.createMany({ data: [
    { caseId: regions.id, kind: 'email', direction: 'inbound', subject: 'Re: discovery responses', summary: 'Opposing counsel promised supplemental responses. (Demo.)', withParty: 'McCalla Raymer', followUpRequired: true, occurredAt: daysFromNow(-3), createdBy: 'user' },
    { caseId: regions.id, kind: 'letter', direction: 'outbound', subject: 'Deficiency letter', summary: 'Sent meet-and-confer letter. (Demo.)', occurredAt: daysFromNow(-5), createdBy: 'user' },
    { caseId: regions.id, kind: 'settlement', direction: 'inbound', subject: 'Settlement discussion', summary: 'Verbal settlement floated. (Demo.)', settlementComm: true, confidentiality: 'settlement', occurredAt: daysFromNow(-7), createdBy: 'user' },
  ] });

  // Research.
  await prisma.researchQuestion.create({ data: { caseId: regions.id, question: 'Does a servicer have standing to enforce absent a recorded assignment?', jurisdiction: 'GA', legalIssueId: standingDefense.id, status: 'researching', verificationStatus: 'confirmed' } });
  await prisma.researchMemorandum.create({ data: { caseId: regions.id, title: 'Standing to enforce — GA', issuePresented: 'Whether plaintiff is entitled to enforce.', briefAnswer: 'Likely not without an unbroken assignment chain. (Demo.)', jurisdiction: 'GA', createdBy: 'user', verificationStatus: 'confirmed' } });

  // Strategy (several + one superseded), decisions (2), opposing, settlements (2), damages (3), remedies (2).
  const strat1 = await prisma.strategyItem.create({ data: { caseId: regions.id, recordType: 'objective', title: 'Defeat standing; preserve counterclaims', status: 'active', sourceType: 'user', verificationStatus: 'confirmed', assumptions: 'Assignment chain is broken. (Demo.)' } });
  const stratNew = await prisma.strategyItem.create({ data: { caseId: regions.id, recordType: 'next-move', title: 'File motion to compel on ROG 1 & 2', status: 'active', sourceType: 'user', verificationStatus: 'confirmed' } });
  await prisma.strategyItem.create({ data: { caseId: regions.id, recordType: 'leverage', title: 'Balance-mismatch contradiction', status: 'active', sourceType: 'user', verificationStatus: 'confirmed' } });
  const stratOld = await prisma.strategyItem.create({ data: { caseId: regions.id, recordType: 'next-move', title: 'Old plan: wait for responses', status: 'superseded', sourceType: 'user', verificationStatus: 'confirmed' } });
  await prisma.strategyItem.update({ where: { id: stratOld.id }, data: { supersededById: stratNew.id } });
  void strat1;

  await prisma.decisionLogEntry.createMany({ data: [
    { caseId: regions.id, title: 'File motion to dismiss', decision: 'Move to dismiss on standing grounds. (Demo.)', options: 'Answer only; MTD; both', selectedOption: 'MTD + answer', rationale: 'Standing is the strongest defense.', decidedBy: 'user' },
    { caseId: regions.id, title: 'Pursue counterclaims', decision: 'Assert GFBPA counterclaim. (Demo.)', rationale: 'Fee-shifting leverage.', decidedBy: 'user' },
  ] });
  await prisma.opposingPosition.create({ data: { caseId: regions.id, party: 'Regions Bank', issue: 'Standing', positionSummary: 'Claims it is the current holder. (Demo.)', weaknesses: 'No recorded assignment produced.', userResponse: 'Demand the assignment chain in discovery.', status: 'active', verificationStatus: 'confirmed' } });

  await prisma.settlementRecord.createMany({ data: [
    { caseId: regions.id, offerType: 'offer', direction: 'inbound', monetaryAmount: 5000, releaseScope: 'Full mutual release', confidentiality: 'settlement', status: 'open', offerDate: daysFromNow(-7), deadline: daysFromNow(10) },
    { caseId: regions.id, offerType: 'counteroffer', direction: 'outbound', monetaryAmount: 15000, releaseScope: 'Claims in this action only', confidentiality: 'settlement', status: 'open', offerDate: daysFromNow(-2) },
  ] });
  await prisma.damageItem.createMany({ data: [
    { caseId: regions.id, label: 'Improper fees charged', category: 'direct-economic', amount: 3200, calculationMethod: 'Sum of disputed fee line items', assumptions: 'All flagged fees improper. (Demo.)', verificationStatus: 'proposed' },
    { caseId: regions.id, label: 'Credit-report harm', category: 'credit-related', amount: 5000, calculationMethod: 'Estimated', assumptions: 'Adverse tradeline reported. (Demo.)', verificationStatus: 'proposed' },
    { caseId: regions.id, label: 'Attorney/filing costs', category: 'fees-expenses', amount: 800, verificationStatus: 'proposed' },
  ] });
  await prisma.remedy.createMany({ data: [
    { caseId: regions.id, remedyType: 'declaratory', description: 'Declaration that plaintiff lacks standing. (Demo.)', legalBasis: 'Standing doctrine', legalIssueId: standingDefense.id, status: 'requested' },
    { caseId: regions.id, remedyType: 'credit-correction', description: 'Correct the credit report. (Demo.)', legalBasis: 'GFBPA/FCRA', legalIssueId: gfbpaClaim.id, status: 'requested' },
  ] });

  // ---------------------- Phase 4 demo data (Regions) ----------------------
  // Saved searches + smart collection.
  await prisma.savedSearch.createMany({ data: [
    { caseId: regions.id, title: 'Unverified authorities', scope: 'case', query: 'unverified', isSmartCollection: true, pinned: true, lastRunAt: new Date() },
    { caseId: regions.id, title: 'Documents mentioning balance', scope: 'case', query: 'balance', lastRunAt: new Date() },
    { caseId: null, title: 'Filings due soon (all cases)', scope: 'global', query: 'motion', isSmartCollection: true, notify: true, lastRunAt: new Date() },
  ] });

  // Search index entries (searchable text + a page-level filing result).
  await prisma.searchIndexEntry.createMany({ data: [
    { caseId: regions.id, recordType: 'document', recordId: answerDoc.id, title: 'Answer and Counterclaims', body: 'answer denying allegations counterclaims balance $128,400 arbitration waiver', createdBy: 'user', verificationStatus: 'confirmed' },
    { caseId: regions.id, recordType: 'document', recordId: verifDoc.id, title: 'Unclassified Scan', body: 'assignment chain ledger balance $131,050', createdBy: 'user', verificationStatus: 'proposed' },
    { caseId: regions.id, recordType: 'filing', recordId: motion.id, title: 'Motion to Dismiss (draft p.1)', body: 'DRAFT Motion to Dismiss statement of facts standing to enforce the note', page: 1, confidentiality: 'public' },
  ] });

  // Exhibit set with items + page ranges + a Bates derivative.
  const exSet = await prisma.exhibitSet.create({ data: { caseId: regions.id, title: 'MTD Hearing Exhibits', kind: 'hearing', numberingStyle: 'alpha', status: 'draft' } });
  await prisma.exhibitItem.createMany({ data: [
    { exhibitSetId: exSet.id, documentId: answerDoc.id, exhibitNumber: 'A', title: 'Answer and Counterclaims', pageRange: '1-8', authenticationStatus: 'authenticated', redactionStatus: 'no-redaction-needed' },
    { exhibitSetId: exSet.id, documentId: verifDoc.id, exhibitNumber: 'B', title: 'Assignment records', pageRange: '1-3', authenticationStatus: 'needs-authentication', redactionStatus: 'potential-redaction' },
  ] });
  const batesDerivative = await prisma.document.create({ data: { caseId: regions.id, originalName: 'answer_and_counterclaims_final.pdf', standardizedName: '2026-05-12_Regions_Answer_Bates_REGIONS-0001-REGIONS-0008.pdf', title: 'Answer and Counterclaims (Bates REGIONS-0001–REGIONS-0008)', sourceLabel: 'bates-derivative', verificationStatus: 'confirmed', reviewStatus: 'reviewed' } });
  await prisma.batesJob.create({ data: { caseId: regions.id, prefix: 'REGIONS-', startNumber: 1, digitCount: 4, totalPages: 8, firstNumber: 'REGIONS-0001', lastNumber: 'REGIONS-0008', derivativeDocumentId: batesDerivative.id, status: 'completed' } });

  // Hearing binder with a section item referencing a missing file (validation warning).
  const binder = await prisma.binder.create({ data: { caseId: regions.id, title: 'MTD Hearing Binder', kind: 'hearing', batesEnabled: true, sections: { create: [{ title: 'Pleadings', order: 0 }, { title: 'Exhibits', order: 1 }, { title: 'Authorities', order: 2 }] } }, include: { sections: true } });
  await prisma.binderItem.create({ data: { sectionId: binder.sections[0]!.id, label: 'Answer and Counterclaims', documentId: answerDoc.id, order: 0 } });
  await prisma.binderItem.create({ data: { sectionId: binder.sections[1]!.id, label: 'Exhibit B (no stored file — demo warning)', documentId: verifDoc.id, order: 0 } });

  // Calendar: connect (mock) + sync the confirmed deadline; leave the unverified one unsynced.
  await prisma.calendarConnection.create({ data: { provider: 'apple', status: 'mocked', isDefault: true, syncMode: 'confirmed-auto' } });
  const confirmedDeadline = await prisma.deadline.findFirst({ where: { caseId: regions.id, verificationStatus: 'confirmed' } });
  if (confirmedDeadline) await prisma.calendarEventLink.create({ data: { deadlineId: confirmedDeadline.id, provider: 'apple', externalId: 'mock-hearing-1', status: 'synced' } });

  // Notifications: prefs + reminders + a digest.
  await prisma.notificationPreference.create({ data: { scope: 'global', channels: JSON.stringify({ dashboard: true, email: true, push: false, digestDaily: true, digestWeekly: false }), schedule: JSON.stringify([30, 14, 7, 3, 1, 0]) } });
  await prisma.notification.createMany({ data: [
    { caseId: regions.id, notifKey: 'reminder:mtd:3', title: 'Response to Motion to Dismiss — due in 3d', body: 'Confirmed deadline', priority: 'high', relatedType: 'deadline', sentAt: new Date() },
    { caseId: regions.id, notifKey: 'filing:rejected:1', title: 'Filing rejected by clerk (demo)', body: 'Correction required', priority: 'critical', status: 'unread', sentAt: new Date() },
  ] });
  await prisma.notificationDigest.create({ data: { period: 'daily', content: JSON.stringify({ period: 'daily', openDeadlines: 3, openDeficiencies: 2, unverifiedAuthorities: 1, generatedAt: new Date().toISOString() }) } });

  // Backups: one successful+verified, one failed. Restore preview. Full export + confidential export.
  const goodBackup = await prisma.backup.create({ data: { type: 'full', status: 'completed', sizeBytes: 40960, location: 'local://backups', encrypted: true, checksum: 'demo-checksum-abc123', completedAt: new Date(), verifiedAt: new Date(), restoreTestStatus: 'passed' } });
  await prisma.backup.create({ data: { type: 'database', status: 'failed', encrypted: true, error: 'Storage unavailable (demo)' } });
  await prisma.restorePreview.create({ data: { backupId: goodBackup.id, summary: JSON.stringify({ backupId: goodBackup.id, wouldRestore: 'full', note: 'Simulated preview.' }) } });
  await prisma.caseExport.create({ data: { caseId: regions.id, scope: 'external-sharing', status: 'completed', includesConfidential: false, manifest: JSON.stringify({ scope: 'external-sharing', note: 'Excludes strategy/privileged.' }) } });

  // Trash: one soft-deleted document (recoverable).
  const trashedDoc = await prisma.document.create({ data: { caseId: regions.id, originalName: 'superseded_draft.pdf', standardizedName: '2026-04-01_Regions_Superseded-Draft.pdf', title: 'Superseded draft', sourceLabel: 'upload', deletedAt: new Date() } });
  void trashedDoc;

  // Security events (incl. suspicious upload + diagnostic failure) + a session.
  await prisma.securityEvent.createMany({ data: [
    { type: 'login', detail: 'Dev-mode sign-in', device: 'Mac', ip: 'local' },
    { type: 'backup-created', detail: 'type=full', ip: 'local' },
    { type: 'suspicious-upload', detail: 'File signature mismatch — quarantined (demo)', ip: 'local' },
    { type: 'authorization-failure', detail: 'Blocked cross-case link attempt (demo)', ip: 'local' },
  ] });
  await prisma.appSession.create({ data: { userId: user.id, device: 'Mac · Safari', ip: 'local', lastActiveAt: new Date() } });

  // Background jobs (incl. one failed) + selected folder mock.
  await prisma.backgroundJob.createMany({ data: [
    { type: 'indexing', status: 'completed', progress: 100, completedAt: new Date() },
    { type: 'integration-sync', status: 'failed', error: 'Google Calendar token expired (demo)', attempts: 2 },
  ] });
  await prisma.selectedFolder.create({ data: { provider: 'icloud', path: '~/Library/Mobile Documents/com~apple~CloudDocs/Litigation/Regions', status: 'mock' } });

  // ---------------------- Phase 5 demo data (Regions) ----------------------
  await prisma.caseReview.create({ data: { caseId: regions.id, version: 1, status: 'complete', provider: 'mock', summary: '2 legal issues, 6 evidence items, 1 unsupported element, 2 open deficiencies, 2 items needing verification.', sections: JSON.stringify([
    { key: 'status', title: 'Executive Case Status', findings: [{ text: 'Regions Bank v. [DEMO Defendant] — 25CV-DEMO-0783 (Superior Court of Forsyth County). (Demo.)', sourceType: 'confirmed-fact', sourceRefs: [], verificationStatus: 'confirmed' }] },
    { key: 'risks', title: 'Procedural Risks', findings: [{ text: '1 unconfirmed/calculated deadline — confirm before relying on it.', sourceType: 'ai-inference', sourceRefs: [], verificationStatus: 'unverified' }] },
  ]) } });

  const docketSource = await prisma.docketSource.create({ data: { caseId: regions.id, sourceType: 'docket-sheet', retrievalMethod: 'upload', documentId: answerDoc.id, reliability: 'user-entered', verificationStatus: 'proposed' } });
  await prisma.docketEntry.createMany({ data: [
    { caseId: regions.id, entryNumber: '1', title: 'Complaint filed', filingParty: 'Plaintiff', sourceId: docketSource.id, reviewStatus: 'reviewed', verificationStatus: 'confirmed', createdBy: 'user', filingDate: new Date(Date.UTC(2026, 3, 2)) },
    { caseId: regions.id, entryNumber: '7', title: 'Order setting hearing', deadlineImplication: 'Hearing date — CONFIRM', sourceId: docketSource.id, reviewStatus: 'pending', verificationStatus: 'proposed', createdBy: 'ai' },
  ] });
  await prisma.docketMonitor.create({ data: { caseId: regions.id, provider: 'manual', schedule: 'weekdays', status: 'manual-only' } });

  await prisma.companionDevice.create({ data: { userId: user.id, deviceName: 'Chris’s MacBook Pro', platform: 'mac', tokenHash: 'demo-hash', registeredAt: new Date(), lastActiveAt: new Date(), permittedFolders: JSON.stringify([{ path: '~/…/CloudDocs/Litigation/Regions', caseId: regions.id, mode: 'review-first' }]) } });
  await prisma.caseAiSetting.create({ data: { caseId: regions.id, mode: 'manual', allowConfidential: false, providerAllowlist: JSON.stringify(['claude', 'openai']) } });
  await prisma.providerUsage.createMany({ data: [
    { caseId: regions.id, provider: 'mock', task: 'case-review', status: 'completed' },
    { caseId: regions.id, provider: 'mock', task: 'draft-section', status: 'completed' },
  ] });

  // ============================ CASE 2: Federal / PACER ============================
  const ndga = await prisma.court.create({
    data: {
      name: 'U.S. District Court, Northern District of Georgia',
      system: 'federal', division: 'Atlanta Division', state: 'GA',
    },
  });
  const judgeFed = await prisma.judge.create({
    data: { name: 'Hon. [DEMO] U.S. District Judge', title: 'U.S. District Judge', courtId: ndga.id },
  });

  const federal = await prisma.case.create({
    data: {
      userId: user.id,
      shortName: 'Federal-Mortgage',
      caption: 'Case Owner v. [DEMO] Mortgage Servicer, LLC',
      captionShort: 'Owner v. Mortgage Servicer',
      caseNumber: '1:26-cv-DEMO',
      caseType: 'consumer',
      forum: 'federal',
      courtId: ndga.id,
      judgeId: judgeFed.id,
      portal: {
        create: { kind: 'pacer', label: 'Open in PACER', url: 'https://pcl.uscourts.gov/' },
      },
      parties: {
        create: [
          { name: 'Case Owner (self-represented)', role: 'plaintiff', isSelf: true },
          { name: '[DEMO] Mortgage Servicer, LLC', role: 'defendant' },
        ],
      },
    },
  });

  await prisma.document.create({
    data: {
      caseId: federal.id,
      originalName: 'reply_in_support_of_remand.pdf',
      standardizedName: generateStandardizedName({
        date: new Date(Date.UTC(2026, 4, 26)), caseShortName: 'Federal-Mortgage',
        title: 'Reply in Support of Remand', party: 'Plaintiffs', status: 'Filed', ext: 'pdf',
      }),
      title: 'Reply in Support of Remand',
      docType: 'Reply', category: 'filed', docDate: new Date(Date.UTC(2026, 4, 26)),
      party: 'Plaintiffs', docStatus: 'filed',
      mimeType: 'application/pdf', sizeBytes: 96_500,
      confidence: 0.8, verificationStatus: 'confirmed', reviewStatus: 'reviewed',
      sourceLabel: 'upload',
    },
  });
  await prisma.deadline.create({
    data: {
      caseId: federal.id, title: 'Ruling on Motion to Remand (watch)',
      source: 'manual', dueDate: daysFromNow(35), verificationStatus: 'confirmed', isMilestone: true,
    },
  });
  await prisma.timelineEvent.createMany({
    data: [
      { caseId: federal.id, date: new Date(Date.UTC(2026, 3, 20)), title: 'Notice of Removal filed', eventType: 'filing', verificationStatus: 'confirmed' },
      { caseId: federal.id, date: new Date(Date.UTC(2026, 4, 26)), title: 'Reply in Support of Remand filed', eventType: 'filing', verificationStatus: 'confirmed' },
    ],
  });

  await prisma.auditLog.create({
    data: { userId: user.id, action: 'seed', detail: 'Seeded 2 demonstration cases.' },
  });

  const commercial = await seedCommercial(prisma);
  console.log(`Commercial catalog seeded: ${commercial.plans} plans, ${commercial.prices} prices, ${commercial.addOns} add-ons, ${commercial.actions} AI actions.`);

  console.log('Seed complete: 2 demo cases (Regions / PeachCourt, Federal-Mortgage / PACER).');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
