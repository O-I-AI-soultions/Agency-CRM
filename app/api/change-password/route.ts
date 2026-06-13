import bcrypt from "bcryptjs";
import { getPartnerFromSession } from "@/lib/auth";
import { getPartnerPasswordHash, setPartnerPasswordHash } from "@/lib/airtable";

export async function POST(request: Request) {
  const partner = getPartnerFromSession(request);
  if (!partner) {
    return Response.json({ error: "לא מחובר" }, { status: 401 });
  }

  const { currentPassword, newPassword } = (await request.json()) as {
    currentPassword?: string;
    newPassword?: string;
  };

  if (!currentPassword || !newPassword) {
    return Response.json({ error: "סיסמה שגויה" }, { status: 401 });
  }

  const storedHash = await getPartnerPasswordHash(partner);
  if (!storedHash || !(await bcrypt.compare(currentPassword, storedHash))) {
    return Response.json({ error: "סיסמה שגויה" }, { status: 401 });
  }

  if (newPassword.length < 8) {
    return Response.json(
      { error: "הסיסמה חייבת להכיל לפחות 8 תווים" },
      { status: 400 }
    );
  }

  const newHash = await bcrypt.hash(newPassword, 12);
  await setPartnerPasswordHash(partner, newHash);

  return Response.json({ ok: true });
}
