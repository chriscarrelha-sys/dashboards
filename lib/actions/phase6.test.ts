import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';

vi.mock('next/cache', () => ({ revalidatePath: () => {} }));

import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth/session';
import {
  logLaunchCheck, upsertBlocker, setBlockerStatus, openLaunchBlockerCount,
  startMigrationBatch, recordInventory, rollbackBatch,
} from '@/lib/actions/phase6';

let caseId: string;
let otherCaseId: string;

beforeAll(async () => {
  const user = await getCurrentUser();
  const c = await prisma.case.create({ data: { userId: user.id, shortName: 'P6', caption: 'P6 v P6', caseNumber: 'P6-1', forum: 'state' } });
  caseId = c.id;
  const other = await prisma.user.create({ data: { email: `p6-other-${Date.now()}@t.local` } });
  const oc = await prisma.case.create({ data: { userId: other.id, shortName: 'OTH6', caption: 'Oth', caseNumber: 'O6-1', forum: 'state' } });
  otherCaseId = oc.id;
});

afterAll(async () => {
  await prisma.case.deleteMany({ where: { id: { in: [caseId, otherCaseId] } } });
  await prisma.$disconnect();
});

describe('launch readiness log', () => {
  it('persists a launch-check run', async () => {
    const res = await logLaunchCheck({
      overall: 'warning', environment: 'development', appVersion: '0.1.0', schemaVersion: 'phase6',
      counts: { pass: 9, warning: 14, failure: 0, skipped: 0 },
      checks: [{ key: 'x', label: 'x', level: 'pass', detail: 'ok' }],
      acknowledgedWarnings: ['calendar-config'],
    });
    expect(res.overall).toBe('warning');
    const row = await prisma.launchCheckRun.findUnique({ where: { id: res.id } });
    expect(row?.warnCount).toBe(14);
    expect(JSON.parse(row!.acknowledgedWarnings!)).toContain('calendar-config');
  });
});

describe('production blocker register', () => {
  it('creates, resolves, and gates on open launch-blockers', async () => {
    const before = await openLaunchBlockerCount();
    const { id } = await upsertBlocker({
      title: 'Encryption at rest not enabled', subsystem: 'security',
      description: 'Managed DB + storage encryption must be on before real case data.',
      severity: 'launch-blocker',
    });
    expect(await openLaunchBlockerCount()).toBe(before + 1);
    await setBlockerStatus(id, 'resolved');
    expect(await openLaunchBlockerCount()).toBe(before);
    const row = await prisma.productionBlocker.findUnique({ where: { id } });
    expect(row?.status).toBe('resolved');
    expect(row?.resolvedAt).not.toBeNull();
    await prisma.productionBlocker.delete({ where: { id } });
  });
});

describe('real-case migration (controlled, reversible)', () => {
  it('refuses a non-dry-run import without a pre-migration backup reference', async () => {
    await expect(startMigrationBatch(caseId, { label: 'Pilot', mode: 'pilot' }))
      .rejects.toThrow(/backup reference is required/i);
  });

  it('records an inventory and rolls back only app records, preserving inventory + source + audit', async () => {
    const { id: batchId } = await startMigrationBatch(caseId, { label: 'Dry run', mode: 'dry-run' });
    const inv = await recordInventory(batchId, [
      { fileName: 'Complaint.pdf', hash: 'h1', likelyType: 'pleading', likelyDate: '2024-01-02', classification: 'routine', confidence: 0.6 },
      { fileName: 'Complaint copy.pdf', hash: 'h1', classification: 'duplicate', confidence: 0.95 },
      { fileName: 'mystery.bin', hash: 'h2', classification: 'needs-review', confidence: 0.4 },
    ]);
    expect(inv.count).toBe(3);
    expect(inv.duplicates).toBe(1);

    const batch = await prisma.migrationBatch.findUnique({ where: { id: batchId } });
    expect(batch?.status).toBe('inventoried');
    expect(batch?.totalFiles).toBe(3);

    // Simulate a real import having created a Document + index entry, tracked for rollback.
    const doc = await prisma.document.create({ data: { caseId, standardizedName: 'Complaint.pdf', originalName: 'Complaint.pdf', title: 'Complaint', storageKey: 'k1', sha256: 'h1', mimeType: 'application/pdf', sizeBytes: 10 } });
    const idx = await prisma.searchIndexEntry.create({ data: { caseId, recordType: 'document', recordId: doc.id, title: 'Complaint', body: 'text' } });
    const anItem = await prisma.migrationItem.findFirst({ where: { batchId, fileName: 'Complaint.pdf' } });
    await prisma.migrationItem.update({ where: { id: anItem!.id }, data: { migrationStatus: 'imported', createdRecords: JSON.stringify({ documentId: doc.id, indexIds: [idx.id] }) } });

    const auditBefore = await prisma.auditLog.count({});
    const roll = await rollbackBatch(batchId);
    expect(roll.removedDocuments).toBe(1);

    // App record gone; inventory row and source path preserved; audit history not reduced.
    expect(await prisma.document.findUnique({ where: { id: doc.id } })).toBeNull();
    expect(await prisma.searchIndexEntry.findUnique({ where: { id: idx.id } })).toBeNull();
    expect(await prisma.migrationItem.count({ where: { batchId } })).toBe(3); // inventory preserved
    const rolledItem = await prisma.migrationItem.findUnique({ where: { id: anItem!.id } });
    expect(rolledItem?.migrationStatus).toBe('rolled-back');
    expect(await prisma.auditLog.count({})).toBeGreaterThanOrEqual(auditBefore); // audit only grows
    const rolledBatch = await prisma.migrationBatch.findUnique({ where: { id: batchId } });
    expect(rolledBatch?.status).toBe('rolled-back');
  });

  it('rejects starting a batch on an unauthorized case', async () => {
    await expect(startMigrationBatch(otherCaseId, { label: 'x', mode: 'dry-run' }))
      .rejects.toThrow(/not authorized|not found/i);
  });
});
