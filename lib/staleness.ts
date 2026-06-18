import type { LeadRecord } from "@/lib/types";

export type StalenessLevel = "fresh" | "aging" | "stale";

export interface StalenessResult {
  days: number;
  level: StalenessLevel;
}

// Threshold reasoning:
// - "fresh" (<= 3 days): a lead touched within the last 3 days is still
//   within a normal follow-up cadence — no action needed yet.
// - "aging" (4-10 days): outside the typical follow-up window; worth a
//   nudge before it goes cold, but not yet urgent.
// - "stale" (> 10 days): more than a week and a half with no contact —
//   the lead is going cold and should be prioritized for outreach.
const FRESH_MAX_DAYS = 3;
const AGING_MAX_DAYS = 10;

/**
 * Computes how "stale" a lead is — i.e. how long it's been since the lead
 * was last touched. `LeadRecord` has no explicit "status changed at"
 * timestamp, so this uses a heuristic reference point: `lastContacted` if
 * set (it's the most direct signal of outreach activity), otherwise
 * `createdTime` (the lead has never been contacted, so its age is the next
 * best signal).
 */
export function computeStaleness(lead: LeadRecord): StalenessResult {
  const reference = lead.lastContacted ?? lead.createdTime;
  const days = Math.floor((Date.now() - new Date(reference).getTime()) / 86_400_000);

  const level: StalenessLevel =
    days <= FRESH_MAX_DAYS ? "fresh" : days <= AGING_MAX_DAYS ? "aging" : "stale";

  return { days, level };
}
