"use client";

import { useState } from "react";
import { KANBAN_STATUSES, type KanbanStatus, type LeadRecord } from "@/lib/types";
import type { Partner } from "@/lib/auth";
import { applyFilters, DEFAULT_FILTERS, type Filters } from "@/lib/filters";
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

  function handleUpdate(updated: LeadRecord) {
    setLeads((prev) => prev.map((lead) => (lead.id === updated.id ? updated : lead)));
    setSelectedLead((prev) => (prev && prev.id === updated.id ? updated : prev));
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
    { title: COLUMN_LABELS["New Lead"], leads: groups["New Lead"], accent: "new" as const },
    { title: COLUMN_LABELS.Contacted, leads: groups.Contacted, accent: "review" as const },
    { title: COLUMN_LABELS["Pitch Sent"], leads: groups["Pitch Sent"], accent: "proposal" as const },
    { title: COLUMN_LABELS["Not Interested"], leads: groups["Not Interested"], accent: "lost" as const },
    { title: "אחר", leads: groups.Other, accent: "negotiation" as const },
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
      <div className="kanban-scroll -mx-4 mt-4 flex gap-4 overflow-x-auto px-4 pb-2 sm:-mx-6 sm:px-6 lg:-mx-8 lg:grid lg:grid-cols-5 lg:gap-4 lg:overflow-visible lg:px-8">
        {columns.map((column) => (
          <KanbanColumn
            key={column.title}
            title={column.title}
            leads={column.leads}
            accent={column.accent}
            onSelect={setSelectedLead}
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
