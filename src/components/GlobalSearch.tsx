"use client";

import Link from "next/link";
import { useMemo, useRef, useState } from "react";
import { advisors } from "@/lib/data/advisors";
import { smartSearch } from "@/lib/search";
import { formatAum } from "@/lib/format";
import { initials } from "@/lib/format";

export function GlobalSearch() {
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);

  const results = useMemo(() => (q.trim() ? smartSearch(advisors, q).slice(0, 6) : []), [q]);

  return (
    <div ref={boxRef} className="relative max-w-xl">
      <input
        value={q}
        onChange={(e) => {
          setQ(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        placeholder="Smart search — “RIAs in GA, $300M–$700M on Schwab, no reply in 90 days”"
        className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm outline-none placeholder:text-muted focus:border-brand"
      />
      {open && q.trim() && (
        <div className="absolute z-20 mt-1 w-full overflow-hidden rounded-lg border border-border bg-elevated shadow-lg">
          {results.length === 0 ? (
            <div className="px-3 py-3 text-sm text-muted">No advisors match.</div>
          ) : (
            results.map((a) => (
              <Link
                key={a.id}
                href={`/advisors/${a.id}`}
                className="flex items-center gap-3 px-3 py-2 text-sm hover:bg-surface"
              >
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-brand/15 text-[11px] font-semibold text-brand">
                  {initials(a.name)}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium">{a.name}</span>
                  <span className="block truncate text-xs text-muted">
                    {a.firm} · {a.state} · {a.custodian} · {formatAum(a.aum)}
                  </span>
                </span>
              </Link>
            ))
          )}
        </div>
      )}
    </div>
  );
}
