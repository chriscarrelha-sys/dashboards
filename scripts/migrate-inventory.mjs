#!/usr/bin/env node
/**
 * Real-case migration planning tool (Phase 6 §31–36): `npm run migrate:inventory -- <folder>`.
 *
 * DRY-RUN ONLY. This is a planning aid, not an importer. It:
 *   - walks a source folder (recursively),
 *   - hashes each file (SHA-256),
 *   - classifies it (type/date/duplicate/version/needs-review) via the shared
 *     inventory engine,
 *   - writes an inventory JSON you can review before any real import.
 *
 * It NEVER: modifies source files, writes to the database, uploads anything, or
 * confirms a deadline. Real import happens later, per case, with a pre-migration
 * backup and your explicit approval (§35, §48).
 */
import { readdir, readFile, stat, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { join, basename } from 'node:path';
import { buildInventory } from '../lib/migration/inventory.mjs';

const IGNORE = new Set(['.DS_Store', 'Thumbs.db', '.git', 'node_modules']);

async function walk(dir, out = []) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    if (IGNORE.has(entry.name)) continue;
    const full = join(dir, entry.name);
    if (entry.isDirectory()) await walk(full, out);
    else if (entry.isFile()) out.push(full);
  }
  return out;
}

async function main() {
  const folder = process.argv[2];
  if (!folder) {
    console.error('Usage: npm run migrate:inventory -- <source-folder> [output.json]');
    process.exit(1);
  }
  const outPath = process.argv[3] || 'migration-inventory.json';

  let paths;
  try {
    paths = await walk(folder);
  } catch (e) {
    console.error(`Cannot read folder "${folder}": ${e.message}`);
    process.exit(1);
  }

  const files = [];
  for (const p of paths) {
    let sizeBytes = null, hash = null, unreadable = false, passwordProtected = false;
    try {
      const st = await stat(p);
      sizeBytes = st.size;
      const buf = await readFile(p);
      hash = createHash('sha256').update(buf).digest('hex');
      // Heuristic: an encrypted PDF starts with %PDF but contains /Encrypt.
      if (basename(p).toLowerCase().endsWith('.pdf')) {
        const head = buf.subarray(0, Math.min(buf.length, 4096)).toString('latin1');
        if (head.includes('/Encrypt')) passwordProtected = true;
      }
    } catch {
      unreadable = true;
    }
    files.push({ fileName: basename(p), sourcePath: p, sizeBytes, hash, unreadable, passwordProtected });
  }

  const { items, summary } = buildInventory(files);

  await writeFile(outPath, JSON.stringify({ folder, generatedFrom: 'migrate-inventory (dry-run)', summary, items }, null, 2));

  console.log(`\nSource inventory (DRY-RUN) for: ${folder}\n`);
  console.log(`  total files      ${summary.total}`);
  console.log(`  routine          ${summary.routine}`);
  console.log(`  needs review     ${summary.needsReview}`);
  console.log(`  exact duplicates ${summary.duplicates}`);
  console.log(`  version groups   ${summary.versionGroups}`);
  console.log(`  unreadable/locked${' '.repeat(0)} ${summary.unreadable}`);
  console.log(`\n  Inventory written to ${outPath}`);
  console.log(`  Nothing was imported, uploaded, or modified. Review this file before any real import.\n`);
}

main().catch((e) => { console.error(e); process.exit(1); });
