import type { Priority, TaskRecord, TaskStatus } from "@/lib/types";

export const TASK_STATUS_LABELS: Record<TaskStatus, string> = {
  "To Do": "לביצוע",
  "In Progress": "בתהליך",
  Done: "הושלם",
};

export const PRIORITY_LABELS: Record<Priority, string> = {
  High: "גבוהה",
  Medium: "בינונית",
  Low: "נמוכה",
};

const PRIORITY_ICONS: Record<Priority, string> = {
  High: "🔴",
  Medium: "🟡",
  Low: "🔵",
};

const PRIORITY_CLASSES: Record<Priority, string> = {
  High: "bg-warn-soft text-warn",
  Medium: "bg-amber-soft text-amber",
  Low: "bg-sky-soft text-sky",
};

const STATUS_CLASSES: Record<TaskStatus, string> = {
  "To Do": "bg-border text-muted",
  "In Progress": "bg-sky-soft text-sky",
  Done: "bg-accent-soft text-accent-strong",
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
  const linkedLabel = task.linkedLeadName
    ? `📋 ${task.linkedLeadName}`
    : task.linkedClientName
      ? `👥 ${task.linkedClientName}`
      : null;

  return (
    <div
      onClick={() => onSelect(task)}
      className="cursor-pointer space-y-2 rounded-xl border border-border bg-surface p-3 shadow-sm transition-shadow hover:shadow-md"
    >
      <div className="flex items-start justify-between gap-2">
        <h3 className="text-sm font-bold leading-snug text-foreground">{task.title}</h3>
        {task.priority && (
          <span
            className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-bold ${PRIORITY_CLASSES[task.priority]}`}
          >
            {PRIORITY_ICONS[task.priority]} {PRIORITY_LABELS[task.priority]}
          </span>
        )}
      </div>

      {linkedLabel && (
        <span className="inline-flex items-center rounded-full bg-background px-2 py-0.5 text-xs font-medium text-muted">
          {linkedLabel}
        </span>
      )}

      <div className="flex flex-wrap items-center gap-2 text-xs">
        <span className={`rounded-full px-2 py-0.5 font-bold ${STATUS_CLASSES[task.status]}`}>
          {TASK_STATUS_LABELS[task.status]}
        </span>
        {task.dueDate && (
          <span className={overdue ? "font-bold text-warn" : "text-muted"}>
            {formatDate(task.dueDate)}
          </span>
        )}
        {task.commentCount > 0 && <span className="text-muted">💬 {task.commentCount}</span>}
      </div>
    </div>
  );
}
