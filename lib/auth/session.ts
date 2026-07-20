import { prisma } from '@/lib/prisma';

/**
 * Auth abstraction. The first version runs in dev mode with a single fixed
 * local user (no external provider). This is the seam where NextAuth/Auth.js
 * slots in later: swap `getCurrentUser()` for a real session lookup and keep
 * every caller unchanged.
 */

// The single local owner. Set OWNER_EMAIL / OWNER_NAME in .env to make this your
// own instance; defaults keep zero-config local dev working.
const DEV_USER_EMAIL = process.env.OWNER_EMAIL || 'owner@prosewins.local';
const DEV_USER_NAME = process.env.OWNER_NAME || 'Case Owner';

export type SessionUser = {
  id: string;
  email: string;
  name: string | null;
};

export function isDevMode(): boolean {
  return process.env.AUTH_DEV_MODE !== 'false';
}

/** Returns the signed-in user, provisioning the owner on first run.
 *
 * Dev mode (default): a single fixed local owner, no password.
 * Hosted mode (AUTH_DEV_MODE=false): resolve the owner from the signed session
 * cookie (set by lib/actions/auth signIn). Middleware blocks unauthenticated
 * requests before they reach here; this is the defense-in-depth check. */
export async function getCurrentUser(): Promise<SessionUser> {
  if (!isDevMode()) {
    const { cookies } = await import('next/headers');
    const { verifySession, SESSION_COOKIE } = await import('@/lib/auth/token');
    const token = (await cookies()).get(SESSION_COOKIE)?.value ?? '';
    const session = await verifySession(token, process.env.AUTH_SECRET ?? '');
    if (!session) throw new Error('Not authenticated');
    const user = await prisma.user.upsert({
      where: { email: session.sub },
      update: {},
      create: { email: session.sub, name: DEV_USER_NAME },
    });
    return { id: user.id, email: user.email, name: user.name };
  }
  const user = await prisma.user.upsert({
    where: { email: DEV_USER_EMAIL },
    update: {},
    create: { email: DEV_USER_EMAIL, name: DEV_USER_NAME },
  });
  return { id: user.id, email: user.email, name: user.name };
}
