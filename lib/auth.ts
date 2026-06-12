import { createHmac, timingSafeEqual } from "crypto";

export const SESSION_COOKIE_NAME = "oi_dashboard_session";

export type Partner = "איתי" | "עומרי";

export const PARTNERS: Partner[] = ["איתי", "עומרי"];

function getSecret(): string {
  const secret = process.env.AUTH_SECRET;
  if (!secret) throw new Error("Missing AUTH_SECRET env var");
  return secret;
}

export function createSessionToken(partner: Partner): string {
  const secret = getSecret();
  const payload = Buffer.from(JSON.stringify({ partner })).toString("base64url");
  const mac = createHmac("sha256", secret).update(payload).digest("hex");
  return `${payload}.${mac}`;
}

export function verifySessionToken(token: string | undefined): { partner: Partner } | null {
  if (!token) return null;
  const secret = getSecret();
  const [payload, mac] = token.split(".");
  if (!payload || !mac) return null;

  const expected = createHmac("sha256", secret).update(payload).digest("hex");
  const a = Buffer.from(mac);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;

  try {
    const data = JSON.parse(Buffer.from(payload, "base64url").toString()) as {
      partner?: string;
    };
    if (data.partner === "איתי" || data.partner === "עומרי") {
      return { partner: data.partner };
    }
    return null;
  } catch {
    return null;
  }
}

export function getPartnerFromSession(req: Request): Partner | null {
  const cookieHeader = req.headers.get("cookie") ?? "";
  const match = cookieHeader.match(new RegExp(`${SESSION_COOKIE_NAME}=([^;]+)`));
  const session = verifySessionToken(match?.[1]);
  return session?.partner ?? null;
}
