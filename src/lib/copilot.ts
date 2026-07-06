import type { Advisor } from "@/lib/types";
import { advisors } from "@/lib/data/advisors";
import { fitScore, openRate } from "@/lib/scoring";
import { TODAY, daysBetween } from "@/lib/format";

export interface CopilotItem {
  advisor: Advisor;
  reason: string;
  priority: number; // higher = act sooner
  action: string; // suggested next-best action
}

/**
 * The AI Sales Copilot's "who should I contact today" logic. In production this
 * is augmented by an LLM for phrasing, but the ranking is deterministic and
 * explainable — every recommendation cites why.
 */
export function dailyPriorities(list: Advisor[] = advisors): CopilotItem[] {
  const items: CopilotItem[] = [];

  for (const a of list) {
    let priority = 0;
    const reasons: string[] = [];
    let action = "Review and choose next touch";

    // Due for follow-up
    if (a.nextFollowUpAt && daysBetween(TODAY, a.nextFollowUpAt) <= 0) {
      priority += 30;
      reasons.push("follow-up is due");
      action = "Send next sequence step";
    }

    // High recent engagement
    if (a.engagement.lastOpenedAt && daysBetween(a.engagement.lastOpenedAt, TODAY) <= 2 && a.engagement.opens >= 3) {
      priority += 25;
      reasons.push(`opened email ${a.engagement.opens}x recently`);
      action = "Strike while warm — call today";
    }

    // Replied but no meeting yet
    if (a.engagement.replies > 0 && a.engagement.meetings === 0) {
      priority += 22;
      reasons.push("replied but no meeting booked");
      action = "Reply and propose a meeting time";
    }

    // Downloaded collateral
    if (a.engagement.whitepaperDownloads > 0 && a.stage === "Engaged") {
      priority += 12;
      reasons.push("downloaded collateral");
    }

    // Strong fit but untouched
    if (a.stage === "New" && fitScore(a) >= 55) {
      priority += 18;
      reasons.push("strong fit, not yet contacted");
      action = "Research, then enroll in Market-Neutral Introduction";
    }

    // Stalled after several emails, no reply
    if (a.engagement.emailsSent >= 4 && a.engagement.replies === 0) {
      priority += 10;
      reasons.push(`${a.engagement.emailsSent} emails, no reply`);
      action = "Switch channel — try a call or LinkedIn";
    }

    // Nudge score by fit so ties break toward better prospects
    priority += Math.round(fitScore(a) / 20);

    if (priority > 0) {
      items.push({
        advisor: a,
        priority,
        reason: reasons.join("; "),
        action,
      });
    }
  }

  return items.sort((x, y) => y.priority - x.priority);
}

export interface CopilotDigest {
  headline: string;
  bullets: string[];
}

/** Natural-language style digest of the priority queue, computed from data. */
export function copilotDigest(list: Advisor[] = advisors): CopilotDigest {
  const items = dailyPriorities(list);
  const due = items.filter((i) => i.advisor.nextFollowUpAt && daysBetween(TODAY, i.advisor.nextFollowUpAt) <= 0);
  const warm = items.filter(
    (i) => i.advisor.engagement.lastOpenedAt && daysBetween(i.advisor.engagement.lastOpenedAt, TODAY) <= 2 && i.advisor.engagement.opens >= 3,
  );
  const downloaded = list.filter((a) => a.engagement.whitepaperDownloads > 0);
  const repliedNoMeeting = list.filter((a) => a.engagement.replies > 0 && a.engagement.meetings === 0);
  const stalled = list.filter((a) => a.engagement.emailsSent >= 4 && a.engagement.replies === 0);

  const bullets: string[] = [];
  if (due.length) bullets.push(`${due.length} advisors are due for follow-up today.`);
  if (warm.length) bullets.push(`${warm.length} opened multiple emails in the last 48 hours — call these first: ${warm.map((i) => i.advisor.name.split(" ")[0]).join(", ")}.`);
  if (downloaded.length) bullets.push(`${downloaded.length} downloaded your collateral.`);
  if (repliedNoMeeting.length) bullets.push(`${repliedNoMeeting.length} replied but have no meeting booked — propose a time.`);
  if (stalled.length) bullets.push(`${stalled.length} haven't replied after several emails — switch channel.`);

  return {
    headline: `You have ${items.length} advisors worth touching today.`,
    bullets,
  };
}
