"use client";

import { useMemo } from "react";
import { X } from "lucide-react";
import { KANBAN_STATUSES, type KanbanStatus, type LeadRecord } from "@/lib/types";
import {
  DEFAULT_FILTERS,
  getUniqueCities,
  getUniqueNiches,
  hasActiveFilters,
  type Filters,
} from "@/lib/filters";

const STATUS_LABELS: Record<KanbanStatus, string> = {
  "New Lead": "לידים חדשים",
  Contacted: "נוצר קשר",
  "Pitch Sent": "הצעה נשלחה",
  "Not Interested": "לא מעוניין",
};

const RATING_OPTIONS = [
  { label: "3.5 ומעלה", value: 3.5 },
  { label: "4.0 ומעלה", value: 4.0 },
  { label: "4.5 ומעלה", value: 4.5 },
];

const selectClasses =
  "rounded-full border border-border bg-surface px-3 py-2 text-base font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-accent/40";

interface FilterBarProps {
  leads: LeadRecord[];
  filters: Filters;
  onChange: (filters: Filters) => void;
  visibleCount: number;
  totalCount: number;
}

export default function FilterBar({
  leads,
  filters,
  onChange,
  visibleCount,
  totalCount,
}: FilterBarProps) {
  const cities = useMemo(() => getUniqueCities(leads), [leads]);
  const niches = useMemo(() => getUniqueNiches(leads), [leads]);
  const isActive = hasActiveFilters(filters);

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2 rounded-2xl bg-sky-soft p-3">
        <input
          type="text"
          value={filters.search}
          onChange={(e) => onChange({ ...filters, search: e.target.value })}
          placeholder="חיפוש שם עסק..."
          aria-label="חיפוש לפי שם עסק"
          suppressHydrationWarning
          className="min-w-[180px] flex-1 rounded-full border border-border bg-surface px-4 py-2 text-base text-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-accent/40"
        />
        <input
          type="text"
          list="city-options"
          value={filters.city}
          onChange={(e) => onChange({ ...filters, city: e.target.value })}
          placeholder="עיר"
          aria-label="סינון לפי עיר"
          suppressHydrationWarning
          className="min-w-[120px] rounded-full border border-border bg-surface px-4 py-2 text-base text-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-accent/40"
        />
        <datalist id="city-options">
          {cities.map((city) => (
            <option key={city} value={city} />
          ))}
        </datalist>
        <input
          type="text"
          list="niche-options"
          value={filters.niche}
          onChange={(e) => onChange({ ...filters, niche: e.target.value })}
          placeholder="ניישה"
          aria-label="סינון לפי ניישה"
          suppressHydrationWarning
          className="min-w-[120px] rounded-full border border-border bg-surface px-4 py-2 text-base text-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-accent/40"
        />
        <datalist id="niche-options">
          {niches.map((niche) => (
            <option key={niche} value={niche} />
          ))}
        </datalist>
        <select
          value={filters.status}
          onChange={(e) => onChange({ ...filters, status: e.target.value })}
          aria-label="סינון לפי סטטוס"
          suppressHydrationWarning
          className={selectClasses}
        >
          <option value="">כל הסטטוסים</option>
          {KANBAN_STATUSES.map((status) => (
            <option key={status} value={status}>
              {STATUS_LABELS[status]}
            </option>
          ))}
        </select>
        <select
          value={filters.minRating ?? ""}
          onChange={(e) =>
            onChange({
              ...filters,
              minRating: e.target.value ? Number(e.target.value) : null,
            })
          }
          aria-label="סינון לפי דירוג מינימלי"
          suppressHydrationWarning
          className={selectClasses}
        >
          <option value="">כל הדירוגים</option>
          {RATING_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        {isActive && (
          <button
            type="button"
            onClick={() => onChange(DEFAULT_FILTERS)}
            suppressHydrationWarning
            className="inline-flex items-center gap-1 rounded-full border border-warn/30 px-3 py-2 text-sm font-bold text-warn transition-colors hover:bg-warn-soft focus:outline-none focus:ring-2 focus:ring-warn/40"
          >
            <X size={14} /> נקה
          </button>
        )}
      </div>
      <p className="text-sm text-muted">
        מציג {visibleCount} מתוך {totalCount} לידים
      </p>
    </div>
  );
}
