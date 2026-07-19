'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { runSearch, saveSearch } from '@/lib/actions/phase4';
import { Button } from '@/components/ui/button';
import { TrustBadge } from '@/components/ui/badge';
import { SEARCH_RECORD_TYPES, humanize } from '@/lib/enums';
import type { VerificationStatus } from '@/lib/enums';
import { Search as SearchIcon, Bookmark } from 'lucide-react';

type Hit = {
  recordType: string; recordId: string; caseId: string; title: string; excerpt: string | null;
  page: number | null; confidentiality: string; createdBy: string | null; verificationStatus: string | null;
};

// Where each record type opens.
function hrefFor(h: Hit): string {
  const base = `/case/${h.caseId}`;
  switch (h.recordType) {
    case 'document': return `${base}/document/${h.recordId}${h.page ? `?page=${h.page}` : ''}`;
    case 'filing': return `${base}/filing/${h.recordId}${h.page ? `?page=${h.page}` : ''}`;
    case 'evidence': return `${base}/evidence`;
    case 'discovery': return `${base}/discovery`;
    case 'legal-issue': return `${base}/legal-issue/${h.recordId}`;
    case 'deadline': case 'task': return `${base}/deadlines`;
    case 'communication': return `${base}/comms/emails`;
    case 'authority': case 'research': return `${base}/research`;
    case 'strategy': return `${base}/strategy`;
    case 'admission': return `${base}/admissions`;
    case 'contradiction': return `${base}/contradictions`;
    case 'timeline': return `${base}/timeline`;
    default: return base;
  }
}

const TABS = ['All', 'document', 'evidence', 'discovery', 'filing', 'deadline', 'communication', 'authority', 'strategy'];

export function SearchClient({ caseId }: { caseId: string | null }) {
  const [pending, start] = useTransition();
  const [q, setQ] = useState('');
  const [scope, setScope] = useState<'case' | 'global'>(caseId ? 'case' : 'global');
  const [tab, setTab] = useState('All');
  const [includeConf, setIncludeConf] = useState(false);
  const [hits, setHits] = useState<Hit[] | null>(null);
  const [saved, setSaved] = useState(false);

  const search = () => {
    if (!q.trim()) return;
    start(async () => {
      const res = await runSearch(q.trim(), scope, scope === 'case' ? caseId : null, { includeConfidential: includeConf, recordTypes: tab === 'All' ? undefined : [tab] });
      setHits(res as Hit[]);
    });
  };
  const doSave = () => start(async () => { await saveSearch(scope === 'case' ? caseId : null, { title: q.slice(0, 60), scope, query: q }); setSaved(true); setTimeout(() => setSaved(false), 1600); });

  const shown = hits ?? [];
  const counts: Record<string, number> = {};
  shown.forEach((h) => { counts[h.recordType] = (counts[h.recordType] || 0) + 1; });
  const filtered = tab === 'All' ? shown : shown.filter((h) => h.recordType === tab);

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <div className="flex flex-1 items-center gap-2 rounded-md border bg-background px-3">
          <SearchIcon size={16} className="text-muted-foreground" />
          <input className="flex-1 bg-transparent py-2 text-sm outline-none" placeholder="Search this case…"
            value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && search()} autoFocus />
        </div>
        <div className="flex rounded-md border text-sm">
          <button onClick={() => setScope('case')} disabled={!caseId} className={`px-3 py-2 ${scope === 'case' ? 'bg-accent font-medium' : 'text-muted-foreground'} disabled:opacity-40`}>This case</button>
          <button onClick={() => setScope('global')} className={`px-3 py-2 ${scope === 'global' ? 'bg-accent font-medium' : 'text-muted-foreground'}`}>All cases</button>
        </div>
        <Button size="sm" onClick={search} disabled={pending || !q.trim()}>Search</Button>
        {hits && <Button size="sm" variant="outline" onClick={doSave} disabled={pending}><Bookmark size={14} /> {saved ? 'Saved' : 'Save'}</Button>}
      </div>
      <label className="mb-3 flex items-center gap-1.5 text-xs text-muted-foreground">
        <input type="checkbox" checked={includeConf} onChange={(e) => setIncludeConf(e.target.checked)} /> Include confidential records
        <span className="ml-2 rounded bg-muted px-1.5 py-0.5">Scope: {scope === 'case' ? 'current case only' : 'all your cases'}</span>
      </label>

      {hits === null ? (
        <p className="rounded-lg border border-dashed p-10 text-center text-sm text-muted-foreground">Search documents, evidence, filings, discovery, deadlines, communications, research, and strategy. Results never leave your account; secrets are never indexed.</p>
      ) : (
        <>
          <div className="mb-3 flex flex-wrap gap-1 border-b text-sm">
            {TABS.filter((t) => t === 'All' || counts[t]).map((t) => (
              <button key={t} onClick={() => setTab(t)} className={`px-3 py-1.5 ${tab === t ? 'border-b-2 border-[hsl(var(--proposed))] font-medium' : 'text-muted-foreground'}`}>
                {t === 'All' ? `All (${shown.length})` : `${humanize(t)} (${counts[t]})`}
              </button>
            ))}
          </div>
          {filtered.length === 0 ? <p className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">No matches.</p> : (
            <div className="space-y-2">
              {filtered.map((h, i) => (
                <Link key={i} href={hrefFor(h)} className="block rounded-lg border bg-card p-3 hover:border-ring">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded bg-muted px-1.5 py-0.5 text-xs text-muted-foreground">{humanize(h.recordType)}</span>
                    <span className="font-medium">{h.title}</span>
                    {h.page && <span className="rounded bg-[hsl(var(--proposed)/0.15)] px-1.5 py-0.5 text-xs text-[hsl(var(--proposed))]">page {h.page}</span>}
                    {h.verificationStatus && <TrustBadge status={h.verificationStatus as VerificationStatus} />}
                    {h.confidentiality !== 'public' && <span className="text-xs text-[hsl(var(--disputed))]">{humanize(h.confidentiality)}</span>}
                  </div>
                  {h.excerpt && <p className="mt-1 text-sm text-muted-foreground">{h.excerpt}</p>}
                </Link>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
