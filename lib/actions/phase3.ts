'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { assertOwnedCase, assertSameCase, audit } from '@/lib/auth/guard';
import { FILING_CHECKLIST_TEMPLATE, FILING_STAGES } from '@/lib/enums';

const bump = (caseId: string, ...slugs: string[]) => {
  revalidatePath(`/case/${caseId}`);
  for (const s of slugs) revalidatePath(`/case/${caseId}/${s}`);
};

/* ============================ FILINGS ============================ */

const filingSchema = z.object({
  title: z.string().min(1).max(300),
  filingType: z.string().max(60).optional(),
  filingParty: z.string().max(200).optional(),
  respondingParty: z.string().max(200).optional(),
  dueDate: z.string().optional(),
  purpose: z.string().max(2000).optional(),
  requestedRelief: z.string().max(2000).optional(),
  portalType: z.string().max(40).optional(),
  portalUrl: z.string().optional(),
});

export async function createFiling(caseId: string, input: z.infer<typeof filingSchema>) {
  const { user } = await assertOwnedCase(caseId);
  const data = filingSchema.parse(input);
  const filing = await prisma.filing.create({
    data: {
      caseId, title: data.title, formalTitle: data.title, filingType: data.filingType || null,
      filingParty: data.filingParty || null, respondingParty: data.respondingParty || null,
      dueDate: data.dueDate ? new Date(data.dueDate) : null, purpose: data.purpose || null,
      requestedRelief: data.requestedRelief || null, portalType: data.portalType || null,
      portalUrl: data.portalUrl || null, stage: 'planned', createdBy: 'user',
      stageHistory: { create: { toStage: 'planned', note: 'Filing created' } },
      // Seed the readiness checklist from the template.
      checklistItems: { create: FILING_CHECKLIST_TEMPLATE.map((t) => ({ category: t.category, label: t.label, status: 'incomplete' })) },
    },
  });
  await audit(user.id, 'filing.create', 'Filing', filing.id, `type=${data.filingType ?? '—'}`);
  bump(caseId, 'filing-workspace');
  return { id: filing.id };
}

export async function advanceFilingStage(caseId: string, filingId: string, toStage: string, note?: string) {
  const { user } = await assertOwnedCase(caseId);
  const filing = await prisma.filing.findFirst({ where: { id: filingId, caseId } });
  if (!filing) throw new Error('Filing not found');
  if (!FILING_STAGES.includes(toStage as never)) throw new Error(`Invalid stage: ${toStage}`);
  await prisma.filing.update({ where: { id: filingId }, data: { stage: toStage } });
  await prisma.filingStageHistory.create({ data: { filingId, fromStage: filing.stage, toStage, note: note || null } });
  await audit(user.id, 'filing.stage', 'Filing', filingId, `${filing.stage}→${toStage}`);
  bump(caseId, `filing/${filingId}`, 'filing-workspace');
}

export async function linkFiling(
  caseId: string, filingId: string,
  kind: 'issue' | 'evidence' | 'authority' | 'discovery' | 'document',
  targetId: string, extra?: { relation?: string; role?: string; pinpoint?: string; pageRange?: string },
) {
  const { user } = await assertOwnedCase(caseId);
  const modelByKind: Record<string, string> = { issue: 'legalIssue', evidence: 'evidenceItem', authority: 'authority', discovery: 'discoveryRequest', document: 'document' };
  await assertSameCase(caseId, [{ model: 'filing', ids: [filingId] }, { model: modelByKind[kind]!, ids: [targetId] }]);
  if (kind === 'issue') await prisma.filingLegalIssueLink.createMany({ data: [{ filingId, legalIssueId: targetId }] }).catch(() => {});
  if (kind === 'evidence') await prisma.filingEvidenceLink.createMany({ data: [{ filingId, evidenceId: targetId, relation: extra?.relation || 'supporting' }] }).catch(() => {});
  if (kind === 'authority') await prisma.filingAuthorityLink.createMany({ data: [{ filingId, authorityId: targetId, pinpoint: extra?.pinpoint || null }] }).catch(() => {});
  if (kind === 'discovery') await prisma.filingDiscoveryLink.createMany({ data: [{ filingId, discoveryRequestId: targetId }] }).catch(() => {});
  if (kind === 'document') await prisma.filingDocumentLink.createMany({ data: [{ filingId, documentId: targetId, role: extra?.role || 'primary', pageRange: extra?.pageRange || null }] }).catch(() => {});
  await audit(user.id, `filing.link.${kind}`, 'Filing', filingId, `target=${targetId}`);
  bump(caseId, `filing/${filingId}`);
}

