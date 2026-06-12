import { revalidatePath } from "next/cache";
import { convertLeadToClient } from "@/lib/airtable";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    const body = await request.json();
    const businessName = body?.businessName;
    const setupFee = body?.setupFee;
    const monthlyRetainer = body?.monthlyRetainer;

    if (typeof businessName !== "string" || businessName.trim() === "") {
      return Response.json({ error: "Missing businessName" }, { status: 400 });
    }

    await convertLeadToClient(id, {
      businessName,
      setupFee: typeof setupFee === "number" ? setupFee : 0,
      monthlyRetainer: typeof monthlyRetainer === "number" ? monthlyRetainer : 0,
    });

    revalidatePath("/leads");
    revalidatePath("/clients");

    return Response.json({ ok: true });
  } catch {
    return Response.json({ error: "Failed to convert lead" }, { status: 500 });
  }
}
