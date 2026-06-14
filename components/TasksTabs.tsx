import Link from "next/link";

const TABS = [
  { key: "list", label: "משימות" },
  { key: "roadmap", label: "מפת דרכים" },
] as const;

export type TasksTab = (typeof TABS)[number]["key"];

export function getActiveTasksTab(tab?: string): TasksTab {
  if (tab === "roadmap") return "roadmap";
  return "list";
}

export default function TasksTabs({ active }: { active: TasksTab }) {
  return (
    <div className="flex w-fit gap-1 rounded-full bg-sky-soft p-1">
      {TABS.map((tab) => (
        <Link
          key={tab.key}
          href={tab.key === "list" ? "/tasks" : `/tasks?tab=${tab.key}`}
          aria-current={active === tab.key ? "page" : undefined}
          className={
            "rounded-full px-4 py-1.5 text-sm font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-accent/40 " +
            (active === tab.key
              ? "bg-accent text-white shadow-sm"
              : "text-muted hover:bg-surface hover:text-foreground")
          }
        >
          {tab.label}
        </Link>
      ))}
    </div>
  );
}
