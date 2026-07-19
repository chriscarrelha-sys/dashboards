'use server';

import { randomUUID, createHash } from 'node:crypto';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth/session';
import { getStorageProvider } from '@/lib/storage/local';
import { classifyByFilename } from '@/lib/documents/classify';
import { generateStandardizedName, extFromName } from '@/lib/documents/filename';
import { computeAdHoc, type CountMethod } from '@/lib/deadlines/rule-engine';
import { runMockAI } from '@/lib/providers/ai/mock';
import { routeProvider, type AITask } from '@/lib/providers/ai/registry';

/** Confirm the case belongs to the signed-in user before any mutation. */
async function assertOwnedCase(caseId: string) {
  const user = await getCurrentUser();
  const c = await prisma.case.findFirst({ where: { id: caseId, userId: user.id }, select: { id: true, shortName: true } });
  if (!c) throw new Error('Case not found');
  return { user, c };
}

async function audit(userId: string, action: string, entity: string, entityId: string, detail?: string) {
  await prisma.auditLog.create({ data: { userId, action, entity, entityId, detail } });
}

// ------------------------------------------------------------------ Documents

export async function uploadDocument(caseId: string, formData: FormData) {
  const { user } = await assertOwnedCase(caseId);
  const file = formData.get('file');
  if (!(file instanceof File)) throw new Error('No file provided');

  const bytes = Buffer.from(await file.arrayBuffer());
  const sha256 = createHash('sha256').update(bytes).digest('hex');
  const storageKey = randomUUID();
  await getStorageProvider('local').put(storageKey, bytes);

  const c = await prisma.case.findUniqueOrThrow({ where: { id: caseId }, select: { shortName: true } });
  const cls = classifyByFilename(file.name);
  const standardizedName = generateStandardizedName({
    date: cls.docDate,
    caseShortName: c.shortName,
    title: cls.docType,
    party: cls.party,
    status: cls.docStatus,
    ext: extFromName(file.name) || 'pdf',
  });

  const categoryByStatus: Record<string, string> = { filed: 'filed', served: 'filed', entered: 'orders', draft: 'drafts' };
  const category = cls.docType === 'Order' ? 'orders'
    : cls.docType === 'Correspondence' ? 'correspondence'
    : cls.docStatus ? categoryByStatus[cls.docStatus] ?? null
    : null;

  const doc = await prisma.document.create({
    data: {
      caseId,
      originalName: file.name,
      standardizedName,
      title: cls.autoApply ? cls.docType : null,
      docType: cls.docType,
      category,
      docDate: cls.docDate,
      party: cls.party,
      docStatus: cls.docStatus,
      mimeType: file.type || null,
      sizeBytes: bytes.length,
      sha256,
      storageKey,
      storageProvider: 'local',
      sourceLabel: 'upload',
      confidence: cls.confidence,
      verificationStatus: cls.autoApply ? 'confirmed' : 'proposed',
      reviewStatus: cls.autoApply ? 'reviewed' : 'queued',
    },
  });

  // Low-confidence classifications go to the review queue (never auto-final).
  if (!cls.autoApply) {
    await prisma.reviewQueueItem.create({
      data: {
        caseId, kind: 'document-classification',
        title: `Classify “${file.name}”`,
        confidence: cls.confidence, provider: 'mock', sourceDocId: doc.id,
        proposal: JSON.stringify({ docType: cls.docType, party: cls.party, docStatus: cls.docStatus, rationale: cls.rationale }),
      },
    });
  }

  await audit(user.id, 'document.upload', 'Document', doc.id, `conf=${cls.confidence.toFixed(2)}`);
  revalidatePath(`/case/${caseId}/documents`);
  revalidatePath(`/case/${caseId}/review-queue`);
  return { id: doc.id, autoApply: cls.autoApply, standardizedName };
}

const reclassSchema = z.object({
  title: z.string().max(300).optional(),
  docType: z.string().max(80).optional(),
  category: z.string().max(80).nullable().optional(),
  party: z.string().max(120).nullable().optional(),
  docStatus: z.string().max(40).nullable().optional(),
  notes: z.string().max(4000).optional(),
});

export async function updateDocument(caseId: string, docId: string, input: z.infer<typeof reclassSchema>) {
  const { user } = await assertOwnedCase(caseId);
  const data = reclassSchema.parse(input);
  await prisma.document.update({
    where: { id: docId },
    data: { ...data, verificationStatus: 'corrected', reviewStatus: 'reviewed' },
  });
  await audit(user.id, 'document.update', 'Document', docId);
  revalidatePath(`/case/${caseId}/documents`);
  revalidatePath(`/case/${caseId}/document/${docId}`);
}

// ------------------------------------------------------------------ Review queue

