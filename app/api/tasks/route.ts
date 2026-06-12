import { revalidatePath } from "next/cache";
import { createTask, listTasks, parseTaskFieldsInput } from "@/lib/airtable";
import { getPartnerFromSession } from "@/lib/auth";

export async function GET() {
  const tasks = await listTasks();
  return Response.json({ tasks });
}

export async function POST(request: Request) {
  const partner = getPartnerFromSession(request);
  if (!partner) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const fields = parseTaskFieldsInput(body);

    if ("error" in fields) {
      return Response.json({ error: fields.error }, { status: 400 });
    }

    if (!fields.title) {
      return Response.json({ error: "Title is required" }, { status: 400 });
    }

    const task = await createTask({ ...fields, owner: partner });

    revalidatePath("/tasks");

    return Response.json({ task });
  } catch {
    return Response.json({ error: "Failed to create task" }, { status: 500 });
  }
}