export async function addFilingVersion(caseId: string, filingId: string, input: { label: string; contentText?: string; changesSummary?: string }) {
  const { user } = await assertOwnedCase(caseId);
  const filing = await prisma.filing.findFirst({ where: { id: filingId, caseId }, include: { versions: true } });
  if (!filing) throw new Error('Filing not found');
  const data = z.object({ label: z.string().max(60), contentText: z.string().max(200000).optional(), changesSummary: z.string().max(2000).optional() }).parse(input);
  const v = await prisma.filingVersion.create({
    data: {
      filingId, versionNumber: filing.versions.length + 1, label: data.label,
      contentText: data.contentText || null, changesSummary: data.changesSummary || null,
      reviewStatus: 'draft', approvalStatus: 'pending', createdBy: 'user',
      sourceVersionId: filing.versions.at(-1)?.id ?? null,
    },
  });
  await audit(user.id, 'filing.version', 'FilingVersion', v.id, `v${v.versionNumber} ${data.label}`);
  bump(caseId, `filing/${filingId}`);
  return { id: v.id, versionNumber: v.versionNumber };
}

export async function markVersionFinal(caseId: string, filingId: string, versionId: string) {
  const { user } = await assertOwnedCase(caseId);
  const v = await prisma.filingVersion.findFirst({ where: { id: versionId, filing: { caseId } } });
  if (!v) throw new Error('Version not found');
  // Never mutate earlier versions; only designate this one final.
  await prisma.filingVersion.update({ where: { id: versionId }, data: { approvalStatus: 'final-for-filing', reviewStatus: 'approved' } });
  await audit(user.id, 'filing.version.final', 'FilingVersion', versionId);
  bump(caseId, `filing/${filingId}`);
}

export async function setChecklistItem(caseId: string, itemId: string, status: string, overrideReason?: string) {
  const { user } = await assertOwnedCase(caseId);
  const item = await prisma.filingChecklistItem.findFirst({ where: { id: itemId, filing: { caseId } } });
  if (!item) throw new Error('Checklist item not found');
  await prisma.filingChecklistItem.update({ where: { id: itemId }, data: { status, overrideReason: overrideReason || null } });
  // Overrides / waivers are logged.
  if (status === 'waived' || (item.isWarning && status === 'complete')) {
    await audit(user.id, 'filing.checklist.override', 'FilingChecklistItem', itemId, overrideReason || 'no reason given');
  } else {
    await audit(user.id, 'filing.checklist.update', 'FilingChecklistItem', itemId, `status=${status}`);
  }
  bump(caseId, `filing/${item.filingId}`);
}

export async function addChecklistItem(caseId: string, filingId: string, label: string, category: string) {
  const { user } = await assertOwnedCase(caseId);
  const filing = await prisma.filing.findFirst({ where: { id: filingId, caseId } });
  if (!filing) throw new Error('Filing not found');
  const it = await prisma.filingChecklistItem.create({ data: { filingId, label, category, status: 'incomplete', custom: true } });
  await audit(user.id, 'filing.checklist.add', 'FilingChecklistItem', it.id);
  bump(caseId, `filing/${filingId}`);
}

/**
 * Rule-based quality-control checks. OPERATIONAL WARNINGS, not legal conclusions.
 * Adds one FilingChecklistItem(isWarning) per detected issue (idempotent by label).
 */
