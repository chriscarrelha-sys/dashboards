'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { TrustBadge } from '@/components/ui/badge';
import { createLegalIssue } from '@/lib/actions/phase2';
import { LEGAL_ISSUE_TYPES, humanize } from '@/lib/enums';
import type { VerificationStatus } from '@/lib/enums';
import { Plus, Scale } from 'lucide-react';

export type IssueRow = {
  id: string; title: string; issueType: string; status: string;
  assertingParty: string | null; verificationStatus: string;
  elementCount: number; supportedCount: number; evidenceCount: number;
};

export function LegalIssuesClient({
  caseId, issues, defaultType,
}: {
  caseId: string; issues: IssueRow[]; defaultType?: string;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [open, setOpen] = useState(false);
  const [f, setF] = useState({ title: '', issueType: defaultType || 'claim', assertingParty: '', standard: '', requestedRelief: '' });

  const submit = () => {
    if (!f.title) return;
    start(async () => {
      await createLegalIssue(caseId, {
        title: f.title, issueType: f.issueType, assertingParty: f.assertingParty || undefined,
        standard: f.standard || undefined, requestedRelief: f.requestedRelief || undefined,
      });
      setF({ title: '', issueType: defaultType || 'claim', assertingParty: '', standard: '', requestedRelief: '' });
      setOpen(false);
      router.refresh();
    });
  };

  return (
    <div>
      <div className="mb-4 flex justify-end">
        <Button size="sm" variant={open ? 'subtle' : 'primary'} onClick={() => setOpen((o) => !o)}><Plus size={15} /> New</Button>
      </div>
      {open && (
        <div className="mb-4 grid gap-3 rounded-lg border bg-card p-4">
          <input className="rounded-md border bg-background px-3 py-2 text-sm" placeholder="Title *" value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} />
          <div className="grid gap-2 sm:grid-cols-2">
            <select className="rounded-md border bg-background px-3 py-2 text-sm" value={f.issueType} onChange={(e) => setF({ ...f, issueType: e.target.value })}>
              {LEGAL_ISSUE_TYPES.map((t) => <option key={t} value={t}>{humanize(t)}</option>)}
            </select>
            <input className="rounded-md border bg-background px-3 py-2 text-sm" placeholder="Asserting party" value={f.assertingParty} onChange={(e) => setF({ ...f, assertingParty: e.target.value })} />
          </div>
          <input className="rounded-md border bg-background px-3 py-2 text-sm" placeholder="Standard / burden of proof" value={f.standard} onChange={(e) => setF({ ...f, standard: e.target.value })} />
          <input className="rounded-md border bg-background px-3 py-2 text-sm" placeholder="Requested relief" value={f.requestedRelief} onChange={(e) => setF({ ...f, requestedRelief: e.target.value })} />
          <div><Button size="sm" onClick={submit} disabled={pending || !f.title}>Create</Button></div>
        </div>
      )}

      {issues.length === 0 ? (
        <p className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">No items yet.</p>
      ) : (
        <div className="space-y-2">
          {issues.map((i) => (
            <Link key={i.id} href={`/case/${caseId}/legal-issue/${i.id}`}
              className="flex items-center gap-3 rounded-lg border bg-card p-3 hover:border-ring">
              <Scale size={16} className="text-[hsl(var(--proposed))]" />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-medium">{i.title}</span>
                  <span className="rounded bg-muted px-1.5 py-0.5 text-xs text-muted-foreground">{humanize(i.issueType)}</span>
                  <TrustBadge status={i.verificationStatus as VerificationStatus} />
                </div>
                <div className="text-xs text-muted-foreground">
                  {i.assertingParty ? `${i.assertingParty} · ` : ''}{humanize(i.status)} · {i.supportedCount}/{i.elementCount} elements supported · {i.evidenceCount} evidence links
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
