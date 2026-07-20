import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';

vi.mock('next/cache', () => ({ revalidatePath: () => {} }));

import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth/session';
import { reindexCase } from '@/lib/search/indexer';
import {
  runSearch, saveSearch, createExhibitSet, addExhibitItem, runBates, createBinder, validateBinder,
  syncDeadline, generateReminders, createBackup, verifyBackup, restorePreview, createCaseExport,
  softDelete, restoreItem, purgeItem,
} from '@/lib/actions/phase4';

let caseA: string;
let caseB: string;
let otherCaseId: string;
let docA: string;

beforeAll(async () => {
  const user = await getCurrentUser();
  const a = await prisma.case.create({ data: { userId: user.id, shortName: 'P4A', caption: 'A v A', caseNumber: 'P4A-1', forum: 'state' } });
  const b = await prisma.case.create({ data: { userId: user.id, shortName: 'P4B', caption: 'B v B', caseNumber: 'P4B-1', forum: 'state' } });
  caseA = a.id; caseB = b.id;
  const d = await prisma.document.create({ data: { caseId: caseA, originalName: 'zebra.pdf', standardizedName: 'zebra.pdf', title: 'Zebra arbitration memo', aiSummary: 'discusses arbitration waiver zebra', sourceLabel: 'upload' } });
  docA = d.id;
  await prisma.document.create({ data: { caseId: caseB, originalName: 'other.pdf', standardizedName: 'other.pdf', title: 'Giraffe unrelated', sourceLabel: 'upload' } });
  await reindexCase(caseA);
  await reindexCase(caseB);

  const other = await prisma.user.create({ data: { email: `p4-other-${Date.now()}@t.local` } });
  const oc = await prisma.case.create({ data: { userId: other.id, shortName: 'OTH', caption: 'Oth', caseNumber: 'O-1', forum: 'state' } });
  otherCaseId = oc.id;
});

afterAll(async () => {
  await prisma.case.deleteMany({ where: { id: { in: [caseA, caseB, otherCaseId] } } });
  await prisma.$disconnect();
});

describe('search', () => {
  it('case-scoped search does not leak other cases', async () => {
    const hits = await runSearch('zebra', 'case', caseA);
    expect(hits.length).toBeGreaterThan(0);
    expect(hits.every((h) => h.caseId === caseA)).toBe(true);
  });

  it('exact term search finds the document', async () => {
    const hits = await runSearch('arbitration', 'case', caseA);
    expect(hits.some((h) => h.recordType === 'document' && h.title.includes('Zebra'))).toBe(true);
  });

  it('persists a saved search', async () => {
    const { id } = await saveSearch(caseA, { title: 'Arbitration', query: 'arbitration', scope: 'case' });
    expect(await prisma.savedSearch.findUnique({ where: { id } })).toBeTruthy();
  });
});

describe('exhibits & bates', () => {
  it('creates an exhibit from a page range and prevents duplicate numbers', async () => {
    const { id: setId } = await createExhibitSet(caseA, { title: 'Set' });
    await addExhibitItem(caseA, setId, { documentId: docA, pageRange: '1-3', exhibitNumber: 'A' });
    await expect(addExhibitItem(caseA, setId, { documentId: docA, exhibitNumber: 'A' })).rejects.toThrow(/already used/);
    // allowDuplicate bypasses with a warning
    const dup = await addExhibitItem(caseA, setId, { documentId: docA, exhibitNumber: 'A', allowDuplicate: true });
    expect(dup.id).toBeTruthy();
  });

  it('Bates numbering creates a derivative and never alters the source', async () => {
    const before = await prisma.document.findUnique({ where: { id: docA } });
    const res = await runBates(caseA, { prefix: 'REG-', startNumber: 1, digitCount: 4, documentId: docA, totalPages: 5 });
    expect(res.firstNumber).toBe('REG-0001');
    expect(res.lastNumber).toBe('REG-0005');
    const after = await prisma.document.findUnique({ where: { id: docA } });
    expect(after?.standardizedName).toBe(before?.standardizedName); // source untouched
    const derivative = await prisma.document.findUnique({ where: { id: res.derivativeId! } });
    expect(derivative?.sourceLabel).toBe('bates-derivative');
  });
});

