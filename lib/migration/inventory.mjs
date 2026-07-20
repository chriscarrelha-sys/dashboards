/**
 * Real-case migration inventory engine (Phase 6 §33–35).
 *
 * Pure, side-effect-free classification logic shared by the dry-run scanner
 * (`scripts/migrate-inventory.mjs`), the server actions, and the test suite.
 * It NEVER reads or writes files or the database — callers supply already-read
 * file descriptors (name, size, hash) and get back a classified inventory.
 *
 * Design guarantees that match the product principles:
 *   - Originals are never mutated (this engine only describes them).
 *   - Nothing is auto-confirmed; every inferred field is a proposal.
 *   - Duplicates are grouped, never deleted.
 */

/** @typedef {{ fileName: string, sourcePath?: string, sizeBytes?: number,
 *   hash?: string, unreadable?: boolean, passwordProtected?: boolean }} SourceFile */

const TYPE_RULES = [
  [/\b(complaint|petition|answer|counterclaim|crossclaim|pleading)\b/i, 'pleading'],
  [/\b(order|ruling|judgment|decree)\b/i, 'order'],
  [/\b(motion|brief|memorandum|response|reply|opposition)\b/i, 'motion'],
  [/\b(interrogator\w*|request for production|rfp|rfa|admission\w*|subpoena|deposition|discovery)\b/i, 'discovery'],
  [/\b(exhibit|attachment|appendix)\b/i, 'exhibit'],
  [/\b(letter|email|correspondence|notice)\b/i, 'correspondence'],
  [/\b(certificate of service|proof of service|service)\b/i, 'service'],
  [/\b(affidavit|declaration|verification)\b/i, 'affidavit'],
  [/\b(transcript|hearing)\b/i, 'transcript'],
  [/\b(invoice|statement|damages|ledger|receipt)\b/i, 'financial'],
];

/** Best-effort document-type inference from a filename. Always a proposal. */
export function inferDocType(fileName) {
  for (const [re, type] of TYPE_RULES) if (re.test(fileName)) return type;
  return 'unclassified';
}

/** Extract a likely document date from the filename, or null. Never confirmed. */
export function inferLikelyDate(fileName) {
  // ISO: 2024-03-09
  let m = fileName.match(/(20\d{2})[-_.](0[1-9]|1[0-2])[-_.](0[1-9]|[12]\d|3[01])/);
  if (m) return `${m[1]}-${m[2]}-${m[3]}`;
  // US: 03-09-2024 or 3/9/2024
  m = fileName.match(/\b(0?[1-9]|1[0-2])[-_/](0?[1-9]|[12]\d|3[01])[-_/](20\d{2})\b/);
  if (m) {
    const mm = String(m[1]).padStart(2, '0');
    const dd = String(m[2]).padStart(2, '0');
    return `${m[3]}-${mm}-${dd}`;
  }
  return null;
}

/** Extension (lowercase, no dot) or ''. */
export function inferExtension(fileName) {
  const i = fileName.lastIndexOf('.');
  return i > 0 ? fileName.slice(i + 1).toLowerCase() : '';
}

/**
 * Normalize a filename for version grouping: drop extension, version markers,
 * (final|draft|signed|filed|redacted), dates, and copy suffixes.
 */
export function normalizeBaseName(fileName) {
  let s = fileName.toLowerCase();
  const dot = s.lastIndexOf('.');
  if (dot > 0) s = s.slice(0, dot);
  s = s
    .replace(/\b(v|ver|version|rev|r)\.?\s?\d+\b/g, ' ')
    .replace(/\b(v|ver|version|rev|draft|final|signed|filed|stamped|conformed|redacted|copy|clean)\b/g, ' ')
    .replace(/\b\d{1,2}[-_/]\d{1,2}[-_/]\d{2,4}\b/g, ' ')
    .replace(/\b20\d{2}[-_.]\d{2}[-_.]\d{2}\b/g, ' ')
    .replace(/\(\d+\)/g, ' ')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
  return s;
}

/**
 * Build a classified inventory from source file descriptors.
 * @param {SourceFile[]} files
 * @returns {{ items: Array<object>, summary: { total:number, duplicates:number,
 *   versionGroups:number, needsReview:number, unreadable:number, routine:number } }}
 */
export function buildInventory(files) {
  // Group by hash (exact duplicates) and by normalized base name (versions).
  const byHash = new Map();
  const byBase = new Map();
  for (const f of files) {
    if (f.hash) {
      if (!byHash.has(f.hash)) byHash.set(f.hash, []);
      byHash.get(f.hash).push(f);
    }
    const base = normalizeBaseName(f.fileName);
    if (!byBase.has(base)) byBase.set(base, []);
    byBase.get(base).push(f);
  }

  const items = files.map((f) => {
    const ext = inferExtension(f.fileName);
    const likelyType = inferDocType(f.fileName);
    const likelyDate = inferLikelyDate(f.fileName);
    const base = normalizeBaseName(f.fileName);
    const hashGroup = f.hash ? byHash.get(f.hash) : [f];
    const baseGroup = byBase.get(base) || [f];

    const isExactDuplicate = f.hash && hashGroup.length > 1;
    const isVersion = !isExactDuplicate && baseGroup.length > 1;
    const readable = !f.unreadable && !f.passwordProtected;

    let classification = 'routine';
    let confidence = 0.6;
    if (!readable) { classification = f.passwordProtected ? 'needs-review' : 'needs-review'; confidence = 0; }
    else if (isExactDuplicate) { classification = 'duplicate'; confidence = 0.95; }
    else if (isVersion) { classification = 'version'; confidence = 0.5; }
    else if (likelyType === 'unclassified' || !likelyDate) { classification = 'needs-review'; confidence = 0.4; }

    return {
      fileName: f.fileName,
      sourcePath: f.sourcePath ?? null,
      sizeBytes: f.sizeBytes ?? null,
      extension: ext,
      hash: f.hash ?? null,
      likelyType,
      likelyDate,
      duplicateGroup: isExactDuplicate ? f.hash : null,
      versionGroup: isVersion ? base : null,
      unreadable: !!f.unreadable,
      passwordProtected: !!f.passwordProtected,
      classification,
      confidence,
      // Proposal only — the real import decides after user review.
      migrationStatus: 'pending',
    };
  });

  const summary = {
    total: items.length,
    duplicates: items.filter((i) => i.classification === 'duplicate').length,
    versionGroups: new Set(items.filter((i) => i.versionGroup).map((i) => i.versionGroup)).size,
    needsReview: items.filter((i) => i.classification === 'needs-review').length,
    unreadable: items.filter((i) => i.unreadable || i.passwordProtected).length,
    routine: items.filter((i) => i.classification === 'routine').length,
  };
  return { items, summary };
}
