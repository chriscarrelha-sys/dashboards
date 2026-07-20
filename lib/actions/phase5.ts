'use server';

import { randomBytes, createHash } from 'node:crypto';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth/session';
import { assertOwnedCase, audit } from '@/lib/auth/guard';
import { buildCaseReview } from '@/lib/analysis/case-review';

async function securityEvent(userId: string | null, type: string, detail?: string) {
  await prisma.securityEvent.create({ data: { userId, type, detail, device: 'dev', ip: 'local' } });
}

/* ============================ ADVANCED AI CASE ANALYSIS ============================ */

/** Generate a versioned, source-linked Case Review from confirmed case data. */
export async function generateCaseReview(caseId: string) {
  const { user } = await assertOwnedCase(caseId);
  const { sections, summary } = await buildCaseReview(caseId);
  const last = await prisma.caseReview.findFirst({ where: { caseId }, orderBy: { version: 'desc' } });
  const review = await prisma.caseReview.create({
    data: { caseId, version: (last?.version ?? 0) + 1, status: 'complete', provider: 'mock', sections: JSON.stringify(sections), summary },
  });
  await prisma.providerUsage.create({ data: { caseId, provider: 'mock', task: 'case-review', status: 'completed' } });
  await audit(user.id, 'ai.case-review', 'CaseReview', review.id, `v${review.version}`);
  revalidatePath(`/case/${caseId}/ai/case-review`);
  return { id: review.id, version: review.version };
}

/* ============================ COURT-DOCKET MONITORING ============================ */

const docketEntrySchema = z.object({
  title: z.string().min(1).max(400), entryNumber: z.string().max(40).optional(), documentNumber: z.string().max(40).optional(),
  filingDate: z.string().optional(), filingParty: z.string().max(200).optional(), description: z.string().max(2000).optional(),
});

export async function createDocketEntry(caseId: string, input: z.infer<typeof docketEntrySchema>) {
  const { user } = await assertOwnedCase(caseId);
  const data = docketEntrySchema.parse(input);
  // Dedupe by (case, entryNumber, documentNumber).
  const dup = await prisma.docketEntry.findFirst({ where: { caseId, entryNumber: data.entryNumber ?? null, documentNumber: data.documentNumber ?? null } });
  if (dup) throw new Error('A docket entry with that entry/document number already exists.');
  const entry = await prisma.docketEntry.create({
    data: { caseId, title: data.title, entryNumber: data.entryNumber ?? null, documentNumber: data.documentNumber ?? null, filingDate: data.filingDate ? new Date(data.filingDate) : null, filingParty: data.filingParty ?? null, description: data.description ?? null, reviewStatus: 'reviewed', verificationStatus: 'confirmed', createdBy: 'user' },
  });
  await audit(user.id, 'docket.entry.create', 'DocketEntry', entry.id);
  revalidatePath(`/case/${caseId}/docket`);
  return { id: entry.id };
}

/** Mock docket-sheet import → proposals to the Verification Queue + a DocketSource. */
export async function importDocketSheet(caseId: string, documentId: string | null) {
  const { user } = await assertOwnedCase(caseId);
  if (documentId) { const d = await prisma.document.findFirst({ where: { id: documentId, caseId } }); if (!d) throw new Error('Document not in this case'); }
  const source = await prisma.docketSource.create({ data: { caseId, sourceType: 'docket-sheet', retrievalMethod: 'upload', documentId, reliability: 'user-entered', verificationStatus: 'proposed' } });
  // Mock-extracted proposed entries → review queue (deadlines/hearings require confirmation).
  const proposals = [
    { kind: 'docket-entry', title: '[MOCK] Complaint filed', proposal: { title: 'Complaint filed', entryNumber: '1', filingParty: 'Plaintiff', filingDate: null } },
    { kind: 'docket-entry', title: '[MOCK] Order setting hearing', proposal: { title: 'Order setting hearing', entryNumber: '7', deadlineImplication: 'Hearing date — CONFIRM' } },
  ];
  await prisma.reviewQueueItem.createMany({ data: proposals.map((p) => ({ caseId, kind: 'docket-entry', title: p.title, provider: 'mock', confidence: 0.6, reason: 'Extracted docket entry — verify against the official docket; dates are not final until confirmed.', sourcePage: 'unavailable', sourceDocId: documentId, status: 'pending', proposal: JSON.stringify({ ...p.proposal, sourceId: source.id }) })) });
  await audit(user.id, 'docket.import', 'DocketSource', source.id, `${proposals.length} proposed`);
  revalidatePath(`/case/${caseId}/docket`); revalidatePath(`/case/${caseId}/verification-queue`);
  return { sourceId: source.id, proposed: proposals.length };
}