describe('binders', () => {
  it('seeds sections and validates source files (no-stored-file warning)', async () => {
    const { id } = await createBinder(caseA, { title: 'Binder' });
    const binder = await prisma.binder.findUnique({ where: { id }, include: { sections: true } });
    expect(binder!.sections.length).toBeGreaterThan(0);
    // docA has no storageKey → a validation warning (demo metadata), not a blocker.
    await prisma.binderItem.create({ data: { sectionId: binder!.sections[0]!.id, label: 'Item', documentId: docA } });
    const v = await validateBinder(caseA, id);
    expect(v.warnings.some((w) => /no stored file/i.test(w))).toBe(true);
    expect(v.canExport).toBe(true); // warnings don't block; missing FK would
  });
});

describe('calendar & notifications', () => {
  it('only confirmed deadlines can sync; unverified are blocked', async () => {
    const unverified = await prisma.deadline.create({ data: { caseId: caseA, title: 'Calc deadline', source: 'calculated', verificationStatus: 'unverified', dueDate: new Date() } });
    await expect(syncDeadline(caseA, unverified.id)).rejects.toThrow(/confirmed/);
    const confirmed = await prisma.deadline.create({ data: { caseId: caseA, title: 'Hearing', source: 'manual', verificationStatus: 'confirmed', dueDate: new Date() } });
    const r1 = await syncDeadline(caseA, confirmed.id);
    const r2 = await syncDeadline(caseA, confirmed.id);
    expect(r2.alreadySynced).toBe(true); // idempotent, no duplicate
    expect(r1.id).toBeTruthy();
  });

  it('deduplicates reminders', async () => {
    const soon = new Date(); soon.setDate(soon.getDate() + 7);
    await prisma.deadline.create({ data: { caseId: caseA, title: 'Due in 7', source: 'manual', verificationStatus: 'confirmed', dueDate: soon } });
    const first = await generateReminders(caseA);
    const second = await generateReminders(caseA);
    expect(first.created).toBeGreaterThanOrEqual(1);
    expect(second.created).toBe(0); // deduped
  });
});

describe('backup, export, trash, security', () => {
  it('creates and verifies a backup', async () => {
    const { id } = await createBackup('manual');
    const v = await verifyBackup(id);
    expect(v.verified).toBe(true);
    const preview = await restorePreview(id);
    expect(preview.note).toContain('Simulated');
  });

  it('exports a case with confidentiality excluded by default', async () => {
    const { id } = await createCaseExport(caseA, 'external-sharing', false);
    const exp = await prisma.caseExport.findUnique({ where: { id } });
    expect(exp?.includesConfidential).toBe(false);
  });

  it('soft-deletes and restores a record; purge requires confirmation', async () => {
    const doc = await prisma.document.create({ data: { caseId: caseA, originalName: 't.pdf', standardizedName: 't.pdf', sourceLabel: 'upload' } });
    await softDelete(caseA, 'document', doc.id);
    expect((await prisma.document.findUnique({ where: { id: doc.id } }))?.deletedAt).not.toBeNull();
    await restoreItem(caseA, 'document', doc.id);
    expect((await prisma.document.findUnique({ where: { id: doc.id } }))?.deletedAt).toBeNull();
    await softDelete(caseA, 'document', doc.id);
    await expect(purgeItem(caseA, 'document', doc.id, 'wrong')).rejects.toThrow(/DELETE/);
    await purgeItem(caseA, 'document', doc.id, 'DELETE');
    expect(await prisma.document.findUnique({ where: { id: doc.id } })).toBeNull();
    // security event recorded for permanent deletion
    expect(await prisma.securityEvent.count({ where: { type: 'permanent-deletion' } })).toBeGreaterThan(0);
  });

  it('rejects search / export on an unauthorized case', async () => {
    await expect(runSearch('x', 'case', otherCaseId)).rejects.toThrow(/not authorized|not found/i);
    await expect(createCaseExport(otherCaseId, 'full', false)).rejects.toThrow(/not authorized|not found/i);
  });
});
