import { revalidatePath } from "next/cache";
import { createRoadmapItem, listRoadmapItems, parseRoadmapFieldsInput } from "@/lib/airtable";
import { getPartnerFromSession } from "@/lib/auth";

export async function GET() {
  const items = await listRoadmapItems();
  return Response.json({ items });
}

export async function POST(request: Request) {
  const partner = getPartnerFromSession(request);
  if (!partner) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const fields = parseRoadmapFieldsInput(body);

    if ("error" in fields) {
      return Response.json({ error: fields.error }, { status: 400 });
    }

    if (!fields.title) {
      return Response.json({ error: "Title is required" }, { status: 400 });
    }

    const item = await createRoadmapItem(fields);

    revalidatePath("/tasks");

    return Response.json({ item });
  } catch {
    return Response.json({ error: "Failed to create roadmap item" }, { status: 500 });
  }
}
