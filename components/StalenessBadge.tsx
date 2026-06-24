import type { LeadRecord } from "@/lib/types";
import { computeStaleness } from "@/lib/staleness";
import { STALENESS_CLASSES, STALENESS_DOT_CLASSES, STALENESS_LABELS } from "@/lib/staleness-labels";

export default function StalenessBadge({ lead }: { lead: LeadRecord }) {
  const { days, level } = computeStaleness(lead);

  return (
    <span
      className={`shrink-0 ${STALENESS_CLASSES[level]}`}
      title={`${STALENESS_LABELS[level]} · ${days} ${days === 1 ? "יום" : "ימים"} מאז יצירת קשר אחרונה`}
    >
      <span className={`inline-block h-2 w-2 rounded-full ${STALENESS_DOT_CLASSES[level]}`} aria-hidden />
      {" "}
      {days}d
    </span>
  );
}
