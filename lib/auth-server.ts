import { cookies } from "next/headers";
import { SESSION_COOKIE_NAME, verifySessionToken, type Partner } from "@/lib/auth";

export async function getCurrentPartner(): Promise<Partner | null> {
  const token = (await cookies()).get(SESSION_COOKIE_NAME)?.value;
  return verifySessionToken(token)?.partner ?? null;
}
