import { prisma } from '@/lib/prisma';

/**
 * Advanced Case Analysis — SOURCE-CONTROLLED.
 *
 * This assembles a case-review report from CONFIRMED case data. It is
 * deterministic and organizational: every finding links to real source records
 * and carries a verification status. It never produces a win-probability score,
 * and any interpretive narrative is clearly marked as mock AI (no live model).
 *
 * Findings distinguish: confirmed-source-fact | user-assertion |
 * opposing-assertion | ai-inference | unverified-proposition | verified-authority.
 */

export type Finding = {
  text: string;
  sourceType: 'confirmed-fact' | 'user-assertion' | 'opposing-assertion' | 'ai-inference' | 'unverified' | 'verified-authority';
  sourceRefs: { type: string; id: string; label: string }[];
  verificationStatus: string;
};
export type ReviewSection = { key: string; title: string; findings: Finding[] };

export async function buildCaseReview(caseId: string): Promise<{ sections: ReviewSection[]; summary: string }> {
  const [
    c, nextDeadline, deadlines, tasks, motions, filings, legalIssues,
    evidence, contradictions, admissions, discovery, deficiencies,
    authorities, damages, settlements, reviewQueue,
  ] = await Promise.all([
    prisma.case.findUniqueOrThrow({ where: { id: caseId }, include: { court: true, judge: true } }),
    prisma.deadline.findFirst({ where: { caseId, done: false, dueDate: { not: null } }, orderBy: { dueDate: 'asc' } }),
    prisma.deadline.findMany({ where: { caseId, done: false } }),
    prisma.task.findMany({ where: { caseId, status: { not: 'done' } } }),
    prisma.motion.findMany({ where: { caseId, status: 'pending' } }),
    prisma.filing.findMany({ where: { caseId, deletedAt: null } }),
    prisma.legalIssue.findMany({ where: { caseId }, include: { elements: { include: { evidenceLinks: { include: { evidence: true } } } } } }),
    prisma.evidenceItem.findMany({ where: { caseId, deletedAt: null } }),
    prisma.contradiction.findMany({ where: { caseId } }),
    prisma.admission.findMany({ where: { caseId } }),
    prisma.discoveryRequest.findMany({ where: { caseId } }),
    prisma.discoveryDeficiency.findMany({ where: { caseId, resolutionStatus: { notIn: ['cured', 'closed'] } } }),
    prisma.authority.findMany({ where: { caseId } }),
    prisma.damageItem.findMany({ where: { caseId } }),
    prisma.settlementRecord.findMany({ where: { caseId, status: 'open' } }),
    prisma.reviewQueueItem.findMany({ where: { caseId, status: 'pending' } }),
  ]);

  const ref = (type: string, id: string, label: string) => ({ type, id, label });
  const f = (text: string, sourceType: Finding['sourceType'], refs: Finding['sourceRefs'], vs = 'confirmed'): Finding =>
    ({ text, sourceType, sourceRefs: refs, verificationStatus: vs });

  const sections: ReviewSection[] = [];

  // 1. Executive status / posture
  sections.push({ key: 'status', title: 'Executive Case Status', findings: [
    f(`${c.caption} — ${c.caseNumber} (${c.court?.name ?? c.forum}${c.judge ? `, ${c.judge.name}` : ''}).`, 'confirmed-fact', [ref('case', c.id, c.shortName)]),
    f(`${filings.length} filing(s), ${motions.length} pending motion(s), ${deadlines.length} open deadline(s), ${reviewQueue.length} item(s) awaiting verification.`, 'confirmed-fact', []),
  ] });

  // 2. Immediate deadlines
  sections.push({ key: 'deadlines', title: 'Immediate Deadlines & Tasks', findings: [
    ...(nextDeadline ? [f(`Next deadline: ${nextDeadline.title} (${nextDeadline.dueDate?.toISOString().slice(0, 10)}).`, 'confirmed-fact', [ref('deadline', nextDeadline.id, nextDeadline.title)], nextDeadline.verificationStatus)] : [f('No upcoming deadlines recorded.', 'confirmed-fact', [])]),
    ...tasks.slice(0, 5).map((t) => f(`Open task: ${t.title}.`, 'user-assertion', [ref('task', t.id, t.title)])),
  ] });

  // 3-6. Element-by-element evidence review (the core gap analysis)
  const elementFindings: Finding[] = [];
  for (const li of legalIssues) {
    for (const el of li.elements) {
      const supporting = el.evidenceLinks.filter((l) => l.relation === 'supporting');
      const adverse = el.evidenceLinks.filter((l) => l.relation === 'adverse');
      let assessment: string;
      if (supporting.length === 0) assessment = 'UNSUPPORTED — no supporting evidence linked (gap)';
      else if (adverse.length > 0) assessment = 'DISPUTED — supporting and adverse evidence present';
      else assessment = 'supported';
      elementFindings.push(f(
        `${li.title} · Element ${el.number} "${el.title}": ${assessment} (${supporting.length} supporting, ${adverse.length} adverse).`,
        'ai-inference',
        [ref('legal-issue', li.id, li.title), ...supporting.slice(0, 3).map((l) => ref('evidence', l.evidence.id, l.evidence.title))],
        el.status,
      ));
    }
  }
  sections.push({ key: 'elements', title: 'Element-by-Element Evidence Review', findings: elementFindings.length ? elementFindings : [f('No legal elements defined yet.', 'confirmed-fact', [])] });

  // 7-8. Strongest / adverse evidence
  sections.push({ key: 'evidence', title: 'Strongest Supporting & Material Adverse Evidence', findings: [
    ...evidence.filter((e) => e.posture === 'supports-user').slice(0, 5).map((e) => f(`Supporting: ${e.title}${e.proposition ? ` — ${e.proposition}` : ''}.`, 'confirmed-fact', [ref('evidence', e.id, e.title)], e.verificationStatus)),
    ...evidence.filter((e) => e.posture === 'adverse').map((e) => f(`ADVERSE: ${e.title}${e.proposition ? ` — ${e.proposition}` : ''}.`, 'confirmed-fact', [ref('evidence', e.id, e.title)], e.verificationStatus)),
  ] });

  // 9-10. Admissions / contradictions
  sections.push({ key: 'admissions', title: 'Admissions & Contradictions', findings: [
    ...admissions.slice(0, 5).map((a) => f(`Admission (${a.admittingParty ?? '—'}): ${a.statement}`, 'opposing-assertion', [ref('admission', a.id, 'admission')], a.verificationStatus)),
    ...contradictions.map((cd) => f(`Contradiction: ${cd.summary} (${cd.status}).`, cd.status === 'confirmed' ? 'confirmed-fact' : 'ai-inference', [ref('contradiction', cd.id, 'contradiction')], cd.verificationStatus)),
  ] });

  // 11-12. Discovery / deficiencies
  sections.push({ key: 'discovery', title: 'Discovery Status', findings: [
    f(`${discovery.length} discovery request(s) tracked; ${deficiencies.length} open deficiency(ies).`, 'confirmed-fact', []),
    ...deficiencies.slice(0, 5).map((d) => f(`Open deficiency: ${d.title} (${d.category}).`, 'user-assertion', [ref('deficiency', d.id, d.title)], d.verificationStatus)),
  ] });

  // 13. Authorities gaps
  const unverifiedAuth = authorities.filter((a) => a.verificationStatus === 'unverified' || a.verificationStatus === 'proposed');
  sections.push({ key: 'authorities', title: 'Authorities & Research Gaps', findings: [
    ...authorities.filter((a) => !unverifiedAuth.includes(a)).slice(0, 4).map((a) => f(`Verified authority: ${a.citation}.`, 'verified-authority', [ref('authority', a.id, a.citation)], a.verificationStatus)),
    ...unverifiedAuth.map((a) => f(`UNVERIFIED authority — open source to confirm: ${a.citation}.`, 'unverified', [ref('authority', a.id, a.citation)], 'unverified')),
  ] });

  // 14-15. Damages / settlement
  const total = damages.reduce((s, d) => s + (d.amount ?? 0), 0);
  sections.push({ key: 'damages', title: 'Damages & Settlement', findings: [
    f(`Claimed damages total: $${total.toLocaleString()} across ${damages.length} item(s) (organizational, not a recoverability determination).`, 'user-assertion', damages.slice(0, 4).map((d) => ref('damage', d.id, d.label))),
    ...settlements.map((sr) => f(`Open ${sr.offerType}: ${sr.monetaryAmount != null ? `$${sr.monetaryAmount.toLocaleString()}` : 'nonmonetary'}.`, 'confirmed-fact', [ref('settlement', sr.id, sr.offerType)])),
  ] });

  // 16. Procedural risks (confirmed data only)
  const risks: Finding[] = [];
  const unverifiedDeadlines = deadlines.filter((d) => d.verificationStatus !== 'confirmed');
  if (unverifiedDeadlines.length) risks.push(f(`${unverifiedDeadlines.length} unconfirmed/calculated deadline(s) — confirm before relying on them.`, 'ai-inference', unverifiedDeadlines.slice(0, 3).map((d) => ref('deadline', d.id, d.title)), 'unverified'));
  const filingsNoCert = filings.filter((fl) => !fl.certificateOfService && ['ready-to-file', 'filed'].includes(fl.stage));
  if (filingsNoCert.length) risks.push(f(`${filingsNoCert.length} filing(s) at/after ready-to-file without a certificate of service.`, 'ai-inference', filingsNoCert.slice(0, 3).map((fl) => ref('filing', fl.id, fl.title))));
  if (unverifiedAuth.length) risks.push(f(`${unverifiedAuth.length} unverified authority(ies) may be cited in filings.`, 'ai-inference', []));
  if (reviewQueue.length) risks.push(f(`${reviewQueue.length} AI proposal(s) await verification.`, 'ai-inference', []));
  sections.push({ key: 'risks', title: 'Procedural Risks & Counterarguments', findings: risks.length ? risks : [f('No obvious procedural risks detected in confirmed data.', 'ai-inference', [])] });

  // 17-18. Next steps + verification required
  const verificationNeeded = [...unverifiedDeadlines, ...unverifiedAuth];
  sections.push({ key: 'next', title: 'Recommended Operational Next Steps (analysis, not legal advice)', findings: [
    f('Confirm any unverified deadlines and authorities before filing.', 'ai-inference', []),
    f('Fill element gaps flagged UNSUPPORTED with evidence or targeted discovery.', 'ai-inference', []),
    f('Resolve open discovery deficiencies via meet-and-confer or motion to compel.', 'ai-inference', []),
  ] });
  sections.push({ key: 'verification', title: 'Verification Required', findings: verificationNeeded.length
    ? verificationNeeded.map((v) => f(`Verify: ${'title' in v ? v.title : v.citation}.`, 'unverified', [], 'unverified'))
    : [f('Nothing outstanding requires verification right now.', 'confirmed-fact', [])] });

  const summary = `${legalIssues.length} legal issue(s), ${evidence.length} evidence item(s), ${elementFindings.filter((x) => x.text.includes('UNSUPPORTED')).length} unsupported element(s), ${deficiencies.length} open deficiency(ies), ${verificationNeeded.length} item(s) needing verification.`;
  return { sections, summary };
}
