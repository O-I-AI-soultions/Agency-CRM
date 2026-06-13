"use client";

import { useState } from "react";
import { Flame, Circle, ArrowDown, Star, Phone, MessageCircle, Check } from "lucide-react";
import type { LeadRecord, Priority } from "@/lib/types";
import type { Partner } from "@/lib/auth";
import { toWhatsAppNumber, buildWhatsAppMessage } from "@/lib/whatsapp";

const PRIORITY_LABELS: Record<Priority, string> = {
  High: "גבוהה",
  Medium: "בינונית",
  Low: "נמוכה",
};

const PRIORITY_CLASSES: Record<Priority, string> = {
  High: "bg-warn-soft text-warn",
  Medium: "bg-amber-soft text-amber",
  Low: "bg-accent-soft text-accent-strong",
};

const PRIORITY_ICONS: Record<Priority, typeof Flame> = {
  High: Flame,
  Medium: Circle,
  Low: ArrowDown,
};

interface CallListItem {
  lead: LeadRecord;
  score: number;
  level: Priority;
}

export default function CallListTable({
  items,
  partner,
}: {
  items: CallListItem[];
  partner: Partner;
}) {
  const [hiddenIds, setHiddenIds] = useState<Set<string>>(new Set());
  const [loadingIds, setLoadingIds] = useState<Set<string>>(new Set());

  const markContacted = async (leadId: string) => {
    setLoadingIds((prev) => new Set(prev).add(leadId));

    try {
      const response = await fetch(`/api/leads/${leadId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "Contacted" }),
      });

      if (response.ok) {
        setHiddenIds((prev) => new Set(prev).add(leadId));
      }
    } finally {
      setLoadingIds((prev) => {
        const next = new Set(prev);
        next.delete(leadId);
        return next;
      });
    }
  };

  const visibleItems = items.filter(({ lead }) => !hiddenIds.has(lead.id));

  function PriorityIcon({ level }: { level: Priority }) {
    const Icon = PRIORITY_ICONS[level];
    return <Icon size={12} />;
  }

  return (
    <div className="overflow-x-auto rounded-2xl border border-border bg-surface shadow-sm">
      <table className="w-full text-start">
        <thead>
          <tr className="border-b border-border bg-background/60">
            <th className="px-4 py-3 text-start text-xs font-bold uppercase tracking-wide text-muted">
              #
            </th>
            <th className="px-4 py-3 text-start text-xs font-bold uppercase tracking-wide text-muted">
              עסק
            </th>
            <th className="px-4 py-3 text-start text-xs font-bold uppercase tracking-wide text-muted">
              עיר
            </th>
            <th className="px-4 py-3 text-start text-xs font-bold uppercase tracking-wide text-muted">
              דירוג
            </th>
            <th className="px-4 py-3 text-start text-xs font-bold uppercase tracking-wide text-muted">
              עדיפות
            </th>
            <th className="px-4 py-3 text-start text-xs font-bold uppercase tracking-wide text-muted">
              פעולות
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {visibleItems.map(({ lead, level }, index) => (
            <tr key={lead.id} className="transition-colors hover:bg-background/60">
              <td className="px-4 py-3 text-sm tabular-nums text-muted">{index + 1}</td>
              <td className="px-4 py-3 text-sm font-bold text-foreground">{lead.businessName}</td>
              <td className="px-4 py-3 text-sm text-foreground/80">{lead.city ?? "—"}</td>
              <td className="px-4 py-3 text-sm tabular-nums text-amber">
                {lead.googleRating != null ? (
                  <span className="inline-flex items-center gap-1">
                    <Star size={12} className="fill-current" /> {lead.googleRating}
                  </span>
                ) : (
                  "—"
                )}
              </td>
              <td className="px-4 py-3 text-sm">
                <span
                  className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-bold ${PRIORITY_CLASSES[level]}`}
                >
                  <PriorityIcon level={level} /> {PRIORITY_LABELS[level]}
                </span>
              </td>
              <td className="px-4 py-3 text-sm">
                <div className="flex flex-wrap items-center gap-2">
                  {lead.phoneNumber && (
                    <a
                      href={`tel:${lead.phoneNumber}`}
                      className="inline-flex items-center gap-1 rounded-full border border-accent/30 px-3 py-2 text-xs font-bold text-accent transition-colors hover:bg-accent-soft"
                    >
                      <Phone size={12} /> חייג
                    </a>
                  )}
                  {lead.phoneNumber && (
                    <a
                      href={`https://wa.me/${toWhatsAppNumber(lead.phoneNumber)}?text=${buildWhatsAppMessage(partner)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 rounded-full border border-accent/30 px-3 py-2 text-xs font-bold text-accent transition-colors hover:bg-accent-soft"
                    >
                      <MessageCircle size={12} /> וואטסאפ
                    </a>
                  )}
                  <button
                    type="button"
                    disabled={loadingIds.has(lead.id)}
                    onClick={() => markContacted(lead.id)}
                    className="inline-flex items-center gap-1 rounded-full bg-accent px-3 py-2 text-xs font-bold text-white transition-colors hover:bg-accent-strong disabled:opacity-50"
                  >
                    <Check size={12} /> סומן כ&apos;צור קשר&apos;
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
