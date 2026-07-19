import { prisma } from '@/lib/prisma';

/**
 * Indexer — rebuilds SearchIndexEntry for a case from its records. Page-level
 * entries are produced for filing-draft text (split into ~1200-char pages) so
 * search can open a document at the matching page. Only content fields are read;
 * secrets/tokens are never touched. Indexing failures never block uploads.
 */

type Entry = {
  recordType: string; recordId: string; title: string; body?: string | null;
  page?: number | null; confidentiality?: string; createdBy?: string | null; verificationStatus?: string | null;
};

function pageChunks(text: string, size = 1200): string[] {
  const out: string[] = [];
  for (let i = 0; i < text.length; i += size) out.push(text.slice(i, i + size));
  return out.length ? out : [''];
}

export async function reindexCase(caseId: string): Promise<number> {
  const [
    documents, evidence, filings, discovery, deadlines, tasks, communications,
    authorities, strategy, admissions, contradictions, legalIssues, timeline, research,
  ] = await Promise.all([
    prisma.document.findMany({ where: { caseId, deletedAt: null } }),
    prisma.evidenceItem.findMany({ where: { caseId, deletedAt: null } }),
    prisma.filing.findMany({ where: { caseId, deletedAt: null }, include: { versions: true } }),
    prisma.discoveryRequest.findMany({ where: { caseId } }),
    prisma.deadline.findMany({ where: { caseId } }),
    prisma.task.findMany({ where: { caseId } }),
    prisma.communication.findMany({ where: { caseId, deletedAt: null } }),
    prisma.authority.findMany({ where: { caseId } }),
    prisma.strategyItem.findMany({ where: { caseId } }),
    prisma.admission.findMany({ where: { caseId } }),
    prisma.contradiction.findMany({ where: { caseId }, include: { statements: true } }),
    prisma.legalIssue.findMany({ where: { caseId } }),
    prisma.timelineEvent.findMany({ where: { caseId } }),
    prisma.researchMemorandum.findMany({ where: { caseId } }),
  ]);

  const entries: Entry[] = [];

  for (const d of documents) {
    entries.push({ recordType: 'document', recordId: d.id, title: d.title || d.standardizedName, body: [d.originalName, d.aiSummary].filter(Boolean).join(' '), createdBy: d.sourceLabel === 'upload' ? 'user' : null, verificationStatus: d.verificationStatus });
  }
  for (const e of evidence) {
    entries.push({ recordType: 'evidence', recordId: e.id, title: e.title, body: [e.proposition, e.quotedText, e.description].filter(Boolean).join(' '), createdBy: e.createdBy, verificationStatus: e.verificationStatus });
  }
  for (const f of filings) {
    entries.push({ recordType: 'filing', recordId: f.id, title: f.title, body: [f.purpose, f.requestedRelief].filter(Boolean).join(' '), confidentiality: f.confidentiality, createdBy: f.createdBy, verificationStatus: f.verificationStatus });
    // Page-level entries from the latest draft version text.
    const latest = f.versions.at(-1);
    if (latest?.contentText) {
      pageChunks(latest.contentText).forEach((chunk, i) => {
        entries.push({ recordType: 'filing', recordId: f.id, title: `${f.title} (draft p.${i + 1})`, body: chunk, page: i + 1, confidentiality: f.confidentiality });
      });
    }
  }
  for (const r of discovery) entries.push({ recordType: 'discovery', recordId: r.id, title: r.shortTitle || r.title, body: [r.requestText, r.responseText, r.objections].filter(Boolean).join(' '), verificationStatus: r.verificationStatus });
  for (const d of deadlines) entries.push({ recordType: 'deadline', recordId: d.id, title: d.title, body: d.governingRule, verificationStatus: d.verificationStatus });
  for (const t of tasks) entries.push({ recordType: 'task', recordId: t.id, title: t.title, body: t.why });
  for (const c of communications) entries.push({ recordType: 'communication', recordId: c.id, title: c.subject || c.kind, body: [c.summary, c.fullText].filter(Boolean).join(' '), confidentiality: c.confidentiality, createdBy: c.createdBy });
  for (const a of authorities) entries.push({ recordType: 'authority', recordId: a.id, title: a.citation, body: [a.proposition, a.quotedText].filter(Boolean).join(' '), verificationStatus: a.verificationStatus });
  for (const s of strategy) entries.push({ recordType: 'strategy', recordId: s.id, title: s.title, body: [s.description, s.assumptions].filter(Boolean).join(' '), confidentiality: 'confidential', createdBy: s.sourceType });
  for (const a of admissions) entries.push({ recordType: 'admission', recordId: a.id, title: a.statement.slice(0, 80), body: [a.statement, a.verbatimText].filter(Boolean).join(' '), verificationStatus: a.verificationStatus });
  for (const c of contradictions) entries.push({ recordType: 'contradiction', recordId: c.id, title: c.title || c.summary, body: [c.summary, c.explanation, ...c.statements.map((s) => s.text)].filter(Boolean).join(' '), verificationStatus: c.verificationStatus });
  for (const li of legalIssues) entries.push({ recordType: 'legal-issue', recordId: li.id, title: li.title, body: [li.description, li.standard].filter(Boolean).join(' '), verificationStatus: li.verificationStatus });
  for (const t of timeline) entries.push({ recordType: 'timeline', recordId: t.id, title: t.title, body: t.description, verificationStatus: t.verificationStatus });
  for (const m of research) entries.push({ recordType: 'research', recordId: m.id, title: m.title, body: [m.issuePresented, m.briefAnswer, m.analysis].filter(Boolean).join(' '), verificationStatus: m.verificationStatus });

  // Replace this case's index atomically-ish.
  await prisma.searchIndexEntry.deleteMany({ where: { caseId } });
  if (entries.length) {
    await prisma.searchIndexEntry.createMany({
      data: entries.map((e) => ({
        caseId, recordType: e.recordType, recordId: e.recordId, title: e.title, body: e.body ?? null,
        page: e.page ?? null, confidentiality: e.confidentiality ?? 'public', createdBy: e.createdBy ?? null,
        verificationStatus: e.verificationStatus ?? null,
      })),
    });
  }
  return entries.length;
}
