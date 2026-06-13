"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";
import {
  ROADMAP_COLORS,
  ROADMAP_OWNERS,
  type RoadmapColor,
  type RoadmapOwner,
  type RoadmapRecord,
  type RoadmapTaskRecord,
} from "@/lib/types";
import {
  ASSIGNEE_TO_HEBREW,
  HEBREW_TO_ASSIGNEE,
  normalizeRoadmapCategory,
  normalizeRoadmapStatus,
  roadmapColorClasses,
  STATUS_TONE_LABELS,
} from "@/lib/roadmap-labels";

const CANONICAL_STATUSES = ["Not Started", "In Progress", "Done"];
const CANONICAL_CATEGORIES = ["Infrastructure", "Ongoing Operations"];

function toDateInput(iso: string | null): string {
  if (!iso) return "";
  return iso.slice(0, 10);
}

function statusOptions(current: string | null): string[] {
  if (current && !CANONICAL_STATUSES.includes(current)) {
    return [current, ...CANONICAL_STATUSES];
  }
  return CANONICAL_STATUSES;
}

function categoryOptions(current: string | null): string[] {
  if (current && !CANONICAL_CATEGORIES.includes(current)) {
    return [current, ...CANONICAL_CATEGORIES];
  }
  return CANONICAL_CATEGORIES;
}

interface RoadmapDrawerProps {
  item: RoadmapRecord | null;
  isNew: boolean;
  tasks: RoadmapTaskRecord[];
  onClose: () => void;
  onCreated: (item: RoadmapRecord) => void;
  onUpdated: (item: RoadmapRecord) => void;
  onDeleted: (id: string) => void;
  onTaskUpdated: (task: RoadmapTaskRecord) => void;
}