export async function resolveReviewItem(caseId: string, itemId: string, decision: 'approve' | 'reject') {
  const { user } = await assertOwnedCase(caseId);
  const item = await prisma.reviewQueueItem.findUniqueOrThrow({ where: { id: itemId } });
  if (item.sourceDocId) {
    await prisma.document.update({
      where: { id: item.sourceDocId },
      data: decision === 'approve'
        ? { verificationStatus: 'confirmed', reviewStatus: 'reviewed', title: (JSON.parse(item.proposal).docType ?? null) }
        : { reviewStatus: 'reviewed' },
    });
  }
  await prisma.reviewQueueItem.update({ where: { id: itemId }, data: { status: decision === 'approve' ? 'approved' : 'rejected' } });
  await audit(user.id, `review.${decision}`, 'ReviewQueueItem', itemId);
  revalidatePath(`/case/${caseId}/review-queue`);
  revalidatePath(`/case/${caseId}/documents`);
}

// ------------------------------------------------------------------ Timeline

const timelineSchema = z.object({
  date: z.string().min(1),
  title: z.string().min(1).max(300),
  eventType: z.string().min(1),
  description: z.string().max(4000).optional(),
});

export async function createTimelineEvent(caseId: string, input: z.infer<typeof timelineSchema>) {
  const { user } = await assertOwnedCase(caseId);
  const data = timelineSchema.parse(input);
  const ev = await prisma.timelineEvent.create({
    data: {
      caseId, date: new Date(data.date), title: data.title, eventType: data.eventType,
      description: data.description || null, verificationStatus: 'confirmed',
    },
  });
  await audit(user.id, 'timeline.create', 'TimelineEvent', ev.id);
  revalidatePath(`/case/${caseId}/timeline`);
}

export async function deleteTimelineEvent(caseId: string, id: string) {
  await assertOwnedCase(caseId);
  await prisma.timelineEvent.delete({ where: { id } });
  revalidatePath(`/case/${caseId}/timeline`);
}

// ------------------------------------------------------------------ Deadlines & tasks

const deadlineSchema = z.object({
  title: z.string().min(1).max(300),
  dueDate: z.string().optional(),
  source: z.enum(['extracted', 'calculated', 'manual']).default('manual'),
  governingRule: z.string().max(300).optional(),
  // optional calculator inputs
  triggerDate: z.string().optional(),
  days: z.coerce.number().int().optional(),
  method: z.enum(['calendar', 'business']).optional(),
});

export async function createDeadline(caseId: string, input: z.infer<typeof deadlineSchema>) {
  const { user } = await assertOwnedCase(caseId);
  const data = deadlineSchema.parse(input);

  let dueDate: Date | null = data.dueDate ? new Date(data.dueDate) : null;
  let governingRule = data.governingRule ?? null;
  let source = data.source;
  // If calculator inputs are present, compute (always unverified).
  if (data.triggerDate && typeof data.days === 'number' && data.method) {
    const comp = computeAdHoc(new Date(data.triggerDate), data.days, data.method as CountMethod);
    dueDate = comp.dueDate;
    governingRule = comp.governingRule;
    source = 'calculated';
  }

  // Deadlines/hearings/service dates ALWAYS start unverified unless user set manual+confirmed.
  const verificationStatus = source === 'manual' && data.dueDate ? 'confirmed' : 'unverified';

  const d = await prisma.deadline.create({
    data: { caseId, title: data.title, dueDate, source, governingRule, verificationStatus },
  });
  await audit(user.id, 'deadline.create', 'Deadline', d.id, `source=${source}`);
  revalidatePath(`/case/${caseId}/deadlines`);
  revalidatePath(`/case/${caseId}`);
}

export async function confirmDeadline(caseId: string, id: string) {
  const { user } = await assertOwnedCase(caseId);
  await prisma.deadline.update({ where: { id }, data: { verificationStatus: 'confirmed' } });
  await audit(user.id, 'deadline.confirm', 'Deadline', id);
  revalidatePath(`/case/${caseId}/deadlines`);
  revalidatePath(`/case/${caseId}`);
}

export async function toggleDeadlineDone(caseId: string, id: string, done: boolean) {
  await assertOwnedCase(caseId);
  await prisma.deadline.update({ where: { id }, data: { done } });
  revalidatePath(`/case/${caseId}/deadlines`);
}

export async function deleteDeadline(caseId: string, id: string) {
  await assertOwnedCase(caseId);
  await prisma.deadline.delete({ where: { id } });
  revalidatePath(`/case/${caseId}/deadlines`);
  revalidatePath(`/case/${caseId}`);
}

