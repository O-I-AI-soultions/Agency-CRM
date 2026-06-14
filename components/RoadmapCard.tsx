import type { RoadmapRecord, RoadmapTaskRecord } from "@/lib/types";
import {
  normalizeRoadmapCategory,
  normalizeRoadmapStatus,
  roadmapColorClasses,
  STATUS_TONE_DOT,
  STATUS_TONE_LABELS,
} from "@/lib/roadmap-labels";

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("he-IL", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

interface RoadmapCardProps {
  item: RoadmapRecord;
  tasks: RoadmapTaskRecord[];
  onSelect: (item: RoadmapRecord) => void;
}

export default function RoadmapCard({ item, tasks, onSelect }: RoadmapCardProps) {
  const tone = normalizeRoadmapStatus(item.status);
  const colors = roadmapColorClasses(item.color);
  const topLevelTasks = tasks.filter((t) => !t.parentId);
  const total = topLevelTasks.length;
  const done = topLevelTasks.filter((t) => t.status === "Done").length;
  const progress = total > 0 ? Math.round((done / total) * 100) : 0;

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onSelect(item)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onSelect(item);
        }
      }}
      aria-label={`פתח יעד: ${item.title}`}
      className="flex w-72 shrink-0 flex-col gap-3 overflow-hidden rounded-xl border border-border bg-surface shadow-sm transition-shadow hover:shadow-md focus:outline-none focus:ring-2 focus:ring-accent/40"
    >
      <div className={`h-1.5 w-full ${colors.bar}`} />

      <div className="flex cursor-pointer flex-col gap-3 px-4 pb-4">
        <div className="flex items-start justify-between gap-2">
          <h2 className="text-sm font-bold leading-snug text-foreground">{item.title}</h2>
          <span
            className="shrink-0 text-base"
            role="img"
            aria-label={STATUS_TONE_LABELS[tone]}
            title={STATUS_TONE_LABELS[tone]}
          >
            {STATUS_TONE_DOT[tone]}
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className={`rounded-full px-2 py-0.5 font-bold ${colors.soft} ${colors.text}`}>
            {normalizeRoadmapCategory(item.category)}
          </span>
          {item.owner && (
            <span className="rounded-full bg-background px-2 py-0.5 font-medium text-muted">
              {item.owner}
            </span>
          )}
        </div>

        {(item.startDate || item.endDate) && (
          <div className="text-xs text-muted">
            {item.startDate ? formatDate(item.startDate) : "—"}
            {" – "}
            {item.endDate ? formatDate(item.endDate) : "—"}
          </div>
        )}

        {total > 0 && (
          <div className="space-y-1">
            <div className="text-xs text-muted">
              {done}/{total} משימות הושלמו
            </div>
            <div className="h-1 w-full overflow-hidden rounded-full bg-border">
              <div
                className={`h-full ${colors.bar}`}
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
