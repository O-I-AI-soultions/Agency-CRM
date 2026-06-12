import { cookies } from "next/headers";
import { createSessionToken, SESSION_COOKIE_NAME, type Partner } from "@/lib/auth";

const PARTNER_PASSWORDS: Record<Partner, string | undefined> = {
  "איתי": process.env.ITAY_PASSWORD,
  "עומרי": process.env.OMRI_PASSWORD,
};

export async function POST(request: Request) {
  const { partner, password } = (await request.json()) as {
    partner?: string;
    password?: string;
  };

  if (partner !== "איתי" && partner !== "עומרי") {
    return Response.json({ error: "סיסמה שגויה" }, { status: 401 });
  }

  const expected = PARTNER_PASSWORDS[partner];
  if (!password || !expected || password !== expected) {
    return Response.json({ error: "סיסמה שגויה" }, { status: 401 });
  }

  const token = createSessionToken(partner);
  (await cookies()).set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });

  return Response.json({ ok: true });
}
