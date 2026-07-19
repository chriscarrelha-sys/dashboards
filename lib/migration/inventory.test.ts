import { describe, it, expect } from 'vitest';
// @ts-expect-error — plain-JS module shared with the CLI; no type decls needed here.
import { buildInventory, inferDocType, inferLikelyDate, normalizeBaseName } from './inventory.mjs';
// @ts-expect-error — plain-JS module shared with the CLI + app + tests.
import { runLaunchReadiness } from '../launch/readiness.mjs';

describe('migration inventory engine', () => {
  it('infers document type from filename keywords', () => {
    expect(inferDocType('2024-03-09 Motion to Compel.pdf')).toBe('motion');
    expect(inferDocType('Order Granting Summary Judgment.pdf')).toBe('order');
    expect(inferDocType('Plaintiff First Interrogatories.docx')).toBe('discovery');
    expect(inferDocType('random-notes.txt')).toBe('unclassified');
  });

  it('parses likely dates in ISO and US formats', () => {
    expect(inferLikelyDate('2024-03-09 Complaint.pdf')).toBe('2024-03-09');
    expect(inferLikelyDate('Answer 03-09-2024.pdf')).toBe('2024-03-09');
    expect(inferLikelyDate('no date here.pdf')).toBeNull();
  });

  it('groups exact duplicates by hash and never marks them for deletion', () => {
    const { items, summary } = buildInventory([
      { fileName: 'Complaint.pdf', hash: 'aaa' },
      { fileName: 'Complaint copy.pdf', hash: 'aaa' },
      { fileName: 'Order 2024-01-02.pdf', hash: 'bbb' },
    ]);
    const dupes = items.filter((i: any) => i.classification === 'duplicate');
    expect(dupes).toHaveLength(2);
    expect(summary.duplicates).toBe(2);
    // Classification only groups — there is no "delete" outcome.
    expect(items.every((i: any) => i.migrationStatus === 'pending')).toBe(true);
  });

  it('groups versions by normalized base name', () => {
    expect(normalizeBaseName('Motion to Compel v2 FINAL.pdf'))
      .toBe(normalizeBaseName('Motion to Compel draft.pdf'));
    const { items } = buildInventory([
      { fileName: 'Motion to Compel draft.pdf', hash: 'x1' },
      { fileName: 'Motion to Compel v2 FINAL.pdf', hash: 'x2' },
    ]);
    expect(items.filter((i: any) => i.versionGroup).length).toBe(2);
  });

  it('flags unreadable/password-protected files for review, never auto-imports', () => {
    const { items } = buildInventory([{ fileName: 'sealed.pdf', hash: 'z', passwordProtected: true }]);
    expect(items[0].classification).toBe('needs-review');
    expect(items[0].confidence).toBe(0);
  });
});

describe('launch readiness engine', () => {
  it('fails in production when dev-mode auth or sqlite is configured', async () => {
    const report = await runLaunchReadiness({
      env: { NODE_ENV: 'production', DATABASE_URL: 'file:./dev.db', AUTH_DEV_MODE: 'true', AUTH_SECRET: 's' },
    });
    expect(report.overall).toBe('failure');
    const driver = report.checks.find((c: any) => c.key === 'database-driver');
    const devmode = report.checks.find((c: any) => c.key === 'auth-dev-mode');
    expect(driver.level).toBe('failure');
    expect(devmode.level).toBe('failure');
  });

  it('treats a clean production config as pass/warning (never silently green on mocks)', async () => {
    const report = await runLaunchReadiness({
      env: {
        NODE_ENV: 'production', DATABASE_URL: 'postgres://x', AUTH_SECRET: 's', AUTH_DEV_MODE: 'false',
        STORAGE_PROVIDER: 's3', BACKUP_DESTINATION: 's3://b', ENCRYPTION_KEY: 'k',
      },
      latestMigration: '20260719_phase6',
    });
    expect(report.overall).not.toBe('failure');
    // Calendar remains a warning because it is mocked until authorized — honesty rule.
    const cal = report.checks.find((c: any) => c.key === 'calendar-config');
    expect(cal.level).toBe('warning');
  });
});
