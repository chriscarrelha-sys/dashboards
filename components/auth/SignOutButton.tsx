'use client';

import { useTransition } from 'react';
import { signOut } from '@/lib/actions/auth';

export function SignOutButton() {
  const [pending, start] = useTransition();
  return (
    <button
      onClick={() => start(() => signOut())}
      disabled={pending}
      className="text-xs text-muted-foreground underline underline-offset-2 hover:text-foreground disabled:opacity-60"
    >
      {pending ? 'Signing out…' : 'Sign out'}
    </button>
  );
}
