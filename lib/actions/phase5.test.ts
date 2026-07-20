import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';

vi.mock('next/cache', () => ({ revalidatePath: () => {} }));

import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth/session';
import {
  generateCaseReview, createDocketEntry, importDocketSheet, setDocketMonitor,
  createDeviceCode, revokeDevice, enroll2FA, setCaseAiMode,
} from '@/lib/actions/phase5';

let caseId: string;
let otherCaseId: string;

beforeAll(async () => {
  const user = await getCurrentUser();
  const c = await prisma.case.create({ data: { userId: user.id, shortName: 'P5', caption: 'P5 v P5', caseNumber: 'P5-1', forum: 'state' } });
  caseId = c.id;
  // Give it a legal issue + element with no supporting evidence (a gap the review should flag).
  const li = await prisma.legalIssue.create({ data: { caseId, title: 'Standing', issueType: 'defense' } });
  await prisma.legalIssueElement.create({ data: { legalIssueId: li.id, number: 1, title: 'Holder of note', status: 'unsupported' } });
  await prisma.authority.create({ data: { caseId, citation: 'X v Y', verificationStatus: 'unverified' } });
  const other = await prisma.user.create({ data: { email: `p5-other-${Date.now()}@t.local` } });
  const oc = await prisma.case.create({ data: { userId: other.id, shortName: 'OTH', caption: 'Oth', caseNumber: 'O-1', forum: 'state' } });
  otherCaseId = oc.id;
});

afterAll(async () => {
  await prisma.case.deleteMany({ where: { id: { in: [caseId, otherCaseId] } } });
  await prisma.$disconnect();
});

describe('advanced case review', () => {
  it('generates a versioned, source-linked review flagging element gaps', async () => {
    const r1 = await generateCaseReview(caseId);
    const r2 = await generateCaseReview(caseId);
    expect(r2.version).toBe(r1.version + 1); // versioned, never overwrites
    const review = await prisma.caseReview.findUnique({ where: { id: r2.id } });
    const sections = JSON.parse(review!.sections);
    const elementSection = sections.find((s: any) => s.key === 'elements');
    expect(JSON.stringify(elementSection)).toMatch(/UNSUPPORTED/);
    // provider usage recorded
    expect(await prisma.providerUsage.count({ where: { caseId, task: 'case-review' } })).toBeGreaterThanOrEqual(2);
  });
});

describe('docket monitoring', () => {
  it('prevents duplicate docket entries', async () => {
    await createDocketEntry(caseId, { title: 'Complaint', entryNumber: '1', documentNumber: 'D1' });
    await expect(createDocketEntry(caseId, { title: 'Dup', entryNumber: '1', documentNumber: 'D1' })).rejects.toThrow(/already exists/);
  });

  it('import routes proposals to the verification queue', async () => {
    const before = await prisma.reviewQueueItem.count({ where: { caseId, kind: 'docket-entry', status: 'pending' } });
    const res = await importDocketSheet(caseId, null);
    expect(res.proposed).toBeGreaterThan(0);
    expect(await prisma.reviewQueueItem.count({ where: { caseId, kind: 'docket-entry', status: 'pending' } })).toBe(before + res.proposed);
  });

  it('non-manual monitor providers are unavailable (not falsely active)', async () => {
    const manual = await setDocketMonitor(caseId, 'manual', 'weekdays');
    expect(manual.status).toBe('manual-only');
    const pacer = await setDocketMonitor(caseId, 'pacer-external', 'daily');
    expect(pacer.status).toBe('unavailable');
  });
});

describe('companion + security', () => {
  it('issues a one-time code and revokes a device', async () => {
    const { code } = await createDeviceCode();
    expect(code).toHaveLength(8);
    const reg = await prisma.deviceRegistrationCode.findUnique({ where: { code } });
    expect(reg?.used).toBe(false);
    const user = await getCurrentUser();
    const device = await prisma.companionDevice.create({ data: { userId: user.id, deviceName: 'Test Mac', tokenHash: 'h' } });
    await revokeDevice(device.id);
    expect((await prisma.companionDevice.findUnique({ where: { id: device.id } }))?.revokedAt).not.toBeNull();
  });

  it('enrolls 2FA returning one-time recovery codes; secret stays server-side', async () => {
    const { recoveryCodes } = await enroll2FA();
    expect(recoveryCodes).toHaveLength(8);
    const user = await getCurrentUser();
    const tfa = await prisma.twoFactorSecret.findUnique({ where: { userId: user.id } });
    expect(tfa?.secret).toBeTruthy(); // stored server-side, never returned in an API to the client
    // recovery codes are stored HASHED, not plaintext
    const stored = JSON.parse(tfa!.recoveryCodes!);
    expect(stored).not.toContain(recoveryCodes[0]);
  });
});

describe('ai privacy + authorization', () => {
  it('sets a conservative case AI mode', async () => {
    await setCaseAiMode(caseId, 'disabled', false, ['claude']);
    const s = await prisma.caseAiSetting.findUnique({ where: { caseId } });
    expect(s?.mode).toBe('disabled');
    expect(s?.allowConfidential).toBe(false);
  });

  it('rejects case review / docket on an unauthorized case', async () => {
    await expect(generateCaseReview(otherCaseId)).rejects.toThrow(/not authorized|not found/i);
    await expect(createDocketEntry(otherCaseId, { title: 'x' })).rejects.toThrow(/not authorized|not found/i);
  });
});
