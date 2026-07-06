import type { Advisor, Custodian } from "@/lib/types";
import { TODAY, daysBetween } from "@/lib/format";

// Lightweight "smart search" — parses natural-ish queries into structured filters.
// e.g. "RIAs in GA with $300M-$700M on Schwab that haven't replied in 90 days".
// A production build would hand ambiguous queries to an LLM to emit these filters;
// the deterministic parser here covers the common institutional-sales facets.

interface ParsedQuery {
  states: string[];
  custodians: Custodian[];
  minAum?: number;
  maxAum?: number;
  noReplyDays?: number;
  firmTypeHint?: string;
  freeText: string[];
}

const STATE_ABBR: Record<string, string> = {
  georgia: "GA", florida: "FL", "north carolina": "NC", "south carolina": "SC",
  tennessee: "TN", alabama: "AL", texas: "TX", "new york": "NY",
};

const CUSTODIANS: Custodian[] = ["Schwab", "Fidelity", "Pershing", "LPL", "Raymond James", "TD"];

function parseAum(raw: string): number | undefined {
  const m = raw.match(/\$?\s*([\d.]+)\s*([mb])/i);
  if (!m) return undefined;
  const n = parseFloat(m[1]);
  return m[2].toLowerCase() === "b" ? n * 1_000_000_000 : n * 1_000_000;
}

export function parseQuery(query: string): ParsedQuery {
  const q = query.toLowerCase();
  const parsed: ParsedQuery = { states: [], custodians: [], freeText: [] };

  // States (abbrev or full name)
  for (const [name, abbr] of Object.entries(STATE_ABBR)) {
    if (q.includes(name)) parsed.states.push(abbr);
  }
  for (const abbr of Object.values(STATE_ABBR)) {
    if (new RegExp(`\\b${abbr.toLowerCase()}\\b`).test(q)) parsed.states.push(abbr);
  }

  // Custodians
  for (const c of CUSTODIANS) {
    if (q.includes(c.toLowerCase())) parsed.custodians.push(c);
  }

  // AUM range: "$300M-$700M" or "$300M to $700M"
  const rangeMatch = q.match(/\$?\s*[\d.]+\s*[mb]\s*(?:-|–|to)\s*\$?\s*[\d.]+\s*[mb]/i);
  if (rangeMatch) {
    const parts = rangeMatch[0].split(/-|–|to/i);
    parsed.minAum = parseAum(parts[0]);
    parsed.maxAum = parseAum(parts[1]);
  } else {
    const over = q.match(/(?:over|above|>)\s*\$?\s*[\d.]+\s*[mb]/i);
    if (over) parsed.minAum = parseAum(over[0]);
    const under = q.match(/(?:under|below|<)\s*\$?\s*[\d.]+\s*[mb]/i);
    if (under) parsed.maxAum = parseAum(under[0]);
  }

  // "haven't replied in N days"
  const reply = q.match(/(?:no reply|haven'?t replied|not replied).*?(\d+)\s*days?/i) || q.match(/(\d+)\s*days?.*?(?:no reply|no response)/i);
  if (reply) parsed.noReplyDays = parseInt(reply[1], 10);

  if (/\brias?\b/.test(q)) parsed.firmTypeHint = "RIA";
  if (/family office/.test(q)) parsed.firmTypeHint = "Family Office";

  // Leftover words for fuzzy name/firm/tag matching
  parsed.freeText = q
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 2 && !["ria", "rias", "with", "that", "have", "haven", "replied", "days", "over", "under", "the", "and"].includes(w));

  return parsed;
}

export function smartSearch(list: Advisor[], query: string): Advisor[] {
  const p = parseQuery(query);

  return list.filter((a) => {
    if (p.states.length && !p.states.includes(a.state)) return false;
    if (p.custodians.length && !p.custodians.includes(a.custodian)) return false;
    if (p.minAum && a.aum < p.minAum) return false;
    if (p.maxAum && a.aum > p.maxAum) return false;
    if (p.firmTypeHint && !a.firmType.includes(p.firmTypeHint)) return false;
    if (p.noReplyDays) {
      const last = a.lastContactAt;
      const noRecentReply = a.engagement.replies === 0;
      const stale = last ? daysBetween(last, TODAY) >= p.noReplyDays : true;
      if (!(noRecentReply && stale)) return false;
    }

    // Free-text: require every leftover token to hit some field (name/firm/tag/city)
    if (p.freeText.length) {
      const hay = `${a.name} ${a.firm} ${a.city} ${a.state} ${a.tags.join(" ")} ${a.strategiesUsed.join(" ")}`.toLowerCase();
      const stateFullNames = Object.entries({ ga: "georgia", fl: "florida", nc: "north carolina", sc: "south carolina", tn: "tennessee" });
      for (const t of p.freeText) {
        const isStateWord = stateFullNames.some(([abbr, full]) => full.includes(t) && a.state.toLowerCase() === abbr);
        if (!hay.includes(t) && !isStateWord) return false;
      }
    }

    return true;
  });
}
