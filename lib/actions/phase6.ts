'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth/session';
import { assertOwnedCase, audit } from '@/lib/auth/guard';

/* ============================ LAUNCH READINESS LOG ============================ */

const launchResultSchema = z.object({
  overall: z.enum(['pass', 'warning', 'failure']),
  environment: z.string().default('development'),
  appVersion: z.string().nullable().optional(),
  schemaVersion: z.string().nullable().optional(),
  counts: z.object({ pass: z.number(), warning: z.number(), failure: z.number(), skipped: z.number() }),
  checks: z.array(z.object({ key: z.string(), label: z.string(), level: z.string(), detail: z.string() })),
  acknowledgedWarnings: z.array(z.string()).optional(),
});

/** Persist a launch-readiness gate run (Phase 6 §5) for the audit trail. */
export async function logLaunchCheck(input: z.infer<typeof launchResultSchema>) {
  const user = await getCurrentUser();
  const r = launchResultSchema.parse(input);
  const run = await prisma.launchCheckRun.create({
    data: {
      userId: user.id,
      environment: r.environment,
      overall: r.overall,
      passCount: r.counts.pass,
      warnCount: r.counts.warning,
      failCount: r.counts.failure,
      results: JSON.stringify(r.checks),
      appVersion: r.appVersion ?? null,
      schemaVersion: r.schemaVersion ?? null,
      acknowledgedWarnings: r.acknowledgedWarnings ? JSON.stringify(r.acknowledgedWarnings) : null,
    },
  });
  await audit(user.id, 'launch.check', 'LaunchCheckRun', run.id, r.overall);
  return { id: run.id, overall: run.overall };
}

/* ============================ PRODUCTION BLOCKER REGISTER ============================ */

const SEVERITIES = ['launch-blocker', 'high-post-launch', 'defect', 'enhancement', 'deferred', 'unsupported'] as const;

const blockerSchema = z.object({
  title: z.string().min(1).max(300),
  subsystem: z.string().min(1).max(60),
  description: z.string().min(1).max(4000),
  severity: z.enum(SEVERITIES).default('launch-blocker'),
  impact: z.string().max(2000).optional(),
  reproduction: z.string().max(2000).optional(),
  resolution: z.string().max(2000).optional(),
  testingRequired: z.string().max(1000).optional(),
  deploymentDependency: z.string().max(500).optional(),
  rollbackImpact: z.string().max(1000).optional(),
});

export async function upsertBlocker(input: z.infer<typeof blockerSchema>, id?: string) {
  const user = await getCurrentUser();
  const data = blockerSchema.parse(input);
  const row = id
    ? await prisma.productionBlocker.update({ where: { id }, data })
    : await prisma.productionBlocker.create({ data });
  await audit(user.id, id ? 'blocker.update' : 'blocker.create', 'ProductionBlocker', row.id, data.severity);
  revalidatePath('/administration/launch');
  return { id: row.id };
}

export async function setBlockerStatus(id: string, status: 'open' | 'in-progress' | 'resolved' | 'accepted-risk' | 'deferred') {
  const user = await getCurrentUser();
  const row = await prisma.productionBlocker.update({
    where: { id },
    data: { status, resolvedAt: status === 'resolved' ? new Date() : null },
  });
  await audit(user.id, 'blocker.status', 'ProductionBlocker', row.id, status);
  revalidatePath('/administration/launch');
  return { id: row.id, status };
}

/** Are there any unresolved launch-blockers? A hard gate for the launch checklist. */
export async function openLaunchBlockerCount() {
  await getCurrentUser();
  return prisma.productionBlocker.count({
    where: { severity: 'launch-blocker', status: { in: ['open', 'in-progress'] } },
  });
}

/* ============================ REAL-CASE MIGRATION (controlled, reversible) ============================ */

const batchSchema = z.object({
  label: z.string().min(1).max(200),
  sourcePath: z.string().max(1000).optional(),
  mode: z.enum(['dry-run', 'pilot', 'full']).default('dry-run'),
  backupRef: z.string().max(300).optional(),
});

/**
 * Start a migration batch for a case. A real (pilot/full) import requires a
 * pre-migration backup reference — we refuse to begin a non-dry-run without one,
 * so there is always a rollback point (§37, §47).
 */
