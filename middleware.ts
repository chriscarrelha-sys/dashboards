import { NextResponse, type NextRequest } from 'next/server';
import { verifySession, SESSION_COOKIE } from '@/lib/auth/token';

/**
 * Route guard. On a hosted instance (AUTH_DEV_MODE=false) every route requires a
 * valid signed session cookie, except the login page and the health probe.
 * On a local dev instance (default) the gate is off — no password needed.
 *
 * Runs on the Edge runtime, so it only uses the Edge-safe token verifier.
 */
const PUBLIC_PATHS = ['/login', '/api/health'];

export async function middleware(req: NextRequest) {
  // Local/dev instance: no auth gate.
  if (process.env.AUTH_DEV_MODE !== 'false') return NextResponse.next();

  const { pathname } = req.nextUrl;
  if (PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(p + '/'))) {
    return NextResponse.next();
  }

  const token = req.cookies.get(SESSION_COOKIE)?.value ?? '';
  const secret = process.env.AUTH_SECRET ?? '';
  const session = await verifySession(token, secret);
  if (session) return NextResponse.next();

  const url = req.nextUrl.clone();
  url.pathname = '/login';
  url.searchParams.set('next', pathname);
  return NextResponse.redirect(url);
}

export const config = {
  // Guard everything except Next internals and static assets.
  matcher: ['/((?!_next/static|_next/image|favicon.ico|icon.svg|manifest.webmanifest|robots.txt|sw.js).*)'],
};
