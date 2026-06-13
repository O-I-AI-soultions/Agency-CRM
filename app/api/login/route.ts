import { cookies } from "next/headers";
import bcrypt from "bcryptjs";
import { createSessionToken, SESSION_COOKIE_NAME, type Partner } from "@/lib/auth";
import { getPartnerPasswordHash } from "@/lib/airtable";

export async function POST(request: Request) {
  const { partner, password } = (await request.json()) as {
    partner?: string;
    password?: string;
  };

  if (partner !== "איתי" && partner !== "עומרי") {
    return Response.json({ error: "סיסמה שגויה" }, { status: 401 });
  }

  if (!password) {
    return Response.json({ error: "סיסמה שגויה" }, { status: 401 });
  }

  const storedHash = await getPartnerPasswordHash(partner as Partner);
  let valid = false;
  if (storedHash) {
    valid = await bcrypt.compare(password, storedHash);
  } else if (partner === "עומרי" && process.env.OMRI_PASSWORD) {
    // Temporary fallback until Omri sets his own password via /settings.
    valid = password === process.env.OMRI_PASSWORD;
  }

  if (!valid) {
    return Response.json({ error: "סיסמה שגויה" }, { status: 401 });
  }

  const token = createSessionToken(partner as Partner);
  (await cookies()).set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });

  return Response.json({ ok: true });
}
