import type { Sequence } from "@/lib/types";

// Workflows are the primary abstraction. An email sequence is one workflow type;
// the same engine orchestrates calls, LinkedIn touches, research refreshes, and
// approval gates. Steps carry a channel so the shape generalizes beyond email.

export const sequences: Sequence[] = [
  {
    id: "seq-mn-intro",
    name: "Market-Neutral Introduction",
    description:
      "8-touch introduction for alts-curious RIAs. Leads with correlation/drawdown math, not performance.",
    audience: "RIAs & hybrids, $250M–$800M AUM, low current alts allocation",
    active: true,
    enrolledCount: 5,
    steps: [
      {
        id: "s1",
        dayOffset: 1,
        channel: "email",
        title: "Email 1 — The correlation problem",
        description:
          "Open with the equity-valuation / correlation tension. No pitch. Offer the drawdown one-pager.",
        requiresApproval: true,
      },
      {
        id: "s2",
        dayOffset: 3,
        channel: "linkedin",
        title: "LinkedIn — Connect + context",
        description: "Personalized connection note referencing their recent commentary or firm focus.",
        requiresApproval: false,
      },
      {
        id: "s3",
        dayOffset: 5,
        channel: "email",
        title: "Email 2 — Ballast, not beta",
        description: "Reframe MMNIX as ballast that improves the efficiency of the existing equity book.",
        requiresApproval: true,
      },
      {
        id: "s4",
        dayOffset: 8,
        channel: "call",
        title: "Call — Discovery",
        description: "15-minute discovery. Goal: understand current alts sleeve and objections.",
        requiresApproval: false,
      },
      {
        id: "s5",
        dayOffset: 12,
        channel: "voicemail",
        title: "Voicemail — Convertible arbitrage angle",
        description: "Short VM introducing convert arb as a differentiated, uncorrelated return stream.",
        requiresApproval: false,
      },
      {
        id: "s6",
        dayOffset: 18,
        channel: "research",
        title: "Research update — Portfolio construction",
        description: "Send a tailored note on where a 5–10% market-neutral sleeve fits their allocation.",
        requiresApproval: true,
      },
      {
        id: "s7",
        dayOffset: 25,
        channel: "email",
        title: "Email 3 — Case study",
        description: "Share an anonymized allocator case study with before/after risk metrics.",
        requiresApproval: true,
      },
      {
        id: "s8",
        dayOffset: 35,
        channel: "email",
        title: "Email 4 — Breakup",
        description: "Respectful close-the-loop email. Leaves the door open and often re-engages.",
        requiresApproval: true,
      },
    ],
  },
  {
    id: "seq-allocator-reengage",
    name: "Allocator Re-Engagement",
    description: "Lighter-touch nurture for sophisticated allocators who already own alternatives.",
    audience: "Family offices & bank trusts already using market-neutral / hedged strategies",
    active: true,
    enrolledCount: 2,
    steps: [
      {
        id: "r1",
        dayOffset: 1,
        channel: "email",
        title: "Email 1 — Capacity & positioning",
        description: "Note on current convert-arb opportunity set and remaining capacity.",
        requiresApproval: true,
      },
      {
        id: "r2",
        dayOffset: 7,
        channel: "meeting",
        title: "Meeting request — Portfolio review",
        description: "Offer a joint review of how MMNIX complements their existing hedged sleeve.",
        requiresApproval: false,
      },
      {
        id: "r3",
        dayOffset: 14,
        channel: "task",
        title: "Task — Send fund docs",
        description: "Deliver factsheet, attribution, and DDQ if requested.",
        requiresApproval: false,
      },
    ],
  },
];

export function getSequence(id: string): Sequence | undefined {
  return sequences.find((s) => s.id === id);
}
