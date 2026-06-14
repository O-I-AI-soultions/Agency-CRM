import { getPartnerNote, upsertPartnerNote } from "@/lib/airtable";
import { getPartnerFromSession } from "@/lib/auth";

export async function GET(request: Request) {
  const partner = getPartnerFromSession(request);
  if (!partner) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const note = await getPartnerNote(partner);

  return Response.json({
    content: note?.content ?? "",
    updatedAt: note?.updatedAt ?? null,
  });
}

export async function PATCH(request: Request) {
  const partner = getPartnerFromSession(request);
  if (!partner) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const content = body?.content;

    if (typeof content !== "string") {
      return Response.json({ error: "Invalid content" }, { status: 400 });
    }

    const note = await upsertPartnerNote(partner, content);

    return Response.json({ ok: true, updatedAt: note.updatedAt });
  } catch {
    return Response.json({ error: "Failed to save note" }, { status: 500 });
  }
}
