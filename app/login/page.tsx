import { redirect } from 'next/navigation';
import { isDevMode } from '@/lib/auth/session';
import { LoginForm } from '@/components/auth/LoginForm';

export const dynamic = 'force-dynamic';

/**
 * Owner login. Only meaningful when real auth is on (AUTH_DEV_MODE=false, i.e. the
 * hosted instance). On a local dev instance there is no password, so we bounce to home.
 */
export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  if (isDevMode()) redirect('/');
  const { next } = await searchParams;

  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col items-center justify-center px-6">
      <div className="mb-8 text-center">
        <div className="mb-2 inline-flex items-center gap-2 text-xl font-semibold tracking-tight">
          <span aria-hidden className="grid h-8 w-8 place-items-center rounded-lg bg-primary text-primary-foreground">⚖</span>
          Pro Se Wins
        </div>
        <p className="text-sm italic text-muted-foreground">“Success is the best revenge.”</p>
      </div>
      <div className="w-full rounded-xl border bg-card p-6 shadow-sm">
        <h1 className="mb-1 text-lg font-semibold">Sign in</h1>
        <p className="mb-4 text-sm text-muted-foreground">This is a private instance. Enter your owner password.</p>
        <LoginForm next={next} />
      </div>
      <p className="mt-6 text-center text-xs text-muted-foreground">Only you can sign in. Sessions last 30 days on this device.</p>
    </main>
  );
}
