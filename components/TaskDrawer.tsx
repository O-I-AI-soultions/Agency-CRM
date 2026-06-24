"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";
import {
  PRIORITIES,
  TASK_STATUSES,
  type LinkableRecord,
  type Priority,
  type TaskCommentRecord,
  type TaskRecord,
  type TaskStatus,
} from "@/lib/types";
import type { Partner } from "@/lib/auth";
import CommentThread from "@/components/CommentThread";
import LinkedRecordSearch from "@/components/LinkedRecordSearch";
import { TASK_STATUS_LABELS } from "@/components/TaskCard";
import { PRIORITY_LABELS } from "@/lib/priority-labels";

function toDateInput(iso: string | null): string {
  if (!iso) return "";
  return iso.slice(0, 10);
}

function linkedFromTask(task: TaskRecord | null): LinkableRecord | null {
  if (!task) return null;
  if (task.linkedLeadId) {
    return { id: task.linkedLeadId, name: task.linkedLeadName ?? "", type: "lead" };
  }
  if (task.linkedClientId) {
    return { id: task.linkedClientId, name: task.linkedClientName ?? "", type: "client" };
  }
  return null;
}

interface TaskDrawerProps {
  task: TaskRecord | null;
  isNew: boolean;
  partner: Partner;
  records: LinkableRecord[];
  onClose: () => void;
  onCreated: (task: TaskRecord) => void;
  onUpdated: (task: TaskRecord) => void;
  onDeleted: (id: string) => void;
}

