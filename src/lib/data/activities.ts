import type { Activity } from "@/lib/types";

// Interaction timeline. Backed by an append-only `activities` table in production
// — the source of the compliance/audit log the PRD requires.

export const activities: Activity[] = [
  { id: "a1", advisorId: "adv-hammond", type: "research", at: "2026-06-20", summary: "AI research report generated", detail: "Confidence 82%. Angle: correlation & drawdown." },
  { id: "a2", advisorId: "adv-hammond", type: "email_sent", at: "2026-06-22", summary: "Sent Email 1 — The correlation problem" },
  { id: "a3", advisorId: "adv-hammond", type: "email_opened", at: "2026-06-22", summary: "Opened Email 1 (2x)" },
  { id: "a4", advisorId: "adv-hammond", type: "download", at: "2026-06-23", summary: "Downloaded drawdown one-pager" },
  { id: "a5", advisorId: "adv-hammond", type: "email_sent", at: "2026-06-26", summary: "Sent Email 2 — Ballast, not beta" },
  { id: "a6", advisorId: "adv-hammond", type: "email_replied", at: "2026-06-29", summary: "Replied: 'Interested in the correlation math — send more.'" },
  { id: "a7", advisorId: "adv-hammond", type: "email_opened", at: "2026-07-04", summary: "Re-opened Email 2" },

  { id: "a8", advisorId: "adv-castellano", type: "meeting", at: "2026-06-18", summary: "Intro call — 30 min", detail: "Owns hedged sleeve; open to convert arb add." },
  { id: "a9", advisorId: "adv-castellano", type: "email_replied", at: "2026-07-02", summary: "Confirmed follow-up meeting for 7/9" },
  { id: "a10", advisorId: "adv-castellano", type: "stage_change", at: "2026-07-02", summary: "Stage → Meeting Set" },

  { id: "a11", advisorId: "adv-nakamura", type: "meeting", at: "2026-06-15", summary: "Committee intro — 45 min" },
  { id: "a12", advisorId: "adv-nakamura", type: "download", at: "2026-06-20", summary: "Downloaded attribution deck" },
  { id: "a13", advisorId: "adv-nakamura", type: "email_replied", at: "2026-06-30", summary: "Requested DDQ for committee review" },
  { id: "a14", advisorId: "adv-nakamura", type: "stage_change", at: "2026-06-30", summary: "Stage → Opportunity" },

  { id: "a15", advisorId: "adv-whitfield", type: "email_sent", at: "2026-06-24", summary: "Sent Research update — Portfolio construction" },
  { id: "a16", advisorId: "adv-whitfield", type: "email_opened", at: "2026-07-05", summary: "Opened research update (3x)" },
  { id: "a17", advisorId: "adv-whitfield", type: "download", at: "2026-07-05", summary: "Downloaded case study" },

  { id: "a18", advisorId: "adv-bhatt", type: "email_sent", at: "2026-07-03", summary: "Sent Email 2 — Ballast, not beta" },
  { id: "a19", advisorId: "adv-bhatt", type: "email_opened", at: "2026-07-05", summary: "Opened Email 2" },
  { id: "a20", advisorId: "adv-okafor", type: "email_sent", at: "2026-07-01", summary: "Sent Email 1 — The correlation problem" },
  { id: "a21", advisorId: "adv-okafor", type: "download", at: "2026-07-03", summary: "Downloaded factor/attribution one-pager" },
];

export function activitiesForAdvisor(advisorId: string): Activity[] {
  return activities
    .filter((a) => a.advisorId === advisorId)
    .sort((a, b) => (a.at < b.at ? 1 : -1));
}
