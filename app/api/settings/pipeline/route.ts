import { getPartnerFromSession } from "@/lib/auth";
import { getPartnerSettings, updatePartnerSettings } from "@/lib/airtable";

export async function GET(request: Request) {
  const partner = getPartnerFromSession(request);
  if (!partner) return Response.json({ error: "לא מחובר" }, { status: 401 });

  const settings = await getPartnerSettings(partner);
  return Response.json({
    scrapeDefaultCity: settings.scrapeDefaultCity,
    scrapeDefaultNiche: settings.scrapeDefaultNiche,
    scrapeDefaultLimit: settings.scrapeDefaultLimit,
  });
}

export async function PATCH(request: Request) {
  const partner = getPartnerFromSession(request);
  if (!partner) return Response.json({ error: "לא מחובר" }, { status: 401 });

  const body = (await request.json()) as {
    scrapeDefaultCity?: string | null;
    scrapeDefaultNiche?: string | null;
    scrapeDefaultLimit?: number | null;
  };

  await updatePartnerSettings(partner, {
    scrapeDefaultCity: body.scrapeDefaultCity,
    scrapeDefaultNiche: body.scrapeDefaultNiche,
    scrapeDefaultLimit: body.scrapeDefaultLimit,
  });

  return Response.json({ ok: true });
}
