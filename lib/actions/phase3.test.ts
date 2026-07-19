import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';

vi.mock('next/cache', () => ({ revalidatePath: () => {} }));

import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth/session';
import {
  createFiling, advanceFilingStage, addFilingVersion, markVersionFinal, setChecklistItem,
  generateCertificate, recordServiceEvent, createCommunication, communicationFollowUp,
} from '@/lib/actions/phase3';
import {
  createAuthority, verifyAuthority, createStrategyItem, supersedeStrategyItem,
  createDecision, supersedeDecision, createSettlement,
} from '@/lib/actions/phase3b';

let caseId: string;
let otherCaseId: string;

beforeAll(async () => {
  const user = await getCurrentUser();
  const c = await prisma.case.create({ data: { userId: user.id, shortName: 'P3', caption: 'P3 v. P3', caseNumber: 'P3-1', forum: 'state' } });
  caseId = c.id;
  const other = await prisma.user.create({ data: { email: `p3-other-${Date.now()}@t.local` } });
  const oc = await prisma.case.create({ data: { userId: other.id, shortName: 'OTH', caption: 'Oth', caseNumber: 'O-1', forum: 'state' } });
  otherCaseId = oc.id;
});

afterAll(async () => {
  await prisma.case.deleteMany({ where: { id: { in: [caseId, otherCaseId] } } });
  await prisma.$disconnect();
});

describe('filings', () => {
  it('creates a filing with a seeded checklist and stage history', async () => {
    const { id } = await createFiling(caseId, { title: 'Motion', filingType: 'motion' });
    const f = await prisma.filing.findUnique({ where: { id }, include: { checklistItems: true, stageHistory: true } });
    expect(f?.stage).toBe('planned');
    expect(f!.checklistItems.length).toBeGreaterThan(5);
    expect(f!.stageHistory.length).toBe(1);
  });

  it('transitions stage and rejects an invalid stage', async () => {
    const { id } = await createFiling(caseId, { title: 'Brief' });
    await advanceFilingStage(caseId, id, 'initial-draft');
    const f = await prisma.filing.findUnique({ where: { id }, include: { stageHistory: true } });
    expect(f?.stage).toBe('initial-draft');
    expect(f!.stageHistory.length).toBe(2);
    await expect(advanceFilingStage(caseId, id, 'not-a-real-stage')).rejects.toThrow(/Invalid stage/);
  });

  it('preserves earlier versions and only marks one final', async () => {
    const { id } = await createFiling(caseId, { title: 'Reply' });
    const v1 = await addFilingVersion(caseId, id, { label: 'initial-draft', contentText: 'a' });
    const v2 = await addFilingVersion(caseId, id, { label: 'revised-draft', contentText: 'b' });
    await markVersionFinal(caseId, id, v2.id);
    const versions = await prisma.filingVersion.findMany({ where: { filingId: id }, orderBy: { versionNumber: 'asc' } });
    expect(versions.map((v) => v.versionNumber)).toEqual([1, 2]);
    expect(versions[0]!.contentText).toBe('a'); // earlier version untouched
    expect(versions.find((v) => v.id === v2.id)!.approvalStatus).toBe('final-for-filing');
    expect(v1.id).toBeTruthy();
  });

  it('logs a checklist waiver as an override in the audit log', async () => {
    const { id } = await createFiling(caseId, { title: 'Notice' });
    const item = await prisma.filingChecklistItem.findFirst({ where: { filingId: id } });
    const before = await prisma.auditLog.count({ where: { action: 'filing.checklist.override' } });
    await setChecklistItem(caseId, item!.id, 'waived', 'Not applicable to this filing');
    expect(await prisma.auditLog.count({ where: { action: 'filing.checklist.override' } })).toBe(before + 1);
  });

  it('generates a certificate of service', async () => {
    const { id } = await createFiling(caseId, { title: 'MSJ' });
    const { id: certId } = await generateCertificate(caseId, id, { method: 'efile', recipientsText: 'Opposing counsel' });
    const cert = await prisma.certificateOfService.findUnique({ where: { id: certId } });
    expect(cert?.statementText).toContain('efile');
    expect(cert?.verificationStatus).toBe('proposed'); // must be reviewed before final
  });

  it('records multiple service events for one filing', async () => {
    const { id } = await createFiling(caseId, { title: 'Served filing' });
    await recordServiceEvent(caseId, { filingId: id, recipientName: 'A' });
    await recordServiceEvent(caseId, { filingId: id, recipientName: 'B' });
    expect(await prisma.serviceEvent.count({ where: { filingId: id } })).toBe(2);
  });
});

describe('communications', () => {
  it('creates a follow-up task from a communication', async () => {
    const { id } = await createCommunication(caseId, { kind: 'email', subject: 'Q' });
    const { taskId } = await communicationFollowUp(caseId, id, 'Reply to Q');
    const t = await prisma.task.findUnique({ where: { id: taskId } });
    expect(t?.title).toBe('Reply to Q');
  });
});

describe('research', () => {
  it('promotes authority status through a verification step', async () => {
    const { id } = await createAuthority(caseId, { citation: 'X v. Y, 1 Ga. 1 (2020)' });
    let a = await prisma.authority.findUnique({ where: { id } });
    expect(a?.verificationStatus).toBe('unverified');
    await verifyAuthority(caseId, id, 'exists', 'confirmed');
    a = await prisma.authority.findUnique({ where: { id } });
    expect(a?.verificationStatus).toBe('source-located');
  });
});

describe('strategy & decisions', () => {
  it('supersedes a strategy item while preserving the original', async () => {
    const { id: oldId } = await createStrategyItem(caseId, { recordType: 'next-move', title: 'Old plan' });
    const { id: newId } = await supersedeStrategyItem(caseId, oldId, { title: 'New plan' });
    const old = await prisma.strategyItem.findUnique({ where: { id: oldId } });
    expect(old?.status).toBe('superseded');
    expect(old?.supersededById).toBe(newId);
    expect(await prisma.strategyItem.findUnique({ where: { id: newId } })).toBeTruthy();
  });

  it('supersedes a decision without editing the original substance', async () => {
    const { id: oldId } = await createDecision(caseId, { title: 'D1', decision: 'Do X' });
    const { id: newId } = await supersedeDecision(caseId, oldId, { title: 'D2', decision: 'Do Y' });
    const old = await prisma.decisionLogEntry.findUnique({ where: { id: oldId } });
    expect(old?.decision).toBe('Do X'); // substance unchanged
    expect(old?.supersededById).toBe(newId);
  });
});

describe('settlement & authorization', () => {
  it('tracks a settlement offer', async () => {
    const { id } = await createSettlement(caseId, { offerType: 'offer', monetaryAmount: 5000 });
    const s = await prisma.settlementRecord.findUnique({ where: { id } });
    expect(s?.monetaryAmount).toBe(5000);
  });

  it('rejects an unauthorized case id', async () => {
    await expect(createFiling(otherCaseId, { title: 'nope' })).rejects.toThrow(/not authorized|not found/i);
  });
});
