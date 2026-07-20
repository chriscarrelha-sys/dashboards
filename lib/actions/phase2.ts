'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { assertOwnedCase, assertSameCase, audit } from '@/lib/auth/guard';
import { CONFIDENCE_AUTO_APPLY } from '@/lib/enums';

const bump = (caseId: string, ...slugs: string[]) => {
  revalidatePath(`/case/${caseId}`);
  for (const s of slugs) revalidatePath(`/case/${caseId}/${s}`);
};

/* ============================ EVIDENCE ============================ */

const evidenceSchema = z.object({
  title: z.string().min(1).max(300),
  proposition: z.string().max(2000).optional(),
  description: z.string().max(8000).optional(),
  evidenceType: z.string().max(60).optional(),
  posture: z.string().max(40).optional(),
  documentId: z.string().optional(),
  sourcePage: z.string().max(40).optional(),
  quotedText: z.string().max(8000).optional(),
  relatedWitnessId: z.string().optional(),
  authenticationNote: z.string().max(4000).optional(),
  legalIssueId: z.string().optional(),
  elementId: z.string().optional(),
  relation: z.enum(['supporting', 'adverse', 'impeachment']).default('supporting'),
  discoveryRequestId: z.string().optional(),
  timelineEventId: z.string().optional(),
});

export async function createEvidence(caseId: string, input: z.input<typeof evidenceSchema>) {
  const { user } = await assertOwnedCase(caseId);
  const data = evidenceSchema.parse(input);

  // Validate every linked id belongs to THIS case (no cross-case leakage).
  await assertSameCase(caseId, [
    { model: 'document', ids: [data.documentId] },
    { model: 'witness', ids: [data.relatedWitnessId] },
    { model: 'legalIssue', ids: [data.legalIssueId] },
    { model: 'discoveryRequest', ids: [data.discoveryRequestId] },
    { model: 'timelineEvent', ids: [data.timelineEventId] },
  ]);
  if (data.elementId) {
    const el = await prisma.legalIssueElement.findFirst({
      where: { id: data.elementId, legalIssue: { caseId } },
    });
    if (!el) throw new Error('Element not in this case');
  }

  const ev = await prisma.evidenceItem.create({
    data: {
      caseId,
      title: data.title,
      proposition: data.proposition || null,
      description: data.description || null,
      evidenceType: data.evidenceType || null,
      posture: data.posture || null,
      documentId: data.documentId || null,
      sourcePage: data.sourcePage || null,
      quotedText: data.quotedText || null,
      relatedWitnessId: data.relatedWitnessId || null,
      authenticationNote: data.authenticationNote || null,
      createdBy: 'user',
      creationSource: data.documentId ? 'document' : 'manual',
      verificationStatus: 'confirmed',
      reviewStatus: 'reviewed',
      evidentiaryStatus: 'identified',
    },
  });

  // Optional inline links (reuse relationship join tables).
  if (data.legalIssueId) {
    await prisma.evidenceLegalIssueLink.create({
      data: { evidenceId: ev.id, legalIssueId: data.legalIssueId, elementId: data.elementId || null, relation: data.relation },
    });
  }
  if (data.discoveryRequestId) {
    await prisma.evidenceDiscoveryLink.create({ data: { evidenceId: ev.id, discoveryRequestId: data.discoveryRequestId } });
  }
  if (data.timelineEventId) {
    await prisma.evidenceTimelineLink.create({ data: { evidenceId: ev.id, timelineEventId: data.timelineEventId } });
  }
  if (data.documentId) {
    await prisma.evidenceDocumentLink.create({ data: { evidenceId: ev.id, documentId: data.documentId, page: data.sourcePage || null } });
  }

  await audit(user.id, 'evidence.create', 'EvidenceItem', ev.id, `type=${data.evidenceType ?? '—'}`);
  bump(caseId, 'evidence', data.documentId ? `document/${data.documentId}` : 'evidence');
  return { id: ev.id };
}

