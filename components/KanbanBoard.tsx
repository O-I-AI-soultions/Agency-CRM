"use client";

import { useEffect, useRef, useState } from "react";
import { AlertTriangle } from "lucide-react";
import { KANBAN_STATUSES, type KanbanStatus, type LeadRecord } from "@/lib/types";
import type { Partner } from "@/lib/auth";
import { applyFilters, DEFAULT_FILTERS, type Filters } from "@/lib/filters";
import { updateLeadStatusClient } from "@/lib/leads-client";
import KanbanColumn from "@/components/KanbanColumn";
import LeadDrawer from "@/components/LeadDrawer";
import FilterBar from "@/components/FilterBar";

const COLUMN_LABELS: Record<KanbanStatus, string> = {
  "New Lead": "לידים חדשים",
  Contacted: "נוצר קשר",
  "Pitch Sent": "הצעה נשלחה",
  "Not Interested": "לא מעוניין",
};

interface KanbanBoardProps {
  leads: LeadRecord[];
  partner: Partner;
}

export default function KanbanBoard({ leads: initialLeads, partner }: KanbanBoardProps) {
  const [leads, setLeads] = useState(initialLeads);
  const [selectedLead, setSelectedLead] = useState<LeadRecord | null>(null);
  const [filters, setFilters] = useState<Filters>(DEFAULT_FILTERS);
  const [draggedLeadId, setDraggedLeadId] = useState<string | null>(null);
  const [dropTargetStatus, setDropTargetStatus] = useState<KanbanStatus | null>(null);
  const [dragError, setDragError] = useState<string | null>(null);
  const dragErrorTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Bug 1 fix (safety net): re-sync local `leads` state whenever the
  // server-provided `initialLeads` prop changes (e.g. after router.refresh()
  // triggers a fresh server render). Optimistic updates from
  // StatusActionButtons / drag-and-drop / the drawer already update local
  // state immediately, but this guards against cross-tab/cross-component
  // changes too. Adjusting state during render (rather than in a useEffect)
  // avoids an extra render pass.
  const [prevInitialLeads, setPrevInitialLeads] = useState(initialLeads);
  if (initialLeads !== prevInitialLeads) {
    setPrevInitialLeads(initialLeads);
    setLeads(initialLeads);
  }

  useEffect(() => {
    return () => {
      if (dragErrorTimeoutRef.current) clearTimeout(dragErrorTimeoutRef.current);
    };
  }, []);

  function handleUpdate(updated: LeadRecord) {
    setLeads((prev) => prev.map((lead) => (lead.id === updated.id ? updated : lead)));
    setSelectedLead((prev) => (prev && prev.id === updated.id ? updated : prev));
  }

  function applyOptimisticStatus(leadId: string, newStatus: KanbanStatus) {
    setLeads((prev) =>
      prev.map((lead) => {
        if (lead.id !== leadId) return lead;

        let updated: LeadRecord = { ...lead, status: newStatus };
        if (newStatus === "Contacted") {
          updated = {
            ...updated,
            lastContacted: new Date().toISOString(),
            followUpCount: (lead.followUpCount ?? 0) + 1,
          };
        }
        return updated;
      })
    );

    setSelectedLead((prev) => {
      if (!prev || prev.id !== leadId) return prev;
      let updated: LeadRecord = { ...prev, status: newStatus };
      if (newStatus === "Contacted") {
        updated = {
          ...updated,
          lastContacted: new Date().toISOString(),
          followUpCount: (prev.followUpCount ?? 0) + 1,
        };
      }
      return updated;
    });
  }

  function showDragError(message: string) {
    setDragError(message);
    if (dragErrorTimeoutRef.current) clearTimeout(dragErrorTimeoutRef.current);
    dragErrorTimeoutRef.current = setTimeout(() => setDragError(null), 3000);
  }

  /**
   * Called when a card's status changes via `StatusActionButtons` (within
   * `LeadCard`). Updates local state optimistically — same path used by
   * drag-and-drop — so the board re-renders immediately without relying on
   * `router.refresh()` (Bug 1 fix).
   */
  function handleStatusChange(leadId: string, newStatus: KanbanStatus) {
    applyOptimisticStatus(leadId, newStatus);
  }

  /**
   * Drag-and-drop drop handler. Optimistically moves the card to the new
   * column, then calls the shared status-update helper. On failure, rolls
   * back the optimistic update and shows an error banner.
   */
  async function handleDrop(leadId: string, newStatus: KanbanStatus) {
    const lead = leads.find((l) => l.id === leadId);
    if (!lead) return;

    // No-op if dropped back onto the same status / "אחר" column.
    const currentStatus: KanbanStatus = lead.status === null ? "New Lead" : (lead.status as KanbanStatus);
    if (currentStatus === newStatus) return;

    const previous = lead;
    applyOptimisticStatus(leadId, newStatus);

    const ok = await updateLeadStatusClient(leadId, newStatus);

    if (!ok) {
      // Roll back to the original lead record.
      setLeads((prev) => prev.map((l) => (l.id === leadId ? previous : l)));
      setSelectedLead((prev) => (prev && prev.id === leadId ? previous : prev));
      showDragError("עדכון הסטטוס נכשל. נסה שוב.");
    }
  }

  const filteredLeads = applyFilters(leads, filters).filter(
    (lead) => lead.status !== "Converted"
  );

  const groups: Record<KanbanStatus | "Other", LeadRecord[]> = {
    "New Lead": [],
    Contacted: [],
    "Pitch Sent": [],
    "Not Interested": [],
    Other: [],
  };

  for (const lead of filteredLeads) {
    if (lead.status === null) {
      groups["New Lead"].push(lead);
    } else if ((KANBAN_STATUSES as readonly string[]).includes(lead.status)) {
      groups[lead.status as KanbanStatus].push(lead);
    } else {
      groups.Other.push(lead);
    }
  }

  const columns = [
    {
      title: COLUMN_LABELS["New Lead"],
      leads: groups["New Lead"],
      accent: "new" as const,
      status: "New Lead" as KanbanStatus,
    },
    {
      title: COLUMN_LABELS.Contacted,
      leads: groups.Contacted,
      accent: "review" as const,
      status: "Contacted" as KanbanStatus,
    },
    {
      title: COLUMN_LABELS["Pitch Sent"],
      leads: groups["Pitch Sent"],
      accent: "proposal" as const,
      status: "Pitch Sent" as KanbanStatus,
    },
    {
      title: COLUMN_LABELS["Not Interested"],
      leads: groups["Not Interested"],
      accent: "lost" as const,
      status: "Not Interested" as KanbanStatus,
    },
    { title: "אחר", leads: groups.Other, accent: "negotiation" as const, status: null },
  ];

  return (
    <>
      <FilterBar
        leads={leads}
        filters={filters}
        onChange={setFilters}
        visibleCount={filteredLeads.length}
        totalCount={leads.length}
      />
      {dragError && (
        <div
          role="alert"
          aria-live="assertive"
          className="mt-3 flex items-center gap-1.5 rounded-xl border border-warn/30 bg-warn-soft px-4 py-2.5 text-sm font-semibold text-warn"
        >
          <AlertTriangle size={16} /> {dragError}
        </div>
      )}
      <div
        className="kanban-scroll -mx-4 mt-4 flex gap-4 overflow-x-auto px-4 pb-2 sm:-mx-6 sm:px-6 lg:-mx-8 lg:grid lg:grid-cols-5 lg:gap-4 lg:overflow-visible lg:px-8"
        style={{ touchAction: "pan-x" }}
      >
        {columns.map((column) => (
          <KanbanColumn
            key={column.title}
            title={column.title}
            leads={column.leads}
            accent={column.accent}
            status={column.status}
            onSelect={setSelectedLead}
            onStatusChange={handleStatusChange}
            draggedLeadId={draggedLeadId}
            dropTargetStatus={dropTargetStatus}
            isDropTarget={column.status !== null && dropTargetStatus === column.status}
            onDragStateChange={(leadId, hoverStatus) => {
              setDraggedLeadId(leadId);
              setDropTargetStatus(hoverStatus);
            }}
            onDrop={handleDrop}
          />
        ))}
      </div>
      <LeadDrawer
        lead={selectedLead}
        partner={partner}
        onClose={() => setSelectedLead(null)}
        onUpdate={handleUpdate}
      />
    </>
  );
}
