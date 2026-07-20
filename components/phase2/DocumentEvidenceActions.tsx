'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { NewEvidenceForm } from '@/components/phase2/EvidenceExplorer';
import { aiExtractEvidence } from '@/lib/actions/ai-extraction';
import { FilePlus, Sparkles } from 'lucide-react';

/**
 * Document-workspace actions: create a source-linked evidence item from this
 * document, or run mock AI extraction (proposals go to the Verification Queue).
 */
export function DocumentEvidenceActions({
  caseId, documentId, documents, legalIssues,
}: {
  caseId: string; documentId: string; documents: { id: string; title: string }[]; legalIssues: { id: string; title: string }[];
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [showForm, setShowForm] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const extract = () => start(async () => {
    const res = await aiExtractEvidence(caseId, documentId);
    setMsg(`${res.proposed} proposal(s) sent to the Verification Queue.`);
    router.refresh();
  });

  return (
    <div className="rounded-lg border bg-card p-4">
      <h2 className="mb-2 text-sm font-semibold">Evidence &amp; analysis</h2>
      <div className="flex flex-wrap gap-2">
        <Button size="sm" onClick={() => setShowForm((s) => !s)}><FilePlus size={14} /> Create Evidence Item</Button>
        <Button size="sm" variant="outline" onClick={extract} disabled={pending}><Sparkles size={14} /> Extract with AI (→ queue)</Button>
      </div>
      {msg && <p className="mt-2 text-xs text-muted-foreground">{msg}</p>}
      {showForm && (
        <div className="mt-3">
          <NewEvidenceForm caseId={caseId} documents={documents} legalIssues={legalIssues} presetDocumentId={documentId} onDone={() => { setShowForm(false); router.refresh(); }} />
        </div>
      )}
    </div>
  );
}
