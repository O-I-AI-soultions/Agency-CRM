import { ClipboardList, Users, MessageCircle } from "lucide-react";
import type { TaskRecord, TaskStatus } from "@/lib/types";
import { PRIORITY_LABELS, PRIORITY_CLASSES, PRIORITY_ICONS } from "@/lib/priority-labels";

export const TASK_STATUS_LABELS: Record<TaskStatus, string> = {
  "To Do": "לביצוע",
  "In Progress": "בתהליך",
  Done: "הושלם",
};

const STATUS_CLASSES: Record<TaskStatus, string> = {
  "To Do": "tag tag-muted",
  "In Progress": "tag tag-accent",
  Done: "tag tag-green",
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("he-IL", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function isOverdue(task: TaskRecord): boolean {
  if (!task.dueDate || task.status === "Done") return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return new Date(task.dueDate) < today;
}

interface TaskCardProps {
  task: TaskRecord;
  onSelect: (task: TaskRecord) => void;
}

export default function TaskCard({ task, onSelect }: TaskCardProps) {
  const overdue = isOverdue(task);
  const PriorityIcon = task.priority ? PRIORITY_ICONS[task.priority] : null;
  const LinkedIcon = task.linkedLeadName ? ClipboardList : task.linkedClientName ? Users : null;
  const linkedName = task.linkedLeadName ?? task.linkedClientName ?? null;

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onSelect(task)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onSelect(task);
        }
      }}
      aria-label={`פתח משימה: ${task.title}`}
      className="panel panel-hover cursor-pointer space-y-2 p-3 focus:outline-none focus:ring-2 focus:ring-accent/40"
    >
      <div className="flex items-start justify-between gap-2">
        <h3 className="font-display text-sm font-bold leading-snug text-foreground">{task.title}</h3>
        {task.priority && PriorityIcon && (
          <span className={`shrink-0 ${PRIORITY_CLASSES[task.priority]}`}>
            <PriorityIcon size={12} /> {PRIORITY_LABELS[task.priority]}
          </span>
        )}
      </div>

      {LinkedIcon && linkedName && (
        <span className="inline-flex items-center gap-1 rounded-md border border-border bg-surface-2 px-2 py-0.5 text-xs font-medium text-muted">
          <LinkedIcon size={12} /> {linkedName}
        </span>
      )}

      <div className="flex flex-wrap items-center gap-2 text-xs">
        <span className={STATUS_CLASSES[task.status]}>{TASK_STATUS_LABELS[task.status]}</span>
        {task.dueDate && (
          <span className={`font-mono ${overdue ? "font-bold text-warn" : "text-muted"}`}>
            {formatDate(task.dueDate)}
          </span>
        )}
        {task.commentCount > 0 && (
          <span className="inline-flex items-center gap-1 font-mono text-muted">
            <MessageCircle size={12} /> {task.commentCount}
          </span>
        )}
      </div>
    </div>
  );
}
