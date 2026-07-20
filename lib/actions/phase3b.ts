'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { assertOwnedCase, audit } from '@/lib/auth/guard';
import { routeProvider } from '@/lib/providers/ai/registry';

const bump = (caseId: string, ...slugs: string[]) => {
  revalidatePath(`/case/${caseId}`);
  for (const s of slugs) revalidatePath(`/case/${caseId}/${s}`);
};

/* ============================ AUTHORITIES + RESEARCH ============================ */

export async function createAuthority(caseId: string, input: { citation: string; authorityType?: string; court?: string; jurisdiction?: string; year?: number; proposition?: string; pinpoint?: string; url?: string }) {
  const { user } = await assertOwnedCase(caseId);
  const data = z.object({ citation: z.string().min(1).max(400), authorityType: z.string().max(40).optional(), court: z.string().max(200).optional(), jurisdiction: z.string().max(120).optional(), year: z.coerce.number().int().optional(), proposition: z.string().max(2000).optional(), pinpoint: z.string().max(120).optional(), url: z.string().max(600).optional() }).parse(input);
  const a = await prisma.authority.create({
    // AI or user, citations start UNVERIFIED until the source is opened/confirmed.
    data: { caseId, citation: data.citation, court: data.court || null, jurisdiction: data.jurisdiction || null, year: data.year ?? null, proposition: data.proposition || null, pinpoint: data.pinpoint || null, url: data.url || null, verificationStatus: 'unverified' },
  });
  await audit(user.id, 'authority.create', 'Authority', a.id);
  bump(caseId, 'research', 'authorities');
  return { id: a.id };
}

/** Record a verification step; the final step's status becomes the authority status. */
export async function verifyAuthority(caseId: string, authorityId: string, step: string, status: string, note?: string) {
  const { user } = await assertOwnedCase(caseId);
  const a = await prisma.authority.findFirst({ where: { id: authorityId, caseId } });
  if (!a) throw new Error('Authority not found');
  await prisma.authorityVerification.create({ data: { authorityId, step, status, note: note || null } });
  // Promote overall status when a human confirms a substantive step.
  const promote: Record<string, string> = { exists: 'source-located', quotation: 'citation-confirmed', pinpoint: 'pinpoint-confirmed', treatment: 'treatment-checked', controlling: 'controlling' };
  if (status === 'confirmed' && promote[step]) {
    await prisma.authority.update({ where: { id: authorityId }, data: { verificationStatus: promote[step], dateVerified: new Date() } });
  }
  await audit(user.id, 'authority.verify', 'Authority', authorityId, `${step}=${status}`);
  bump(caseId, 'research', 'authorities');
}

export async function createResearchQuestion(caseId: string, input: { question: string; jurisdiction?: string; legalIssueId?: string; priority?: string }) {
  const { user } = await assertOwnedCase(caseId);
  const data = z.object({ question: z.string().min(1).max(1000), jurisdiction: z.string().max(120).optional(), legalIssueId: z.string().optional(), priority: z.string().max(20).optional() }).parse(input);
  const q = await prisma.researchQuestion.create({ data: { caseId, question: data.question, jurisdiction: data.jurisdiction || null, legalIssueId: data.legalIssueId || null, priority: data.priority || 'normal', status: 'open', verificationStatus: 'confirmed' } });
  await audit(user.id, 'research-question.create', 'ResearchQuestion', q.id);
  bump(caseId, 'research');
  return { id: q.id };
}

export async function createResearchMemo(caseId: string, input: { title: string; issuePresented?: string; briefAnswer?: string; analysis?: string; conclusion?: string; jurisdiction?: string }) {
  const { user } = await assertOwnedCase(caseId);
  const data = z.object({ title: z.string().min(1).max(300), issuePresented: z.string().max(4000).optional(), briefAnswer: z.string().max(4000).optional(), analysis: z.string().max(20000).optional(), conclusion: z.string().max(4000).optional(), jurisdiction: z.string().max(120).optional() }).parse(input);
  const m = await prisma.researchMemorandum.create({ data: { caseId, title: data.title, issuePresented: data.issuePresented || null, briefAnswer: data.briefAnswer || null, analysis: data.analysis || null, conclusion: data.conclusion || null, jurisdiction: data.jurisdiction || null, createdBy: 'user', verificationStatus: 'confirmed' } });
  await audit(user.id, 'research-memo.create', 'ResearchMemorandum', m.id);
  bump(caseId, 'research');
  return { id: m.id };
}

