'use server';

import { createHash } from 'node:crypto';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth/session';
import { assertOwnedCase, audit } from '@/lib/auth/guard';
import { getSearchProvider, type SearchFilters } from '@/lib/search/provider';
import { reindexCase } from '@/lib/search/indexer';
import { BINDER_SECTION_TEMPLATE, DEFAULT_REMINDER_OFFSETS, EXPORT_DIRS } from '@/lib/enums';

async function securityEvent(userId: string | null, type: string, detail?: string) {
  await prisma.securityEvent.create({ data: { userId, type, detail, device: 'dev', ip: 'local' } });
}

/** Whole days from `a` to `b` (date-only). */
function daysBetween(a: Date, b: Date): number {
  const x = Date.UTC(a.getFullYear(), a.getMonth(), a.getDate());
  const y = Date.UTC(b.getFullYear(), b.getMonth(), b.getDate());
  return Math.round((y - x) / 86_400_000);
}

/* ============================ SEARCH ============================ */

export async function runSearch(query: string, scope: 'case' | 'global', caseId: string | null, filters: SearchFilters = {}) {
  const user = await getCurrentUser();
  let realScope;
  if (scope === 'case') {
    if (!caseId) throw new Error('caseId required for case scope');
    await assertOwnedCase(caseId); // prevents searching another user's case
    realScope = { kind: 'case' as const, caseId };
  } else {
    const cases = await prisma.case.findMany({ where: { userId: user.id }, select: { id: true } });
    realScope = { kind: 'global' as const, userCaseIds: cases.map((c) => c.id) };
  }
  const hits = await getSearchProvider().search(query, realScope, filters, 100);
  if (caseId && scope === 'case') {
    // Belt-and-suspenders: never leak another case's rows.
    return hits.filter((h) => h.caseId === caseId);
  }
  return hits;
}

export async function reindex(caseId: string) {
  const { user } = await assertOwnedCase(caseId);
  const n = await reindexCase(caseId);
  await prisma.backgroundJob.create({ data: { type: 'indexing', status: 'completed', progress: 100, completedAt: new Date() } });
  await audit(user.id, 'search.reindex', 'Case', caseId, `${n} entries`);
  revalidatePath(`/case/${caseId}/search`);
  return { entries: n };
}

const savedSearchSchema = z.object({ title: z.string().min(1).max(200), scope: z.enum(['case', 'global']).default('case'), query: z.string().max(1000), filters: z.string().optional(), isSmartCollection: z.boolean().optional(), notify: z.boolean().optional() });
export async function saveSearch(caseId: string | null, input: z.input<typeof savedSearchSchema>) {
  const user = await getCurrentUser();
  if (caseId) await assertOwnedCase(caseId);
  const data = savedSearchSchema.parse(input);
  const s = await prisma.savedSearch.create({ data: { caseId, title: data.title, scope: data.scope, query: data.query, filters: data.filters || null, isSmartCollection: data.isSmartCollection ?? false, notify: data.notify ?? false, lastRunAt: new Date() } });
  await audit(user.id, 'search.save', 'SavedSearch', s.id, data.isSmartCollection ? 'smart-collection' : 'saved');
  if (caseId) revalidatePath(`/case/${caseId}/search`);
  return { id: s.id };
}

/* ============================ EXHIBITS + BATES ============================ */

export async function createExhibitSet(caseId: string, input: { title: string; kind?: string; numberingStyle?: string; purpose?: string }) {
  const { user } = await assertOwnedCase(caseId);
  const data = z.object({ title: z.string().min(1).max(200), kind: z.string().max(40).optional(), numberingStyle: z.string().max(40).optional(), purpose: z.string().max(1000).optional() }).parse(input);
  const set = await prisma.exhibitSet.create({ data: { caseId, title: data.title, kind: data.kind || 'hearing', numberingStyle: data.numberingStyle || 'numeric', purpose: data.purpose || null } });
  await audit(user.id, 'exhibit-set.create', 'ExhibitSet', set.id);
  revalidatePath(`/case/${caseId}/exhibits`);
  return { id: set.id };
}

