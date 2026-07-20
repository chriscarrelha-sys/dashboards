#!/usr/bin/env node
/**
 * Launch-readiness gate CLI (Phase 6 §5): `npm run launch:check`.
 *
 * Non-destructive. Inspects configuration + connectivity and prints a table.
 * Exit code 1 on any FAILURE so it can gate a deploy in CI. Warnings print an
 * acknowledgment reminder but do not fail the process.
 */
import { readdir, readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { runLaunchReadiness } from '../lib/launch/readiness.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');

async function latestMigration() {
  try {
    const dir = join(root, 'prisma', 'migrations');
    const entries = (await readdir(dir, { withFileTypes: true }))
      .filter((e) => e.isDirectory())
      .map((e) => e.name)
      .sort();
    return entries[entries.length - 1] || null;
  } catch { return null; }
}

async function packageVersion() {
  try {
    const pkg = JSON.parse(await readFile(join(root, 'package.json'), 'utf8'));
    return pkg.version || null;
  } catch { return null; }
}

async function getPrisma() {
  try {
    const { PrismaClient } = await import('@prisma/client');
    const prisma = new PrismaClient();
    return prisma;
  } catch { return null; }
}

const COLORS = { pass: '\x1b[32m', warning: '\x1b[33m', failure: '\x1b[31m', skipped: '\x1b[90m', reset: '\x1b[0m' };
const ICON = { pass: '+', warning: '!', failure: 'x', skipped: '.' };

async function main() {
  const prisma = await getPrisma();
  let appliedMigration = null;
  if (prisma) {
    try {
      const rows = await prisma.$queryRawUnsafe(
        'SELECT migration_name FROM _prisma_migrations WHERE finished_at IS NOT NULL ORDER BY finished_at DESC LIMIT 1'
      );
      appliedMigration = rows?.[0]?.migration_name || null;
    } catch { /* table may not exist yet */ }
  }

  const report = await runLaunchReadiness({
    env: process.env,
    prisma,
    packageVersion: await packageVersion(),
    latestMigration: await latestMigration(),
    appliedMigration,
    healthEndpoint: true,
  });

  console.log(`\nPro Se Wins — Launch Readiness Gate (${report.environment})\n`);
  for (const c of report.checks) {
    const color = COLORS[c.level] || '';
    const icon = ICON[c.level] || '?';
    console.log(`  ${color}${icon} ${c.level.toUpperCase().padEnd(7)}${COLORS.reset}  ${c.label}`);
    console.log(`             ${c.detail}`);
  }
  const { pass, warning, failure, skipped } = report.counts;
  console.log(`\n  ${pass} pass · ${warning} warning · ${failure} failure · ${skipped} skipped`);

  if (prisma) await prisma.$disconnect();

  if (report.overall === 'failure') {
    console.log(`\n${COLORS.failure}RESULT: FAILURE — launch is blocked. Resolve failures above.${COLORS.reset}\n`);
    process.exit(1);
  }
  if (report.overall === 'warning') {
    console.log(`\n${COLORS.warning}RESULT: WARNING — launch may proceed only with documented acknowledgment of each warning.${COLORS.reset}\n`);
    process.exit(0);
  }
  console.log(`\n${COLORS.pass}RESULT: PASS — ready to launch.${COLORS.reset}\n`);
}

main().catch((e) => { console.error(e); process.exit(1); });
