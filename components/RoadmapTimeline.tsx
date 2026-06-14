"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import type { RoadmapRecord, RoadmapTaskRecord } from "@/lib/types";
import {
  normalizeRoadmapCategory,
  normalizeRoadmapStatus,
  STATUS_TONE_LABELS,
  type StatusTone,
} from "@/lib/roadmap-labels";
import RoadmapCard from "@/components/RoadmapCard";
import RoadmapDrawer from "@/components/RoadmapDrawer";

interface RoadmapTimelineProps {
  items: RoadmapRecord[];
  roadmapTasks: RoadmapTaskRecord[];
}

function sortByStartDate(items: RoadmapRecord[]): RoadmapRecord[] {
  return [...items].sort((a, b) => {
    if (!a.startDate) return 1;
    if (!b.startDate) return -1;
    return a.startDate.localeCompare(b.startDate);
  });
}

export default function RoadmapTimeline({
  items: initialItems,
  roadmapTasks: initialTasks,
}: RoadmapTimelineProps) {
  const [items, setItems] = useState(sortByStartDate(initialItems));
  const [tasks, setTasks] = useState(initialTasks);
  const [selected, setSelected] = useState<RoadmapRecord | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<StatusTone | null>(null);

  const categories = [...new Set(items.map((i) => normalizeRoadmapCategory(i.category)))];
  const statusTones: StatusTone[] = ["not-started", "in-progress", "done"];

  const filtered = items.filter((item) => {
    if (categoryFilter && normalizeRoadmapCategory(item.category) !== categoryFilter) {
      return false;
    }
    if (statusFilter && normalizeRoadmapStatus(item.status) !== statusFilter) {
      return false;
    }
    return true;
  });

  function closeDrawer() {
    setSelected(null);
    setIsCreating(false);
  }

  function handleCreated(item: RoadmapRecord) {
    setItems((prev) => sortByStartDate([...prev, item]));
  }

  function handleUpdated(updated: RoadmapRecord) {
    setItems((prev) => sortByStartDate(prev.map((i) => (i.id === updated.id ? updated : i))));
    setSelected((prev) => (prev?.id === updated.id ? updated : prev));
  }

  function handleDeleted(id: string) {
    setItems((prev) => prev.filter((i) => i.id !== id));
    setSelected(null);
  }

  function handleTaskUpdated(task: RoadmapTaskRecord) {
    setTasks((prev) => prev.map((t) => (t.id === task.id ? task : t)));
  }

  function handleTaskCreated(task: RoadmapTaskRecord) {
    setTasks((prev) => [...prev, task]);
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex flex-wrap gap-1.5">
            <button
              type="button"
              onClick={() => setCategoryFilter(null)}
              aria-pressed={categoryFilter === null}
              className={
                categoryFilter === null
                  ? "rounded-lg border border-accent bg-accent px-3 py-1.5 text-xs font-semibold text-accent-foreground transition-colors focus:outline-none focus:ring-2 focus:ring-accent/40"
                  : "btn-outline rounded-lg px-3 py-1.5 text-xs font-semibold"
              }
            >
              הכל
            </button>
            {categories.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setCategoryFilter(c)}
                aria-pressed={categoryFilter === c}
                className={
                  categoryFilter === c
                    ? "rounded-lg border border-accent bg-accent px-3 py-1.5 text-xs font-semibold text-accent-foreground transition-colors focus:outline-none focus:ring-2 focus:ring-accent/40"
                    : "btn-outline rounded-lg px-3 py-1.5 text-xs font-semibold"
                }
              >
                {c}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap gap-1.5">
            <button
              type="button"
              onClick={() => setStatusFilter(null)}
              aria-pressed={statusFilter === null}
              className={
                statusFilter === null
                  ? "rounded-lg border border-accent bg-accent px-3 py-1.5 text-xs font-semibold text-accent-foreground transition-colors focus:outline-none focus:ring-2 focus:ring-accent/40"
                  : "btn-outline rounded-lg px-3 py-1.5 text-xs font-semibold"
              }
            >
              הכל
            </button>
            {statusTones.map((tone) => (
              <button
                key={tone}
                type="button"
                onClick={() => setStatusFilter(tone)}
                aria-pressed={statusFilter === tone}
                className={
                  statusFilter === tone
                    ? "rounded-lg border border-accent bg-accent px-3 py-1.5 text-xs font-semibold text-accent-foreground transition-colors focus:outline-none focus:ring-2 focus:ring-accent/40"
                    : "btn-outline rounded-lg px-3 py-1.5 text-xs font-semibold"
                }
              >
                {STATUS_TONE_LABELS[tone]}
              </button>
            ))}
          </div>
        </div>

        <button type="button" onClick={() => setIsCreating(true)} className="btn-primary">
          <Plus size={16} /> יעד חדש
        </button>
      </div>

      <div className="kanban-scroll flex gap-4 overflow-x-auto pb-2">
        {filtered.length === 0 ? (
          <p className="w-full rounded-lg border border-dashed border-border px-3 py-6 text-center text-sm text-muted">
            אין יעדים התואמים את הסינון
          </p>
        ) : (
          filtered.map((item) => (
            <RoadmapCard
              key={item.id}
              item={item}
              tasks={tasks.filter((t) => item.taskIds.includes(t.id))}
              onSelect={setSelected}
            />
          ))
        )}
      </div>

      <RoadmapDrawer
        item={selected}
        isNew={isCreating}
        tasks={tasks}
        onClose={closeDrawer}
        onCreated={handleCreated}
        onUpdated={handleUpdated}
        onDeleted={handleDeleted}
        onTaskUpdated={handleTaskUpdated}
        onTaskCreated={handleTaskCreated}
      />
    </div>
  );
}
