"use client";

import { useState } from "react";
import { Star, Phone, MessageCircle, Check } from "lucide-react";
import type { LeadRecord, Priority } from "@/lib/types";
import type { Partner } from "@/lib/auth";
import { toWhatsAppNumber, buildWhatsAppMessage } from "@/lib/whatsapp";
import { PRIORITY_LABELS, PRIORITY_CLASSES, PRIORITY_ICONS } from "@/lib/priority-labels";

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
    <div className="panel overflow-x-auto">
      <table className="w-full text-start">
        <thead>
          <tr className="border-b border-border">
            <th scope="col" className="px-4 py-3 text-start text-xs font-bold uppercase tracking-wide text-muted">
              #
            </th>
            <th scope="col" className="px-4 py-3 text-start text-xs font-bold uppercase tracking-wide text-muted">
              עסק
            </th>
            <th scope="col" className="px-4 py-3 text-start text-xs font-bold uppercase tracking-wide text-muted">
              עיר
            </th>
            <th scope="col" className="px-4 py-3 text-start text-xs font-bold uppercase tracking-wide text-muted">
              דירוג
            </th>
            <th scope="col" className="px-4 py-3 text-start text-xs font-bold uppercase tracking-wide text-muted">
              עדיפות
            </th>
            <th scope="col" className="px-4 py-3 text-start text-xs font-bold uppercase tracking-wide text-muted">
              פעולות
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {visibleItems.map(({ lead, level }, index) => (
            <tr key={lead.id} className="transition-colors hover:bg-surface-2">
              <td className="px-4 py-3 text-sm font-mono tabular-nums text-muted">{index + 1}</td>
              <td className="px-4 py-3 text-sm font-bold text-foreground">{lead.businessName}</td>
              <td className="px-4 py-3 text-sm text-foreground/80">{lead.city ?? "—"}</td>
              <td className="px-4 py-3 text-sm font-mono tabular-nums text-amber-strong">
                {lead.googleRating != null ? (
                  <span className="inline-flex items-center gap-1">
                    <Star size={12} className="fill-current" /> {lead.googleRating}
                  </span>
                ) : (
                  "—"
                )}
              </td>
              <td className="px-4 py-3 text-sm">
                <span className={PRIORITY_CLASSES[level]}>
                  <PriorityIcon level={level} /> {PRIORITY_LABELS[level]}
                </span>
              </td>
              <td className="px-4 py-3 text-sm">
                <div className="flex flex-wrap items-center gap-2">
                  {lead.phoneNumber && (
                    <a
                      href={`tel:${lead.phoneNumber}`}
                      className="btn-outline"
                    >
                      <Phone size={12} /> חייג
                    </a>
                  )}
                  {lead.phoneNumber && (
                    <a
                      href={`https://wa.me/${toWhatsAppNumber(lead.phoneNumber)}?text=${buildWhatsAppMessage(partner)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn-outline"
                    >
                      <MessageCircle size={12} /> וואטסאפ
                    </a>
                  )}
                  <button
                    type="button"
                    disabled={loadingIds.has(lead.id)}
                    onClick={() => markContacted(lead.id)}
                    className="btn-primary"
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