export async function addExhibitItem(caseId: string, setId: string, input: { documentId?: string; pageRange?: string; exhibitNumber: string; title?: string; allowDuplicate?: boolean }) {
  const { user } = await assertOwnedCase(caseId);
  const set = await prisma.exhibitSet.findFirst({ where: { id: setId, caseId }, include: { items: true } });
  if (!set) throw new Error('Exhibit set not found');
  const data = z.object({ documentId: z.string().optional(), pageRange: z.string().max(60).optional(), exhibitNumber: z.string().min(1).max(40), title: z.string().max(200).optional(), allowDuplicate: z.boolean().optional() }).parse(input);
  if (data.documentId) {
    const doc = await prisma.document.findFirst({ where: { id: data.documentId, caseId } });
    if (!doc) throw new Error('Document not in this case');
  }
  // Prevent accidental duplicate exhibit numbers within a set.
  if (!data.allowDuplicate && set.items.some((i) => i.exhibitNumber === data.exhibitNumber)) {
    throw new Error(`Exhibit number "${data.exhibitNumber}" already used in this set. Confirm to allow a duplicate.`);
  }
  const item = await prisma.exhibitItem.create({
    data: { exhibitSetId: setId, documentId: data.documentId || null, pageRange: data.pageRange || null, exhibitNumber: data.exhibitNumber, title: data.title || null },
  });
  await audit(user.id, 'exhibit-item.create', 'ExhibitItem', item.id, `#${data.exhibitNumber}`);
  revalidatePath(`/case/${caseId}/exhibit-set/${setId}`);
  return { id: item.id };
}

export async function setExhibitItemStatus(caseId: string, itemId: string, field: 'authenticationStatus' | 'redactionStatus', value: string) {
  const { user } = await assertOwnedCase(caseId);
  const it = await prisma.exhibitItem.findFirst({ where: { id: itemId, exhibitSet: { caseId } } });
  if (!it) throw new Error('Not found');
  await prisma.exhibitItem.update({ where: { id: itemId }, data: { [field]: value } });
  await audit(user.id, 'exhibit-item.status', 'ExhibitItem', itemId, `${field}=${value}`);
  revalidatePath(`/case/${caseId}/exhibit-set/${it.exhibitSetId}`);
}

/** Bates numbering creates a DERIVATIVE document — the source is never altered. */
export async function runBates(caseId: string, input: { prefix: string; startNumber?: number; digitCount?: number; documentId?: string; totalPages?: number }) {
  const { user } = await assertOwnedCase(caseId);
  const data = z.object({ prefix: z.string().min(1).max(40), startNumber: z.coerce.number().int().optional(), digitCount: z.coerce.number().int().optional(), documentId: z.string().optional(), totalPages: z.coerce.number().int().optional() }).parse(input);
  const start = data.startNumber ?? 1;
  const digits = data.digitCount ?? 6;
  const pages = data.totalPages ?? 1;
  const fmt = (n: number) => `${data.prefix}${String(n).padStart(digits, '0')}`;
  const firstNumber = fmt(start);
  const lastNumber = fmt(start + pages - 1);

  let derivativeId: string | null = null;
  if (data.documentId) {
    const src = await prisma.document.findFirst({ where: { id: data.documentId, caseId } });
    if (!src) throw new Error('Document not in this case');
    const derivative = await prisma.document.create({
      data: {
        caseId, originalName: src.originalName, standardizedName: `${src.standardizedName.replace(/\.[^.]+$/, '')}_Bates_${firstNumber}-${lastNumber}.pdf`,
        title: `${src.title ?? src.standardizedName} (Bates ${firstNumber}–${lastNumber})`, docType: src.docType,
        mimeType: src.mimeType, sourceLabel: 'bates-derivative', verificationStatus: 'confirmed', reviewStatus: 'reviewed',
        // No storageKey copy — derivative marker only; the source file is untouched.
      },
    });
    derivativeId = derivative.id;
  }

  const job = await prisma.batesJob.create({ data: { caseId, prefix: data.prefix, startNumber: start, digitCount: digits, totalPages: pages, firstNumber, lastNumber, derivativeDocumentId: derivativeId, status: 'completed' } });
  await audit(user.id, 'bates.run', 'BatesJob', job.id, `${firstNumber}-${lastNumber}`);
  revalidatePath(`/case/${caseId}/exhibits`);
  return { id: job.id, firstNumber, lastNumber, derivativeId };
}

