import Link from "next/link";

const TABS = [
  { key: "kanban", label: "קנבן" },
  { key: "calls", label: "רשימת שיחות" },
  { key: "scrape", label: "סריקה" },
] as const;

export type LeadsTab = (typeof TABS)[number]["key"];

export function getActiveTab(tab?: string): LeadsTab {
  if (tab === "calls" || tab === "scrape") return tab;
  return "kanban";
}

export default function LeadsTabs({ active }: { active: LeadsTab }) {
  return (
    <div className="flex w-fit gap-1 rounded-full bg-sky-soft p-1">
      {TABS.map((tab) => (
        <Link
          key={tab.key}
          href={tab.key === "kanban" ? "/leads" : `/leads?tab=${tab.key}`}
          className={
            "rounded-full px-4 py-2 text-sm font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/40 " +
            (active === tab.key
              ? "bg-accent-strong text-white shadow-sm"
              : "text-muted hover:bg-surface hover:text-foreground")
          }
        >
          {tab.label}
        </Link>
      ))}
    </div>
  );
}
