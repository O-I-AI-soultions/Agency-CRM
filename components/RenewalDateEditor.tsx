"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { isRenewalDueSoon, type ClientRecord } from "@/lib/types";

function formatRenewalDate(value: string | null): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";

  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
}

// Date input expects YYYY-MM-DD; Airtable date fields already come back in
// that shape, but guard against datetime strings just in case.
function toDateInputValue(value: string | null): string {
  if (!value) return "";
  return value.slice(0, 10);
}

export default function RenewalDateEditor({ client }: { client: ClientRecord }) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(toDateInputValue(client.renewalDate));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(false);

  const dueSoon = isRenewalDueSoon(client);

  async function handleSave() {
    setSaving(true);
    setError(false);

    try {
      const res = await fetch(`/api/clients/${client.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ renewalDate: value || null }),
      });

      if (!res.ok) {
        throw new Error("Failed to update renewal date");
      }

      setEditing(false);
      router.refresh();
    } catch {
      setError(true);
    } finally {
      setSaving(false);
    }
  }

  if (editing) {
    return (
      <div className="flex flex-col items-start gap-1">
        <div className="flex items-center gap-2">
          <input
            type="date"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            className="rounded-md border border-border bg-background px-2 py-1 text-sm text-foreground focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
          />
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="btn-primary px-2 py-1 text-xs disabled:opacity-50"
          >
            {saving ? "שומר..." : "שמור"}
          </button>
          <button
            type="button"
            onClick={() => {
              setEditing(false);
              setValue(toDateInputValue(client.renewalDate));
              setError(false);
            }}
            className="btn-outline px-2 py-1 text-xs"
          >
            ביטול
          </button>
        </div>
        {error && (
          <span role="alert" className="text-xs text-warn">
            שגיאה בעדכון
          </span>
        )}
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => setEditing(true)}
      className="flex items-center gap-2 text-start focus:outline-none"
      title="לחץ לעריכת תאריך חידוש"
    >
      <span className="font-mono tabular-nums text-foreground/80">
        {formatRenewalDate(client.renewalDate)}
      </span>
      {dueSoon && (
        <span className="tag tag-amber shrink-0" title="חידוש מתקרב או באיחור — תוך 30 יום">
          חידוש בקרוב
        </span>
      )}
    </button>
  );
}
