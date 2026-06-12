import { revalidatePath } from "next/cache";
import { createTaskComment, listTaskComments } from "@/lib/airtable";
import { getPartnerFromSession } from "@/lib/auth";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const comments = await listTaskComments(id);
  return Response.json({ comments });
}

export async function POST(
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
    const comment = body?.comment;

    if (typeof comment !== "string" || !comment.trim()) {
      return Response.json({ error: "Invalid comment" }, { status: 400 });
    }

    const created = await createTaskComment({
      taskId: id,
      comment: comment.trim(),
      author: partner,
    });

    revalidatePath("/tasks");

    return Response.json({ comment: created });
  } catch {
    return Response.json({ error: "Failed to create comment" }, { status: 500 });
  }
}
