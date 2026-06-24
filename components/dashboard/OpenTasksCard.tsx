"use client";

import { useState } from "react";
import { CheckSquare } from "lucide-react";
import type { TaskRecord } from "@/lib/types";
import { PRIORITY_LABELS, PRIORITY_CLASSES } from "@/lib/priority-labels";

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
      className="panel animate-fade-up p-5"
      style={{ animationDelay: "0.3s" }}
    >
      <div className="flex items-center justify-between">
        <h2 className="text-[13px] font-semibold text-muted">משימות פתוחות</h2>
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
                aria-label={`סמן את המשימה "${task.title}" כהושלמה`}
                onClick={() => handleComplete(task.id)}
                className="group -mt-2.5 -ms-2.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition-colors hover:bg-accent-soft focus:outline-none focus:ring-2 focus:ring-accent/40"
              >
                <span className="h-4 w-4 rounded-full border-2 border-border transition-colors group-hover:border-accent" />
              </button>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm text-foreground">{task.title}</p>
                <div className="mt-1 flex items-center gap-2">
                  {task.dueDate && (
                    <span className={`font-mono text-[11px] ${overdue ? "font-bold text-warn-strong" : "text-muted"}`}>
                      {formatDate(task.dueDate)}
                    </span>
                  )}
                  {task.priority && (
                    <span className={PRIORITY_CLASSES[task.priority]}>
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
