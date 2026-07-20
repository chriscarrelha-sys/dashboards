import Link from 'next/link';
import { listCasesForLanding } from '@/lib/services/cases';
import { isDevMode } from '@/lib/auth/session';
import { SignOutButton } from '@/components/auth/SignOutButton';

export const dynamic = 'force-dynamic';

/**
 * Landing page — deliberately minimal. Logo, the quote, "Select a Matter",
 * one card per case, and Add New Case. No counts, alerts, or case data.
 */
export default async function LandingPage() {
  const cases = await listCasesForLanding();

  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col items-center px-6 py-16">
      {!isDevMode() && (
        <div className="mb-4 flex w-full justify-end">
          <SignOutButton />
        </div>
      )}
      <div className="mb-12 text-center">
        <div className="mb-3 inline-flex items-center gap-2 text-2xl font-semibold tracking-tight">
          <span aria-hidden className="grid h-9 w-9 place-items-center rounded-lg bg-primary text-primary-foreground">
            ⚖
          </span>
          Pro Se Wins
        </div>
        <p className="text-sm italic text-muted-foreground">“Success is the best revenge.”</p>
      </div>

      <div className="w-full">
        <h1 className="mb-5 text-center text-lg font-medium text-muted-foreground">Select a Matter</h1>

        <div className="grid gap-3 sm:grid-cols-2">
          {cases.map((c) => (
            <Link
              key={c.id}
              href={`/case/${c.id}`}
              className="group rounded-lg border bg-card p-5 text-left shadow-sm transition-colors hover:border-ring focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <div className="text-base font-semibold">{c.shortName}</div>
              <div className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                {c.captionShort || c.caption}
              </div>
              <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
                <span>{c.court?.name ?? (c.forum === 'federal' ? 'Federal court' : 'Court')}</span>
                <span className="font-mono">{c.caseNumber}</span>
              </div>
            </Link>
          ))}

          <Link
            href="/new"
            className="flex min-h-[116px] items-center justify-center rounded-lg border border-dashed p-5 text-sm font-medium text-muted-foreground transition-colors hover:border-ring hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            + Add New Case
          </Link>
        </div>
      </div>
    </main>
  );
}