export async function runReadinessChecks(caseId: string, filingId: string) {
  const { user } = await assertOwnedCase(caseId);
  const filing = await prisma.filing.findFirst({
    where: { id: filingId, caseId },
    include: {
      case: { include: { court: true } }, evidenceLinks: true, authorityLinks: { include: { authority: true } },
      legalIssueLinks: true, versions: true, certificates: true, documentLinks: true, checklistItems: true,
    },
  });
  if (!filing) throw new Error('Filing not found');

  const warnings: string[] = [];
  if (!filing.filingType) warnings.push('Filing type is not set.');
  if (!filing.legalIssueLinks.length) warnings.push('No legal issues linked to this filing.');
  if (!filing.evidenceLinks.length) warnings.push('No evidence linked to this filing.');
  if (filing.authorityLinks.some((a) => a.authority.verificationStatus === 'unverified' || a.authority.verificationStatus === 'proposed')) warnings.push('One or more linked authorities are unverified.');
  if (!filing.certificates.length) warnings.push('No certificate of service prepared.');
  if (!filing.versions.some((v) => v.approvalStatus === 'final-for-filing')) warnings.push('No version marked final-for-filing.');
  const finalV = filing.versions.find((v) => v.approvalStatus === 'final-for-filing') ?? filing.versions.at(-1);
  if (finalV?.contentText && /\b(TODO|INSERT|TBD)\b|\[[^\]]+\]/i.test(finalV.contentText)) warnings.push('Draft contains placeholder text (TODO/INSERT/TBD/[...]).');
  if (filing.case.caption && filing.formalTitle && filing.case.captionShort && false) { /* caption check placeholder */ }
  if (!filing.dueDate) warnings.push('Filing deadline is not confirmed.');

  // Upsert-by-label so re-running doesn't duplicate.
  const existing = new Set(filing.checklistItems.filter((c) => c.isWarning).map((c) => c.label));
  const toCreate = warnings.filter((w) => !existing.has(w));
  if (toCreate.length) {
    await prisma.filingChecklistItem.createMany({
      data: toCreate.map((w) => ({ filingId, category: 'qc-warning', label: w, status: 'needs-review', isWarning: true })),
    });
  }
  // Clear warnings that no longer apply (were auto and not overridden).
  const stale = filing.checklistItems.filter((c) => c.isWarning && !warnings.includes(c.label) && c.status !== 'waived');
  if (stale.length) await prisma.filingChecklistItem.deleteMany({ where: { id: { in: stale.map((s) => s.id) } } });

  await audit(user.id, 'filing.readiness', 'Filing', filingId, `${warnings.length} warning(s)`);
  bump(caseId, `filing/${filingId}`);
  return { warnings: warnings.length };
}

export async function recordSubmission(caseId: string, filingId: string, input: { portal?: string; confirmationNumber?: string; docketNumber?: string; filingFee?: string; status?: string }) {
  const { user } = await assertOwnedCase(caseId);
  const filing = await prisma.filing.findFirst({ where: { id: filingId, caseId } });
  if (!filing) throw new Error('Filing not found');
  const data = z.object({ portal: z.string().max(40).optional(), confirmationNumber: z.string().max(120).optional(), docketNumber: z.string().max(120).optional(), filingFee: z.string().max(60).optional(), status: z.string().max(40).optional() }).parse(input);
  const sub = await prisma.filingSubmission.create({
    data: { filingId, portal: data.portal || filing.portalType, submittedAt: new Date(), confirmationNumber: data.confirmationNumber || null, docketNumber: data.docketNumber || null, filingFee: data.filingFee || null, status: data.status || 'accepted' },
  });
  await prisma.filing.update({ where: { id: filingId }, data: { stage: 'filed', actualFilingDate: new Date(), status: 'filed', docketNumber: data.docketNumber || filing.docketNumber } });
  await prisma.filingStageHistory.create({ data: { filingId, fromStage: filing.stage, toStage: 'filed', note: `Submitted (${data.confirmationNumber ?? 'no conf#'})` } });
  await audit(user.id, 'filing.submit', 'FilingSubmission', sub.id, `status=${sub.status}`);
  bump(caseId, `filing/${filingId}`, 'filing-workspace');
  return { id: sub.id };
}

export async function addFiledStampedCopy(caseId: string, filingId: string) {
  const { user } = await assertOwnedCase(caseId);
  const filing = await prisma.filing.findFirst({ where: { id: filingId, caseId }, include: { versions: true } });
  if (!filing) throw new Error('Filing not found');
  const v = await prisma.filingVersion.create({ data: { filingId, versionNumber: filing.versions.length + 1, label: 'filed-stamped', reviewStatus: 'approved', approvalStatus: 'final-for-filing', createdBy: 'user', changesSummary: 'Filed-stamped copy from the court' } });
  await prisma.filing.update({ where: { id: filingId }, data: { stage: 'filed-stamped' } });
  await audit(user.id, 'filing.filed-stamped', 'FilingVersion', v.id);
  bump(caseId, `filing/${filingId}`);
}