/* ============================ STRATEGY / DECISIONS ============================ */

export async function createStrategyItem(caseId: string, input: { recordType: string; title: string; description?: string; priority?: string; assumptions?: string; risks?: string; counterarguments?: string }) {
  const { user } = await assertOwnedCase(caseId);
  const data = z.object({ recordType: z.string().max(40), title: z.string().min(1).max(300), description: z.string().max(4000).optional(), priority: z.string().max(20).optional(), assumptions: z.string().max(2000).optional(), risks: z.string().max(2000).optional(), counterarguments: z.string().max(2000).optional() }).parse(input);
  const s = await prisma.strategyItem.create({ data: { caseId, recordType: data.recordType, title: data.title, description: data.description || null, priority: data.priority || 'normal', assumptions: data.assumptions || null, risks: data.risks || null, counterarguments: data.counterarguments || null, status: 'active', sourceType: 'user', verificationStatus: 'confirmed' } });
  await audit(user.id, 'strategy.create', 'StrategyItem', s.id, `type=${data.recordType}`);
  bump(caseId, 'strategy');
  return { id: s.id };
}

/** Supersede a strategy item — preserves the old record, links the new one. */
export async function supersedeStrategyItem(caseId: string, oldId: string, input: { title: string; description?: string }) {
  const { user } = await assertOwnedCase(caseId);
  const old = await prisma.strategyItem.findFirst({ where: { id: oldId, caseId } });
  if (!old) throw new Error('Strategy item not found');
  const fresh = await prisma.strategyItem.create({ data: { caseId, recordType: old.recordType, title: input.title, description: input.description || null, status: 'active', sourceType: 'user', verificationStatus: 'confirmed' } });
  await prisma.strategyItem.update({ where: { id: oldId }, data: { status: 'superseded', supersededById: fresh.id } });
  await audit(user.id, 'strategy.supersede', 'StrategyItem', fresh.id, `supersedes=${oldId}`);
  bump(caseId, 'strategy');
  return { id: fresh.id };
}

export async function createSnapshot(caseId: string, label: string) {
  const { user } = await assertOwnedCase(caseId);
  const items = await prisma.strategyItem.findMany({ where: { caseId }, orderBy: { createdAt: 'asc' } });
  const snap = await prisma.strategySnapshot.create({ data: { caseId, label, summary: JSON.stringify(items.map((i) => ({ type: i.recordType, title: i.title, status: i.status }))) } });
  await audit(user.id, 'strategy.snapshot', 'StrategySnapshot', snap.id);
  bump(caseId, 'strategy');
  return { id: snap.id };
}

export async function createDecision(caseId: string, input: { title: string; decision: string; issueConsidered?: string; options?: string; selectedOption?: string; rationale?: string; risks?: string; expectedResult?: string }) {
  const { user } = await assertOwnedCase(caseId);
  const data = z.object({ title: z.string().min(1).max(300), decision: z.string().min(1).max(2000), issueConsidered: z.string().max(2000).optional(), options: z.string().max(2000).optional(), selectedOption: z.string().max(1000).optional(), rationale: z.string().max(4000).optional(), risks: z.string().max(2000).optional(), expectedResult: z.string().max(2000).optional() }).parse(input);
  const d = await prisma.decisionLogEntry.create({ data: { caseId, title: data.title, decision: data.decision, issueConsidered: data.issueConsidered || null, options: data.options || null, selectedOption: data.selectedOption || null, rationale: data.rationale || null, risks: data.risks || null, expectedResult: data.expectedResult || null, decidedBy: 'user' } });
  await audit(user.id, 'decision.create', 'DecisionLogEntry', d.id);
  bump(caseId, 'strategy/decision-log');
  return { id: d.id };
}

