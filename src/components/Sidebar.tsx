"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const nav = [
  { href: "/", label: "Dashboard", icon: "◫" },
  { href: "/copilot", label: "AI Copilot", icon: "✦" },
  { href: "/advisors", label: "Advisors", icon: "◎" },
  { href: "/campaigns", label: "Campaigns", icon: "⇉" },
  { href: "/content-studio", label: "Content Studio", icon: "✎" },
  { href: "/analytics", label: "Analytics", icon: "▤" },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col border-r border-border bg-surface px-3 py-4 md:flex">
      <div className="flex items-center gap-2 px-2 pb-5">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand font-bold text-brand-fg">
          I
        </div>
        <div className="leading-tight">
          <div className="text-sm font-semibold">ISOS</div>
          <div className="text-[11px] text-muted">Institutional Sales OS</div>
        </div>
      </div>

      <nav className="flex flex-col gap-1">
        {nav.map((item) => {
          const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors ${
                active
                  ? "bg-brand/10 font-medium text-brand"
                  : "text-muted hover:bg-elevated hover:text-fg"
              }`}
            >
              <span className="w-4 text-center text-base leading-none">{item.icon}</span>
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto rounded-lg border border-border bg-elevated p-3 text-[11px] text-muted">
        <div className="mb-1 font-medium text-fg">Selling MMNIX</div>
        Market-neutral to RIAs. Lead with correlation, not performance.
      </div>
    </aside>
  );
}
