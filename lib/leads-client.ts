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

/**
 * Permanently deletes a lead via `DELETE /api/leads/[id]`. Used when marking
 * a lead as "not interested" — rather than keeping a hidden "Not Interested"
 * status, the lead is removed from the CRM entirely.
 */
export async function deleteLeadClient(leadId: string): Promise<boolean> {
  try {
    const res = await fetch(`/api/leads/${leadId}`, { method: "DELETE" });
    return res.ok;
  } catch {
    return false;
  }
}

export type SiteCategory = "landing" | "booking" | "payments";

export interface GenerateSiteResult {
  ok: boolean;
  repoUrl?: string;
  error?: string;
  partialRepoUrl?: string;
}

/**
 * Client-side helper for `POST /api/leads/[id]/generate-site`. Mirrors
 * `updateLeadStatusClient`'s try/catch + fallback-error-string shape so
 * `LeadDrawer.tsx`'s "create site" modal can call this instead of `fetch`
 * inline, for testability.
 */
export async function generateSiteClient(
  leadId: string,
  category: SiteCategory
): Promise<GenerateSiteResult> {
  try {
    const res = await fetch(`/api/leads/${leadId}/generate-site`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ category }),
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
      return {
        ok: false,
        error: typeof body?.error === "string" ? body.error : "שגיאה ביצירת האתר",
        partialRepoUrl: typeof body?.partialRepoUrl === "string" ? body.partialRepoUrl : undefined,
      };
    }
    return { ok: true, repoUrl: body?.repoUrl };
  } catch {
    return { ok: false, error: "שגיאה ביצירת האתר" };
  }
}