export async function updateEvidence(caseId: string, id: string, patch: Record<string, unknown>) {
  const { user } = await assertOwnedCase(caseId);
  const allowed = z.object({
    title: z.string().max(300).optional(),
    proposition: z.string().max(2000).optional(),
    evidenceType: z.string().max(60).optional(),
    posture: z.string().max(40).optional(),
    evidentiaryStatus: z.string().max(60).optional(),
    authenticationStatus: z.string().max(60).optional(),
    exhibitStatus: z.string().max(60).optional(),
    exhibitLabel: z.string().max(20).optional(),
    disputed: z.boolean().optional(),
    notes: z.string().max(8000).optional(),
  }).parse(patch);
  const before = await prisma.evidenceItem.findFirst({ where: { id, caseId } });
  if (!before) throw new Error('Evidence not found');
  await prisma.evidenceItem.update({ where: { id }, data: { ...allowed, verificationStatus: 'corrected' } });
  await audit(user.id, 'evidence.update', 'EvidenceItem', id, JSON.stringify(allowed));
  bump(caseId, 'evidence');
}

export async function linkEvidenceToIssue(
  caseId: string, evidenceId: string, legalIssueId: string, elementId: string | null, relation: string,
) {
  const { user } = await assertOwnedCase(caseId);
  await assertSameCase(caseId, [
    { model: 'evidenceItem', ids: [evidenceId] },
    { model: 'legalIssue', ids: [legalIssueId] },
  ]);
  // Create-if-absent (composite unique includes a nullable elementId, so upsert is awkward).
  const exists = await prisma.evidenceLegalIssueLink.findFirst({ where: { evidenceId, legalIssueId, elementId, relation } });
  if (!exists) await prisma.evidenceLegalIssueLink.create({ data: { evidenceId, legalIssueId, elementId, relation } });
  await audit(user.id, 'evidence.link-issue', 'EvidenceItem', evidenceId, `issue=${legalIssueId} rel=${relation}`);
  bump(caseId, 'evidence', `legal-issue/${legalIssueId}`);
}

export async function deleteEvidence(caseId: string, id: string) {
  const { user } = await assertOwnedCase(caseId);
  const ev = await prisma.evidenceItem.findFirst({ where: { id, caseId } });
  if (!ev) throw new Error('Not found');
  await prisma.evidenceItem.delete({ where: { id } });
  await audit(user.id, 'evidence.delete', 'EvidenceItem', id);
  bump(caseId, 'evidence');
}

/* ============================ CONTRADICTIONS ============================ */

const contradictionSchema = z.object({
  title: z.string().max(300).optional(),
  summary: z.string().min(1).max(2000),
  explanation: z.string().max(4000).optional(),
  materiality: z.string().max(20).optional(),
  significance: z.string().max(2000).optional(),
  relatedWitnessId: z.string().optional(),
  statements: z.array(z.object({
    label: z.string().max(4),
    text: z.string().min(1).max(4000),
    documentId: z.string().optional(),
    sourcePage: z.string().max(40).optional(),
    author: z.string().max(200).optional(),
  })).min(2),
});

export async function createContradiction(caseId: string, input: z.infer<typeof contradictionSchema>) {
  const { user } = await assertOwnedCase(caseId);
  const data = contradictionSchema.parse(input);
  await assertSameCase(caseId, [
    { model: 'witness', ids: [data.relatedWitnessId] },
    { model: 'document', ids: data.statements.map((s) => s.documentId) },
  ]);
  const c = await prisma.contradiction.create({
    data: {
      caseId,
      title: data.title || null,
      summary: data.summary,
      explanation: data.explanation || null,
      materiality: data.materiality || null,
      significance: data.significance || null,
      relatedWitnessId: data.relatedWitnessId || null,
      statementA: data.statements[0]?.text ?? null,
      statementB: data.statements[1]?.text ?? null,
      status: 'confirmed',
      verificationStatus: 'confirmed',
      createdBy: 'user',
      statements: {
        create: data.statements.map((s) => ({
          label: s.label, text: s.text, documentId: s.documentId || null,
          sourcePage: s.sourcePage || null, author: s.author || null,
        })),
      },
    },
  });
  await audit(user.id, 'contradiction.create', 'Contradiction', c.id);
  bump(caseId, 'contradictions');
  return { id: c.id };
}