/* ============================ FILING PACKAGE ============================ */

export async function createFilingPackage(caseId: string, filingId: string | null, title: string) {
  const { user } = await assertOwnedCase(caseId);
  if (filingId) await assertSameCase(caseId, [{ model: 'filing', ids: [filingId] }]);
  const pkg = await prisma.filingPackage.create({ data: { caseId, filingId, title } });
  await audit(user.id, 'filing-package.create', 'FilingPackage', pkg.id);
  bump(caseId, 'filing-workspace', filingId ? `filing/${filingId}` : 'filing-workspace');
  return { id: pkg.id };
}

export async function addPackageItem(caseId: string, packageId: string, input: { label: string; documentId?: string; pageRange?: string; confidentiality?: string; separateUpload?: boolean; exhibitDesignation?: string }) {
  const { user } = await assertOwnedCase(caseId);
  const pkg = await prisma.filingPackage.findFirst({ where: { id: packageId, caseId }, include: { items: true } });
  if (!pkg) throw new Error('Package not found');
  const data = z.object({ label: z.string().max(200), documentId: z.string().optional(), pageRange: z.string().max(40).optional(), confidentiality: z.string().max(40).optional(), separateUpload: z.boolean().optional(), exhibitDesignation: z.string().max(40).optional() }).parse(input);
  if (data.documentId) await assertSameCase(caseId, [{ model: 'document', ids: [data.documentId] }]);
  const item = await prisma.filingPackageItem.create({
    data: { packageId, order: pkg.items.length, label: data.label, documentId: data.documentId || null, pageRange: data.pageRange || null, confidentiality: data.confidentiality || 'public', separateUpload: data.separateUpload ?? false, exhibitDesignation: data.exhibitDesignation || null },
  });
  await audit(user.id, 'filing-package.item', 'FilingPackageItem', item.id);
  bump(caseId, `filing-package/${packageId}`);
  return { id: item.id };
}

/* ============================ CERTIFICATE + SERVICE ============================ */

export async function generateCertificate(caseId: string, filingId: string, input: { serviceDate?: string; servingParty?: string; method?: string; recipientsText?: string }) {
  const { user } = await assertOwnedCase(caseId);
  const filing = await prisma.filing.findFirst({ where: { id: filingId, caseId }, include: { case: true } });
  if (!filing) throw new Error('Filing not found');
  const data = z.object({ serviceDate: z.string().optional(), servingParty: z.string().max(200).optional(), method: z.string().max(40).optional(), recipientsText: z.string().max(4000).optional() }).parse(input);
  const statement = `I hereby certify that on ${data.serviceDate || '[DATE]'} I served a true and correct copy of ${filing.title} upon ${data.recipientsText || '[RECIPIENTS]'} by ${data.method || '[METHOD]'}. (Draft — review before filing.)`;
  const cert = await prisma.certificateOfService.create({
    data: { caseId, filingId, serviceDate: data.serviceDate ? new Date(data.serviceDate) : null, servingParty: data.servingParty || null, method: data.method || null, recipientsText: data.recipientsText || null, statementText: statement, filedStatus: 'draft', verificationStatus: 'proposed', createdBy: 'user' },
  });
  await prisma.filing.update({ where: { id: filingId }, data: { certificateOfService: true } });
  await audit(user.id, 'certificate.generate', 'CertificateOfService', cert.id);
  bump(caseId, `filing/${filingId}`);
  return { id: cert.id };
}

export async function createServiceRecipient(caseId: string, input: { name: string; role?: string; representedParty?: string; email?: string; serviceAddress?: string; preferredMethod?: string; sourceOfAddress?: string }) {
  const { user } = await assertOwnedCase(caseId);
  const data = z.object({ name: z.string().min(1).max(200), role: z.string().max(120).optional(), representedParty: z.string().max(200).optional(), email: z.string().max(200).optional(), serviceAddress: z.string().max(400).optional(), preferredMethod: z.string().max(40).optional(), sourceOfAddress: z.string().max(200).optional() }).parse(input);
  const r = await prisma.serviceRecipient.create({ data: { caseId, ...data, lastVerified: null } });
  await audit(user.id, 'service-recipient.create', 'ServiceRecipient', r.id);
  bump(caseId, 'service');
  return { id: r.id };
}

