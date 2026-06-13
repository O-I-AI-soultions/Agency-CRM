import { revalidatePath } from "next/cache";
import { deleteRoadmapItem, parseRoadmapFieldsInput, updateRoadmapItem } from "@/lib/airtable";
import { getPartnerFromSession } from "@/lib/auth";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const partner = getPartnerFromSession(request);
  if (!partner) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  try {
    const body = await request.json();
    const fields = parseRoadmapFieldsInput(body);

    if ("error" in fields) {
      return Response.json({ error: fields.error }, { status: 400 });
    }

    if (Object.keys(fields).length === 0) {
      return Response.json({ error: "No valid fields to update" }, { status: 400 });
    }

    const item = await updateRoadmapItem(id, fields);

    revalidatePath("/tasks");

    return Response.json({ item });
  } catch {
    return Response.json({ error: "Failed to update roadmap item" }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const partner = getPartnerFromSession(request);
  if (!partner) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  try {
    await deleteRoadmapItem(id);

    revalidatePath("/tasks");

    return Response.json({ ok: true });
  } catch {
    return Response.json({ error: "Failed to delete roadmap item" }, { status: 500 });
  }
}
