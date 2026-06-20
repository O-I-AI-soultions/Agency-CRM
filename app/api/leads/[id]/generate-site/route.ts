import { getLead, updateLeadFields } from "@/lib/airtable";
import { getPartnerFromSession } from "@/lib/auth";
import {
  buildClientJsContent,
  buildSiteGenerationPlan,
  createRepoFromTemplate,
  createVercelProject,
  GitHubApiError,
  putRepoFile,
  RepoNotReadyError,
  SITE_CATEGORIES,
  triggerDeployment,
  VercelApiError,
  waitForRepoReady,
  type SiteCategory,
} from "@/lib/site-generator";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const partner = getPartnerFromSession(request);
  if (!partner) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const body = await request.json().catch(() => ({}));
  const category = body?.category;

  if (
    typeof category !== "string" ||
    !(SITE_CATEGORIES as readonly string[]).includes(category)
  ) {
    return Response.json({ error: "Invalid category" }, { status: 400 });
  }

  let lead;
  try {
    lead = await getLead(id);
  } catch {
    return Response.json({ error: "Lead not found" }, { status: 404 });
  }

  const { repoName, templateRepo, shape, clientData } = buildSiteGenerationPlan(
    lead,
    category as SiteCategory
  );

  let repo: { html_url: string; full_name: string };
  try {
    repo = await createRepoFromTemplate(templateRepo, repoName);
  } catch (err) {
    if (err instanceof GitHubApiError) {
      if (err.status === 500 && err.message === "Missing GITHUB_API_TOKEN") {
        return Response.json({ error: "Missing GITHUB_API_TOKEN" }, { status: 500 });
      }
      if (err.status === 422) {
        return Response.json(
          { error: "כבר קיים ריפו בשם הזה ב-GitHub" },
          { status: 409 }
        );
      }
      if (err.rateLimited) {
        return Response.json(
          { error: "הגעת למגבלת הקריאות של GitHub, נסה שוב בעוד כמה דקות" },
          { status: 502 }
        );
      }
      return Response.json(
        { error: `GitHub API error: ${err.message}` },
        { status: 502 }
      );
    }
    return Response.json({ error: "Failed to generate site" }, { status: 500 });
  }

  try {
    await waitForRepoReady(repo.full_name);
  } catch (err) {
    if (err instanceof RepoNotReadyError) {
      return Response.json(
        {
          error: "הריפו נוצר אך עדיין לא מוכן לכתיבה, נסה שוב בעוד כמה רגעים",
          partialRepoUrl: repo.html_url,
        },
        { status: 502 }
      );
    }
    const message =
      err instanceof GitHubApiError ? `GitHub API error: ${err.message}` : "Failed to generate site";
    return Response.json({ error: message, partialRepoUrl: repo.html_url }, { status: 502 });
  }

  try {
    await putRepoFile(
      repo.full_name,
      "client.json",
      JSON.stringify(clientData, null, 2),
      "Generate client.json from lead data"
    );

    if (shape === "landing") {
      await putRepoFile(
        repo.full_name,
        "client.js",
        buildClientJsContent(clientData),
        "Generate client.js from lead data"
      );
    }
  } catch (err) {
    const message =
      err instanceof GitHubApiError ? `GitHub API error: ${err.message}` : "Failed to generate site";
    return Response.json(
      { error: message, partialRepoUrl: repo.html_url },
      { status: 502 }
    );
  }

  // Best-effort: trigger a Vercel deployment for the new repo. The repo +
  // committed data are already a complete, valid success on their own (the
  // primary operation), so a Vercel failure here degrades the response — it
  // does not fail the request or roll back the already-created GitHub repo.
  //
  // Deliberately does NOT wait for the deployment to finish: a real
  // `template-booking` build can take close to the full 180s polling budget
  // `waitForDeploymentReady` used to use, and a serverless function request
  // can be killed by the platform well before that (default Vercel function
  // timeouts are far shorter, and even a configured `maxDuration` isn't
  // guaranteed to cover a slow build on every plan). Polling synchronously
  // here risked turning the route's carefully-designed "always returns a
  // graceful response" guarantee into a raw 504 on exactly the build that
  // most needed it. Instead: trigger the deployment, return immediately with
  // its id/"deploying" status, and let the client poll
  // `GET .../deploy-status` (a single fast Vercel API call per request) —
  // see `.pipeline/changes.md` for the full reviewer finding and rationale.
  let deploymentId: string | undefined;
  let deployError: string | undefined;

  try {
    await createVercelProject(repo.full_name.split("/")[1]); // repoName, not full_name
    const deployment = await triggerDeployment(repoName); // use the same repoName from buildSiteGenerationPlan
    deploymentId = deployment.id;
  } catch (err) {
    deployError =
      err instanceof VercelApiError ? `Vercel API error: ${err.message}` : "Failed to deploy site to Vercel";
    console.error("generate-site: Vercel deploy trigger failed", err);
  }

  // Best-effort: write a note back to the lead's Airtable record. The repo
  // was already created and configured successfully — that's the
  // operation's primary success criterion — so a failure here is logged
  // and otherwise ignored, mirroring convertLeadToClient's pattern of
  // treating the Airtable side-effect as best-effort once the "real"
  // external action succeeded.
  //
  // Known limitation (v1, see .pipeline/changes.md): the live URL isn't
  // known yet at this point — the deployment was only just triggered, not
  // awaited — so the note records the repo URL only. The live URL is never
  // back-filled into Airtable once the client-side poll resolves it; a
  // partner who wants it in Airtable needs to copy it in manually from the
  // UI or the Vercel dashboard.
  const existingNotes = lead.notes ? `${lead.notes}\n\n` : "";
  const stamp = new Date().toLocaleDateString("he-IL");
  await updateLeadFields(id, {
    Notes: `${existingNotes}[${stamp}] אתר נוצר: ${repo.html_url}`,
  }).catch((err) => console.error("generate-site: failed to write note", err));

  return Response.json({
    ok: true,
    repoUrl: repo.html_url,
    repoFullName: repo.full_name,
    ...(deploymentId
      ? { deploymentId, status: "deploying" as const }
      : { deployError }),
  });
}