export default function TaskDrawer({
  task,
  isNew,
  partner,
  records,
  onClose,
  onCreated,
  onUpdated,
  onDeleted,
}: TaskDrawerProps) {
  const isOpen = task !== null || isNew;
  const isOwn = isNew || task?.owner === partner;

  const [title, setTitle] = useState(task?.title ?? "");
  const [status, setStatus] = useState<TaskStatus>(task?.status ?? "To Do");
  const [priority, setPriority] = useState<Priority | null>(task?.priority ?? null);
  const [dueDate, setDueDate] = useState(toDateInput(task?.dueDate ?? null));
  const [linked, setLinked] = useState<LinkableRecord | null>(linkedFromTask(task));
  const [comments, setComments] = useState<TaskCommentRecord[]>([]);
  const [openKey, setOpenKey] = useState<string | null>(isNew ? "new" : task?.id ?? null);
  const [saving, setSaving] = useState(false);

  const currentKey = isNew ? "new" : task?.id ?? null;
  if (currentKey !== openKey) {
    setOpenKey(currentKey);
    setTitle(task?.title ?? "");
    setStatus(task?.status ?? "To Do");
    setPriority(task?.priority ?? null);
    setDueDate(toDateInput(task?.dueDate ?? null));
    setLinked(linkedFromTask(task));
    setComments([]);
  }

  useEffect(() => {
    if (isNew || !task) return;
    const taskId = task.id;
    let cancelled = false;
    fetch(`/api/tasks/${taskId}/comments`)
      .then((res) => res.json())
      .then((data) => {
        if (!cancelled) setComments(data.comments ?? []);
      });
    return () => {
      cancelled = true;
    };
  }, [isNew, task?.id]);

  useEffect(() => {
    if (!isOpen) return;
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [isOpen, onClose]);

  async function patchTask(body: Record<string, unknown>) {
    if (!task) return null;
    const res = await fetch(`/api/tasks/${task.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.task as TaskRecord;
  }

  async function handleStatusChange(value: TaskStatus) {
    setStatus(value);
    const updated = await patchTask({ status: value });
    if (updated) onUpdated(updated);
  }

  async function handlePriorityChange(value: Priority | null) {
    setPriority(value);
    const updated = await patchTask({ priority: value });
    if (updated) onUpdated(updated);
  }

  async function handleDueDateChange(value: string) {
    setDueDate(value);
    const updated = await patchTask({ dueDate: value === "" ? null : value });
    if (updated) onUpdated(updated);
  }

  async function handleTitleBlur() {
    if (!task || title === task.title) return;
    if (!title.trim()) {
      setTitle(task.title);
      return;
    }
    const updated = await patchTask({ title: title.trim() });
    if (updated) onUpdated(updated);
  }

  async function handleLinkedChange(value: LinkableRecord | null) {
    setLinked(value);
    const updated = await patchTask({
      linkedLeadName: value?.type === "lead" ? value.name : null,
      linkedLeadId: value?.type === "lead" ? value.id : null,
      linkedClientName: value?.type === "client" ? value.name : null,
      linkedClientId: value?.type === "client" ? value.id : null,
    });
    if (updated) onUpdated(updated);
  }

  async function handleCreate() {
    if (!title.trim()) return;
    setSaving(true);
    try {
      const res = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          status,
          priority,
          dueDate: dueDate === "" ? null : dueDate,
          linkedLeadName: linked?.type === "lead" ? linked.name : null,
          linkedLeadId: linked?.type === "lead" ? linked.id : null,
          linkedClientName: linked?.type === "client" ? linked.name : null,
          linkedClientId: linked?.type === "client" ? linked.id : null,
        }),
      });
      if (!res.ok) return;
      const data = await res.json();
      onCreated(data.task as TaskRecord);
      onClose();
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!task) return;
    if (!window.confirm("למחוק את המשימה?")) return;
    const res = await fetch(`/api/tasks/${task.id}`, { method: "DELETE" });
    if (!res.ok) return;
    onDeleted(task.id);
    onClose();
  }

  async function handleSendComment(text: string) {
    if (!task) return;
    const optimistic: TaskCommentRecord = {
      id: `temp-${comments.length}-${text.length}-${Date.now()}`,
      taskId: task.id,
      comment: text,
      author: partner,
      date: new Date().toISOString(),
    };
    setComments((prev) => [...prev, optimistic]);

    const res = await fetch(`/api/tasks/${task.id}/comments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ comment: text }),
    });

    if (res.ok) {
      const data = await res.json();
      setComments((prev) => prev.map((c) => (c.id === optimistic.id ? data.comment : c)));
      onUpdated({ ...task, commentCount: task.commentCount + 1 });
    } else {
      setComments((prev) => prev.filter((c) => c.id !== optimistic.id));
    }
  }

  const fieldDisabled = !isOwn;

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
        className={`fixed inset-y-0 right-0 z-50 w-full max-w-md overflow-y-auto border-s border-border bg-surface shadow-xl transition-transform duration-300 ${
          isOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        {isOpen && (
          <div className="relative flex min-h-full flex-col">
            <button
              type="button"
              onClick={onClose}
              aria-label="סגור"
              className="absolute left-4 top-4 flex h-11 w-11 items-center justify-center rounded-full text-muted transition-colors hover:bg-background hover:text-foreground focus:outline-none focus:ring-2 focus:ring-accent/40"
            >
              <X size={18} />
            </button>

            <div className="border-b border-border p-4 pl-14">
              <h2 className="font-display text-xl font-black leading-snug text-foreground">
                {isNew ? "משימה חדשה" : "משימה"}
              </h2>
              {!isNew && !isOwn && (
                <p className="mt-1 text-xs text-muted">
                  משימה של {task?.owner} — לקריאה בלבד, ניתן להגיב
                </p>
              )}
            </div>

            <div className="space-y-4 p-4">
              <label className="block space-y-1">
                <span className="text-xs font-bold uppercase tracking-wide text-muted">כותרת</span>
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  onBlur={handleTitleBlur}
                  disabled={fieldDisabled}
                  placeholder="מה צריך לעשות?"
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-base font-medium text-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-accent/40 disabled:cursor-not-allowed disabled:opacity-50"
                />
              </label>

              <label className="flex items-center justify-between text-sm">
                <span className="text-xs font-bold uppercase tracking-wide text-muted">סטטוס</span>
                <select
                  value={status}
                  onChange={(e) => handleStatusChange(e.target.value as TaskStatus)}
                  disabled={fieldDisabled}
                  className="rounded-lg border border-border bg-background px-2 py-1.5 text-base font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-accent/40 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {TASK_STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {TASK_STATUS_LABELS[s]}
                    </option>
                  ))}
                </select>
              </label>

              <label className="flex items-center justify-between text-sm">
                <span className="text-xs font-bold uppercase tracking-wide text-muted">עדיפות</span>
                <select
                  value={priority ?? ""}
                  onChange={(e) =>
                    handlePriorityChange(e.target.value === "" ? null : (e.target.value as Priority))
                  }
                  disabled={fieldDisabled}
                  className="rounded-lg border border-border bg-background px-2 py-1.5 text-base font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-accent/40 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <option value="">לא נקבע</option>
                  {PRIORITIES.map((p) => (
                    <option key={p} value={p}>
                      {PRIORITY_LABELS[p]}
                    </option>
                  ))}
                </select>
              </label>

              <label className="flex items-center justify-between text-sm">
                <span className="text-xs font-bold uppercase tracking-wide text-muted">תאריך יעד</span>
                <input
                  type="date"
                  value={dueDate}
                  onChange={(e) => handleDueDateChange(e.target.value)}
                  disabled={fieldDisabled}
                  className="rounded-lg border border-border bg-background px-2 py-1.5 text-base font-mono font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-accent/40 disabled:cursor-not-allowed disabled:opacity-50"
                />
              </label>

              <div className="space-y-1">
                <span className="text-xs font-bold uppercase tracking-wide text-muted">קשור ל</span>
                <LinkedRecordSearch
                  records={records}
                  value={linked}
                  onChange={handleLinkedChange}
                  disabled={fieldDisabled}
                />
              </div>

              {isNew ? (
                <button
                  type="button"
                  onClick={handleCreate}
                  disabled={saving || !title.trim()}
                  className="btn-primary w-full disabled:cursor-not-allowed"
                >
                  צור משימה
                </button>
              ) : (
                <>
                  <CommentThread comments={comments} onSend={handleSendComment} />

                  {isOwn && (
                    <button type="button" onClick={handleDelete} className="btn-danger w-full">
                      מחק משימה
                    </button>
                  )}
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </>
  );
}
