import { createScrapeHistoryRecord, countLeadTrackerRecords } from "@/lib/airtable";
import { getPartnerFromSession } from "@/lib/auth";

export async function POST(request: Request) {
  const sessionPartner = getPartnerFromSession(request);
  if (!sessionPartner) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const niche = typeof body?.niche === "string" ? body.niche.trim() : "";
    const city = typeof body?.city === "string" ? body.city.trim() : "";
    const limitRaw = body?.limit;
    const limit =
      typeof limitRaw === "number" && Number.isFinite(limitRaw)
        ? Math.min(50, Math.max(1, Math.round(limitRaw)))
        : 15;

    if (!niche || !city) {
      return Response.json({ error: "Missing niche or city" }, { status: 400 });
    }

    const apifyToken = process.env.APIFY_API_TOKEN;
    if (!apifyToken) {
      return Response.json({ error: "Missing APIFY_API_TOKEN" }, { status: 500 });
    }

    const leadCountBefore = await countLeadTrackerRecords();

    const response = await fetch(
      "https://api.apify.com/v2/acts/compass~crawler-google-places/runs",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apifyToken}`,
        },
        body: JSON.stringify({
          searchStringsArray: [`${niche} ב${city}`],
          maxCrawledPlacesPerSearch: limit,
          website: "withoutWebsite",
          // Apify's input schema uses Google's legacy locale code for
          // Hebrew ("iw"), not the standard "he".
          language: "iw",
        }),
      }
    );

    if (!response.ok) {
      const errorBody = await response.json().catch(() => null);
      const apifyMessage = errorBody?.error?.message as string | undefined;
      return Response.json(
        {
          error: apifyMessage
            ? `Failed to start Apify run: ${apifyMessage}`
            : `Failed to start Apify run (HTTP ${response.status})`,
        },
        { status: 502 }
      );
    }

    const { data } = await response.json();
    const runId = data?.id as string | undefined;

    if (!runId) {
      return Response.json({ error: "Apify run did not return an id" }, { status: 502 });
    }

    const historyRecordId = await createScrapeHistoryRecord({
      runId,
      city,
      niche,
      limit,
      triggeredBy: sessionPartner,
    });

    return Response.json({ runId, historyRecordId, leadCountBefore });
  } catch {
    return Response.json({ error: "Failed to start scrape" }, { status: 500 });
  }
}