export async function setContradictionStatus(caseId: string, id: string, status: string) {
  const { user } = await assertOwnedCase(caseId);
  const c = await prisma.contradiction.findFirst({ where: { id, caseId } });
  if (!c) throw new Error('Not found');
  const verification = status === 'confirmed' ? 'confirmed' : status === 'rejected' ? 'disputed' : c.verificationStatus;
  await prisma.contradiction.update({ where: { id }, data: { status, verificationStatus: verification } });
  await audit(user.id, `contradiction.${status}`, 'Contradiction', id);
  bump(caseId, 'contradictions');
}

/* ============================ ADMISSIONS ============================ */

const admissionSchema = z.object({
  title: z.string().max(300).optional(),
  statement: z.string().min(1).max(4000),
  verbatimText: z.string().max(8000).optional(),
  category: z.string().max(60).optional(),
  admittingParty: z.string().max(200).optional(),
  documentId: z.string().optional(),
  sourcePage: z.string().max(40).optional(),
  significance: z.string().max(2000).optional(),
});

export async function createAdmission(caseId: string, input: z.infer<typeof admissionSchema>) {
  const { user } = await assertOwnedCase(caseId);
  const data = admissionSchema.parse(input);
  await assertSameCase(caseId, [{ model: 'document', ids: [data.documentId] }]);
  const a = await prisma.admission.create({
    data: {
      caseId, title: data.title || null, statement: data.statement, verbatimText: data.verbatimText || null,
      category: data.category || null, admittingParty: data.admittingParty || null,
      documentId: data.documentId || null, sourcePage: data.sourcePage || null,
      significance: data.significance || null, verificationStatus: 'confirmed', createdBy: 'user',
    },
  });
  await audit(user.id, 'admission.create', 'Admission', a.id);
  bump(caseId, 'admissions');
  return { id: a.id };
}

/* ============================ LEGAL ISSUES + ELEMENTS ============================ */

const legalIssueSchema = z.object({
  title: z.string().min(1).max(300),
  issueType: z.string().max(40).default('claim'),
  description: z.string().max(8000).optional(),
  assertingParty: z.string().max(200).optional(),
  opposingParty: z.string().max(200).optional(),
  standard: z.string().max(400).optional(),
  burdenHolder: z.string().max(200).optional(),
  requestedRelief: z.string().max(2000).optional(),
});

export async function createLegalIssue(caseId: string, input: z.infer<typeof legalIssueSchema>) {
  const { user } = await assertOwnedCase(caseId);
  const data = legalIssueSchema.parse(input);
  const li = await prisma.legalIssue.create({
    data: { caseId, ...data, category: 'substantive', verificationStatus: 'confirmed', createdBy: 'user', status: 'asserted' },
  });
  await audit(user.id, 'legal-issue.create', 'LegalIssue', li.id, `type=${data.issueType}`);
  bump(caseId, 'claims', 'defenses', `legal-issue/${li.id}`);
  return { id: li.id };
}

export async function addElement(caseId: string, legalIssueId: string, input: { title: string; standard?: string; burdenHolder?: string }) {
  const { user } = await assertOwnedCase(caseId);
  const li = await prisma.legalIssue.findFirst({ where: { id: legalIssueId, caseId }, include: { elements: true } });
  if (!li) throw new Error('Legal issue not found');
  const data = z.object({ title: z.string().min(1).max(300), standard: z.string().max(400).optional(), burdenHolder: z.string().max(200).optional() }).parse(input);
  const el = await prisma.legalIssueElement.create({
    data: { legalIssueId, number: li.elements.length + 1, title: data.title, standard: data.standard || null, burdenHolder: data.burdenHolder || null, status: 'unsupported' },
  });
  await audit(user.id, 'element.create', 'LegalIssueElement', el.id);
  bump(caseId, `legal-issue/${legalIssueId}`);
  return { id: el.id };
}

