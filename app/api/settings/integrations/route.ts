import { getPartnerFromSession } from "@/lib/auth";
import { getPartnerSettings, updatePartnerSettings } from "@/lib/airtable";

export async function GET(request: Request) {
  const partner = getPartnerFromSession(request);
  if (!partner) return Response.json({ error: "לא מחובר" }, { status: 401 });

  const settings = await getPartnerSettings(partner);
  return Response.json(settings);
}

export async function PATCH(request: Request) {
  const partner = getPartnerFromSession(request);
  if (!partner) return Response.json({ error: "לא מחובר" }, { status: 401 });

  const body = (await request.json()) as Record<string, unknown>;

  const allowed = ["makeWebhookUrl", "makeApiKey", "googleConnected"] as const;
  const update: Record<string, unknown> = {};

  for (const key of allowed) {
    if (key in body) update[key] = body[key];
  }

  if (body.googleConnected === false) {
    await updatePartnerSettings(partner, {
      googleAccessToken: null,
      googleRefreshToken: null,
      googleTokenExpiry: null,
      googleEmail: null,
    });
  } else {
    await updatePartnerSettings(partner, {
      makeWebhookUrl:
        "makeWebhookUrl" in body ? (body.makeWebhookUrl as string | null) : undefined,
      makeApiKey: "makeApiKey" in body ? (body.makeApiKey as string | null) : undefined,
    });
  }

  return Response.json({ ok: true });
}
