import type { Lead } from "@workspace/db";

export type LeadPriority = "hot" | "warm" | "cold";

export interface ScoreResult {
  score: number;
  priority: LeadPriority;
  nextAction: string;
}

/**
 * Rule-based lead scoring. Score 0..100.
 * - Budget > 100k → +30, > 25k → +15
 * - Has phone → +15
 * - Has email → +10
 * - Source = indiamart → +10
 * - Status (contacted/qualified) → +15 / +25
 * - Recently contacted (<7d) → +10
 */
export function scoreLead(lead: Partial<Lead>): ScoreResult {
  let score = 30;
  const budget = lead.budget ? Number(lead.budget) : 0;
  if (budget > 100000) score += 30;
  else if (budget > 25000) score += 15;
  if (lead.phone) score += 15;
  if (lead.email) score += 10;
  if (lead.source === "indiamart") score += 10;
  if (lead.status === "qualified") score += 25;
  else if (lead.status === "contacted") score += 15;
  if (lead.lastContactedAt) {
    const daysSince = (Date.now() - new Date(lead.lastContactedAt).getTime()) / 86400000;
    if (daysSince < 7) score += 10;
  }
  score = Math.max(0, Math.min(100, score));
  const priority: LeadPriority = score >= 75 ? "hot" : score >= 50 ? "warm" : "cold";
  const nextAction =
    priority === "hot"
      ? "Call within 24 hours and send a quotation"
      : priority === "warm"
        ? "Send a follow-up email within 2 days"
        : "Add to nurture campaign";
  return { score, priority, nextAction };
}
