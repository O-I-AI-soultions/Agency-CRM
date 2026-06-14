"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { KanbanStatus, LeadStatus } from "@/lib/types";
import { deleteLeadClient, updateLeadStatusClient } from "@/lib/leads-client";

interface StatusActionButtonsProps {
  leadId: string;
  currentStatus: LeadStatus | null;
  /**
   * Optional callback invoked immediately (optimistically) when the status
   * update succeeds, so the parent (e.g. KanbanBoard) can update its local
   * state without waiting for `router.refresh()`. This is the primary fix
   * for Bug 1 — cards move to their new column without a full page reload.
   */
  onStatusChange?: (status: KanbanStatus) => void;
  /**
   * Optional callback invoked immediately (optimistically) when a lead is
   * deleted (via the "לא מעוניין" action), so the parent can remove the
   * card from its local state without waiting for `router.refresh()`.
   */
  onDeleted?: (leadId: string) => void;
}

export default function StatusActionButtons({
  leadId,
  currentStatus,
  onStatusChange,
  onDeleted,
}: StatusActionButtonsProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const updateStatus = async (status: KanbanStatus) => {
    setIsLoading(true);
    setError(null);

    try {
      const ok = await updateLeadStatusClient(leadId, status);

      if (!ok) {
        throw new Error("Request failed");
      }

      onStatusChange?.(status);
      router.refresh();
    } catch {
      setError("שגיאה בעדכון");
    } finally {
      setIsLoading(false);
    }
  };

  // "Not interested" leads are removed from the CRM entirely rather than
  // kept around with a hidden status.
  const handleNotInterested = async () => {
    if (!window.confirm("האם למחוק את הליד? הפעולה אינה הפיכה.")) return;

    setIsLoading(true);
    setError(null);

    try {
      const ok = await deleteLeadClient(leadId);

      if (!ok) {
        throw new Error("Request failed");
      }

      onDeleted?.(leadId);
      router.refresh();
    } catch {
      setError("שגיאה במחיקה");
    } finally {
      setIsLoading(false);
    }
  };

  const primaryClasses =
    "rounded-full px-3 py-2 text-xs font-bold bg-accent text-white hover:bg-accent-strong focus:outline-none focus:ring-2 focus:ring-accent/40 disabled:opacity-50 transition-colors";
  const outlineGrayClasses =
    "rounded-full px-3 py-2 text-xs font-bold border border-warn/30 text-warn hover:bg-warn-soft focus:outline-none focus:ring-2 focus:ring-warn/40 disabled:opacity-50 transition-colors";
  const outlineBlueClasses =
    "rounded-full px-3 py-2 text-xs font-bold border border-accent/30 text-accent hover:bg-accent-soft focus:outline-none focus:ring-2 focus:ring-accent/40 disabled:opacity-50 transition-colors";

  let buttons: React.ReactNode;

  if (
    currentStatus === "New Lead" ||
    currentStatus === "New" ||
    currentStatus === "Qualified" ||
    currentStatus === null
  ) {
    buttons = (
      <>
        <button
          type="button"
          className={primaryClasses}
          disabled={isLoading}
          onClick={() => updateStatus("Contacted")}
          suppressHydrationWarning
        >
          סומן כ&apos;נוצר קשר&apos;
        </button>
        <button
          type="button"
          className={outlineGrayClasses}
          disabled={isLoading}
          onClick={handleNotInterested}
          suppressHydrationWarning
        >
          לא מעוניין
        </button>
      </>
    );
  } else if (currentStatus === "Contacted") {
    buttons = (
      <>
        <button
          type="button"
          className={primaryClasses}
          disabled={isLoading}
          onClick={() => updateStatus("Pitch Sent")}
          suppressHydrationWarning
        >
          נשלחה הצעה
        </button>
        <button
          type="button"
          className={outlineGrayClasses}
          disabled={isLoading}
          onClick={handleNotInterested}
          suppressHydrationWarning
        >
          לא מעוניין
        </button>
      </>
    );
  } else if (currentStatus === "Pitch Sent") {
    buttons = (
      <button
        type="button"
        className={outlineGrayClasses}
        disabled={isLoading}
        onClick={handleNotInterested}
        suppressHydrationWarning
      >
        לא מעוניין
      </button>
    );
  } else if (currentStatus === "Not Interested") {
    buttons = (
      <button
        type="button"
        className={outlineBlueClasses}
        disabled={isLoading}
        onClick={() => updateStatus("New Lead")}
        suppressHydrationWarning
      >
        החזר לטיפול
      </button>
    );
  } else {
    buttons = null;
  }

  return (
    <div className="flex flex-wrap items-center gap-2 pt-1">
      {buttons}
      {error && (
        <span role="alert" className="text-xs text-warn">
          {error}
        </span>
      )}
    </div>
  );
}