export async function recordServiceEvent(caseId: string, input: { filingId?: string; recipientId?: string; recipientName: string; serviceMethod?: string; serviceDate?: string; address?: string; trackingNumber?: string }) {
  const { user } = await assertOwnedCase(caseId);
  const data = z.object({ filingId: z.string().optional(), recipientId: z.string().optional(), recipientName: z.string().min(1).max(200), serviceMethod: z.string().max(40).optional(), serviceDate: z.string().optional(), address: z.string().max(400).optional(), trackingNumber: z.string().max(120).optional() }).parse(input);
  if (data.filingId) await assertSameCase(caseId, [{ model: 'filing', ids: [data.filingId] }]);
  const ev = await prisma.serviceEvent.create({
    data: { caseId, filingId: data.filingId || null, recipientId: data.recipientId || null, recipientName: data.recipientName, serviceMethod: data.serviceMethod || null, serviceDate: data.serviceDate ? new Date(data.serviceDate) : new Date(), address: data.address || null, trackingNumber: data.trackingNumber || null, deliveryStatus: 'sent', verificationStatus: 'confirmed' },
  });
  // Timeline integration.
  await prisma.timelineEvent.create({ data: { caseId, date: ev.serviceDate ?? new Date(), title: `Served: ${data.recipientName}`, eventType: 'service', verificationStatus: 'confirmed' } });
  await audit(user.id, 'service.event', 'ServiceEvent', ev.id);
  bump(caseId, 'service', 'comms/service-history', 'timeline', data.filingId ? `filing/${data.filingId}` : 'service');
  return { id: ev.id };
}

/* ============================ COMMUNICATIONS ============================ */

export async function createCommunication(caseId: string, input: { kind: string; direction?: string; subject?: string; summary?: string; withParty?: string; sender?: string; recipients?: string; confidentiality?: string; settlementComm?: boolean; followUpRequired?: boolean; relatedFilingId?: string }) {
  const { user } = await assertOwnedCase(caseId);
  const data = z.object({ kind: z.string().max(40), direction: z.string().max(30).optional(), subject: z.string().max(300).optional(), summary: z.string().max(4000).optional(), withParty: z.string().max(200).optional(), sender: z.string().max(200).optional(), recipients: z.string().max(1000).optional(), confidentiality: z.string().max(40).optional(), settlementComm: z.boolean().optional(), followUpRequired: z.boolean().optional(), relatedFilingId: z.string().optional() }).parse(input);
  if (data.relatedFilingId) await assertSameCase(caseId, [{ model: 'filing', ids: [data.relatedFilingId] }]);
  const c = await prisma.communication.create({
    data: { caseId, kind: data.kind, direction: data.direction || 'outbound', subject: data.subject || null, summary: data.summary || null, withParty: data.withParty || null, sender: data.sender || null, recipients: data.recipients || null, confidentiality: data.confidentiality || 'public', settlementComm: data.settlementComm ?? false, followUpRequired: data.followUpRequired ?? false, relatedFilingId: data.relatedFilingId || null, occurredAt: new Date(), createdBy: 'user' },
  });
  await audit(user.id, 'communication.create', 'Communication', c.id, `kind=${data.kind}`);
  bump(caseId, 'comms/emails', 'communications');
  return { id: c.id };
}

/** Follow-up workflow: spin a task off a communication. */
export async function communicationFollowUp(caseId: string, communicationId: string, taskTitle: string) {
  const { user } = await assertOwnedCase(caseId);
  const comm = await prisma.communication.findFirst({ where: { id: communicationId, caseId } });
  if (!comm) throw new Error('Communication not found');
  const t = await prisma.task.create({ data: { caseId, title: taskTitle, why: `Follow-up on communication: ${comm.subject ?? comm.kind}`, priority: 'normal' } });
  await prisma.communication.update({ where: { id: communicationId }, data: { followUpRequired: true } });
  await audit(user.id, 'communication.followup', 'Task', t.id);
  bump(caseId, 'comms/emails', 'deadlines');
  return { taskId: t.id };
}
