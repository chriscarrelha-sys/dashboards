/**
 * Owner password verification (Web Crypto only; runs in Node server actions).
 *
 * Two ways to configure the single owner's password:
 *   - OWNER_PASSWORD_HASH = "pbkdf2$<iterations>$<saltB64>$<hashB64>"  (preferred)
 *   - OWNER_PASSWORD = "<plaintext>"                                    (simplest)
 *
 * If both are absent, login is impossible (fail closed). Comparison is
 * constant-time to avoid leaking length/prefix via timing.
 */

const encoder = new TextEncoder();

function ab(u8: Uint8Array): ArrayBuffer {
  return u8.buffer.slice(u8.byteOffset, u8.byteOffset + u8.byteLength) as ArrayBuffer;
}

function b64(bytes: Uint8Array): string {
  let s = '';
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s);
}
function unb64(str: string): Uint8Array {
  const bin = atob(str);
  const u8 = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i);
  return u8;
}

function constantTimeEqual(a: string, b: string): boolean {
  // Compare fixed-length hashes of both so length differences don't short-circuit.
  if (a.length !== b.length) {
    // Still do a comparison to keep timing steady, then fail.
    let diff = 1;
    const max = Math.max(a.length, b.length);
    for (let i = 0; i < max; i++) diff |= (a.charCodeAt(i) || 0) ^ (b.charCodeAt(i) || 0);
    return false;
  }
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

async function pbkdf2(password: string, salt: Uint8Array, iterations: number, lengthBits = 256): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey('raw', ab(encoder.encode(password)), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', salt: ab(salt), iterations, hash: 'SHA-256' }, key, lengthBits);
  return new Uint8Array(bits);
}

/** Create a storable hash string for a password (for OWNER_PASSWORD_HASH). */
export async function hashPassword(password: string, iterations = 210000): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const hash = await pbkdf2(password, salt, iterations);
  return `pbkdf2$${iterations}$${b64(salt)}$${b64(hash)}`;
}

export async function verifyOwnerPassword(input: string): Promise<boolean> {
  const hashStr = process.env.OWNER_PASSWORD_HASH;
  if (hashStr) {
    const parts = hashStr.split('$');
    if (parts.length !== 4 || parts[0] !== 'pbkdf2') return false;
    const iterations = parseInt(parts[1] ?? '0', 10);
    const salt = unb64(parts[2] ?? '');
    const expected = parts[3] ?? '';
    const got = b64(await pbkdf2(input, salt, iterations));
    return constantTimeEqual(got, expected);
  }
  const plain = process.env.OWNER_PASSWORD;
  if (plain) return constantTimeEqual(input, plain);
  return false; // fail closed — no password configured
}

export function ownerPasswordConfigured(): boolean {
  return !!(process.env.OWNER_PASSWORD_HASH || process.env.OWNER_PASSWORD);
}
