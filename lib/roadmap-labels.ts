import type { RoadmapColor } from "@/lib/types";

export type StatusTone = "not-started" | "in-progress" | "done";

export function normalizeRoadmapStatus(raw: string | null): StatusTone {
  if (raw === "הושלם" || raw === "Done") return "done";
  if (raw === "בתהליך" || raw === "In Progress") return "in-progress";
  return "not-started";
}

export const STATUS_TONE_LABELS: Record<StatusTone, string> = {
  "not-started": "לא התחיל",
  "in-progress": "בתהליך",
  done: "הושלם",
};

export const STATUS_TONE_DOT: Record<StatusTone, string> = {
  "not-started": "⚪",
  "in-progress": "🟡",
  done: "🟢",
};

export function normalizeRoadmapCategory(raw: string | null): string {
  switch (raw) {
    case "Infrastructure":
    case "תפעול":
      return "תפעול";
    case "Ongoing Operations":
      return "תחזוקה שוטפת";
    case "מכירות":
      return "מכירות";
    case "שיווק":
      return "שיווק";
    case "מוצר":
      return "מוצר";
    default:
      return raw ?? "—";
  }
}

interface ColorClasses {
  bar: string;
  soft: string;
  text: string;
}

export const ROADMAP_COLOR_CLASSES: Record<RoadmapColor, ColorClasses> = {
  Blue: { bar: "bg-sky", soft: "bg-sky-soft", text: "text-sky" },
  Green: { bar: "bg-accent", soft: "bg-accent-soft", text: "text-accent-strong" },
  Orange: { bar: "bg-amber", soft: "bg-amber-soft", text: "text-amber" },
  Red: { bar: "bg-warn", soft: "bg-warn-soft", text: "text-warn" },
  Purple: { bar: "bg-purple", soft: "bg-purple-soft", text: "text-purple" },
};

export function roadmapColorClasses(color: string | null): ColorClasses {
  return ROADMAP_COLOR_CLASSES[(color as RoadmapColor) ?? "Blue"] ?? ROADMAP_COLOR_CLASSES.Blue;
}

export const ASSIGNEE_TO_HEBREW: Record<string, string> = {
  Itay: "איתי",
  Omri: "עמרי",
};

export const HEBREW_TO_ASSIGNEE: Record<string, "Itay" | "Omri"> = {
  איתי: "Itay",
  עמרי: "Omri",
};
