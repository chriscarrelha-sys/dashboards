/**
 * Signed session tokens (Edge- AND Node-safe: uses only Web Crypto + btoa/atob,
 * no `node:` imports, so it can run inside Next middleware on the Edge runtime).
 *
 * A token is `base64url(payloadJson).base64url(hmacSha256)`. The HMAC secret is
 * AUTH_SECRET. Tokens carry an expiry; a tampered or expired token verifies to
 * null.
 */

const encoder = new TextEncoder();
const decoder = new TextDecoder();

// Copy into a fresh ArrayBuffer so Web Crypto's BufferSource typing is satisfied
// across runtimes (Edge + Node) and TS's stricter Uint8Array generics.
function ab(u8: Uint8Array): ArrayBuffer {
  return u8.buffer.slice(u8.byteOffset, u8.byteOffset + u8.byteLength) as ArrayBuffer;
}

export type SessionPayload = { sub: string; exp: number }; // exp = unix seconds

function toB64Url(bytes: Uint8Array): string {
  let s = '';
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromB64Url(str: string): Uint8Array {
  const b64 = str.replace(/-/g, '+').replace(/_/g, '/');
  const bin = atob(b64);
  const u8 = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i);
  return u8;
}

async function hmacKey(secret: string): Promise<CryptoKey> {
  return crypto.subtle.importKey('raw', ab(encoder.encode(secret)), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign', 'verify']);
}

export async function signSession(payload: SessionPayload, secret: string): Promise<string> {
  const body = toB64Url(encoder.encode(JSON.stringify(payload)));
  const key = await hmacKey(secret);
  const sig = await crypto.subtle.sign('HMAC', key, ab(encoder.encode(body)));
  return `${body}.${toB64Url(new Uint8Array(sig))}`;
}

export async function verifySession(token: string, secret: string): Promise<SessionPayload | null> {
  if (!token || !secret) return null;
  const dot = token.indexOf('.');
  if (dot <= 0) return null;
  const body = token.slice(0, dot);
  const sig = token.slice(dot + 1);
  try {
    const key = await hmacKey(secret);
    const ok = await crypto.subtle.verify('HMAC', key, ab(fromB64Url(sig)), ab(encoder.encode(body)));
    if (!ok) return null;
    const payload = JSON.parse(decoder.decode(fromB64Url(body))) as SessionPayload;
    if (typeof payload.exp !== 'number' || payload.exp < Math.floor(Date.now() / 1000)) return null;
    if (typeof payload.sub !== 'string' || !payload.sub) return null;
    return payload;
  } catch {
    return null;
  }
}

export const SESSION_COOKIE = 'ps_session';
export const SESSION_TTL_SECONDS = 30 * 24 * 3600; // 30 days
