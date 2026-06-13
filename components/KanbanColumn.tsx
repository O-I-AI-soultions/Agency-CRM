import type { LeadRecord } from "@/lib/types";
import LeadCard from "@/components/LeadCard";

export type ColumnAccent = "new" | "review" | "proposal" | "negotiation" | "lost";

export const ACCENT_COLORS: Record<ColumnAccent, string> = {
  new: "var(--col-new)",
  review: "var(--col-review)",
  proposal: "var(--col-proposal)",
  negotiation: "var(--col-negotiation)",
  lost: "var(--col-lost)",
};

interface KanbanColumnProps {
  title: string;
  leads: LeadRecord[];
  accent: ColumnAccent;
  onSelect: (lead: LeadRecord) => void;
}

export default function KanbanColumn({ title, leads, accent, onSelect }: KanbanColumnProps) {
  const color = ACCENT_COLORS[accent];

  return (
    <div className="flex w-72 shrink-0 flex-col lg:w-auto">
      <div
        className="flex items-center gap-2 rounded-t-xl px-3.5 py-3 text-white"
        style={{ backgroundColor: color }}
      >
        <h2 className="font-display text-sm font-semibold">{title}</h2>
        <span className="mr-auto rounded-full bg-white/25 px-2 py-0.5 text-xs font-bold">
          {leads.length}
        </span>
      </div>

      <div className="flex min-h-[200px] flex-col gap-2 rounded-b-xl border border-t-0 border-border bg-black/[0.02] p-2.5">
        {leads.length === 0 ? (
          <p className="rounded-xl border border-dashed border-border px-3 py-6 text-center text-sm text-muted">
            אין לידים
          </p>
        ) : (
          leads.map((lead, index) => (
            <LeadCard key={lead.id} lead={lead} onSelect={onSelect} accentColor={color} index={index} />
          ))
        )}
      </div>
    </div>
  );
}
