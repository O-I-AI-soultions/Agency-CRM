import type { LeadRecord } from "@/lib/types";
import LeadCard from "@/components/LeadCard";

export type ColumnAccent = "sky" | "amber" | "accent" | "warn" | "muted";

const DOT_CLASSES: Record<ColumnAccent, string> = {
  sky: "bg-sky",
  amber: "bg-amber",
  accent: "bg-accent",
  warn: "bg-warn",
  muted: "bg-muted",
};

const COUNT_CLASSES: Record<ColumnAccent, string> = {
  sky: "bg-sky-soft text-sky",
  amber: "bg-amber-soft text-amber",
  accent: "bg-accent-soft text-accent-strong",
  warn: "bg-warn-soft text-warn",
  muted: "bg-border text-muted",
};

interface KanbanColumnProps {
  title: string;
  leads: LeadRecord[];
  accent: ColumnAccent;
  onSelect: (lead: LeadRecord) => void;
}

export default function KanbanColumn({ title, leads, accent, onSelect }: KanbanColumnProps) {
  return (
    <div className="flex w-72 shrink-0 flex-col gap-3 rounded-2xl border border-border bg-surface/60 p-3 lg:w-auto">
      <div className="flex items-center gap-2 px-1">
        <span className={`h-2 w-2 rounded-full ${DOT_CLASSES[accent]}`} aria-hidden />
        <h2 className="text-sm font-bold text-foreground">{title}</h2>
        <span
          className={`mr-auto rounded-full px-2 py-0.5 text-xs font-bold ${COUNT_CLASSES[accent]}`}
        >
          {leads.length}
        </span>
      </div>

      <div className="flex flex-col gap-3">
        {leads.length === 0 ? (
          <p className="rounded-xl border border-dashed border-border px-3 py-6 text-center text-sm text-muted">
            אין לידים
          </p>
        ) : (
          leads.map((lead) => <LeadCard key={lead.id} lead={lead} onSelect={onSelect} />)
        )}
      </div>
    </div>
  );
}
