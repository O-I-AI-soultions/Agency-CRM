import type { KanbanStatus } from "@/lib/types";

/**
 * Shared client-side helper for updating a lead's status via
 * `PATCH /api/leads/[id]`. Used by both `StatusActionButtons` and the
 * Kanban drag-and-drop drop handler so the "Contacted" special-casing
 * (Last Contacted timestamp + Follow-up Count increment, handled
 * server-side in `updateLeadStatus`) is respected uniformly.
 */
export async function updateLeadStatusClient(
  leadId: string,
  status: KanbanStatus
): Promise<boolean> {
  try {
    const res = await fetch(`/api/leads/${leadId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    return res.ok;
  } catch {
    return false;
  }
}
