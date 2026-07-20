#!/usr/bin/env node
/** Environment validation — fails clearly when required variables are absent
 * or inconsistent. Run in CI and before deployment (npm run validate:env). */
const REQUIRED = ['DATABASE_URL'];
const PROD_REQUIRED = ['DATABASE_URL', 'AUTH_SECRET'];
const env = process.env;
const mode = env.NODE_ENV || 'development';
const errors = [];

const required = mode === 'production' ? PROD_REQUIRED : REQUIRED;
for (const k of required) if (!env[k]) errors.push(`Missing required variable: ${k}`);

// In production, dev-mode auth must be OFF.
if (mode === 'production' && env.AUTH_DEV_MODE === 'true') {
  errors.push('AUTH_DEV_MODE must not be "true" in production — configure a real auth provider.');
}
// Don't allow a sqlite dev DB in production.
if (mode === 'production' && (env.DATABASE_URL || '').startsWith('file:')) {
  errors.push('DATABASE_URL points at SQLite (file:) — production requires PostgreSQL.');
}

if (errors.length) {
  console.error('Environment validation FAILED:');
  for (const e of errors) console.error('  - ' + e);
  process.exit(1);
}
console.log(`Environment OK (${mode}).`);
