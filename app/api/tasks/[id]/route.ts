import { revalidatePath } from "next/cache";
import { deleteTask, getTaskOwner, parseTaskFieldsInput, updateTask } from "@/lib/airtable";
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
    const owner = await getTaskOwner(id);
    if (!owner) {
      return Response.json({ error: "Task not found" }, { status: 404 });
    }
    if (owner !== partner) {
      return Response.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const fields = parseTaskFieldsInput(body);

    if ("error" in fields) {
      return Response.json({ error: fields.error }, { status: 400 });
    }

    if (Object.keys(fields).length === 0) {
      return Response.json({ error: "No valid fields to update" }, { status: 400 });
    }

    const task = await updateTask(id, fields);

    revalidatePath("/tasks");

    return Response.json({ task });
  } catch {
    return Response.json({ error: "Failed to update task" }, { status: 500 });
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
    const owner = await getTaskOwner(id);
    if (!owner) {
      return Response.json({ error: "Task not found" }, { status: 404 });
    }
    if (owner !== partner) {
      return Response.json({ error: "Forbidden" }, { status: 403 });
    }

    await deleteTask(id);

    revalidatePath("/tasks");

    return Response.json({ ok: true });
  } catch {
    return Response.json({ error: "Failed to delete task" }, { status: 500 });
  }
}
