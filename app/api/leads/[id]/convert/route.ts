import { revalidatePath } from "next/cache";
import { convertLeadToClient } from "@/lib/airtable";
import { getPartnerFromSession } from "@/lib/auth";

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
    const businessName = body?.businessName;
    const setupFee = body?.setupFee;
    const monthlyRetainer = body?.monthlyRetainer;

    if (typeof businessName !== "string" || businessName.trim() === "") {
      return Response.json({ error: "Missing businessName" }, { status: 400 });
    }

    const result = await convertLeadToClient(id, {
      businessName,
      setupFee: typeof setupFee === "number" ? setupFee : 0,
      monthlyRetainer: typeof monthlyRetainer === "number" ? monthlyRetainer : 0,
    });

    revalidatePath("/leads");
    revalidatePath("/clients");

    if (!result.leadStatusUpdated) {
      return Response.json(
        {
          error: "Failed to update lead status in Airtable",
          clientCreated: result.clientCreated,
        },
        { status: 502 }
      );
    }

    return Response.json({ ok: true, clientCreated: true });
  } catch {
    return Response.json(
      { error: "Failed to convert lead", clientCreated: false },
      { status: 500 }
    );
  }
}