export default function RoadmapDrawer({
  item,
  isNew,
  tasks,
  onClose,
  onCreated,
  onUpdated,
  onDeleted,
  onTaskUpdated,
}: RoadmapDrawerProps) {
  const isOpen = item !== null || isNew;

  const [title, setTitle] = useState(item?.title ?? "");
  const [description, setDescription] = useState(item?.description ?? "");
  const [status, setStatus] = useState(item?.status ?? "Not Started");
  const [category, setCategory] = useState(item?.category ?? "Infrastructure");
  const [owner, setOwner] = useState<RoadmapOwner | "">(item?.owner ?? "");
  const [color, setColor] = useState<RoadmapColor>(item?.color ?? "Blue");
  const [startDate, setStartDate] = useState(toDateInput(item?.startDate ?? null));
  const [endDate, setEndDate] = useState(toDateInput(item?.endDate ?? null));
  const [openKey, setOpenKey] = useState<string | null>(isNew ? "new" : item?.id ?? null);
  const [saving, setSaving] = useState(false);

  const currentKey = isNew ? "new" : item?.id ?? null;
  if (currentKey !== openKey) {
    setOpenKey(currentKey);
    setTitle(item?.title ?? "");
    setDescription(item?.description ?? "");
    setStatus(item?.status ?? "Not Started");
    setCategory(item?.category ?? "Infrastructure");
    setOwner(item?.owner ?? "");
    setColor(item?.color ?? "Blue");
    setStartDate(toDateInput(item?.startDate ?? null));
    setEndDate(toDateInput(item?.endDate ?? null));
  }

  useEffect(() => {
    if (!isOpen) return;
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [isOpen, onClose]);

  async function patchItem(body: Record<string, unknown>) {
    if (!item) return null;
    const res = await fetch(`/api/roadmap/${item.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.item as RoadmapRecord;
  }

  async function patchRoadmapTask(taskId: string, body: Record<string, unknown>) {
    const res = await fetch(`/api/roadmap-tasks/${taskId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.task as RoadmapTaskRecord;
  }

  async function handleTitleBlur() {
    if (!item || title === item.title) return;
    if (!title.trim()) {
      setTitle(item.title);
      return;
    }
    const updated = await patchItem({ title: title.trim() });
    if (updated) onUpdated(updated);
  }

  async function handleDescriptionBlur() {
    if (!item || description === (item.description ?? "")) return;
    const updated = await patchItem({ description: description === "" ? null : description });
    if (updated) onUpdated(updated);
  }

  async function handleStatusChange(value: string) {
    setStatus(value);
    const updated = await patchItem({ status: value });
    if (updated) onUpdated(updated);
  }

  async function handleCategoryChange(value: string) {
    setCategory(value);
    const updated = await patchItem({ category: value });
    if (updated) onUpdated(updated);
  }

  async function handleOwnerChange(value: RoadmapOwner | "") {
    setOwner(value);
    const updated = await patchItem({ owner: value === "" ? null : value });
    if (updated) onUpdated(updated);
  }

  async function handleColorChange(value: RoadmapColor) {
    setColor(value);
    const updated = await patchItem({ color: value });
    if (updated) onUpdated(updated);
  }

  async function handleStartDateChange(value: string) {
    setStartDate(value);
    const updated = await patchItem({ startDate: value === "" ? null : value });
    if (updated) onUpdated(updated);
  }

  async function handleEndDateChange(value: string) {
    setEndDate(value);
    const updated = await patchItem({ endDate: value === "" ? null : value });
    if (updated) onUpdated(updated);
  }

  async function handleTaskToggle(task: RoadmapTaskRecord) {
    const newStatus = task.status === "Done" ? "To Do" : "Done";
    const updated = await patchRoadmapTask(task.id, { status: newStatus });
    if (updated) onTaskUpdated(updated);
  }

  async function handleTaskAssigneeChange(task: RoadmapTaskRecord, hebrewValue: string) {
    const assignedTo = hebrewValue === "" ? null : HEBREW_TO_ASSIGNEE[hebrewValue] ?? null;
    const updated = await patchRoadmapTask(task.id, { assignedTo });
    if (updated) onTaskUpdated(updated);
  }

  async function handleTaskDueDateChange(task: RoadmapTaskRecord, value: string) {
    const updated = await patchRoadmapTask(task.id, { dueDate: value === "" ? null : value });
    if (updated) onTaskUpdated(updated);
  }

  async function handleTaskNotesBlur(task: RoadmapTaskRecord, value: string) {
    if (value === (task.notes ?? "")) return;
    const updated = await patchRoadmapTask(task.id, { notes: value === "" ? null : value });
    if (updated) onTaskUpdated(updated);
  }

  async function handleCreate() {
    if (!title.trim()) return;
    setSaving(true);
    try {
      const res = await fetch("/api/roadmap", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          description: description === "" ? null : description,
          status,
          category,
          owner: owner === "" ? null : owner,
          color,
          startDate: startDate === "" ? null : startDate,
          endDate: endDate === "" ? null : endDate,
        }),
      });
      if (!res.ok) return;
      const data = await res.json();
      onCreated(data.item as RoadmapRecord);
      onClose();
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!item) return;
    if (!window.confirm("למחוק את היעד?")) return;
    const res = await fetch(`/api/roadmap/${item.id}`, { method: "DELETE" });
    if (!res.ok) return;
    onDeleted(item.id);
    onClose();
  }

  const linkedTasks = item ? tasks.filter((t) => item.taskIds.includes(t.id)) : [];
  const doneCount = linkedTasks.filter((t) => t.status === "Done").length;

  return (
    <>
      <div
        onClick={onClose}
        aria-hidden
        className={`fixed inset-0 z-40 bg-black/30 transition-opacity ${
          isOpen ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
      />

      <div
        role="dialog"
        aria-modal="true"
        className={`fixed inset-y-0 right-0 z-50 w-full max-w-md overflow-y-auto bg-surface shadow-xl transition-transform duration-300 ${
          isOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        {isOpen && (
          <div className="relative flex min-h-full flex-col">
            <button
              type="button"
              onClick={onClose}
              aria-label="סגור"
              className="absolute left-4 top-4 flex h-8 w-8 items-center justify-center rounded-full text-muted transition-colors hover:bg-background hover:text-foreground"
            >
              <X size={18} />
            </button>

            <div className="border-b border-border p-4 pl-14">
              <h2 className="text-xl font-black leading-snug text-foreground">
                {isNew ? "יעד חדש" : "יעד במפת הדרכים"}
              </h2>
            </div>

            <div className="space-y-4 p-4">
              <label className="block space-y-1">
                <span className="text-xs font-bold uppercase tracking-wide text-muted">כותרת</span>
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  onBlur={handleTitleBlur}
                  placeholder="שם היעד"
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm font-medium text-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-accent/40"
                />
              </label>

              <label className="block space-y-1">
                <span className="text-xs font-bold uppercase tracking-wide text-muted">תיאור</span>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  onBlur={handleDescriptionBlur}
                  rows={4}
                  placeholder="תיאור היעד וקריטריוני הצלחה"
                  className="w-full resize-none rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-accent/40"
                />
              </label>

              <label className="flex items-center justify-between text-sm">
                <span className="text-muted">סטטוס</span>
                <select
                  value={status ?? ""}
                  onChange={(e) => handleStatusChange(e.target.value)}
                  className="rounded-lg border border-border bg-background px-2 py-1 text-sm font-medium text-foreground"
                >
                  {statusOptions(status).map((s) => (
                    <option key={s} value={s}>
                      {STATUS_TONE_LABELS[normalizeRoadmapStatus(s)]}
                    </option>
                  ))}
                </select>
              </label>

              <label className="flex items-center justify-between text-sm">
                <span className="text-muted">קטגוריה</span>
                <select
                  value={category ?? ""}
                  onChange={(e) => handleCategoryChange(e.target.value)}
                  className="rounded-lg border border-border bg-background px-2 py-1 text-sm font-medium text-foreground"
                >
                  {categoryOptions(category).map((c) => (
                    <option key={c} value={c}>
                      {normalizeRoadmapCategory(c)}
                    </option>
                  ))}
                </select>
              </label>

              <label className="flex items-center justify-between text-sm">
                <span className="text-muted">אחראי</span>
                <select
                  value={owner}
                  onChange={(e) => handleOwnerChange(e.target.value as RoadmapOwner | "")}
                  className="rounded-lg border border-border bg-background px-2 py-1 text-sm font-medium text-foreground"
                >
                  <option value="">לא נקבע</option>
                  {ROADMAP_OWNERS.map((o) => (
                    <option key={o} value={o}>
                      {o}
                    </option>
                  ))}
                </select>
              </label>

              <label className="flex items-center justify-between text-sm">
                <span className="text-muted">צבע</span>
                <div className="flex gap-1.5">
                  {ROADMAP_COLORS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => handleColorChange(c)}
                      aria-label={c}
                      className={`h-6 w-6 rounded-full ${roadmapColorClasses(c).bar} ${
                        color === c ? "ring-2 ring-offset-2 ring-foreground" : ""
                      }`}
                    />
                  ))}
                </div>
              </label>

              <div className="flex items-center justify-between gap-2 text-sm">
                <label className="flex flex-1 items-center justify-between gap-2">
                  <span className="text-muted">מתאריך</span>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => handleStartDateChange(e.target.value)}
                    className="rounded-lg border border-border bg-background px-2 py-1 text-sm font-medium text-foreground"
                  />
                </label>
                <label className="flex flex-1 items-center justify-between gap-2">
                  <span className="text-muted">עד תאריך</span>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => handleEndDateChange(e.target.value)}
                    className="rounded-lg border border-border bg-background px-2 py-1 text-sm font-medium text-foreground"
                  />
                </label>
              </div>

              {isNew ? (
                <button
                  type="button"
                  onClick={handleCreate}
                  disabled={saving || !title.trim()}
                  className="w-full rounded-full bg-accent px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-accent-strong disabled:opacity-50"
                >
                  צור יעד
                </button>
              ) : (
                <>
                  {linkedTasks.length > 0 && (
                    <div className="space-y-2">
                      <h3 className="text-xs font-bold uppercase tracking-wide text-muted">
                        משימות ({doneCount}/{linkedTasks.length})
                      </h3>
                      <div className="space-y-2">
                        {linkedTasks.map((task) => (
                          <div
                            key={task.id}
                            className="space-y-2 rounded-lg border border-border bg-background p-2"
                          >
                            <label className="flex items-start gap-2">
                              <input
                                type="checkbox"
                                checked={task.status === "Done"}
                                onChange={() => handleTaskToggle(task)}
                                className="mt-0.5 h-4 w-4 shrink-0 accent-accent"
                              />
                              <span
                                className={`text-sm font-medium ${
                                  task.status === "Done"
                                    ? "text-muted line-through"
                                    : "text-foreground"
                                }`}
                              >
                                {task.title}
                              </span>
                            </label>

                            <div className="flex flex-wrap items-center gap-2 pr-6 text-xs">
                              <select
                                value={task.assignedTo ? ASSIGNEE_TO_HEBREW[task.assignedTo] : ""}
                                onChange={(e) => handleTaskAssigneeChange(task, e.target.value)}
                                className="rounded-md border border-border bg-surface px-1.5 py-0.5 text-xs font-medium text-foreground"
                              >
                                <option value="">לא משויך</option>
                                <option value="איתי">איתי</option>
                                <option value="עומרי">עומרי</option>
                              </select>

                              <input
                                type="date"
                                value={toDateInput(task.dueDate)}
                                onChange={(e) => handleTaskDueDateChange(task, e.target.value)}
                                className="rounded-md border border-border bg-surface px-1.5 py-0.5 text-xs font-medium text-foreground"
                              />
                            </div>

                            <input
                              defaultValue={task.notes ?? ""}
                              onBlur={(e) => handleTaskNotesBlur(task, e.target.value)}
                              placeholder="הערות"
                              className="w-full rounded-md border border-border bg-surface px-1.5 py-1 pr-6 text-xs text-foreground placeholder:text-muted"
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={handleDelete}
                    className="w-full rounded-full bg-warn-soft px-4 py-2 text-sm font-bold text-warn transition-colors hover:bg-warn hover:text-white"
                  >
                    מחק יעד
                  </button>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </>
  );
}
