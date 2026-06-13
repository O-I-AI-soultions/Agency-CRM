import { revalidatePath } from "next/cache";
import { createRoadmapTask, parseRoadmapTaskCreateInput } from "@/lib/airtable";
import { getPartnerFromSession } from "@/lib/auth";

export async function POST(request: Request) {
  const partner = getPartnerFromSession(request);
  if (!partner) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const input = parseRoadmapTaskCreateInput(body);

    if ("error" in input) {
      return Response.json({ error: input.error }, { status: 400 });
    }

    const task = await createRoadmapTask(input);

    revalidatePath("/tasks");

    return Response.json({ task });
  } catch {
    return Response.json({ error: "Failed to create roadmap task" }, { status: 500 });
  }
}
