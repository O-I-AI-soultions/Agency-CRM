import { getPartnerFromSession } from "@/lib/auth";
import { NextResponse } from "next/server";

const SCOPES = [
  "https://www.googleapis.com/auth/calendar",
  "https://www.googleapis.com/auth/gmail.send",
  "https://www.googleapis.com/auth/drive.file",
  "https://www.googleapis.com/auth/userinfo.email",
  "https://www.googleapis.com/auth/userinfo.profile",
].join(" ");

export async function GET(request: Request) {
  const partner = getPartnerFromSession(request);
  if (!partner) return NextResponse.redirect(new URL("/login", request.url));

  const clientId = process.env.GOOGLE_CLIENT_ID;
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? new URL(request.url).origin;

  if (!clientId) {
    return NextResponse.redirect(
      new URL("/settings?tab=integrations&error=google_not_configured", request.url)
    );
  }

  const redirectUri = `${baseUrl}/api/auth/google/callback`;
  const state = Buffer.from(JSON.stringify({ partner })).toString("base64url");

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: SCOPES,
    access_type: "offline",
    prompt: "consent",
    state,
  });

  return NextResponse.redirect(
    `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`
  );
}
