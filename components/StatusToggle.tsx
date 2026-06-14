"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { ClientStatus } from "@/lib/types";

export default function StatusToggle({
  clientId,
  currentStatus,
}: {
  clientId: string;
  currentStatus: ClientStatus | null;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  const isActive = currentStatus !== "Inactive";
  const nextStatus: ClientStatus = isActive ? "Inactive" : "Active";

  async function handleClick() {
    setLoading(true);
    setError(false);

    try {
      const res = await fetch(`/api/clients/${clientId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus }),
      });

      if (!res.ok) {
        throw new Error("Failed to update status");
      }

      router.refresh();
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col items-start gap-1">
      <button
        type="button"
        onClick={handleClick}
        disabled={loading}
        className={`rounded-full px-3 py-2 text-sm font-bold transition-opacity cursor-pointer hover:opacity-80 focus:outline-none focus:ring-2 focus:ring-accent/40 disabled:cursor-not-allowed disabled:opacity-50 ${
          isActive
            ? "bg-accent-soft text-accent-strong"
            : "bg-border text-muted"
        }`}
      >
        {isActive ? "פעיל" : "לא פעיל"}
      </button>
      {error && (
        <span role="alert" className="text-xs text-warn">
          שגיאה בעדכון
        </span>
      )}
    </div>
  );
}
