import { Flame, Circle, ArrowDown } from "lucide-react";
import type { Priority } from "@/lib/types";

export const PRIORITY_LABELS: Record<Priority, string> = {
  High: "גבוהה",
  Medium: "בינונית",
  Low: "נמוכה",
};

export const PRIORITY_CLASSES: Record<Priority, string> = {
  High: "tag tag-warn",
  Medium: "tag tag-amber",
  Low: "tag tag-sky",
};

export const PRIORITY_ICONS: Record<Priority, typeof Flame> = {
  High: Flame,
  Medium: Circle,
  Low: ArrowDown,
};
