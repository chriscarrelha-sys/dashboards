export function formatAum(aum: number): string {
  if (aum >= 1_000_000_000) return `$${(aum / 1_000_000_000).toFixed(1)}B`;
  if (aum >= 1_000_000) return `$${Math.round(aum / 1_000_000)}M`;
  return `$${aum.toLocaleString()}`;
}

export function formatPct(x: number): string {
  return `${Math.round(x * 100)}%`;
}

export function initials(name: string): string {
  return name
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

// Deterministic "today" for the demo (see currentDate context). Avoids Date.now()
// so server and client render identically and the seed stays reproducible.
export const TODAY = "2026-07-06";

export function daysBetween(a: string, b: string): number {
  const ms = new Date(b).getTime() - new Date(a).getTime();
  return Math.round(ms / 86_400_000);
}
