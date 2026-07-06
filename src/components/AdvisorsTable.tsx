"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { advisors } from "@/lib/data/advisors";
import { fitScore, openRate, temperature, type Temperature } from "@/lib/scoring";
import { formatAum, formatPct, initials } from "@/lib/format";
import { Badge } from "@/components/ui";

type SortKey = "fit" | "aum" | "open" | "name";

const TEMPS: (Temperature | "All")[] = ["All", "Hot", "Warm", "Cold"];

export function AdvisorsTable() {
  const [temp, setTemp] = useState<Temperature | "All">("All");
  const [sort, setSort] = useState<SortKey>("fit");
  const [query, setQuery] = useState("");

  const rows = useMemo(() => {
    let list = advisors.slice();
    if (temp !== "All") list = list.filter((a) => temperature(a) === temp);
    if (query.trim()) {
      const q = query.toLowerCase();
      list = list.filter((a) =>
        `${a.name} ${a.firm} ${a.state} ${a.custodian} ${a.tags.join(" ")}`.toLowerCase().includes(q),
      );
    }
    list.sort((a, b) => {
      if (sort === "name") return a.name.localeCompare(b.name);
      if (sort === "aum") return b.aum - a.aum;
      if (sort === "open") return openRate(b) - openRate(a);
      return fitScore(b) - fitScore(a);
    });
    return list;
  }, [temp, sort, query]);

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Filter by name, firm, state…"
          className="w-64 rounded-lg border border-border bg-surface px-3 py-1.5 text-sm outline-none focus:border-brand"
        />
        <div className="flex overflow-hidden rounded-lg border border-border">
          {TEMPS.map((t) => (
            <button
              key={t}
              onClick={() => setTemp(t)}
              className={`px-3 py-1.5 text-xs font-medium ${
                temp === t ? "bg-brand text-brand-fg" : "bg-surface text-muted hover:bg-elevated"
              }`}
            >
              {t}
            </button>
          ))}
        </div>
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value as SortKey)}
          className="rounded-lg border border-border bg-surface px-3 py-1.5 text-xs outline-none"
        >
          <option value="fit">Sort: Fit score</option>
          <option value="aum">Sort: AUM</option>
          <option value="open">Sort: Open rate</option>
          <option value="name">Sort: Name</option>
        </select>
        <span className="ml-auto text-xs text-muted">{rows.length} advisors</span>
      </div>

      <div className="overflow-hidden rounded-xl border border-border">
        <table className="w-full text-sm">
          <thead className="bg-elevated text-left text-xs uppercase tracking-wide text-muted">
            <tr>
              <th className="px-4 py-2.5 font-medium">Advisor</th>
              <th className="px-4 py-2.5 font-medium">Firm</th>
              <th className="hidden px-4 py-2.5 font-medium md:table-cell">Custodian</th>
              <th className="px-4 py-2.5 font-medium">AUM</th>
              <th className="hidden px-4 py-2.5 font-medium sm:table-cell">Stage</th>
              <th className="hidden px-4 py-2.5 font-medium lg:table-cell">Open</th>
              <th className="px-4 py-2.5 font-medium">Fit</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {rows.map((a) => (
              <tr key={a.id} className="bg-surface hover:bg-elevated">
                <td className="px-4 py-2.5">
                  <Link href={`/advisors/${a.id}`} className="flex items-center gap-2.5">
                    <span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand/15 text-[11px] font-semibold text-brand">
                      {initials(a.name)}
                    </span>
                    <span>
                      <span className="block font-medium">{a.name}</span>
                      <span className="block text-xs text-muted">{a.city}, {a.state}</span>
                    </span>
                  </Link>
                </td>
                <td className="px-4 py-2.5">
                  <div>{a.firm}</div>
                  <div className="text-xs text-muted">{a.firmType}</div>
                </td>
                <td className="hidden px-4 py-2.5 md:table-cell">{a.custodian}</td>
                <td className="px-4 py-2.5">{formatAum(a.aum)}</td>
                <td className="hidden px-4 py-2.5 sm:table-cell">
                  <Badge tone="neutral">{a.stage}</Badge>
                </td>
                <td className="hidden px-4 py-2.5 lg:table-cell">{formatPct(openRate(a))}</td>
                <td className="px-4 py-2.5">
                  <span className="inline-flex items-center gap-2">
                    <Badge tone={temperature(a)}>{fitScore(a)}</Badge>
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
