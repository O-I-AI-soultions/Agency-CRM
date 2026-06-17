import { Suspense } from "react";
import { Settings } from "lucide-react";
import { redirect } from "next/navigation";
import { getCurrentPartner } from "@/lib/auth-server";
import { getPartnerSettings } from "@/lib/airtable";
import SettingsClient from "@/components/settings/SettingsClient";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const partner = await getCurrentPartner();
  if (!partner) {
    redirect("/login");
  }

  const settings = await getPartnerSettings(partner);
  const googleConfigured = !!(
    process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
  );
  const apifyConfigured = !!process.env.APIFY_API_TOKEN;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="flex items-center gap-2 text-3xl font-black tracking-tight text-foreground">
          <Settings size={28} /> הגדרות
        </h1>
        <p className="mt-1 text-sm text-muted">ניהול חשבון, חיבורים וברירות מחדל</p>
      </div>

      <Suspense>
        <SettingsClient
          partner={partner}
          initialSettings={settings}
          googleConfigured={googleConfigured}
          apifyConfigured={apifyConfigured}
        />
      </Suspense>
    </div>
  );
}
