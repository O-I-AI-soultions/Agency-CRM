"use client";

import { useState } from "react";
import { Flame, PartyPopper } from "lucide-react";
import type { KanbanStatus, LeadRecord } from "@/lib/types";
import type { Partner } from "@/lib/auth";
import { computePriority } from "@/lib/priority";
import LeadCard from "@/components/LeadCard";
import LeadDrawer from "@/components/LeadDrawer";

interface UrgentLeadsCardProps {
  leads: LeadRecord[];
  partner: Partner;
}

const TOP_N = 5;

function getTopUrgentLeads(leads: LeadRecord[]): LeadRecord[] {
  return leads
    .filter((lead) => lead.status !== "Converted")
    .map((lead) => ({ lead, ...computePriority(lead) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, TOP_N)
    .map((entry) => entry.lead);
}

export default function UrgentLeadsCard({ leads: initialLeads, partner }: UrgentLeadsCardProps) {
  const [leads, setLeads] = useState(initialLeads);
  const [selectedLead, setSelectedLead] = useState<LeadRecord | null>(null);

  // Re-sync local state when the server-provided `initialLeads` prop
  // changes (e.g. after router.refresh()). Adjusting state during render
  // avoids an extra render pass compared to a useEffect.
  const [prevInitialLeads, setPrevInitialLeads] = useState(initialLeads);
  if (initialLeads !== prevInitialLeads) {
    setPrevInitialLeads(initialLeads);
    setLeads(initialLeads);
  }

  function handleUpdate(updated: LeadRecord) {
    setLeads((prev) => prev.map((lead) => (lead.id === updated.id ? updated : lead)));
    setSelectedLead((prev) => (prev && prev.id === updated.id ? updated : prev));
  }

  function handleStatusChange(leadId: string, newStatus: KanbanStatus) {
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

  const topLeads = getTopUrgentLeads(leads);

  return (
    <>
      <div className="card-shadow animate-fade-up rounded-2xl bg-surface p-5">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-lg font-bold text-foreground">הלידים הדחופים ביותר</h2>
          <Flame size={18} className="text-warn" />
        </div>
        <p className="mt-1 text-sm text-muted">5 הלידים שדורשים את הטיפול הדחוף ביותר כרגע</p>

        <div className="mt-4 space-y-2.5">
          {topLeads.length === 0 ? (
            <div className="flex items-center justify-center gap-1.5 rounded-xl border border-dashed border-border px-3 py-8 text-center text-sm text-muted">
              <PartyPopper size={16} /> כל הכבוד! אין לידים דחופים כרגע
            </div>
          ) : (
            topLeads.map((lead, index) => (
              <LeadCard
                key={lead.id}
                lead={lead}
                onSelect={setSelectedLead}
                onStatusChange={handleStatusChange}
                accentColor="var(--col-new)"
                index={index}
              />
            ))
          )}
        </div>
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