const taskSchema = z.object({
  title: z.string().min(1).max(300),
  why: z.string().max(2000).optional(),
  priority: z.enum(['low', 'normal', 'high', 'critical']).default('normal'),
  dueDate: z.string().optional(),
  isNextAction: z.boolean().optional(),
});

export async function createTask(caseId: string, input: z.infer<typeof taskSchema>) {
  const { user } = await assertOwnedCase(caseId);
  const data = taskSchema.parse(input);
  if (data.isNextAction) {
    await prisma.task.updateMany({ where: { caseId, isNextAction: true }, data: { isNextAction: false } });
  }
  const t = await prisma.task.create({
    data: {
      caseId, title: data.title, why: data.why || null, priority: data.priority,
      dueDate: data.dueDate ? new Date(data.dueDate) : null, isNextAction: data.isNextAction ?? false,
    },
  });
  await audit(user.id, 'task.create', 'Task', t.id);
  revalidatePath(`/case/${caseId}/deadlines`);
  revalidatePath(`/case/${caseId}`);
}

export async function setTaskStatus(caseId: string, id: string, status: string) {
  await assertOwnedCase(caseId);
  await prisma.task.update({ where: { id }, data: { status } });
  revalidatePath(`/case/${caseId}/deadlines`);
  revalidatePath(`/case/${caseId}`);
}

export async function deleteTask(caseId: string, id: string) {
  await assertOwnedCase(caseId);
  await prisma.task.delete({ where: { id } });
  revalidatePath(`/case/${caseId}/deadlines`);
  revalidatePath(`/case/${caseId}`);
}

// ------------------------------------------------------------------ AI (mock)

export async function sendAIMessage(caseId: string, conversationId: string | null, task: AITask, prompt: string, override?: string) {
  const { user } = await assertOwnedCase(caseId);
  let convo = conversationId
    ? await prisma.aIConversation.findUnique({ where: { id: conversationId } })
    : null;
  if (!convo) {
    convo = await prisma.aIConversation.create({ data: { caseId, scope: 'case', title: prompt.slice(0, 60) } });
  }

  const { provider } = routeProvider(task, override as never);
  await prisma.aIMessage.create({ data: { conversationId: convo.id, role: 'user', content: prompt } });

  // Only the mock provider is wired in v1. Real providers require server keys.
  const result = runMockAI(task, prompt);
  const msg = await prisma.aIMessage.create({
    data: { conversationId: convo.id, role: 'assistant', content: result.content, provider: provider.key },
  });
  await prisma.aIProviderRun.create({
    data: { conversationId: convo.id, provider: provider.key, task, prompt, status: 'completed' },
  });
  await prisma.aIOutput.create({ data: { messageId: msg.id, verificationStatus: 'proposed' } });
  await audit(user.id, 'ai.message', 'AIConversation', convo.id, `provider=${provider.key}`);
  revalidatePath(`/case/${caseId}/ai`);
  return { conversationId: convo.id, provider: provider.key };
}

// ------------------------------------------------------------------ Case creation

const newCaseSchema = z.object({
  shortName: z.string().min(1).max(120),
  caption: z.string().min(1).max(600),
  captionShort: z.string().max(300).optional(),
  caseNumber: z.string().min(1).max(120),
  forum: z.enum(['state', 'federal', 'arbitration']),
  caseType: z.string().max(80).optional(),
  courtName: z.string().max(300).optional(),
  division: z.string().max(200).optional(),
  judgeName: z.string().max(200).optional(),
  portalKind: z.enum(['peachcourt', 'pacer', 'other', 'none']).default('none'),
  portalUrl: z.string().url().optional().or(z.literal('')),
});

export async function createCase(input: z.infer<typeof newCaseSchema>) {
  const user = await getCurrentUser();
  const data = newCaseSchema.parse(input);

  const court = data.courtName
    ? await prisma.court.create({
        data: { name: data.courtName, system: data.forum, division: data.division || null },
      })
    : null;
  const judge = data.judgeName
    ? await prisma.judge.create({ data: { name: data.judgeName, courtId: court?.id } })
    : null;

  const created = await prisma.case.create({
    data: {
      userId: user.id,
      shortName: data.shortName,
      caption: data.caption,
      captionShort: data.captionShort || null,
      caseNumber: data.caseNumber,
      forum: data.forum,
      caseType: data.caseType || null,
      courtId: court?.id,
      judgeId: judge?.id,
      ...(data.portalKind !== 'none' && data.portalUrl
        ? { portal: { create: { kind: data.portalKind, url: data.portalUrl, label: data.portalKind === 'pacer' ? 'Open in PACER' : 'Open in PeachCourt' } } }
        : {}),
    },
  });
  await audit(user.id, 'case.create', 'Case', created.id);
  revalidatePath('/');
  return { id: created.id };
}
