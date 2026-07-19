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

/** Returns the signed-in user, provisioning the dev user on first run. */
export async function getCurrentUser(): Promise<SessionUser> {
  if (!isDevMode()) {
    // Production auth not wired yet — fail loudly rather than pretend.
    throw new Error(
      'Real authentication is not configured. Set AUTH_DEV_MODE=true for local development, ' +
        'or implement the NextAuth provider in lib/auth.',
    );
  }
  const user = await prisma.user.upsert({
    where: { email: DEV_USER_EMAIL },
    update: {},
    create: { email: DEV_USER_EMAIL, name: DEV_USER_NAME },
  });
  return { id: user.id, email: user.email, name: user.name };
}
