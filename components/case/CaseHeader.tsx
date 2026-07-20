'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Copy, Check, ExternalLink } from 'lucide-react';

type Portal = { kind: string; label: string | null; url: string } | null;

export function CaseHeader({
  caption,
  courtName,
  division,
  caseNumber,
  judgeName,
  caseType,
  forum,
  portal,
}: {
  caption: string;
  courtName: string | null;
  division: string | null;
  caseNumber: string;
  judgeName: string | null;
  caseType: string | null;
  forum: string;
  portal: Portal;
}) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(caseNumber);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      /* clipboard unavailable */
    }
  };

  const meta = [
    courtName,
    division,
    judgeName ? `Judge: ${judgeName}` : null,
    caseType ? `Type: ${caseType}` : null,
    forum ? `Forum: ${forum}` : null,
  ].filter(Boolean);

  return (
    <div className="mb-6 border-b pb-6">
      <h1 className="text-xl font-semibold leading-snug sm:text-2xl">{caption}</h1>
      <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
        {meta.map((m, i) => (
          <span key={i} className="after:ml-3 after:text-border after:content-['·'] last:after:content-['']">
            {m}
          </span>
        ))}
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <span className="rounded-md bg-muted px-2.5 py-1 font-mono text-sm">{caseNumber}</span>
        <Button variant="outline" size="sm" onClick={copy}>
          {copied ? <Check size={14} /> : <Copy size={14} />}
          {copied ? 'Copied' : 'Copy Case Number'}
        </Button>
        {portal && (
          <a href={portal.url} target="_blank" rel="noopener noreferrer">
            <Button variant="primary" size="sm">
              <ExternalLink size={14} />
              {portal.label || (portal.kind === 'pacer' ? 'Open in PACER' : 'Open in PeachCourt')}
            </Button>
          </a>
        )}
      </div>
    </div>
  );
}