/** Decisions are immutable: record a new decision that supersedes the old. */
export async function supersedeDecision(caseId: string, oldId: string, input: { title: string; decision: string; rationale?: string }) {
  const { user } = await assertOwnedCase(caseId);
  const old = await prisma.decisionLogEntry.findFirst({ where: { id: oldId, caseId } });
  if (!old) throw new Error('Decision not found');
  const fresh = await prisma.decisionLogEntry.create({ data: { caseId, title: input.title, decision: input.decision, rationale: input.rationale || null, decidedBy: 'user' } });
  // Only set the pointer on the old record; its substance is never edited.
  await prisma.decisionLogEntry.update({ where: { id: oldId }, data: { supersededById: fresh.id } });
  await audit(user.id, 'decision.supersede', 'DecisionLogEntry', fresh.id, `supersedes=${oldId}`);
  bump(caseId, 'strategy/decision-log');
  return { id: fresh.id };
}

export async function createOpposingPosition(caseId: string, input: { issue: string; party?: string; positionSummary?: string; exactStatement?: string; weaknesses?: string; userResponse?: string }) {
  const { user } = await assertOwnedCase(caseId);
  const data = z.object({ issue: z.string().min(1).max(300), party: z.string().max(200).optional(), positionSummary: z.string().max(4000).optional(), exactStatement: z.string().max(4000).optional(), weaknesses: z.string().max(2000).optional(), userResponse: z.string().max(2000).optional() }).parse(input);
  const p = await prisma.opposingPosition.create({ data: { caseId, issue: data.issue, party: data.party || null, positionSummary: data.positionSummary || null, exactStatement: data.exactStatement || null, weaknesses: data.weaknesses || null, userResponse: data.userResponse || null, status: 'active', verificationStatus: 'confirmed' } });
  await audit(user.id, 'opposing-position.create', 'OpposingPosition', p.id);
  bump(caseId, 'strategy/opposing');
  return { id: p.id };
}

/* ============================ SETTLEMENT / DAMAGES / REMEDIES ============================ */

export async function createSettlement(caseId: string, input: { offerType: string; direction?: string; monetaryAmount?: number; deadline?: string; nonmonetaryTerms?: string; releaseScope?: string; confidentiality?: string; status?: string }) {
  const { user } = await assertOwnedCase(caseId);
  const data = z.object({ offerType: z.string().max(40), direction: z.string().max(20).optional(), monetaryAmount: z.coerce.number().optional(), deadline: z.string().optional(), nonmonetaryTerms: z.string().max(2000).optional(), releaseScope: z.string().max(1000).optional(), confidentiality: z.string().max(40).optional(), status: z.string().max(40).optional() }).parse(input);
  const s = await prisma.settlementRecord.create({ data: { caseId, offerType: data.offerType, direction: data.direction || 'outbound', monetaryAmount: data.monetaryAmount ?? null, deadline: data.deadline ? new Date(data.deadline) : null, nonmonetaryTerms: data.nonmonetaryTerms || null, releaseScope: data.releaseScope || null, confidentiality: data.confidentiality || 'settlement', status: data.status || 'open', offerDate: new Date() } });
  await audit(user.id, 'settlement.create', 'SettlementRecord', s.id, `type=${data.offerType}`);
  bump(caseId, 'strategy/settlement', 'strategy/negotiation');
  return { id: s.id };
}

export async function createDamage(caseId: string, input: { label: string; category?: string; amount?: number; calculationMethod?: string; assumptions?: string; causationTheory?: string }) {
  const { user } = await assertOwnedCase(caseId);
  const data = z.object({ label: z.string().min(1).max(300), category: z.string().max(40).optional(), amount: z.coerce.number().optional(), calculationMethod: z.string().max(400).optional(), assumptions: z.string().max(2000).optional(), causationTheory: z.string().max(2000).optional() }).parse(input);
  const d = await prisma.damageItem.create({ data: { caseId, label: data.label, category: data.category || null, amount: data.amount ?? null, calculationMethod: data.calculationMethod || null, assumptions: data.assumptions || null, causationTheory: data.causationTheory || null, verificationStatus: 'proposed' } });
  await audit(user.id, 'damage.create', 'DamageItem', d.id);
  bump(caseId, 'strategy/damages');
  return { id: d.id };
}

