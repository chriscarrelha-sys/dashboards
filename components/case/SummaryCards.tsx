'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Card } from '@/components/ui/card';
import { TrustBadge } from '@/components/ui/badge';
import { cn, formatDate, relativeDeadline } from '@/lib/utils';
import type { VerificationStatus } from '@/lib/enums';
import { ChevronDown } from 'lucide-react';

export type SummaryData = {
  base: string;
  nextTask: {
    title: string;
    why: string | null;
    priority: string;
    dueDate: string | null;
    status: string;
  } | null;
  nextDeadline: {
    title: string;
    dueDate: string | null;
    source: string;
    verificationStatus: string;
    governingRule: string | null;
  } | null;
  posture: { pendingMotions: number; notes: { title: string; body: string | null }[] };
};

export function SummaryCards({ data }: { data: SummaryData }) {
  // On mobile we keep only one card open; on desktop, many. We track the set.
  const [open, setOpen] = useState<Set<string>>(new Set(['next-action']));
  const isMobile = () => typeof window !== 'undefined' && window.matchMedia('(max-width: 640px)').matches;

  const toggle = (key: string) => {
    setOpen((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        if (isMobile()) next.clear();
        next.add(key);
      }
      return next;
    });
  };

  const nd = data.nextDeadline;
  const rel = nd?.dueDate ? relativeDeadline(nd.dueDate) : null;

  return (
    <div className="grid gap-3 md:grid-cols-3">
      <SummaryCard
        title="Next Action"
        open={open.has('next-action')}
        onToggle={() => toggle('next-action')}
        collapsed={data.nextTask ? data.nextTask.title : 'No open tasks'}
      >
        {data.nextTask ? (
          <div className="space-y-2 text-sm">
            <p className="font-medium">{data.nextTask.title}</p>
            {data.nextTask.why && (
              <p className="text-muted-foreground">
                <span className="font-medium text-foreground">Why it matters: </span>
                {data.nextTask.why}
              </p>
            )}
            <dl className="grid grid-cols-2 gap-1 text-muted-foreground">
              <div><dt className="inline font-medium text-foreground">Priority: </dt>{data.nextTask.priority}</div>
              <div><dt className="inline font-medium text-foreground">Status: </dt>{data.nextTask.status}</div>
              <div><dt className="inline font-medium text-foreground">Due: </dt>{formatDate(data.nextTask.dueDate)}</div>
            </dl>
            <Link href={`${data.base}/deadlines`} className="inline-block text-xs font-medium text-[hsl(var(--proposed))] hover:underline">
              Open Deadlines &amp; Tasks →
            </Link>
          </div>
        ) : (
          <EmptyMini href={`${data.base}/deadlines`} label="Add a task" />
        )}
      </SummaryCard>

      <SummaryCard
        title="Next Court Date or Deadline"
        open={open.has('deadline')}
        onToggle={() => toggle('deadline')}
        collapsed={nd ? `${nd.title}${rel ? ` · ${rel.label}` : ''}` : 'No upcoming deadlines'}
      >
        {nd ? (
          <div className="space-y-2 text-sm">
            <div className="flex items-center gap-2">
              <p className="font-medium">{nd.title}</p>
              <TrustBadge status={nd.verificationStatus as VerificationStatus} />
            </div>
            <dl className="grid gap-1 text-muted-foreground">
              <div><dt className="inline font-medium text-foreground">Date: </dt>{formatDate(nd.dueDate)}{rel ? ` (${rel.label})` : ''}</div>
              <div><dt className="inline font-medium text-foreground">Source: </dt>{nd.source}</div>
              {nd.governingRule && (
                <div><dt className="inline font-medium text-foreground">Basis: </dt>{nd.governingRule}</div>
              )}
            </dl>
            {nd.verificationStatus === 'unverified' && (
              <p className="rounded-md bg-[hsl(var(--unverified)/0.12)] px-2 py-1 text-xs text-[hsl(var(--unverified))]">
                Calculated but not verified — confirm before relying on this date.
              </p>
            )}
            <Link href={`${data.base}/deadlines`} className="inline-block text-xs font-medium text-[hsl(var(--proposed))] hover:underline">
              Open Deadlines &amp; Tasks →
            </Link>
          </div>
        ) : (
          <EmptyMini href={`${data.base}/deadlines`} label="Add a deadline" />
        )}
      </SummaryCard>

      <SummaryCard
        title="Current Case Posture"
        open={open.has('posture')}
        onToggle={() => toggle('posture')}
        collapsed={`${data.posture.pendingMotions} pending motion(s)`}
      >
        <div className="space-y-2 text-sm">
          <p className="text-muted-foreground">
            <span className="font-medium text-foreground">Pending motions: </span>
            {data.posture.pendingMotions}
          </p>
          {data.posture.notes.length ? (
            <ul className="space-y-1.5">
              {data.posture.notes.map((n, i) => (
                <li key={i}>
                  <span className="font-medium">{n.title}: </span>
                  <span className="text-muted-foreground">{n.body}</span>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyMini href={`${data.base}/strategy`} label="Add strategy notes" />
          )}
        </div>
      </SummaryCard>
    </div>
  );
}

function SummaryCard({
  title,
  collapsed,
  open,
  onToggle,
  children,
}: {
  title: string;
  collapsed: string;
  open: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <Card className="overflow-hidden">
      <button onClick={onToggle} className="flex w-full items-start justify-between gap-2 p-4 text-left" aria-expanded={open}>
        <div className="min-w-0">
          <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{title}</div>
          {!open && <div className="mt-1 truncate text-sm font-medium">{collapsed}</div>}
        </div>
        <ChevronDown size={16} className={cn('mt-0.5 shrink-0 text-muted-foreground transition-transform', open ? '' : '-rotate-90')} />
      </button>
      {open && <div className="border-t p-4">{children}</div>}
    </Card>
  );
}

function EmptyMini({ href, label }: { href: string; label: string }) {
  return (
    <Link href={href} className="text-xs font-medium text-[hsl(var(--proposed))] hover:underline">
      {label} →
    </Link>
  );
}