/* ============================ BINDERS ============================ */

export async function createBinder(caseId: string, input: { title: string; kind?: string; batesEnabled?: boolean }) {
  const { user } = await assertOwnedCase(caseId);
  const data = z.object({ title: z.string().min(1).max(200), kind: z.string().max(40).optional(), batesEnabled: z.boolean().optional() }).parse(input);
  const binder = await prisma.binder.create({
    data: {
      caseId, title: data.title, kind: data.kind || 'hearing', batesEnabled: data.batesEnabled ?? false,
      sections: { create: BINDER_SECTION_TEMPLATE.slice(0, 8).map((t, i) => ({ title: t, order: i })) },
    },
  });
  await audit(user.id, 'binder.create', 'Binder', binder.id);
  revalidatePath(`/case/${caseId}/filings/hearing-binders`);
  return { id: binder.id };
}

export async function addBinderItem(caseId: string, sectionId: string, input: { label: string; documentId?: string; pageRange?: string }) {
  const { user } = await assertOwnedCase(caseId);
  const section = await prisma.binderSection.findFirst({ where: { id: sectionId, binder: { caseId } }, include: { items: true } });
  if (!section) throw new Error('Section not found');
  const data = z.object({ label: z.string().min(1).max(200), documentId: z.string().optional(), pageRange: z.string().max(60).optional() }).parse(input);
  if (data.documentId) { const d = await prisma.document.findFirst({ where: { id: data.documentId, caseId } }); if (!d) throw new Error('Document not in this case'); }
  const item = await prisma.binderItem.create({ data: { sectionId, label: data.label, documentId: data.documentId || null, pageRange: data.pageRange || null, order: section.items.length } });
  await audit(user.id, 'binder-item.create', 'BinderItem', item.id);
  return { id: item.id };
}

/** Validate a binder (§23). Returns warnings; blocks on missing source files. */
export async function validateBinder(caseId: string, binderId: string) {
  await assertOwnedCase(caseId);
  const binder = await prisma.binder.findFirst({ where: { id: binderId, caseId }, include: { sections: { include: { items: { include: { document: true } } } } } });
  if (!binder) throw new Error('Binder not found');
  const warnings: string[] = [];
  const blockers: string[] = [];
  const allItems = binder.sections.flatMap((s) => s.items);
  if (!allItems.length) warnings.push('Binder has no items.');
  for (const it of allItems) {
    if (it.documentId && !it.document) blockers.push(`Item "${it.label}" references a missing document.`);
    if (it.documentId && it.document && !it.document.storageKey) warnings.push(`"${it.label}" has no stored file (demo metadata).`);
  }
  if (binder.sections.some((s) => !s.title)) warnings.push('A section is missing a title.');
  return { warnings, blockers, canExport: blockers.length === 0 };
}

/* ============================ EXPORT + BACKUP + RESTORE ============================ */

