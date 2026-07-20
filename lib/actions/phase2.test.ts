import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';

// revalidatePath only works inside a Next request scope; stub it for tests.
vi.mock('next/cache', () => ({ revalidatePath: () => {} }));

import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth/session';
import {
  createEvidence, linkEvidenceToIssue, createContradiction, createAdmission,
  createLegalIssue, addElement, setElementStatus, createDiscoverySet, addDiscoveryRequest, createDeficiency,
} from '@/lib/actions/phase2';
import { resolveProposal } from '@/lib/actions/verification';

let caseId: string;
let docId: string;
let otherCaseId: string;

beforeAll(async () => {
  const user = await getCurrentUser();
  const c = await prisma.case.create({
    data: { userId: user.id, shortName: 'TEST', caption: 'Test v. Test', caseNumber: 'TEST-1', forum: 'state' },
  });
  caseId = c.id;
  const doc = await prisma.document.create({
    data: { caseId, originalName: 't.pdf', standardizedName: '2026-01-01_TEST_Doc.pdf', docType: 'Motion' },
  });
  docId = doc.id;

  // A second case under a DIFFERENT user, to test cross-case prevention.
  const other = await prisma.user.create({ data: { email: `other-${Date.now()}@t.local`, name: 'Other' } });
  const oc = await prisma.case.create({
    data: { userId: other.id, shortName: 'OTHER', caption: 'Other', caseNumber: 'O-1', forum: 'state' },
  });
  otherCaseId = oc.id;
});

afterAll(async () => {
  await prisma.case.deleteMany({ where: { id: { in: [caseId, otherCaseId] } } });
  await prisma.$disconnect();
});

describe('evidence', () => {
  it('creates a source-linked evidence item and writes an audit log', async () => {
    const before = await prisma.auditLog.count();
    const { id } = await createEvidence(caseId, { title: 'Ledger', documentId: docId, sourcePage: '3', evidenceType: 'business-record' });
    const ev = await prisma.evidenceItem.findUnique({ where: { id } });
    expect(ev?.documentId).toBe(docId);
    expect(ev?.sourcePage).toBe('3');
    expect(ev?.verificationStatus).toBe('confirmed');
    // an EvidenceDocumentLink was created (no duplicate file, just a link)
    expect(await prisma.evidenceDocumentLink.count({ where: { evidenceId: id } })).toBe(1);
    expect(await prisma.auditLog.count()).toBeGreaterThan(before);
  });

  it('links evidence to a legal element', async () => {
    const { id: issueId } = await createLegalIssue(caseId, { title: 'Standing', issueType: 'defense' });
    const { id: elId } = await addElement(caseId, issueId, { title: 'Holder of note' });
    const { id: evId } = await createEvidence(caseId, { title: 'Assignment gap', evidenceType: 'documentary' });
    await linkEvidenceToIssue(caseId, evId, issueId, elId, 'supporting');
    const link = await prisma.evidenceLegalIssueLink.findFirst({ where: { evidenceId: evId, legalIssueId: issueId, elementId: elId } });
    expect(link?.relation).toBe('supporting');
  });

  it('rejects cross-case linking', async () => {
    const otherIssue = await prisma.legalIssue.create({ data: { caseId: otherCaseId, title: 'X', issueType: 'claim' } });
    await expect(createEvidence(caseId, { title: 'Bad link', legalIssueId: otherIssue.id })).rejects.toThrow();
  });
});

describe('legal elements', () => {
  it('updates an element status', async () => {
    const { id: issueId } = await createLegalIssue(caseId, { title: 'Damages', issueType: 'counterclaim' });
    const { id: elId } = await addElement(caseId, issueId, { title: 'Causation' });
    await setElementStatus(caseId, elId, 'partially-supported');
    const el = await prisma.legalIssueElement.findUnique({ where: { id: elId } });
    expect(el?.status).toBe('partially-supported');
  });
});

describe('contradictions & admissions', () => {
  it('creates a contradiction with two source statements', async () => {
    const { id } = await createContradiction(caseId, {
      summary: 'Balance mismatch',
      statements: [
        { label: 'A', text: '$100', documentId: docId, sourcePage: '1' },
        { label: 'B', text: '$200', documentId: docId, sourcePage: '2' },
      ],
    });
    expect(await prisma.contradictionStatement.count({ where: { contradictionId: id } })).toBe(2);
  });

  it('creates a source-linked admission', async () => {
    const { id } = await createAdmission(caseId, { statement: 'We acquired the note.', category: 'pleading', documentId: docId, sourcePage: '1' });
    const a = await prisma.admission.findUnique({ where: { id } });
    expect(a?.documentId).toBe(docId);
  });
});

describe('discovery', () => {
  it('imports a set, numbers requests, and flags a deficiency', async () => {
    const { id: setId } = await createDiscoverySet(caseId, { title: 'First ROGs', discoveryType: 'interrogatories', servingParty: 'Def' });
    const r1 = await addDiscoveryRequest(caseId, setId, { requestNumber: 1, kind: 'interrogatory', requestText: 'Q1' });
    const r2 = await addDiscoveryRequest(caseId, setId, { requestNumber: 2, kind: 'interrogatory', requestText: 'Q2' });
    const reqs = await prisma.discoveryRequest.findMany({ where: { setId }, orderBy: { requestNumber: 'asc' } });
    expect(reqs.map((r) => r.requestNumber)).toEqual([1, 2]);
    const { id: defId } = await createDeficiency(caseId, { title: 'No response', category: 'no-response', discoveryRequestId: r2.id });
    const def = await prisma.discoveryDeficiency.findUnique({ where: { id: defId } });
    expect(def?.discoveryRequestId).toBe(r2.id);
    // request marked deficient
    const req2 = await prisma.discoveryRequest.findUnique({ where: { id: r2.id } });
    expect(req2?.deficiencyStatus).toBe('confirmed');
    expect(r1.id).toBeTruthy();
  });
});

describe('verification approval', () => {
  it('approving an evidence proposal creates an EvidenceItem and marks the item approved', async () => {
    const item = await prisma.reviewQueueItem.create({
      data: {
        caseId, kind: 'evidence', title: 'Proposed', provider: 'mock', confidence: 0.7, status: 'pending', sourceDocId: docId,
        proposal: JSON.stringify({ title: 'AI evidence', proposition: 'p', evidenceType: 'documentary' }),
      },
    });
    const res = await resolveProposal(caseId, item.id, 'approve');
    expect(res.createdEntity).toBe('EvidenceItem');
    const created = await prisma.evidenceItem.findUnique({ where: { id: res.createdId! } });
    expect(created?.createdBy).toBe('ai');
    const after = await prisma.reviewQueueItem.findUnique({ where: { id: item.id } });
    expect(after?.status).toBe('approved');
  });

  it('rejects an unauthorized case id', async () => {
    await expect(createEvidence(otherCaseId, { title: 'nope' })).rejects.toThrow(/not authorized|not found/i);
  });
});
