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
  await prisma.document.create({
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