export async function setElementStatus(caseId: string, elementId: string, status: string, assessment?: string) {
  const { user } = await assertOwnedCase(caseId);
  const el = await prisma.legalIssueElement.findFirst({ where: { id: elementId, legalIssue: { caseId } }, include: { legalIssue: true } });
  if (!el) throw new Error('Element not found');
  await prisma.legalIssueElement.update({ where: { id: elementId }, data: { status, assessment: assessment ?? el.assessment } });
  await audit(user.id, 'element.status', 'LegalIssueElement', elementId, `status=${status}`);
  bump(caseId, `legal-issue/${el.legalIssueId}`);
}

/* ============================ DISCOVERY ============================ */

export async function createDiscoverySet(caseId: string, input: {
  title: string; discoveryType: string; servingParty?: string; respondingParty?: string; responseDeadline?: string;
}) {
  const { user } = await assertOwnedCase(caseId);
  const data = z.object({
    title: z.string().min(1).max(300), discoveryType: z.string().max(60),
    servingParty: z.string().max(200).optional(), respondingParty: z.string().max(200).optional(),
    responseDeadline: z.string().optional(),
  }).parse(input);
  const set = await prisma.discoverySet.create({
    data: {
      caseId, title: data.title, discoveryType: data.discoveryType,
      servingParty: data.servingParty || null, respondingParty: data.respondingParty || null,
      responseDeadline: data.responseDeadline ? new Date(data.responseDeadline) : null,
      status: 'served', verificationStatus: 'confirmed', createdBy: 'user',
    },
  });
  await audit(user.id, 'discovery-set.create', 'DiscoverySet', set.id);
  bump(caseId, 'discovery');
  return { id: set.id };
}

export async function addDiscoveryRequest(caseId: string, setId: string, input: {
  requestNumber?: number; kind: string; shortTitle?: string; requestText: string; responseText?: string; objections?: string;
}) {
  const { user } = await assertOwnedCase(caseId);
  const set = await prisma.discoverySet.findFirst({ where: { id: setId, caseId } });
  if (!set) throw new Error('Discovery set not found');
  const data = z.object({
    requestNumber: z.coerce.number().int().optional(), kind: z.string().max(40),
    shortTitle: z.string().max(200).optional(), requestText: z.string().min(1).max(8000),
    responseText: z.string().max(8000).optional(), objections: z.string().max(4000).optional(),
  }).parse(input);
  const req = await prisma.discoveryRequest.create({
    data: {
      caseId, setId, kind: data.kind, title: data.shortTitle || `${data.kind} ${data.requestNumber ?? ''}`.trim(),
      shortTitle: data.shortTitle || null, requestNumber: data.requestNumber ?? null,
      requestText: data.requestText, responseText: data.responseText || null, objections: data.objections || null,
      servingParty: set.servingParty, respondingParty: set.respondingParty,
      verificationStatus: 'confirmed', status: data.responseText ? 'received' : 'open',
    },
  });
  await audit(user.id, 'discovery-request.create', 'DiscoveryRequest', req.id);
  bump(caseId, 'discovery', `discovery-set/${setId}`);
  return { id: req.id };
}

export async function updateDiscoveryResponse(caseId: string, requestId: string, input: { responseText?: string; objections?: string }) {
  const { user } = await assertOwnedCase(caseId);
  const req = await prisma.discoveryRequest.findFirst({ where: { id: requestId, caseId } });
  if (!req) throw new Error('Request not found');
  const data = z.object({ responseText: z.string().max(8000).optional(), objections: z.string().max(4000).optional() }).parse(input);
  await prisma.discoveryRequest.update({ where: { id: requestId }, data: { responseText: data.responseText ?? req.responseText, objections: data.objections ?? req.objections, status: 'received' } });
  await audit(user.id, 'discovery-response.update', 'DiscoveryRequest', requestId);
  bump(caseId, 'discovery', `discovery-set/${req.setId}`);
}

