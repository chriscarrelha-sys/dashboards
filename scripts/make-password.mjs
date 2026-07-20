#!/usr/bin/env node
/**
 * Generate an OWNER_PASSWORD_HASH for the hosted login.
 * Usage:  npm run make:password -- "your password here"
 * Copy the printed line into your host's environment variables.
 */
const password = process.argv[2];
if (!password) {
  console.error('Usage: npm run make:password -- "your password"');
  process.exit(1);
}
const enc = new TextEncoder();
const iterations = 210000;
const salt = crypto.getRandomValues(new Uint8Array(16));
const key = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveBits']);
const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', salt, iterations, hash: 'SHA-256' }, key, 256);
const b64 = (u8) => { let s = ''; for (const b of new Uint8Array(u8)) s += String.fromCharCode(b); return btoa(s); };
console.log(`OWNER_PASSWORD_HASH="pbkdf2$${iterations}$${b64(salt)}$${b64(bits)}"`);
