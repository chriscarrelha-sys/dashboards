/**
 * Standardized filename generation.
 *
 * Default pattern: YYYY-MM-DD_CaseShortName_DocumentTitle_Party_Status.ext
 * e.g. 2026-05-12_Regions_Answer-and-Counterclaims_Defendants_Filed.pdf
 *
 * Pure and dependency-free so it is easy to unit test (see filename.test.ts).
 * The original filename is always preserved separately in Document.originalName.
 */

export type FilenameParts = {
  date?: Date | string | null;
  caseShortName: string;
  title?: string | null;
  party?: string | null;
  status?: string | null;
  ext?: string | null;
};

/** Collapse arbitrary text into a filename-safe token (Title-Case-ish, hyphenated). */
export function slugToken(input: string | null | undefined): string {
  if (!input) return '';
  return input
    .normalize('NFKD')
    .replace(/[^\w\s-]/g, '') // drop punctuation
    .trim()
    .replace(/\s+/g, '-') // spaces → hyphens
    .replace(/-+/g, '-') // collapse repeats
    .replace(/^-|-$/g, '');
}

function toDateToken(date: Date | string | null | undefined): string {
  if (!date) return 'undated';
  const d = typeof date === 'string' ? new Date(date) : date;
  if (Number.isNaN(d.getTime())) return 'undated';
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function cleanExt(ext: string | null | undefined, fallback = 'pdf'): string {
  if (!ext) return fallback;
  const e = ext.replace(/^\./, '').toLowerCase().replace(/[^a-z0-9]/g, '');
  return e || fallback;
}

/** Titlecase a status token: "filed" → "Filed". */
function titleCase(s: string): string {
  return s.replace(/\b\w/g, (c) => c.toUpperCase());
}

export function generateStandardizedName(parts: FilenameParts): string {
  const segments = [
    toDateToken(parts.date),
    slugToken(parts.caseShortName) || 'Case',
    slugToken(parts.title) || 'Document',
    slugToken(parts.party),
    slugToken(parts.status ? titleCase(parts.status) : ''),
  ].filter((s) => s.length > 0);

  const ext = cleanExt(parts.ext);
  return `${segments.join('_')}.${ext}`;
}

/** Pull an extension from an original filename ("foo.PDF" → "pdf"). */
export function extFromName(name: string | null | undefined): string {
  if (!name) return '';
  const idx = name.lastIndexOf('.');
  return idx >= 0 ? name.slice(idx + 1) : '';
}
