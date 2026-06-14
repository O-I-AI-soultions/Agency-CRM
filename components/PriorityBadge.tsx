import { Flame, Circle, ArrowDown } from "lucide-react";
import type { LeadRecord, Priority } from "@/lib/types";
import { computePriority } from "@/lib/priority";

const PRIORITY_LABELS: Record<Priority, string> = {
  High: "גבוהה",
  Medium: "בינונית",
  Low: "נמוכה",
};

const PRIORITY_CLASSES: Record<Priority, string> = {
  High: "bg-warn-soft text-warn-strong",
  Medium: "bg-amber-soft text-amber-strong",
  Low: "bg-accent-soft text-accent-strong",
};

const PRIORITY_ICONS: Record<Priority, typeof Flame> = {
  High: Flame,
  Medium: Circle,
  Low: ArrowDown,
};

export default function PriorityBadge({ lead }: { lead: LeadRecord }) {
  const { level } = computePriority(lead);
  const Icon = PRIORITY_ICONS[level];

  return (
    <span
      className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-bold ${PRIORITY_CLASSES[level]}`}
    >
      <Icon size={12} /> {PRIORITY_LABELS[level]}
    </span>
  );
}
