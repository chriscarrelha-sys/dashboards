import * as React from 'react';
import { cn } from '@/lib/utils';
import type { VerificationStatus } from '@/lib/enums';
import { VERIFICATION_LABELS } from '@/lib/enums';

export function Badge({ className, ...props }: React.HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium',
        className,
      )}
      {...props}
    />
  );
}

const TRUST_CLASSES: Record<VerificationStatus, string> = {
  confirmed: 'border-transparent bg-[hsl(var(--confirmed)/0.15)] text-[hsl(var(--confirmed))]',
  proposed: 'border-transparent bg-[hsl(var(--proposed)/0.15)] text-[hsl(var(--proposed))]',
  unverified: 'border-transparent bg-[hsl(var(--unverified)/0.15)] text-[hsl(var(--unverified))]',
  disputed: 'border-transparent bg-[hsl(var(--disputed)/0.15)] text-[hsl(var(--disputed))]',
  corrected: 'border-transparent bg-muted text-muted-foreground',
};

/**
 * The single most important UI element in the app: it tells the user at a glance
 * whether a value is a confirmed fact, a proposal, or an unverified calculation.
 */
export function TrustBadge({
  status,
  className,
}: {
  status: VerificationStatus;
  className?: string;
}) {
  return (
    <Badge className={cn(TRUST_CLASSES[status], className)} title={`Trust state: ${VERIFICATION_LABELS[status]}`}>
      {VERIFICATION_LABELS[status]}
    </Badge>
  );
}
