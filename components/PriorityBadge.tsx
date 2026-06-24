import type { LeadRecord } from "@/lib/types";
import { computePriority } from "@/lib/priority";
import { PRIORITY_LABELS, PRIORITY_CLASSES, PRIORITY_ICONS } from "@/lib/priority-labels";

export default function PriorityBadge({ lead }: { lead: LeadRecord }) {
  const { level } = computePriority(lead);
  const Icon = PRIORITY_ICONS[level];

  return (
    <span className={`shrink-0 ${PRIORITY_CLASSES[level]}`}>
      <Icon size={12} /> {PRIORITY_LABELS[level]}
    </span>
  );
}
