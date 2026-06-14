"use client";

import { useState } from "react";
import type { LinkableRecord, TaskRecord } from "@/lib/types";
import type { Partner } from "@/lib/auth";
import TaskCard from "@/components/TaskCard";
import TaskDrawer from "@/components/TaskDrawer";

const OTHER_PARTNER: Record<Partner, Partner> = {
  איתי: "עמרי",
  עמרי: "איתי",
};

interface TasksBoardProps {
  tasks: TaskRecord[];
  partner: Partner;
  records: LinkableRecord[];
}

export default function TasksBoard({ tasks: initialTasks, partner, records }: TasksBoardProps) {
  const [tasks, setTasks] = useState(initialTasks);
  const [selectedTask, setSelectedTask] = useState<TaskRecord | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  const myTasks = tasks.filter((task) => task.owner === partner);
  const otherTasks = tasks.filter((task) => task.owner !== partner);
  const otherPartner = OTHER_PARTNER[partner];

  function handleCreated(task: TaskRecord) {
    setTasks((prev) => [task, ...prev]);
  }

  function handleUpdated(updated: TaskRecord) {
    setTasks((prev) => prev.map((task) => (task.id === updated.id ? updated : task)));
    setSelectedTask((prev) => (prev && prev.id === updated.id ? updated : prev));
  }

  function handleDeleted(id: string) {
    setTasks((prev) => prev.filter((task) => task.id !== id));
    setSelectedTask((prev) => (prev?.id === id ? null : prev));
  }

  function closeDrawer() {
    setSelectedTask(null);
    setIsCreating(false);
  }

  return (
    <>
      <div className="flex justify-end">
        <button
          type="button"
          onClick={() => setIsCreating(true)}
          className="rounded-full bg-accent px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-accent-strong focus:outline-none focus:ring-2 focus:ring-accent/40"
        >
          + משימה חדשה
        </button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-3 rounded-2xl border border-border bg-surface/60 p-3">
          <h2 className="px-1 text-sm font-bold text-foreground">המשימות שלי ({partner})</h2>
          {myTasks.length === 0 ? (
            <p className="rounded-xl border border-dashed border-border px-3 py-6 text-center text-sm text-muted">
              אין משימות
            </p>
          ) : (
            myTasks.map((task) => <TaskCard key={task.id} task={task} onSelect={setSelectedTask} />)
          )}
        </div>

        <div className="flex flex-col gap-3 rounded-2xl border border-border bg-surface/60 p-3">
          <h2 className="px-1 text-sm font-bold text-foreground">המשימות של {otherPartner}</h2>
          {otherTasks.length === 0 ? (
            <p className="rounded-xl border border-dashed border-border px-3 py-6 text-center text-sm text-muted">
              אין משימות
            </p>
          ) : (
            otherTasks.map((task) => <TaskCard key={task.id} task={task} onSelect={setSelectedTask} />)
          )}
        </div>
      </div>

      <TaskDrawer
        task={selectedTask}
        isNew={isCreating}
        partner={partner}
        records={records}
        onClose={closeDrawer}
        onCreated={handleCreated}
        onUpdated={handleUpdated}
        onDeleted={handleDeleted}
      />
    </>
  );
}