export async function createRemedy(caseId: string, input: { remedyType: string; description?: string; legalBasis?: string; legalIssueId?: string }) {
  const { user } = await assertOwnedCase(caseId);
  const data = z.object({ remedyType: z.string().max(40), description: z.string().max(2000).optional(), legalBasis: z.string().max(1000).optional(), legalIssueId: z.string().optional() }).parse(input);
  const r = await prisma.remedy.create({ data: { caseId, remedyType: data.remedyType, description: data.description || null, legalBasis: data.legalBasis || null, legalIssueId: data.legalIssueId || null, status: 'requested' } });
  await audit(user.id, 'remedy.create', 'Remedy', r.id);
  bump(caseId, 'strategy/remedies');
  return { id: r.id };
}

/* ============================ AI DRAFTING + REVIEW (mock) ============================ */

/** Source-controlled AI drafting (mock). Records the approved source scope. */
export async function aiDraft(caseId: string, filingId: string | null, task: string, prompt: string, sourceScope: string[]) {
  const { user } = await assertOwnedCase(caseId);
  if (filingId) {
    const f = await prisma.filing.findFirst({ where: { id: filingId, caseId } });
    if (!f) throw new Error('Filing not found');
  }
  const { provider } = routeProvider('drafting');
  const output = [
    `**[Mock AI draft — no live model configured]**`,
    ``,
    `Task: ${task}`,
    `Source scope (as approved by you): ${sourceScope.length ? sourceScope.join(', ') : 'no case sources'}`,
    ``,
    `[MOCK] Draft text would appear here, grounded only in the approved sources. Factual`,
    `statements are tagged to sources; legal propositions carry their authority's`,
    `verification status. Where no verified source supports an assertion, it is flagged`,
    `rather than fabricated. Save this as a filing version after your review.`,
  ].join('\n');
  const run = await prisma.aIDraftRun.create({ data: { caseId, filingId, provider: provider.key, task, sourceScope: JSON.stringify(sourceScope), prompt, output, destinationFilingId: filingId, verificationStatus: 'proposed' } });
  await audit(user.id, 'ai.draft', 'AIDraftRun', run.id, `task=${task} provider=${provider.key}`);
  if (filingId) bump(caseId, `filing/${filingId}`);
  bump(caseId, 'ai/drafting');
  return { id: run.id, output, provider: provider.key };
}

/**
 * AI draft review (mock). Scans a filing's latest draft for operational issues
 * and files DraftReviewIssue rows + Verification Queue entries. Never rewrites.
 */
export async function aiReviewDraft(caseId: string, filingId: string) {
  const { user } = await assertOwnedCase(caseId);
  const filing = await prisma.filing.findFirst({ where: { id: filingId, caseId }, include: { versions: true, certificates: true, authorityLinks: { include: { authority: true } } } });
  if (!filing) throw new Error('Filing not found');
  const latest = filing.versions.at(-1);
  const issues: { issueType: string; explanation: string; severity: string; location: string }[] = [];
  if (latest?.contentText && /\b(TODO|INSERT|TBD)\b|\[[^\]]+\]/i.test(latest.contentText)) issues.push({ issueType: 'unresolved-placeholder', explanation: 'Draft contains placeholder text.', severity: 'high', location: 'draft body' });
  if (!filing.certificates.length) issues.push({ issueType: 'missing-certificate', explanation: 'No certificate of service is attached.', severity: 'warning', location: 'components' });
  if (filing.authorityLinks.some((a) => a.authority.verificationStatus === 'unverified' || a.authority.verificationStatus === 'proposed')) issues.push({ issueType: 'unverified-authority', explanation: 'A cited authority is unverified.', severity: 'warning', location: 'authorities' });
  if (!latest) issues.push({ issueType: 'missing-source-links', explanation: 'No draft version exists to review.', severity: 'info', location: 'draft' });

  for (const it of issues) {
    await prisma.draftReviewIssue.create({ data: { caseId, filingId, issueType: it.issueType, explanation: it.explanation, severity: it.severity, location: it.location, confidence: 0.6, status: 'open' } });
    await prisma.reviewQueueItem.create({ data: { caseId, kind: 'draft-review', title: `Draft review: ${it.issueType}`, provider: 'mock', confidence: 0.6, reason: it.explanation, status: 'pending', proposal: JSON.stringify(it) } });
  }
  await audit(user.id, 'ai.review-draft', 'Filing', filingId, `${issues.length} issue(s)`);
  bump(caseId, `filing/${filingId}`, 'verification-queue');
  return { issues: issues.length };
}
