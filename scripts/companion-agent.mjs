#!/usr/bin/env node
/**
 * Pro Se Wins — reference companion agent (demonstration).
 *
 * This is a minimal Node reference for the Mac companion protocol documented in
 * docs/COMPANION.md. A production companion is a native SwiftUI or Tauri app that
 * stores its token in the macOS Keychain and monitors user-selected iCloud/Finder
 * folders. This script demonstrates ONLY the registration handshake and a mock
 * folder scan — it does not upload files or scan the whole disk.
 *
 * Usage:
 *   node scripts/companion-agent.mjs register <CODE> [baseUrl]
 *   node scripts/companion-agent.mjs scan <folder>
 */
import { readdir, stat } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';

const [, , cmd, arg, baseArg] = process.argv;
const BASE = baseArg || process.env.PROSEWINS_URL || 'http://localhost:3000';

async function register(code) {
  const res = await fetch(`${BASE}/api/companion/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code, deviceName: `Reference Agent (${process.platform})` }),
  });
  const data = await res.json();
  if (!res.ok) { console.error('Registration failed:', data.error); process.exit(1); }
  console.log('Registered. Store this token in the Keychain (shown once):');
  console.log('  deviceId:', data.deviceId);
  console.log('  token:   ', data.token);
  console.log('  expires: ', data.expiresAt);
  console.log('\nThe token is device-scoped and revocable from Administration → Companion Devices.');
}

/** Mock folder scan — reports metadata only, uploads nothing, no disk-wide scan. */
async function scan(folder) {
  const names = await readdir(folder);
  console.log(`Scanning selected folder: ${folder} (${names.length} entries)`);
  for (const name of names) {
    if (name.startsWith('.')) continue;
    const full = `${folder}/${name}`;
    const s = await stat(full).catch(() => null);
    if (!s || !s.isFile()) continue;
    const bytes = await readFile(full);
    const hash = createHash('sha256').update(bytes).digest('hex');
    console.log(`  detected: ${name}  ${s.size}B  sha256=${hash.slice(0, 16)}…  (would enter desktop review queue)`);
  }
  console.log('\nDetected files would be proposed for import (Review-first mode); originals are never renamed/moved.');
}

if (cmd === 'register' && arg) await register(arg);
else if (cmd === 'scan' && arg) await scan(arg);
else { console.log('Usage: node scripts/companion-agent.mjs register <CODE> [baseUrl] | scan <folder>'); process.exit(1); }
