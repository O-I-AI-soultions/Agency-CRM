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
  /** Present when the deploy was successfully triggered (status "deploying"); used to poll deploy-status. */
  deploymentId?: string;
  error?: string;
  partialRepoUrl?: string;
}

/**
 * Client-side helper for `POST /api/leads/[id]/generate-site`. Mirrors
 * `updateLeadStatusClient`'s try/catch + fallback-error-string shape so
 * `LeadDrawer.tsx`'s "create site" modal can call this instead of `fetch`
 * inline, for testability.
 *
 * Note: the route no longer waits for the Vercel deployment to finish — it
 * returns as soon as the deploy is triggered, with `deploymentId` set and no
 * live URL yet. Callers should follow up with `checkDeployStatusClient`
 * polling until it resolves to "ready" (or gives up).
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
    return {
      ok: true,
      repoUrl: body?.repoUrl,
      deploymentId: typeof body?.deploymentId === "string" ? body.deploymentId : undefined,
    };
  } catch {
    return { ok: false, error: "שגיאה ביצירת האתר" };
  }
}

export type DeployStatusResult =
  | { status: "building" }
  | { status: "ready"; liveUrl: string }
  | { status: "error"; error: string };

/**
 * Client-side helper for `GET /api/leads/[id]/generate-site/deploy-status`.
 * One fast request per call, no internal waiting — `LeadDrawer.tsx` calls
 * this on a polling interval after `generateSiteClient` returns a
 * `deploymentId`.
 */
export async function checkDeployStatusClient(
  leadId: string,
  deploymentId: string
): Promise<DeployStatusResult> {
  try {
    const res = await fetch(
      `/api/leads/${leadId}/generate-site/deploy-status?deploymentId=${encodeURIComponent(deploymentId)}`
    );
    const body = await res.json().catch(() => ({}));
    if (!res.ok || body?.status === "error") {
      return {
        status: "error",
        error: typeof body?.error === "string" ? body.error : "שגיאה בבדיקת סטטוס הפריסה",
      };
    }
    if (body?.status === "ready" && typeof body?.liveUrl === "string") {
      return { status: "ready", liveUrl: body.liveUrl };
    }
    return { status: "building" };
  } catch {
    return { status: "error", error: "שגיאה בבדיקת סטטוס הפריסה" };
  }
}