export async function setDocketMonitor(caseId: string, provider: string, schedule: string) {
  const { user } = await assertOwnedCase(caseId);
  const status = provider === 'manual' ? 'manual-only' : 'unavailable'; // no authorized live provider wired
  const existing = await prisma.docketMonitor.findUnique({ where: { caseId } });
  const m = existing
    ? await prisma.docketMonitor.update({ where: { caseId }, data: { provider, schedule, status } })
    : await prisma.docketMonitor.create({ data: { caseId, provider, schedule, status } });
  await audit(user.id, 'docket.monitor', 'DocketMonitor', m.id, `${provider}/${schedule}=${status}`);
  revalidatePath(`/case/${caseId}/docket`);
  return { status };
}

/* ============================ MAC COMPANION (device registration) ============================ */

/** Create a one-time device-registration code (user is signed in; companion redeems it). */
export async function createDeviceCode() {
  const user = await getCurrentUser();
  const code = randomBytes(4).toString('hex').toUpperCase(); // 8 hex chars
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
  await prisma.deviceRegistrationCode.create({ data: { code, userId: user.id, expiresAt } });
  await securityEvent(user.id, 'new-device', 'registration code issued');
  await audit(user.id, 'companion.code', 'DeviceRegistrationCode', code);
  revalidatePath('/case/[id]/admin/devices', 'page');
  return { code, expiresAt: expiresAt.toISOString() };
}

export async function revokeDevice(deviceId: string) {
  const user = await getCurrentUser();
  const d = await prisma.companionDevice.findFirst({ where: { id: deviceId, userId: user.id } });
  if (!d) throw new Error('Device not found');
  await prisma.companionDevice.update({ where: { id: deviceId }, data: { revokedAt: new Date() } });
  await securityEvent(user.id, 'session-revoked', `companion device ${deviceId}`);
  await audit(user.id, 'companion.revoke', 'CompanionDevice', deviceId);
  revalidatePath('/case/[id]/admin/devices', 'page');
}

/* ============================ 2FA (scaffolding) ============================ */

/** Enroll 2FA: generate a TOTP secret (server-side only) + hashed recovery codes. */
export async function enroll2FA() {
  const user = await getCurrentUser();
  const secret = randomBytes(20).toString('hex'); // TOTP secret (server-side only; base32 encoding at display time in a real impl)
  const recovery = Array.from({ length: 8 }, () => randomBytes(4).toString('hex'));
  const hashed = recovery.map((r) => createHash('sha256').update(r).digest('hex'));
  const existing = await prisma.twoFactorSecret.findUnique({ where: { userId: user.id } });
  if (existing) await prisma.twoFactorSecret.update({ where: { userId: user.id }, data: { secret, recoveryCodes: JSON.stringify(hashed), enabled: false } });
  else await prisma.twoFactorSecret.create({ data: { userId: user.id, secret, recoveryCodes: JSON.stringify(hashed), enabled: false } });
  await securityEvent(user.id, '2fa-enroll', 'secret generated');
  await audit(user.id, '2fa.enroll', 'User', user.id);
  // Return recovery codes ONCE (plaintext) for the user to store; secret stays server-side.
  return { recoveryCodes: recovery };
}

export async function enable2FA() {
  const user = await getCurrentUser();
  await prisma.twoFactorSecret.update({ where: { userId: user.id }, data: { enabled: true } });
  await securityEvent(user.id, '2fa-enabled', '');
  await audit(user.id, '2fa.enable', 'User', user.id);
  revalidatePath('/case/[id]/admin/security', 'page');
}

/* ============================ AI PRIVACY MODES ============================ */

export async function setCaseAiMode(caseId: string, mode: string, allowConfidential: boolean, providerAllowlist: string[]) {
  const { user } = await assertOwnedCase(caseId);
  const data = { mode, allowConfidential, providerAllowlist: JSON.stringify(providerAllowlist) };
  const existing = await prisma.caseAiSetting.findUnique({ where: { caseId } });
  if (existing) await prisma.caseAiSetting.update({ where: { caseId }, data });
  else await prisma.caseAiSetting.create({ data: { caseId, ...data } });
  await audit(user.id, 'ai.privacy-mode', 'CaseAiSetting', caseId, `mode=${mode}`);
  revalidatePath(`/case/${caseId}/admin/ai-privacy`);
}
