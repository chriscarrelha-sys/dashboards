'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { resolveReviewItem } from '@/lib/actions';

export function ReviewActions({ caseId, itemId }: { caseId: string; itemId: string }) {
  const [pending, start] = useTransition();
  const router = useRouter();
  const act = (decision: 'approve' | 'reject') =>
    start(async () => {
      await resolveReviewItem(caseId, itemId, decision);
      router.refresh();
    });
  return (
    <div className="flex gap-2">
      <Button size="sm" onClick={() => act('approve')} disabled={pending}>Approve</Button>
      <Button size="sm" variant="outline" onClick={() => act('reject')} disabled={pending}>Reject</Button>
    </div>
  );
}
