import { getPartnerFromSession } from "@/lib/auth";
import { updatePartnerSettings } from "@/lib/airtable";
import { NextResponse } from "next/server";
import type { Partner } from "@/lib/auth";

export async function GET(request: Request) {
  const partner = getPartnerFromSession(request);
  if (!partner) return NextResponse.redirect(new URL("/login", request.url));

  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const error = url.searchParams.get("error");

  if (error || !code) {
    return NextResponse.redirect(
      new URL("/settings?tab=integrations&error=google_denied", request.url)
    );
  }

  const stateRaw = url.searchParams.get("state");
  let statePartner: Partner | null = null;
  try {
    const parsed = JSON.parse(Buffer.from(stateRaw ?? "", "base64url").toString()) as {
      partner?: string;
    };
    if (parsed.partner === "איתי" || parsed.partner === "עמרי") {
      statePartner = parsed.partner;
    }
  } catch {
    // ignore
  }

  if (!statePartner || statePartner !== partner) {
    return NextResponse.redirect(
      new URL("/settings?tab=integrations&error=google_invalid_state", request.url)
    );
  }

  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? new URL(request.url).origin;

  if (!clientId || !clientSecret) {
    return NextResponse.redirect(
      new URL("/settings?tab=integrations&error=google_not_configured", request.url)
    );
  }

  const redirectUri = `${baseUrl}/api/auth/google/callback`;

  try {
    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: "authorization_code",
      }),
    });

    const tokens = (await tokenRes.json()) as {
      access_token?: string;
      refresh_token?: string;
      expires_in?: number;
      error?: string;
    };

    if (!tokenRes.ok || !tokens.access_token) {
      return NextResponse.redirect(
        new URL("/settings?tab=integrations&error=google_token_failed", request.url)
      );
    }

    const userInfoRes = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    });
    const userInfo = (await userInfoRes.json()) as { email?: string };

    const expiry = tokens.expires_in
      ? new Date(Date.now() + tokens.expires_in * 1000).toISOString()
      : null;

    await updatePartnerSettings(partner, {
      googleAccessToken: tokens.access_token,
      googleRefreshToken: tokens.refresh_token ?? null,
      googleTokenExpiry: expiry,
      googleEmail: userInfo.email ?? null,
    });

    return NextResponse.redirect(
      new URL("/settings?tab=integrations&connected=google", request.url)
    );
  } catch {
    return NextResponse.redirect(
      new URL("/settings?tab=integrations&error=google_token_failed", request.url)
    );
  }
}
