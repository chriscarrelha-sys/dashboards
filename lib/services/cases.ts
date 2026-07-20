import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth/session';

/** List the signed-in user's cases for the landing page (minimal fields). */
export async function listCasesForLanding() {
  const user = await getCurrentUser();
  return prisma.case.findMany({
    where: { userId: user.id },
    orderBy: { updatedAt: 'desc' },
    select: {
      id: true,
      shortName: true,
      captionShort: true,
      caption: true,
      caseNumber: true,
      forum: true,
      court: { select: { name: true, division: true } },
    },
  });
}

/** Full case header + relations used across the case workspace. */
export async function getCaseOrThrow(id: string) {
  const user = await getCurrentUser();
  const found = await prisma.case.findFirst({
    where: { id, userId: user.id },
    include: {
      court: true,
      judge: true,
      portal: true,
      parties: true,
    },
  });
  if (!found) throw new Error('Case not found');
  return found;
}

/** Data for the three homepage summary cards. */
export async function getCaseSummary(id: string) {
  const [nextTask, nextDeadline, postureNotes, pendingMotions] = await Promise.all([
    prisma.task.findFirst({
      where: { caseId: id, status: { not: 'done' } },
      orderBy: [{ isNextAction: 'desc' }, { dueDate: 'asc' }],
    }),
    prisma.deadline.findFirst({
      where: { caseId: id, done: false, dueDate: { not: null } },
      orderBy: { dueDate: 'asc' },
    }),
    prisma.strategyNote.findMany({ where: { caseId: id }, take: 5, orderBy: { createdAt: 'desc' } }),
    prisma.motion.count({ where: { caseId: id, status: 'pending' } }),
  ]);
  return { nextTask, nextDeadline, postureNotes, pendingMotions };
}
