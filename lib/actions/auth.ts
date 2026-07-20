'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { verifyOwnerPassword } from '@/lib/auth/password';
import { signSession, SESSION_COOKIE, SESSION_TTL_SECONDS } from '@/lib/auth/token';
import { prisma } from '@/lib/prisma';

const OWNER_EMAIL = process.env.OWNER_EMAIL || 'owner@prosewins.local';

function cookieSecure(): boolean {
  // Secure cookies in production, unless explicitly relaxed for local http testing.
  return process.env.NODE_ENV === 'production' && process.env.AUTH_INSECURE_COOKIES !== 'true';
}

/** Verify the owner password and set a signed session cookie. */
export async function signIn(password: string, next?: string): Promise<{ ok: boolean; error?: string }> {
  const secret = process.env.AUTH_SECRET;
  if (!secret) return { ok: false, error: 'Server is missing AUTH_SECRET.' };
  const ok = await verifyOwnerPassword(password);
  if (!ok) {
    await prisma.securityEvent.create({ data: { userId: null, type: 'login.failed', detail: 'bad password', device: 'web', ip: 'unknown' } }).catch(() => {});
    return { ok: false, error: 'Incorrect password.' };
  }
  const exp = Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS;
  const token = await signSession({ sub: OWNER_EMAIL, exp }, secret);
  const jar = await cookies();
  jar.set(SESSION_COOKIE, token, { httpOnly: true, secure: cookieSecure(), sameSite: 'lax', path: '/', maxAge: SESSION_TTL_SECONDS });
  await prisma.securityEvent.create({ data: { userId: null, type: 'login.success', detail: OWNER_EMAIL, device: 'web', ip: 'unknown' } }).catch(() => {});
  return { ok: true };
}

export async function signOut(): Promise<void> {
  const jar = await cookies();
  jar.delete(SESSION_COOKIE);
  redirect('/login');
}
