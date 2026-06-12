"use client";

import { useState } from "react";
import { KANBAN_STATUSES, type KanbanStatus, type LeadRecord } from "@/lib/types";
import KanbanColumn from "@/components/KanbanColumn";
import LeadDrawer from "@/components/LeadDrawer";

const COLUMN_LABELS: Record<KanbanStatus, string> = {
  "New Lead": "לידים חדשים",
  Contacted: "נוצר קשר",
  "Pitch Sent": "הצעה נשלחה",
  "Not Interested": "לא מעוניין",
};

interface KanbanBoardProps {
  leads: LeadRecord[];
}

export default function KanbanBoard({ leads: initialLeads }: KanbanBoardProps) {
  const [leads, setLeads] = useState(initialLeads);
  const [selectedLead, setSelectedLead] = useState<LeadRecord | null>(null);

  function handleUpdate(updated: LeadRecord) {
    setLeads((prev) => prev.map((lead) => (lead.id === updated.id ? updated : lead)));
    setSelectedLead((prev) => (prev && prev.id === updated.id ? updated : prev));
  }

  const groups: Record<KanbanStatus | "Other", LeadRecord[]> = {
    "New Lead": [],
    Contacted: [],
    "Pitch Sent": [],
    "Not Interested": [],
    Other: [],
  };

  for (const lead of leads) {
    if (lead.status === null) {
      groups["New Lead"].push(lead);
    } else if ((KANBAN_STATUSES as readonly string[]).includes(lead.status)) {
      groups[lead.status as KanbanStatus].push(lead);
    } else {
      groups.Other.push(lead);
    }
  }

  const columns = [
    { title: COLUMN_LABELS["New Lead"], leads: groups["New Lead"], accent: "sky" as const },
    { title: COLUMN_LABELS.Contacted, leads: groups.Contacted, accent: "amber" as const },
    { title: COLUMN_LABELS["Pitch Sent"], leads: groups["Pitch Sent"], accent: "accent" as const },
    { title: COLUMN_LABELS["Not Interested"], leads: groups["Not Interested"], accent: "warn" as const },
    { title: "אחר", leads: groups.Other, accent: "muted" as const },
  ];

  return (
    <>
      <div className="kanban-scroll -mx-4 flex gap-4 overflow-x-auto px-4 pb-2 sm:-mx-6 sm:px-6 lg:-mx-8 lg:grid lg:grid-cols-5 lg:gap-4 lg:overflow-visible lg:px-8">
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
        onClose={() => setSelectedLead(null)}
        onUpdate={handleUpdate}
      />
    </>
  );
}