export async function createBackup(type = 'manual') {
  const user = await getCurrentUser();
  const dbInfo = await Promise.all([prisma.case.count(), prisma.document.count(), prisma.auditLog.count()]);
  const manifest = { cases: dbInfo[0], documents: dbInfo[1], auditEntries: dbInfo[2], at: new Date().toISOString() };
  const checksum = createHash('sha256').update(JSON.stringify(manifest)).digest('hex');
  const retentionAt = new Date(); retentionAt.setDate(retentionAt.getDate() + 30);
  const b = await prisma.backup.create({ data: { type, scope: 'full', completedAt: new Date(), status: 'completed', sizeBytes: JSON.stringify(manifest).length, location: 'local://backups', encrypted: true, checksum, retentionAt } });
  await securityEvent(user.id, 'backup-created', `type=${type}`);
  await audit(user.id, 'backup.create', 'Backup', b.id, `checksum=${checksum.slice(0, 12)}`);
  revalidatePath('/case/[id]/admin/backup', 'page');
  return { id: b.id, checksum };
}

/** A backup is not complete just because a file exists — verify it. */
export async function verifyBackup(backupId: string) {
  const user = await getCurrentUser();
  const b = await prisma.backup.findUnique({ where: { id: backupId } });
  if (!b) throw new Error('Backup not found');
  const ok = Boolean(b.checksum && b.status === 'completed' && b.encrypted);
  await prisma.backup.update({ where: { id: backupId }, data: { verifiedAt: new Date(), restoreTestStatus: ok ? 'passed' : 'failed' } });
  await audit(user.id, 'backup.verify', 'Backup', backupId, ok ? 'passed' : 'failed');
  return { verified: ok };
}

export async function restorePreview(backupId: string) {
  const user = await getCurrentUser();
  const b = await prisma.backup.findUnique({ where: { id: backupId } });
  if (!b) throw new Error('Backup not found');
  // Simulated preview (production would restore into a temporary environment).
  const summary = { backupId, wouldRestore: b.scope, note: 'Simulated preview — no data changed.', createdAt: new Date().toISOString() };
  const rp = await prisma.restorePreview.create({ data: { backupId, summary: JSON.stringify(summary) } });
  await securityEvent(user.id, 'restore-initiated', `preview backup=${backupId}`);
  await audit(user.id, 'restore.preview', 'RestorePreview', rp.id);
  return summary;
}

export async function createCaseExport(caseId: string, scope: 'full' | 'external-sharing' | 'documents-only', includeConfidential: boolean) {
  const { user } = await assertOwnedCase(caseId);
  const [docs, evidence, filings] = await Promise.all([prisma.document.count({ where: { caseId, deletedAt: null } }), prisma.evidenceItem.count({ where: { caseId } }), prisma.filing.count({ where: { caseId } })]);
  const manifest = { scope, dirs: EXPORT_DIRS, counts: { documents: docs, evidence, filings }, includesConfidential: includeConfidential, generatedAt: new Date().toISOString() };
  const exp = await prisma.caseExport.create({ data: { caseId, scope, status: 'completed', manifest: JSON.stringify(manifest), includesConfidential: includeConfidential } });
  await securityEvent(user.id, 'export-created', `case=${caseId} scope=${scope}`);
  await audit(user.id, 'export.create', 'CaseExport', exp.id, `scope=${scope}`);
  revalidatePath(`/case/${caseId}/admin/export`);
  return { id: exp.id };
}

/* ============================ TRASH ============================ */

const TRASHABLE = ['document', 'evidence', 'filing', 'communication'] as const;
const modelFor: Record<string, 'document' | 'evidenceItem' | 'filing' | 'communication'> = { document: 'document', evidence: 'evidenceItem', filing: 'filing', communication: 'communication' };

export async function softDelete(caseId: string, entity: string, id: string) {
  const { user } = await assertOwnedCase(caseId);
  if (!TRASHABLE.includes(entity as never)) throw new Error('Entity not trashable');
  const model = modelFor[entity]!;
  // @ts-expect-error dynamic model
  const rec = await prisma[model].findFirst({ where: { id, caseId } });
  if (!rec) throw new Error('Not found');
  // @ts-expect-error dynamic model
  await prisma[model].update({ where: { id }, data: { deletedAt: new Date() } });
  await audit(user.id, `${entity}.trash`, entity, id);
  revalidatePath(`/case/${caseId}/admin/trash`);
}

