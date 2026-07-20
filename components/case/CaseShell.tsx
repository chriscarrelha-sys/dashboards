'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { CASE_NAV } from '@/lib/navigation';
import { cn } from '@/lib/utils';
import { Menu, X, ChevronDown, ArrowLeft, Search } from 'lucide-react';

type Header = { id: string; shortName: string; caption: string; caseNumber: string };

export function CaseShell({ header, children }: { header: Header; children: React.ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const base = `/case/${header.id}`;

  return (
    <div className="flex min-h-screen">
      {/* Desktop sidebar */}
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-r bg-card lg:flex">
        <SidebarInner base={base} header={header} />
      </aside>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={() => setMobileOpen(false)} />
          <aside className="absolute left-0 top-0 flex h-full w-72 flex-col border-r bg-card shadow-xl">
            <SidebarInner base={base} header={header} onNavigate={() => setMobileOpen(false)} />
          </aside>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Sticky compact identifier */}
        <header className="sticky top-0 z-30 flex items-center gap-3 border-b bg-background/85 px-4 py-2.5 backdrop-blur">
          <button
            className="rounded-md p-1.5 hover:bg-accent lg:hidden"
            onClick={() => setMobileOpen(true)}
            aria-label="Open navigation"
          >
            <Menu size={18} />
          </button>
          <Link href={base} className="min-w-0">
            <span className="truncate text-sm font-semibold">{header.shortName}</span>
            <span className="ml-2 font-mono text-xs text-muted-foreground">{header.caseNumber}</span>
          </Link>
          <Link href={`${base}/search`} className="ml-auto inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-xs text-muted-foreground hover:bg-accent hover:text-foreground" title="Universal search">
            <Search size={14} /> <span className="hidden sm:inline">Search</span>
          </Link>
        </header>

        <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-6 sm:px-6">{children}</main>
      </div>
    </div>
  );
}

function SidebarInner({
  base,
  header,
  onNavigate,
}: {
  base: string;
  header: Header;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  return (
    <>
      <div className="flex items-center justify-between border-b px-4 py-3">
        <Link href="/" className="flex items-center gap-2 text-sm font-semibold" onClick={onNavigate}>
          <span aria-hidden className="grid h-6 w-6 place-items-center rounded bg-primary text-xs text-primary-foreground">⚖</span>
          Pro Se Wins
        </Link>
        {onNavigate && (
          <button className="rounded-md p-1 hover:bg-accent" onClick={onNavigate} aria-label="Close">
            <X size={16} />
          </button>
        )}
      </div>

      <Link
        href="/"
        onClick={onNavigate}
        className="mx-3 mt-3 inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft size={13} /> All matters
      </Link>

      <nav className="flex-1 overflow-y-auto px-2 py-3">
        {CASE_NAV.map((group) => (
          <NavGroupBlock
            key={group.label}
            group={group}
            base={base}
            pathname={pathname}
            onNavigate={onNavigate}
          />
        ))}
      </nav>
    </>
  );
}

function NavGroupBlock({
  group,
  base,
  pathname,
  onNavigate,
}: {
  group: (typeof CASE_NAV)[number];
  base: string;
  pathname: string;
  onNavigate?: () => void;
}) {
  const hrefFor = (slug: string) => (slug ? `${base}/${slug}` : base);
  const groupActive = group.items.some((i) => pathname === hrefFor(i.slug));
  const [open, setOpen] = useState(groupActive);

  return (
    <div className="mb-1">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between rounded-md px-2 py-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground hover:bg-accent"
        aria-expanded={open}
      >
        {group.label}
        <ChevronDown size={14} className={cn('transition-transform', open ? '' : '-rotate-90')} />
      </button>
      {open && (
        <div className="mt-0.5">
          {group.items.map((item) => {
            const href = hrefFor(item.slug);
            const active = pathname === href;
            return (
              <Link
                key={item.slug || 'overview'}
                href={href}
                onClick={onNavigate}
                className={cn(
                  'block rounded-md px-3 py-1.5 text-sm transition-colors',
                  active
                    ? 'bg-accent font-medium text-accent-foreground'
                    : 'text-muted-foreground hover:bg-accent hover:text-foreground',
                )}
              >
                {item.label}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
