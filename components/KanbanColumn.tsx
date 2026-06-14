import type { KanbanStatus, LeadRecord } from "@/lib/types";
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
  /** The `KanbanStatus` this column maps to, or `null` for the "אחר" column
   * (which is not a valid drag-and-drop target). */
  status: KanbanStatus | null;
  onSelect: (lead: LeadRecord) => void;
  onStatusChange: (leadId: string, newStatus: KanbanStatus) => void;
  onDelete: (leadId: string) => void;
  draggedLeadId: string | null;
  dropTargetStatus: KanbanStatus | null;
  isDropTarget: boolean;
  onDragStateChange: (leadId: string | null, hoverStatus: KanbanStatus | null) => void;
  onDrop: (leadId: string, newStatus: KanbanStatus) => void;
}

export default function KanbanColumn({
  title,
  leads,
  accent,
  status,
  onSelect,
  onStatusChange,
  onDelete,
  draggedLeadId,
  dropTargetStatus,
  isDropTarget,
  onDragStateChange,
  onDrop,
}: KanbanColumnProps) {
  const color = ACCENT_COLORS[accent];

  return (
    <div className="flex w-72 shrink-0 flex-col lg:w-auto">
      <div
        className="flex items-center gap-2 rounded-t-lg border-b-2 bg-surface px-3.5 py-3"
        style={{ borderColor: color }}
      >
        <span className="h-2 w-2 rounded-full" style={{ backgroundColor: color }} />
        <h2 className="font-display text-sm font-semibold text-foreground">{title}</h2>
        <span className="tag tag-muted mr-auto">{leads.length}</span>
      </div>

      <div
        data-column-status={status ?? "other"}
        className={`kanban-column-dropzone flex min-h-[200px] flex-col gap-2 rounded-b-lg border border-t-0 p-2.5 transition-colors ${
          isDropTarget
            ? "border-accent bg-accent-soft"
            : "border-border bg-black/[0.02]"
        }`}
      >
        {leads.length === 0 ? (
          <p className="rounded-lg border border-dashed border-border px-3 py-6 text-center text-sm text-muted">
            אין לידים
          </p>
        ) : (
          leads.map((lead, index) => (
            <LeadCard
              key={lead.id}
              lead={lead}
              onSelect={onSelect}
              onStatusChange={onStatusChange}
              onDelete={onDelete}
              accentColor={color}
              index={index}
              isDragging={draggedLeadId === lead.id}
              dropTargetStatus={dropTargetStatus}
              onDragStateChange={onDragStateChange}
              onDrop={onDrop}
            />
          ))
        )}
      </div>
    </div>
  );
}