export async function createDeficiency(caseId: string, input: {
  title: string; category: string; discoveryRequestId?: string; explanation?: string; missingInformation?: string; governingRule?: string;
}) {
  const { user } = await assertOwnedCase(caseId);
  const data = z.object({
    title: z.string().min(1).max(300), category: z.string().max(60),
    discoveryRequestId: z.string().optional(), explanation: z.string().max(4000).optional(),
    missingInformation: z.string().max(2000).optional(), governingRule: z.string().max(400).optional(),
  }).parse(input);
  await assertSameCase(caseId, [{ model: 'discoveryRequest', ids: [data.discoveryRequestId] }]);
  const d = await prisma.discoveryDeficiency.create({
    data: {
      caseId, title: data.title, category: data.category, discoveryRequestId: data.discoveryRequestId || null,
      explanation: data.explanation || null, missingInformation: data.missingInformation || null,
      governingRule: data.governingRule || null, dateIdentified: new Date(),
      resolutionStatus: 'confirmed', verificationStatus: 'confirmed', createdBy: 'user',
    },
  });
  if (data.discoveryRequestId) await prisma.discoveryRequest.update({ where: { id: data.discoveryRequestId }, data: { deficiencyStatus: 'confirmed' } });
  await audit(user.id, 'deficiency.create', 'DiscoveryDeficiency', d.id, `category=${data.category}`);
  bump(caseId, 'discovery/deficiencies', 'discovery');
  return { id: d.id };
}

export async function setDeficiencyStatus(caseId: string, id: string, status: string) {
  const { user } = await assertOwnedCase(caseId);
  const d = await prisma.discoveryDeficiency.findFirst({ where: { id, caseId } });
  if (!d) throw new Error('Not found');
  await prisma.discoveryDeficiency.update({ where: { id }, data: { resolutionStatus: status } });
  await audit(user.id, `deficiency.${status}`, 'DiscoveryDeficiency', id);
  bump(caseId, 'discovery/deficiencies');
}

export async function createMeetAndConfer(caseId: string, input: {
  title: string; communicationType?: string; participants?: string; summary?: string; demand?: string;
}) {
  const { user } = await assertOwnedCase(caseId);
  const data = z.object({
    title: z.string().min(1).max(300), communicationType: z.string().max(60).optional(),
    participants: z.string().max(1000).optional(), summary: z.string().max(4000).optional(), demand: z.string().max(2000).optional(),
  }).parse(input);
  const m = await prisma.meetAndConferRecord.create({
    data: { caseId, title: data.title, communicationType: data.communicationType || null, participants: data.participants || null, summary: data.summary || null, demand: data.demand || null, communicationDate: new Date(), status: 'open' },
  });
  await audit(user.id, 'meet-confer.create', 'MeetAndConferRecord', m.id);
  bump(caseId, 'discovery/meet-confer', 'discovery');
  return { id: m.id };
}

export async function createWitness(caseId: string, input: { name: string; role?: string; party?: string; expectedTestimony?: string }) {
  const { user } = await assertOwnedCase(caseId);
  const data = z.object({ name: z.string().min(1).max(200), role: z.string().max(120).optional(), party: z.string().max(120).optional(), expectedTestimony: z.string().max(4000).optional() }).parse(input);
  const w = await prisma.witness.create({ data: { caseId, name: data.name, role: data.role || null, party: data.party || null, expectedTestimony: data.expectedTestimony || null } });
  await audit(user.id, 'witness.create', 'Witness', w.id);
  bump(caseId, 'people/witnesses', 'witnesses');
  return { id: w.id };
}

export async function createSubpoena(caseId: string, input: { recipient: string; subpoenaType: string; requested?: string }) {
  const { user } = await assertOwnedCase(caseId);
  const data = z.object({ recipient: z.string().min(1).max(200), subpoenaType: z.string().max(40), requested: z.string().max(2000).optional() }).parse(input);
  const s = await prisma.subpoena.create({ data: { caseId, recipient: data.recipient, subpoenaType: data.subpoenaType, requested: data.requested || null, status: 'draft' } });
  await audit(user.id, 'subpoena.create', 'Subpoena', s.id);
  bump(caseId, 'discovery/subpoenas');
  return { id: s.id };
}
