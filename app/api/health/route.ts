import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

/**
 * Liveness + readiness probe (Phase 6 §5). Reports database reachability and
 * the applied schema version. Never returns secrets or case data.
 */
export async function GET() {
  const started = Date.now();
  let database: 'up' | 'down' = 'down';
  let schemaVersion: string | null = null;
  try {
    await prisma.$queryRawUnsafe('SELECT 1');
    database = 'up';
    const rows = await prisma.$queryRawUnsafe<{ migration_name: string }[]>(
      'SELECT migration_name FROM _prisma_migrations WHERE finished_at IS NOT NULL ORDER BY finished_at DESC LIMIT 1'
    );
    schemaVersion = rows?.[0]?.migration_name ?? null;
  } catch {
    database = 'down';
  }
  const ok = database === 'up';
  return NextResponse.json(
    {
      status: ok ? 'ok' : 'degraded',
      database,
      schemaVersion,
      version: process.env.npm_package_version ?? null,
      uptimeMs: Math.round(process.uptime() * 1000),
      responseMs: Date.now() - started,
    },
    { status: ok ? 200 : 503 }
  );
}
