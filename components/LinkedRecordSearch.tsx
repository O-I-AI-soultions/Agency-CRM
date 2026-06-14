"use client";

import { useState } from "react";
import { ClipboardList, Users, X } from "lucide-react";
import type { LinkableRecord } from "@/lib/types";

interface LinkedRecordSearchProps {
  records: LinkableRecord[];
  value: LinkableRecord | null;
  onChange: (value: LinkableRecord | null) => void;
  disabled?: boolean;
}

export default function LinkedRecordSearch({
  records,
  value,
  onChange,
  disabled,
}: LinkedRecordSearchProps) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);

  if (value) {
    const ValueIcon = value.type === "lead" ? ClipboardList : Users;
    return (
      <div className="flex items-center justify-between gap-2 rounded-lg border border-border bg-background px-3 py-2 text-sm">
        <span className="inline-flex items-center gap-1 font-medium text-foreground">
          <ValueIcon size={14} /> {value.name}
        </span>
        {!disabled && (
          <button
            type="button"
            onClick={() => onChange(null)}
            aria-label="הסר קישור"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-muted transition-colors hover:bg-warn-soft hover:text-warn focus:outline-none focus:ring-2 focus:ring-warn/40"
          >
            <X size={14} />
          </button>
        )}
      </div>
    );
  }

  const filtered = query.trim()
    ? records
        .filter((r) => r.name.toLowerCase().includes(query.trim().toLowerCase()))
        .slice(0, 8)
    : records.slice(0, 8);

  return (
    <div className="relative">
      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 100)}
        disabled={disabled}
        placeholder="חיפוש ליד או לקוח..."
        aria-label="חיפוש ליד או לקוח לקישור"
        role="combobox"
        aria-expanded={open && filtered.length > 0}
        aria-controls="linked-record-options"
        aria-autocomplete="list"
        className="w-full rounded-lg border border-border bg-background px-3 py-2 text-base text-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-accent/40 disabled:opacity-50"
      />
      {open && filtered.length > 0 && (
        <ul
          id="linked-record-options"
          role="listbox"
          className="absolute z-10 mt-1 max-h-48 w-full overflow-y-auto rounded-lg border border-border bg-surface shadow-md"
        >
          {filtered.map((r) => {
            const RecordIcon = r.type === "lead" ? ClipboardList : Users;
            return (
              <li key={`${r.type}-${r.id}`} role="option" aria-selected="false">
                <button
                  type="button"
                  onClick={() => {
                    onChange(r);
                    setQuery("");
                    setOpen(false);
                  }}
                  className="flex w-full items-center gap-2 px-3 py-2 text-right text-sm text-foreground transition-colors hover:bg-background focus:outline-none focus:ring-2 focus:ring-accent/40"
                >
                  <RecordIcon size={14} /> {r.name}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
