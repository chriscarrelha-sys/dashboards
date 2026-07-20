import { prisma } from '@/lib/prisma';

/**
 * SearchProvider interface. The default LocalSearchProvider queries the
 * SearchIndexEntry table (populated by the indexer) with case-scoped filters.
 * A production deployment can swap in Meilisearch/Typesense/pgvector behind the
 * same interface without changing callers. A MockSearchProvider backs tests.
 *
 * Secrets/tokens are NEVER indexed (the indexer only reads content fields).
 */

export type SearchScope = { kind: 'case'; caseId: string } | { kind: 'global'; userCaseIds: string[] };

export type SearchFilters = {
  recordTypes?: string[];
  createdBy?: 'user' | 'ai';
  confidentiality?: string;
  verificationStatus?: string;
  includeConfidential?: boolean;
};

export type SearchHit = {
  recordType: string;
  recordId: string;
  caseId: string;
  title: string;
  excerpt: string | null;
  page: number | null;
  confidentiality: string;
  createdBy: string | null;
  verificationStatus: string | null;
};

export interface SearchProvider {
  readonly name: string;
  search(query: string, scope: SearchScope, filters?: SearchFilters, limit?: number): Promise<SearchHit[]>;
}

/** Case-insensitive, punctuation-tolerant token match (approximate fuzzy for SQLite). */
function tokenize(q: string): string[] {
  return q.toLowerCase().replace(/[^\w$.\-\s]/g, ' ').split(/\s+/).filter((t) => t.length > 1);
}

export const localSearchProvider: SearchProvider = {
  name: 'local',
  async search(query, scope, filters = {}, limit = 100) {
    const caseIds = scope.kind === 'case' ? [scope.caseId] : scope.userCaseIds;
    if (caseIds.length === 0) return [];
    const terms = tokenize(query);

    const where: Record<string, unknown> = { caseId: { in: caseIds } };
    if (filters.recordTypes?.length) where.recordType = { in: filters.recordTypes };
    if (filters.createdBy) where.createdBy = filters.createdBy;
    if (filters.verificationStatus) where.verificationStatus = filters.verificationStatus;
    // Confidential records are excluded unless explicitly requested.
    if (!filters.includeConfidential) where.confidentiality = 'public';
    if (filters.confidentiality) where.confidentiality = filters.confidentiality;

    // Match ALL terms (AND) against title OR body (case-insensitive contains).
    if (terms.length) {
      where.AND = terms.map((t) => ({
        OR: [
          { title: { contains: t } },
          { body: { contains: t } },
        ],
      }));
    }

    const rows = await prisma.searchIndexEntry.findMany({ where, take: limit, orderBy: { indexedAt: 'desc' } });

    // Rank: title hits > body hits; page-level entries keep their page.
    const scored = rows.map((r) => {
      const hay = `${r.title} ${r.body ?? ''}`.toLowerCase();
      let score = 0;
      for (const t of terms) { if (r.title.toLowerCase().includes(t)) score += 3; else if (hay.includes(t)) score += 1; }
      return { r, score };
    }).sort((a, b) => b.score - a.score);

    return scored.map(({ r }) => ({
      recordType: r.recordType, recordId: r.recordId, caseId: r.caseId, title: r.title,
      excerpt: excerptFor(r.body, terms), page: r.page, confidentiality: r.confidentiality,
      createdBy: r.createdBy, verificationStatus: r.verificationStatus,
    }));
  },
};

function excerptFor(body: string | null, terms: string[]): string | null {
  if (!body) return null;
  const lower = body.toLowerCase();
  const pos = terms.map((t) => lower.indexOf(t)).filter((i) => i >= 0).sort((a, b) => a - b)[0] ?? 0;
  const start = Math.max(0, pos - 60);
  return (start > 0 ? '…' : '') + body.slice(start, start + 180) + (body.length > start + 180 ? '…' : '');
}

export function getSearchProvider(): SearchProvider {
  // Extension point: read SEARCH_PROVIDER env and return a hosted provider.
  return localSearchProvider;
}
