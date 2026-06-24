import { updateClientStatus, updateClientRenewalDate } from "@/lib/airtable";
import type { ClientStatus } from "@/lib/types";
import { revalidatePath } from "next/cache";
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
    const { status, renewalDate } = body ?? {};

    if (status === undefined && renewalDate === undefined) {
      return Response.json({ error: "No fields to update" }, { status: 400 });
    }

    if (status !== undefined) {
      if (status !== "Active" && status !== "Inactive") {
        return Response.json({ error: "Invalid status" }, { status: 400 });
      }
      await updateClientStatus(id, status as ClientStatus);
    }

    if (renewalDate !== undefined) {
      if (renewalDate !== null && typeof renewalDate !== "string") {
        return Response.json({ error: "Invalid renewalDate" }, { status: 400 });
      }
      await updateClientRenewalDate(id, renewalDate);
    }

    revalidatePath("/clients");

    return Response.json({ ok: true });
  } catch {
    return Response.json({ error: "Failed to update client" }, { status: 500 });
  }
}
