import type { StalenessLevel } from "@/lib/staleness";

export const STALENESS_LABELS: Record<StalenessLevel, string> = {
  fresh: "טרי",
  aging: "מתיישן",
  stale: "קפא",
};

export const STALENESS_CLASSES: Record<StalenessLevel, string> = {
  fresh: "tag tag-green",
  aging: "tag tag-amber",
  stale: "tag tag-warn",
};

// Colored dot shown next to the day count, independent of the `.tag`
// background so the badge reads at a glance even at small sizes.
export const STALENESS_DOT_CLASSES: Record<StalenessLevel, string> = {
  fresh: "bg-green",
  aging: "bg-amber",
  stale: "bg-warn",
};