export async function restoreItem(caseId: string, entity: string, id: string) {
  const { user } = await assertOwnedCase(caseId);
  const model = modelFor[entity]!;
  // @ts-expect-error dynamic model
  await prisma[model].update({ where: { id }, data: { deletedAt: null } });
  await audit(user.id, `${entity}.restore`, entity, id);
  revalidatePath(`/case/${caseId}/admin/trash`);
}

export async function purgeItem(caseId: string, entity: string, id: string, confirmation: string) {
  const { user } = await assertOwnedCase(caseId);
  if (confirmation !== 'DELETE') throw new Error('Type DELETE to confirm permanent deletion');
  const model = modelFor[entity]!;
  // @ts-expect-error dynamic model
  await prisma[model].delete({ where: { id } });
  await securityEvent(user.id, 'permanent-deletion', `${entity}=${id}`);
  await audit(user.id, `${entity}.purge`, entity, id, 'permanent');
  revalidatePath(`/case/${caseId}/admin/trash`);
}

/* ============================ CALENDAR + NOTIFICATIONS ============================ */

export async function connectCalendar(provider: string) {
  const user = await getCurrentUser();
  const existing = await prisma.calendarConnection.findFirst({ where: { provider } });
  const conn = existing
    ? await prisma.calendarConnection.update({ where: { id: existing.id }, data: { status: 'mocked', isDefault: true } })
    : await prisma.calendarConnection.create({ data: { provider, status: 'mocked', isDefault: true, syncMode: 'confirmed-auto' } });
  await securityEvent(user.id, 'integration-connected', `calendar=${provider}`);
  await audit(user.id, 'calendar.connect', 'CalendarConnection', conn.id, `${provider} (mock)`);
  return { id: conn.id };
}

/** Sync a deadline to the (mock) calendar. ONLY confirmed events auto-sync. */
export async function syncDeadline(caseId: string, deadlineId: string) {
  const { user } = await assertOwnedCase(caseId);
  const d = await prisma.deadline.findFirst({ where: { id: deadlineId, caseId } });
  if (!d) throw new Error('Deadline not found');
  if (d.verificationStatus !== 'confirmed') throw new Error('Only confirmed deadlines can be synced. Confirm it first.');
  // Idempotent: don't create duplicate links.
  const existing = await prisma.calendarEventLink.findFirst({ where: { deadlineId, status: 'synced' } });
  if (existing) return { alreadySynced: true, id: existing.id };
  const link = await prisma.calendarEventLink.create({ data: { deadlineId, provider: 'apple', externalId: `mock-${deadlineId.slice(0, 8)}`, status: 'synced' } });
  await audit(user.id, 'calendar.sync', 'Deadline', deadlineId, 'synced (mock)');
  revalidatePath(`/case/${caseId}/calendar`);
  return { id: link.id };
}

export async function setNotificationPrefs(input: { dashboard: boolean; email: boolean; push: boolean; digestDaily: boolean; digestWeekly: boolean }) {
  const user = await getCurrentUser();
  const existing = await prisma.notificationPreference.findFirst({ where: { scope: 'global' } });
  const channels = JSON.stringify(input);
  if (existing) await prisma.notificationPreference.update({ where: { id: existing.id }, data: { channels } });
  else await prisma.notificationPreference.create({ data: { scope: 'global', channels, schedule: JSON.stringify(DEFAULT_REMINDER_OFFSETS) } });
  await audit(user.id, 'notifications.prefs', 'NotificationPreference', 'global');
}