export async function startMigrationBatch(caseId: string, input: z.infer<typeof batchSchema>) {
  const { user } = await assertOwnedCase(caseId);
  const data = batchSchema.parse(input);
  if (data.mode !== 'dry-run' && !data.backupRef) {
    throw new Error('A pre-migration backup reference is required before a pilot or full import.');
  }
  const batch = await prisma.migrationBatch.create({
    data: {
      caseId, userId: user.id, label: data.label,
      sourcePath: data.sourcePath ?? null, mode: data.mode,
      backupRef: data.backupRef ?? null, status: 'planned',
    },
  });
  await audit(user.id, 'migration.batch.start', 'MigrationBatch', batch.id, data.mode);
  return { id: batch.id };
}

const inventoryItemSchema = z.object({
  fileName: z.string().min(1),
  sourcePath: z.string().nullable().optional(),
  sizeBytes: z.number().nullable().optional(),
  extension: z.string().nullable().optional(),
  hash: z.string().nullable().optional(),
  likelyDate: z.string().nullable().optional(),
  likelyType: z.string().nullable().optional(),
  duplicateGroup: z.string().nullable().optional(),
  versionGroup: z.string().nullable().optional(),
  unreadable: z.boolean().optional(),
  passwordProtected: z.boolean().optional(),
  classification: z.string().default('pending'),
  confidence: z.number().nullable().optional(),
});

/** Record a computed source inventory against a batch (no files touched). */
export async function recordInventory(batchId: string, items: z.infer<typeof inventoryItemSchema>[]) {
  const user = await getCurrentUser();
  const batch = await prisma.migrationBatch.findFirst({ where: { id: batchId } });
  if (!batch) throw new Error('Migration batch not found');
  await assertOwnedCase(batch.caseId); // enforce ownership of the batch's case
  const parsed = items.map((i) => inventoryItemSchema.parse(i));

  await prisma.migrationItem.createMany({
    data: parsed.map((i) => ({
      batchId,
      fileName: i.fileName,
      sourcePath: i.sourcePath ?? null,
      sizeBytes: i.sizeBytes ?? null,
      extension: i.extension ?? null,
      hash: i.hash ?? null,
      likelyDate: i.likelyDate ? new Date(i.likelyDate) : null,
      likelyType: i.likelyType ?? null,
      duplicateGroup: i.duplicateGroup ?? null,
      versionGroup: i.versionGroup ?? null,
      unreadable: i.unreadable ?? false,
      passwordProtected: i.passwordProtected ?? false,
      classification: i.classification,
      confidence: i.confidence ?? null,
      migrationStatus: 'pending',
    })),
  });

  const counts = {
    totalFiles: parsed.length,
    duplicates: parsed.filter((i) => i.classification === 'duplicate').length,
    needsReview: parsed.filter((i) => i.classification === 'needs-review').length,
    unreadable: parsed.filter((i) => i.unreadable || i.passwordProtected).length,
  };
  await prisma.migrationBatch.update({
    where: { id: batchId },
    data: { ...counts, status: 'inventoried' },
  });
  await audit(user.id, 'migration.inventory', 'MigrationBatch', batchId, `${counts.totalFiles} files`);
  return { count: parsed.length, ...counts };
}

/**
 * Roll back a migration batch (§37). Removes ONLY the application records this
 * batch created (documents + their index entries), preserves the source
 * inventory and all audit history, and never deletes the user's source files.
 */
export async function rollbackBatch(batchId: string) {
  const user = await getCurrentUser();
  const batch = await prisma.migrationBatch.findFirst({ where: { id: batchId } });
  if (!batch) throw new Error('Migration batch not found');
  await assertOwnedCase(batch.caseId);

  const items = await prisma.migrationItem.findMany({ where: { batchId } });
  let removedDocs = 0;
  for (const item of items) {
    if (!item.createdRecords) continue;
    let created: { documentId?: string; indexIds?: string[] } = {};
    try { created = JSON.parse(item.createdRecords); } catch { created = {}; }
    if (created.indexIds?.length) {
      await prisma.searchIndexEntry.deleteMany({ where: { id: { in: created.indexIds } } });
    }
    if (created.documentId) {
      // Remove the app record only; the immutable original on disk/source is untouched.
      await prisma.document.deleteMany({ where: { id: created.documentId, caseId: batch.caseId } });
      removedDocs++;
    }
    await prisma.migrationItem.update({ where: { id: item.id }, data: { migrationStatus: 'rolled-back', createdRecords: null } });
  }
  await prisma.migrationBatch.update({ where: { id: batchId }, data: { status: 'rolled-back' } });
  // Audit history is preserved (this adds to it; it never deletes prior entries).
  await audit(user.id, 'migration.rollback', 'MigrationBatch', batchId, `removed ${removedDocs} document record(s)`);
  return { rolledBack: items.length, removedDocuments: removedDocs };
}
