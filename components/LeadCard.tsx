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

function PhoneIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" className="h-4 w-4" aria-hidden>
      <path
        d="M5.5 3h2.2l1 3.2-1.6 1.4a8 8 0 0 0 4.3 4.3l1.4-1.6 3.2 1v2.2c0 .8-.7 1.5-1.5 1.4-6-.5-10.8-5.3-11.3-11.3C3 3.7 3.7 3 4.5 3h1Z"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function GlobeIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" className="h-4 w-4" aria-hidden>
      <circle cx="10" cy="10" r="7" stroke="currentColor" strokeWidth="1.4" />
      <path
        d="M3 10h14M10 3c1.8 1.9 2.8 4.4 2.8 7s-1 5.1-2.8 7c-1.8-1.9-2.8-4.4-2.8-7s1-5.1 2.8-7Z"
        stroke="currentColor"
        strokeWidth="1.4"
      />
    </svg>
  );
}

function PinIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" className="h-4 w-4" aria-hidden>
      <path
        d="M10 17.5s5.5-4.4 5.5-8.5a5.5 5.5 0 1 0-11 0c0 4.1 5.5 8.5 5.5 8.5Z"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
      <circle cx="10" cy="9" r="1.8" stroke="currentColor" strokeWidth="1.4" />
    </svg>
  );
}

function StarIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" className="h-3.5 w-3.5" aria-hidden>
      <path d="M10 1.8 12.4 7l5.6.6-4.2 3.8 1.2 5.6L10 14.1l-5 2.9 1.2-5.6L2 7.6 7.6 7 10 1.8Z" />
    </svg>
  );
}

interface LeadCardProps {
  lead: LeadRecord;
  onSelect: (lead: LeadRecord) => void;
}

export default function LeadCard({ lead, onSelect }: LeadCardProps) {
  return (
    <div
      onClick={() => onSelect(lead)}
      className="cursor-pointer space-y-2 rounded-xl border border-border bg-surface p-3 shadow-sm transition-shadow hover:shadow-md"
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
              <StarIcon /> {lead.googleRating}
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
              <PhoneIcon />
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
              <GlobeIcon />
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
              <PinIcon />
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
