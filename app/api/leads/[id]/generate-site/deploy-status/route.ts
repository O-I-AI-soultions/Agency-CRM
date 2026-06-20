import { getPartnerFromSession } from "@/lib/auth";
import { checkDeploymentStatus, resolveLiveUrl, VercelApiError } from "@/lib/site-generator";

/**
 * `GET .../generate-site/deploy-status?deploymentId=...`
 *
 * Lightweight companion to `POST .../generate-site`: makes exactly ONE
 * Vercel API call (via `checkDeploymentStatus`) to report a deployment's
 * current state, with no internal waiting/sleeping/looping. The client
 * (`LeadDrawer.tsx`) polls this endpoint on an interval after the POST
 * returns `status: "deploying"`, instead of the old approach of the POST
 * route blocking on a long synchronous poll itself — see
 * `.pipeline/changes.md` for the platform-timeout finding that motivated
 * this split. Follows the same query-param GET convention as
 * `app/api/scrape/status/route.ts`.
 */
export async function GET(request: Request) {
  const partner = getPartnerFromSession(request);
  if (!partner) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const deploymentId = searchParams.get("deploymentId");

  if (!deploymentId) {
    return Response.json({ error: "Missing deploymentId" }, { status: 400 });
  }

  try {
    const deployment = await checkDeploymentStatus(deploymentId);

    if (deployment.readyState === "READY") {
      return Response.json({ status: "ready" as const, liveUrl: resolveLiveUrl(deployment) });
    }

    // Any other non-terminal readyState (QUEUED, BUILDING, INITIALIZING,
    // etc.) — still in progress, no liveUrl yet.
    return Response.json({ status: "building" as const });
  } catch (err) {
    const message =
      err instanceof VercelApiError ? `Vercel API error: ${err.message}` : "Failed to check deployment status";
    console.error("generate-site/deploy-status: check failed", err);
    return Response.json({ status: "error" as const, error: message });
  }
}
