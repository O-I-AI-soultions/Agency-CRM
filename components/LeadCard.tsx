import { Phone, Globe, MapPin, Star } from "lucide-react";
import type { LeadRecord } from "@/lib/types";
import StatusActionButtons from "@/components/StatusActionButtons";
import PriorityBadge from "@/components/PriorityBadge";

function getHostname(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

interface LeadCardProps {
  lead: LeadRecord;
  onSelect: (lead: LeadRecord) => void;
  accentColor: string;
  index: number;
}

export default function LeadCard({ lead, onSelect, accentColor, index }: LeadCardProps) {
  return (
    <div
      onClick={() => onSelect(lead)}
      className="card-shadow card-shadow-hover animate-fade-up cursor-pointer space-y-2 rounded-b-xl rounded-t-sm border border-t-2 border-border bg-surface p-3"
      style={{ borderTopColor: accentColor, animationDelay: `${index * 0.06}s` }}
    >
      <div className="flex items-start justify-between gap-2">
        <h3 className="text-sm font-bold leading-snug text-foreground">{lead.businessName}</h3>
        <PriorityBadge lead={lead} />
      </div>

      {(lead.city || lead.googleRating != null) && (
        <div className="flex items-center gap-2 text-xs text-muted">
          {lead.city && <span>{lead.city}</span>}
          {lead.city && lead.googleRating != null && <span aria-hidden>·</span>}
          {lead.googleRating != null && (
            <span className="flex items-center gap-1 font-semibold text-amber">
              <Star size={14} className="fill-current" /> {lead.googleRating}
            </span>
          )}
        </div>
      )}

      {lead.notes && <p className="line-clamp-2 text-xs text-muted">{lead.notes}</p>}

      {(lead.phoneNumber || lead.websiteUrl || lead.googleMapsLink) && (
        <div
          onClick={(e) => e.stopPropagation()}
          className="flex flex-wrap items-center gap-1.5 pt-1"
        >
          {lead.phoneNumber && (
            <a
              href={`tel:${lead.phoneNumber}`}
              className="flex items-center gap-1 rounded-full bg-background px-2 py-1 text-xs font-medium text-foreground transition-colors hover:bg-accent-soft hover:text-accent-strong"
              title="טלפון"
            >
              <Phone size={16} />
              <span dir="ltr">{lead.phoneNumber}</span>
            </a>
          )}

          {lead.websiteUrl && (
            <a
              href={lead.websiteUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 rounded-full bg-background px-2 py-1 text-xs font-medium text-foreground transition-colors hover:bg-accent-soft hover:text-accent-strong"
              title="אתר"
            >
              <Globe size={16} />
              <span dir="ltr">{getHostname(lead.websiteUrl)}</span>
            </a>
          )}

          {lead.googleMapsLink && (
            <a
              href={lead.googleMapsLink}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 rounded-full bg-background px-2 py-1 text-xs font-medium text-foreground transition-colors hover:bg-accent-soft hover:text-accent-strong"
              title="מפה"
            >
              <MapPin size={16} />
              מפה
            </a>
          )}
        </div>
      )}

      <div onClick={(e) => e.stopPropagation()} className="border-t border-border pt-2">
        <StatusActionButtons leadId={lead.id} currentStatus={lead.status} />
      </div>
    </div>
  );
}
