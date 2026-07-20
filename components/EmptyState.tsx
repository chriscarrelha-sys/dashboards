import type { ReactNode } from 'react';

/**
 * Polished placeholder for sections whose dedicated module isn't built yet.
 * Never a blank page: states the purpose and (optionally) the planned build.
 */
export function EmptyState({
  title,
  description,
  hint,
  action,
}: {
  title: string;
  description?: string;
  hint?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex min-h-[40vh] flex-col items-center justify-center rounded-lg border border-dashed p-10 text-center">
      <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-muted text-muted-foreground">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
          <path d="M4 7a2 2 0 0 1 2-2h5l2 2h5a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2Z" />
        </svg>
      </div>
      <h2 className="text-lg font-semibold">{title}</h2>
      {description && <p className="mt-1 max-w-md text-sm text-muted-foreground">{description}</p>}
      {hint && (
        <p className="mt-3 max-w-md rounded-md bg-muted px-3 py-2 text-xs text-muted-foreground">{hint}</p>
      )}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
