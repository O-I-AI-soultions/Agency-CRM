import type { LeadRecord, Priority } from "@/lib/types";
import { computePriority } from "@/lib/priority";

const PRIORITY_LABELS: Record<Priority, string> = {
  High: "גבוהה",
  Medium: "בינונית",
  Low: "נמוכה",
};

const PRIORITY_CLASSES: Record<Priority, string> = {
  High: "bg-warn-soft text-warn",
  Medium: "bg-amber-soft text-amber",
  Low: "bg-accent-soft text-accent-strong",
};

const PRIORITY_ICONS: Record<Priority, string> = {
  High: "🔥",
  Medium: "●",
  Low: "↓",
};

export default function PriorityBadge({ lead }: { lead: LeadRecord }) {
  const { level } = computePriority(lead);

  return (
    <span
      className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-bold ${PRIORITY_CLASSES[level]}`}
    >
      {PRIORITY_ICONS[level]} {PRIORITY_LABELS[level]}
    </span>
  );
}
