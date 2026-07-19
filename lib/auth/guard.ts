import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth/session';

/**
 * Server-side authorization helpers. Never trust a client-provided caseId or
 * relationship id — every mutation re-checks that the case belongs to the
 * signed-in user, and cross-entity links are validated to be within that case.
 */

export async function assertOwnedCase(caseId: string) {
  const user = await getCurrentUser();
  const c = await prisma.case.findFirst({
    where: { id: caseId, userId: user.id },
    select: { id: true, shortName: true, caption: true },
  });
  if (!c) throw new Error('Case not found or not authorized');
  return { user, c };
}

/** Ensure every id in `ids` for `model` belongs to the given case. Prevents cross-case links. */
export async function assertSameCase(
  caseId: string,
  checks: { model: string; ids: (string | null | undefined)[] }[],
) {
  for (const { model, ids } of checks) {
    // Dedupe — the same id may legitimately appear twice (e.g. both statements
    // of a contradiction cite the same document).
    const real = [...new Set(ids.filter((x): x is string => Boolean(x)))];
    if (real.length === 0) continue;
    // @ts-expect-error dynamic model access is intentional and constrained to known models
    const count: number = await prisma[model].count({ where: { id: { in: real }, caseId } });
    if (count !== real.length) {
      throw new Error(`Cross-case relationship rejected for ${model}`);
    }
  }
}

export async function audit(
  userId: string | null,
  action: string,
  entity: string,
  entityId: string,
  detail?: string,
) {
  await prisma.auditLog.create({ data: { userId, action, entity, entityId, detail } });
}
