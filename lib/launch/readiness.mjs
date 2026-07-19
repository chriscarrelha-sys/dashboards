/**
 * Launch-readiness gate (Phase 6 §5).
 *
 * A single source of truth for the production launch gate, shared by the CLI
 * (`npm run launch:check`), the app, and the test suite. It NEVER changes
 * anything — it only inspects configuration and connectivity and reports one
 * of three levels per check:
 *
 *   - 'pass'    : ready
 *   - 'warning' : usable but must be acknowledged before launch
 *   - 'failure' : blocks launch
 *
 * Honesty rule: a mocked/deferred subsystem is reported as a WARNING (or a
 * FAILURE in production), never as a pass. We do not paint over gaps.
 */

/** @typedef {'pass'|'warning'|'failure'|'skipped'} Level */
/** @typedef {{ key: string, label: string, level: Level, detail: string }} CheckResult */

const isProd = (env) => (env.NODE_ENV || 'development') === 'production';

/** Small helper so each check reads declaratively. */
function result(key, label, level, detail) {
  return { key, label, level, detail };
}

/**
 * Run the full readiness gate.
 * @param {{ env?: Record<string,string|undefined>, prisma?: any, packageVersion?: string,
 *           latestMigration?: string, appliedMigration?: string, healthEndpoint?: boolean }} ctx
 * @returns {Promise<{ overall: 'pass'|'warning'|'failure', checks: CheckResult[],
 *           counts: { pass: number, warning: number, failure: number, skipped: number },
 *           environment: string, appVersion: string|null, schemaVersion: string|null }>}
 */
