/**
 * Seed data — clearly-marked DEMONSTRATION cases (fictitious).
 * Provides one Georgia state-court matter (PeachCourt) and one federal matter
 * (PACER), plus enough related records to exercise the vertical slice.
 */
import { PrismaClient } from '@prisma/client';
import { generateStandardizedName } from '../lib/documents/filename';

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