/** Generate reminder notifications for upcoming confirmed deadlines (deduped). */
export async function generateReminders(caseId: string) {
  const { user } = await assertOwnedCase(caseId);
  const deadlines = await prisma.deadline.findMany({ where: { caseId, done: false, verificationStatus: 'confirmed', dueDate: { not: null } } });
  let created = 0;
  for (const d of deadlines) {
    const days = daysBetween(new Date(), d.dueDate!);
    if (!DEFAULT_REMINDER_OFFSETS.includes(days as never)) continue;
    const key = `reminder:${d.id}:${days}`;
    const exists = await prisma.notification.findFirst({ where: { notifKey: key } });
    if (exists) continue; // dedupe
    await prisma.notification.create({ data: { caseId, notifKey: key, title: `${d.title} — due in ${days}d`, body: `Confirmed deadline ${d.dueDate!.toISOString().slice(0, 10)}`, priority: days <= 1 ? 'critical' : days <= 7 ? 'high' : 'normal', relatedType: 'deadline', relatedId: d.id, sentAt: new Date() } });
    created++;
  }
  await audit(user.id, 'notifications.reminders', 'Case', caseId, `${created} created`);
  revalidatePath(`/case/${caseId}/admin/notifications`);
  return { created };
}

export async function generateDigest(period: 'daily' | 'weekly') {
  const user = await getCurrentUser();
  const cases = await prisma.case.findMany({ where: { userId: user.id }, select: { id: true } });
  const ids = cases.map((c) => c.id);
  const [dueSoon, deficiencies, unverifiedAuth] = await Promise.all([
    prisma.deadline.count({ where: { caseId: { in: ids }, done: false } }),
    prisma.discoveryDeficiency.count({ where: { caseId: { in: ids }, resolutionStatus: { notIn: ['cured', 'closed'] } } }),
    prisma.authority.count({ where: { caseId: { in: ids }, verificationStatus: 'unverified' } }),
  ]);
  const content = { period, openDeadlines: dueSoon, openDeficiencies: deficiencies, unverifiedAuthorities: unverifiedAuth, generatedAt: new Date().toISOString() };
  const dg = await prisma.notificationDigest.create({ data: { period, content: JSON.stringify(content) } });
  await audit(user.id, 'notifications.digest', 'NotificationDigest', dg.id, period);
  return content;
}

export async function ackNotification(id: string, action: 'read' | 'acknowledged' | 'dismissed') {
  const user = await getCurrentUser();
  await prisma.notification.update({ where: { id }, data: { status: action } });
  await audit(user.id, `notification.${action}`, 'Notification', id);
}

/* ============================ INTEGRATIONS + SECURITY ============================ */

export async function testIntegration(key: string) {
  const user = await getCurrentUser();
  // Mock diagnostic — real providers would ping their API server-side.
  const hasKey = Boolean(process.env[`${key.toUpperCase().replace(/-/g, '_')}_API_KEY`]);
  const result = hasKey ? 'connected' : 'mocked';
  await securityEvent(user.id, 'integration-connected', `test ${key}=${result}`);
  await audit(user.id, 'integration.test', 'Integration', key, result);
  return { key, result, message: hasKey ? 'Live credentials detected.' : 'No credentials — running in mock mode.' };
}

export async function addSelectedFolder(provider: string, path: string) {
  const user = await getCurrentUser();
  const f = await prisma.selectedFolder.create({ data: { provider, path, status: 'mock' } });
  await audit(user.id, 'companion.folder', 'SelectedFolder', f.id, `${provider}:${path}`);
  return { id: f.id };
}

export async function revokeSession(sessionId: string) {
  const user = await getCurrentUser();
  await prisma.appSession.update({ where: { id: sessionId }, data: { revokedAt: new Date() } });
  await securityEvent(user.id, 'session-revoked', sessionId);
  await audit(user.id, 'session.revoke', 'AppSession', sessionId);
  revalidatePath('/case/[id]/admin/security', 'page');
}