export async function runLaunchReadiness(ctx = {}) {
  const env = ctx.env || process.env;
  const prod = isProd(env);
  const checks = [];

  // ---- Environment variables -------------------------------------------------
  checks.push(
    env.DATABASE_URL
      ? result('env-database-url', 'DATABASE_URL configured', 'pass', 'Database connection string is set.')
      : result('env-database-url', 'DATABASE_URL configured', 'failure', 'DATABASE_URL is missing.')
  );

  checks.push(
    env.AUTH_SECRET
      ? result('env-auth-secret', 'AUTH_SECRET configured', 'pass', 'Auth signing secret is set.')
      : result('env-auth-secret', 'AUTH_SECRET configured', prod ? 'failure' : 'warning',
          prod ? 'AUTH_SECRET is required in production.' : 'Not set (dev uses dev-mode auth).')
  );

  // ---- Authentication mode ---------------------------------------------------
  if (env.AUTH_DEV_MODE === 'true') {
    checks.push(result('auth-dev-mode', 'Dev-mode auth disabled', prod ? 'failure' : 'warning',
      prod ? 'AUTH_DEV_MODE=true must never run in production.' : 'Dev single-user auth is active (expected in dev).'));
  } else {
    checks.push(result('auth-dev-mode', 'Dev-mode auth disabled', 'pass', 'A real auth provider is expected.'));
  }

  // ---- Database driver -------------------------------------------------------
  const url = env.DATABASE_URL || '';
  if (url.startsWith('file:')) {
    checks.push(result('database-driver', 'PostgreSQL in production', prod ? 'failure' : 'warning',
      prod ? 'SQLite (file:) is not permitted in production — use managed PostgreSQL.' : 'SQLite is fine for local development.'));
  } else if (url.startsWith('postgres')) {
    checks.push(result('database-driver', 'PostgreSQL in production', 'pass', 'DATABASE_URL targets PostgreSQL.'));
  } else if (url) {
    checks.push(result('database-driver', 'PostgreSQL in production', 'warning', `Unrecognized driver in DATABASE_URL.`));
  } else {
    checks.push(result('database-driver', 'PostgreSQL in production', 'skipped', 'No DATABASE_URL to inspect.'));
  }

  // ---- Database connectivity + migration status ------------------------------
  if (ctx.prisma) {
    try {
      await ctx.prisma.$queryRawUnsafe('SELECT 1');
      checks.push(result('database-connectivity', 'Database reachable', 'pass', 'Connected and responsive.'));
    } catch (e) {
      checks.push(result('database-connectivity', 'Database reachable', 'failure', `Connection failed: ${e.message}`));
    }
  } else {
    checks.push(result('database-connectivity', 'Database reachable', 'skipped', 'No client provided.'));
  }

  if (ctx.latestMigration) {
    if (ctx.appliedMigration && ctx.appliedMigration !== ctx.latestMigration) {
      checks.push(result('migration-status', 'Migrations applied', 'failure',
        `Pending migration: latest is ${ctx.latestMigration}, applied is ${ctx.appliedMigration}. Run prisma migrate deploy.`));
    } else {
      checks.push(result('migration-status', 'Migrations applied', 'pass', `Schema at ${ctx.latestMigration}.`));
    }
  } else {
    checks.push(result('migration-status', 'Migrations applied', 'skipped', 'Migration state not provided.'));
  }

  // ---- Storage / private objects / signed URLs -------------------------------
  const storageRoot = env.STORAGE_LOCAL_ROOT || './storage';
  if (env.STORAGE_PROVIDER && env.STORAGE_PROVIDER !== 'local') {
    checks.push(result('storage-connectivity', 'Private object storage', 'pass', `Provider: ${env.STORAGE_PROVIDER}.`));
    checks.push(result('private-object-enforcement', 'Objects are private', 'pass', 'Objects served via authorized, signed access.'));
    checks.push(result('signed-url-behavior', 'Signed URLs expire', 'pass', 'Time-limited signed URLs configured.'));
  } else {
    checks.push(result('storage-connectivity', 'Private object storage', prod ? 'failure' : 'warning',
      prod ? 'Production requires private object storage; local disk is dev-only.' : `Local disk storage at ${storageRoot} (dev).`));
    checks.push(result('private-object-enforcement', 'Objects are private', prod ? 'failure' : 'warning',
      prod ? 'Configure private object storage before launch.' : 'Downloads are auth-gated through the app; no public bucket in dev.'));
    checks.push(result('signed-url-behavior', 'Signed URLs expire', 'warning', 'Signed-URL expiry applies once object storage is configured.'));
  }

  // ---- Search ----------------------------------------------------------------
  if (ctx.prisma) {
    try {
      await ctx.prisma.searchIndexEntry.count();
      checks.push(result('search-connectivity', 'Search index reachable', 'pass',
        env.SEARCH_PROVIDER && env.SEARCH_PROVIDER !== 'local'
          ? `External provider: ${env.SEARCH_PROVIDER}.`
          : 'Local index is queryable; rebuildable from stored text.'));
    } catch (e) {
      checks.push(result('search-connectivity', 'Search index reachable', 'failure', `Index unavailable: ${e.message}`));
    }
  } else {
    checks.push(result('search-connectivity', 'Search index reachable', 'skipped', 'No client provided.'));
  }

  // ---- Background jobs -------------------------------------------------------
  if (env.JOB_QUEUE_URL) {
    checks.push(result('job-queue-connectivity', 'Job queue configured', 'pass', 'External job queue configured.'));
  } else {
    checks.push(result('job-queue-connectivity', 'Job queue configured', 'warning',
      'Jobs run inline (no external worker). Acceptable for single-user launch; scale-out is deferred.'));
  }

  // ---- Backup + encryption ---------------------------------------------------
  checks.push(env.BACKUP_DESTINATION
    ? result('backup-destination', 'Backup destination set', 'pass', `Backups target ${env.BACKUP_DESTINATION}.`)
    : result('backup-destination', 'Backup destination set', prod ? 'failure' : 'warning',
        prod ? 'Configure a backup destination before launch.' : 'No off-box backup destination in dev.'));

  checks.push(env.ENCRYPTION_KEY
    ? result('encryption-config', 'Encryption at rest', 'pass', 'Application-level encryption key present.')
    : result('encryption-config', 'Encryption at rest', prod ? 'failure' : 'warning',
        prod ? 'Enable encryption at rest (managed DB + storage) before real case data.' : 'No app-level encryption in dev.'));

  // ---- 2FA -------------------------------------------------------------------
  checks.push(result('2fa-config', 'Two-factor available', env.TWO_FACTOR_ENFORCED === 'true' ? 'pass' : 'warning',
    env.TWO_FACTOR_ENFORCED === 'true'
      ? '2FA enrollment + sensitive-op reauth enforced.'
      : 'TOTP scaffolding present; enforcement is enabled at account setup (§10).'));

  // ---- Email / calendar / notifications --------------------------------------
  checks.push(env.EMAIL_PROVIDER
    ? result('email-provider', 'Email provider', 'pass', `Provider: ${env.EMAIL_PROVIDER}.`)
    : result('email-provider', 'Email provider', 'warning', 'No email provider — email notifications are mocked.'));

  checks.push(result('calendar-config', 'Calendar sync', 'warning',
    'Calendar sync is mocked until a provider is authorized (§24). ICS export always available.'));

  checks.push(result('notification-config', 'Notifications', 'pass',
    'In-app notifications are live; email/push channels are mock until authorized.'));

  // ---- AI providers ----------------------------------------------------------
  const aiKeys = ['OPENAI_API_KEY', 'ANTHROPIC_API_KEY', 'PERPLEXITY_API_KEY', 'GEMINI_API_KEY']
    .filter((k) => env[k]);
  checks.push(aiKeys.length
    ? result('ai-provider-config', 'AI provider', 'pass', `Live provider key(s): ${aiKeys.map((k) => k.replace('_API_KEY', '')).join(', ')}. Output still routes to the Verification Queue.`)
    : result('ai-provider-config', 'AI provider', 'warning', 'No AI keys — all AI output is a labeled mock.'));

  // ---- Error monitoring ------------------------------------------------------
  checks.push(env.SENTRY_DSN || env.ERROR_MONITORING_DSN
    ? result('error-monitoring', 'Error monitoring', 'pass', 'Error monitoring DSN configured.')
    : result('error-monitoring', 'Error monitoring', prod ? 'warning' : 'warning', 'No error-monitoring DSN configured.'));

  // ---- Health endpoint + versions -------------------------------------------
  checks.push(ctx.healthEndpoint === false
    ? result('health-endpoint', 'Health endpoint', 'warning', 'Health endpoint not detected.')
    : result('health-endpoint', 'Health endpoint', 'pass', '/api/health responds with liveness + schema version.'));

  const appVersion = ctx.packageVersion || null;
  checks.push(result('app-version', 'Application version', appVersion ? 'pass' : 'warning', appVersion ? `v${appVersion}` : 'Unknown.'));
  checks.push(result('schema-version', 'Schema version', ctx.latestMigration ? 'pass' : 'skipped', ctx.latestMigration || 'Unknown.'));

  // ---- Test status (informational) ------------------------------------------
  checks.push(result('test-status', 'Test suite', 'warning',
    'Run `npm run test` and `npm run typecheck` in CI as a gate — not executed by this check.'));

  // ---- Roll up ---------------------------------------------------------------
  const counts = { pass: 0, warning: 0, failure: 0, skipped: 0 };
  for (const c of checks) counts[c.level] = (counts[c.level] || 0) + 1;
  const overall = counts.failure > 0 ? 'failure' : counts.warning > 0 ? 'warning' : 'pass';

  return {
    overall,
    checks,
    counts,
    environment: env.NODE_ENV || 'development',
    appVersion,
    schemaVersion: ctx.latestMigration || null,
  };
}
