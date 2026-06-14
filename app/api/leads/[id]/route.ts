import { revalidatePath } from "next/cache";
import { deleteLead, updateLeadFields, updateLeadStatus } from "@/lib/airtable";
import { KANBAN_STATUSES, type KanbanStatus } from "@/lib/types";
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
    const status = body?.status;
    const notes = body?.notes;
    const nextAction = body?.nextAction;

    const hasStatus = status !== undefined;
    const hasNotes = typeof notes === "string";
    const hasNextAction = typeof nextAction === "string";

    if (
      hasStatus &&
      (typeof status !== "string" ||
        !(KANBAN_STATUSES as readonly string[]).includes(status))
    ) {
      return Response.json({ error: "Invalid status" }, { status: 400 });
    }

    if (!hasStatus && !hasNotes && !hasNextAction) {
      return Response.json({ error: "No valid fields to update" }, { status: 400 });
    }

    if (hasStatus) {
      await updateLeadStatus(id, status as KanbanStatus);
    }

    const fieldUpdates: Record<string, unknown> = {};
    if (hasNotes) fieldUpdates["Notes"] = notes;
    if (hasNextAction) fieldUpdates["Next Action"] = nextAction;

    if (Object.keys(fieldUpdates).length > 0) {
      await updateLeadFields(id, fieldUpdates);
    }

    revalidatePath("/leads");

    return Response.json({ ok: true });
  } catch {
    return Response.json({ error: "Failed to update lead" }, { status: 500 });
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
    await deleteLead(id);
    revalidatePath("/leads");
    return Response.json({ ok: true });
  } catch {
    return Response.json({ error: "Failed to delete lead" }, { status: 500 });
  }
}
