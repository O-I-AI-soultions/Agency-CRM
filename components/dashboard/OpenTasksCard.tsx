"use client";

import { useState } from "react";
import { CheckSquare } from "lucide-react";
import type { Priority, TaskRecord } from "@/lib/types";

const PRIORITY_LABELS: Record<Priority, string> = {
  High: "גבוהה",
  Medium: "בינונית",
  Low: "נמוכה",
};

const PRIORITY_CLASSES: Record<Priority, string> = {
  High: "bg-warn-soft text-warn",
  Medium: "bg-amber-soft text-amber",
  Low: "bg-sky-soft text-sky",
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("he-IL", {
    day: "2-digit",
    month: "2-digit",
  });
}

function isOverdue(task: TaskRecord): boolean {
  if (!task.dueDate) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return new Date(task.dueDate) < today;
}

interface OpenTasksCardProps {
  tasks: TaskRecord[];
}

export default function OpenTasksCard({ tasks: initialTasks }: OpenTasksCardProps) {
  const [tasks, setTasks] = useState(initialTasks);

  async function handleComplete(taskId: string) {
    setTasks((prev) => prev.filter((task) => task.id !== taskId));

    try {
      const res = await fetch(`/api/tasks/${taskId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "Done" }),
      });
      if (!res.ok) {
        setTasks(initialTasks);
      }
    } catch {
      setTasks(initialTasks);
    }
  }

  const visible = tasks.slice(0, 4);

  return (
    <div
      className="card-shadow animate-fade-up rounded-2xl bg-surface p-5"
      style={{ animationDelay: "0.3s" }}
    >
      <div className="flex items-center justify-between">
        <h3 className="text-[13px] font-semibold text-muted">משימות פתוחות</h3>
        <CheckSquare size={16} className="text-muted-2" />
      </div>

      <div className="mt-3 space-y-3">
        {visible.length === 0 && <p className="text-xs text-muted-2">אין משימות פתוחות</p>}

        {visible.map((task) => {
          const overdue = isOverdue(task);
          return (
            <div key={task.id} className="flex items-start gap-2.5">
              <button
                type="button"
                aria-label="סמן כהושלם"
                onClick={() => handleComplete(task.id)}
                className="mt-0.5 h-4 w-4 shrink-0 rounded-full border-2 border-border transition-colors hover:border-accent hover:bg-accent-soft"
              />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm text-foreground">{task.title}</p>
                <div className="mt-1 flex items-center gap-2">
                  {task.dueDate && (
                    <span className={`text-[11px] ${overdue ? "font-bold text-warn" : "text-muted-2"}`}>
                      {formatDate(task.dueDate)}
                    </span>
                  )}
                  {task.priority && (
                    <span
                      className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold ${PRIORITY_CLASSES[task.priority]}`}
                    >
                      {PRIORITY_LABELS[task.priority]}
                    </span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
