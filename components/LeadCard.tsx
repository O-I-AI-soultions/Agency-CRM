import { useRef, useState } from "react";
import { Phone, Globe, MapPin, Star } from "lucide-react";
import type { KanbanStatus, LeadRecord } from "@/lib/types";
import StatusActionButtons from "@/components/StatusActionButtons";
import PriorityBadge from "@/components/PriorityBadge";

function getHostname(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

// Minimum pointer movement (px) before a press-and-move is treated as a
// drag rather than a tap/click.
const DRAG_THRESHOLD = 7;

interface LeadCardProps {
  lead: LeadRecord;
  onSelect: (lead: LeadRecord) => void;
  accentColor: string;
  index: number;
  /** Whether this card is the one currently being dragged. */
  isDragging?: boolean;
  /** The status of the column currently being hovered while dragging (any card). */
  dropTargetStatus?: KanbanStatus | null;
  /** Called continuously while dragging with the dragged lead id and the
   * status of the column currently under the pointer (or null). Called
   * with `(null, null)` when dragging ends. */
  onDragStateChange?: (leadId: string | null, hoverStatus: KanbanStatus | null) => void;
  /** Called on a successful drop with the lead id and target status. */
  onDrop?: (leadId: string, newStatus: KanbanStatus) => void;
  /** Optimistic status-change callback bubbled up from StatusActionButtons. */
  onStatusChange?: (leadId: string, newStatus: KanbanStatus) => void;
}

export default function LeadCard({
  lead,
  onSelect,
  accentColor,
  index,
  isDragging = false,
  onDragStateChange,
  onDrop,
  onStatusChange,
}: LeadCardProps) {
  const cardRef = useRef<HTMLDivElement | null>(null);
  const pointerState = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    dragging: boolean;
  } | null>(null);
  // Set by endDrag when a drag occurred, and consulted (then cleared) by the
  // click handler that fires right after pointerup — pointerState itself is
  // already cleared by then, so this flag is what actually suppresses the
  // click-to-open behavior after a drag.
  const justDraggedRef = useRef(false);

  const [dragOffset, setDragOffset] = useState<{ x: number; y: number } | null>(null);

  const isDraggable = Boolean(onDragStateChange && onDrop);

  function handlePointerDown(e: React.PointerEvent<HTMLDivElement>) {
    if (!isDraggable) return;
    // Only left-button / primary pointer (mouse) or touch/pen.
    if (e.button !== undefined && e.button !== 0 && e.pointerType === "mouse") return;

    pointerState.current = {
      pointerId: e.pointerId,
      startX: e.clientX,
      startY: e.clientY,
      dragging: false,
    };
  }

  function findColumnStatusAt(x: number, y: number): KanbanStatus | "other" | null {
    const el = document.elementFromPoint(x, y);
    const dropzone = el?.closest<HTMLElement>("[data-column-status]");
    const value = dropzone?.dataset.columnStatus;
    if (!value) return null;
    if (value === "other") return "other";
    return value as KanbanStatus;
  }

  function handlePointerMove(e: React.PointerEvent<HTMLDivElement>) {
    const state = pointerState.current;
    if (!state || state.pointerId !== e.pointerId) return;

    const dx = e.clientX - state.startX;
    const dy = e.clientY - state.startY;

    if (!state.dragging) {
      if (Math.hypot(dx, dy) < DRAG_THRESHOLD) return;
      state.dragging = true;
      cardRef.current?.setPointerCapture(e.pointerId);
    }

    e.preventDefault();
    setDragOffset({ x: dx, y: dy });

    const target = findColumnStatusAt(e.clientX, e.clientY);
    const hoverStatus = target === "other" || target === null ? null : target;
    onDragStateChange?.(lead.id, hoverStatus);
  }

  function endDrag(e: React.PointerEvent<HTMLDivElement>, commit: boolean) {
    const state = pointerState.current;
    pointerState.current = null;

    if (!state) return;

    if (cardRef.current?.hasPointerCapture(e.pointerId)) {
      cardRef.current.releasePointerCapture(e.pointerId);
    }

    if (!state.dragging) {
      setDragOffset(null);
      return;
    }

    justDraggedRef.current = true;

    const target = findColumnStatusAt(e.clientX, e.clientY);
    setDragOffset(null);
    onDragStateChange?.(null, null);

    if (!commit) return;

    if (target && target !== "other") {
      onDrop?.(lead.id, target);
    }
  }

  function handlePointerUp(e: React.PointerEvent<HTMLDivElement>) {
    endDrag(e, true);
  }

  function handlePointerCancel(e: React.PointerEvent<HTMLDivElement>) {
    endDrag(e, false);
  }

  function handleClick() {
    // If a drag just happened, pointerup already handled it — a click event
    // still fires after pointerup, so only open the drawer when no drag was
    // in progress.
    if (justDraggedRef.current) {
      justDraggedRef.current = false;
      return;
    }
    onSelect(lead);
  }

  const dragging = isDragging && dragOffset !== null;

  const style: React.CSSProperties = {
    borderTopColor: accentColor,
    animationDelay: `${index * 0.06}s`,
  };

  if (dragging && dragOffset) {
    style.transform = `translate(${dragOffset.x}px, ${dragOffset.y}px) scale(1.03)`;
    style.position = "relative";
    style.zIndex = 50;
    style.boxShadow = "0 12px 32px rgba(0,0,0,0.18)";
    style.opacity = 0.92;
  }

  return (
    <div
      ref={cardRef}
      role="button"
      tabIndex={0}
      aria-label={`פתח פרטי ליד: ${lead.businessName}`}
      aria-roledescription="draggable"
      aria-grabbed={dragging}
      onClick={handleClick}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onSelect(lead);
        }
      }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerCancel}
      className={`card-shadow card-shadow-hover animate-fade-up cursor-pointer space-y-2 rounded-b-xl rounded-t-sm border border-t-2 border-border bg-surface p-3 focus:outline-none focus:ring-2 focus:ring-accent/40 ${
        dragging ? "shadow-2xl" : ""
      }`}
      style={{ ...style, touchAction: dragging ? "none" : "pan-x" }}
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
            <span className="flex items-center gap-1 font-semibold text-amber-strong">
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
              className="flex items-center gap-1 rounded-full bg-background px-2 py-2 text-xs font-medium text-foreground transition-colors hover:bg-accent-soft hover:text-accent-strong"
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
              className="flex items-center gap-1 rounded-full bg-background px-2 py-2 text-xs font-medium text-foreground transition-colors hover:bg-accent-soft hover:text-accent-strong"
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
              className="flex items-center gap-1 rounded-full bg-background px-2 py-2 text-xs font-medium text-foreground transition-colors hover:bg-accent-soft hover:text-accent-strong"
              title="מפה"
            >
              <MapPin size={16} />
              מפה
            </a>
          )}
        </div>
      )}

      <div onClick={(e) => e.stopPropagation()} className="border-t border-border pt-2">
        <StatusActionButtons
          leadId={lead.id}
          currentStatus={lead.status}
          onStatusChange={
            onStatusChange ? (status) => onStatusChange(lead.id, status) : undefined
          }
        />
      </div>
    </div>
  );
}
