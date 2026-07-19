import { NextResponse } from 'next/server';
import { randomBytes, createHash } from 'node:crypto';
import { prisma } from '@/lib/prisma';

/**
 * Mac companion device registration (server side of the protocol).
 *
 * Flow: the signed-in user creates a one-time code in the web app; the companion
 * POSTs { code, deviceName } here. We validate the code, mint a device-scoped
 * token, store only its SHA-256 hash (the token is returned ONCE), and register
 * the device. The companion stores the token in the macOS Keychain. The user can
 * revoke the device from Administration → Companion Devices, after which its
 * token no longer authenticates. No user password is ever handled by the companion.
 *
 * This is the real server protocol; the native SwiftUI/Tauri client is specified
 * in docs/COMPANION.md and demonstrated by scripts/companion-agent.mjs.
 */
export async function POST(req: Request) {
  let body: { code?: string; deviceName?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }
  const code = (body.code ?? '').trim().toUpperCase();
  const deviceName = (body.deviceName ?? 'Mac').slice(0, 80);
  if (!code) return NextResponse.json({ error: 'code required' }, { status: 400 });

  const reg = await prisma.deviceRegistrationCode.findUnique({ where: { code } });
  if (!reg || reg.used || reg.expiresAt < new Date()) {
    return NextResponse.json({ error: 'Invalid or expired code' }, { status: 401 });
  }

  const token = randomBytes(32).toString('hex');
  const tokenHash = createHash('sha256').update(token).digest('hex');
  const expiresAt = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000); // 90 days

  const device = await prisma.companionDevice.create({
    data: { userId: reg.userId, deviceName, platform: 'mac', tokenHash, registeredAt: new Date(), lastActiveAt: new Date(), expiresAt },
  });
  await prisma.deviceRegistrationCode.update({ where: { code }, data: { used: true } });
  await prisma.securityEvent.create({ data: { userId: reg.userId, type: 'integration-connected', detail: `companion device registered: ${deviceName}`, device: deviceName } });

  // Token returned ONCE; only its hash is stored.
  return NextResponse.json({ deviceId: device.id, token, expiresAt: expiresAt.toISOString() });
}
