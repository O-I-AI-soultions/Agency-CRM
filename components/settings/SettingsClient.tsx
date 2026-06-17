"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { User, Plug, Paintbrush, Filter } from "lucide-react";
import AccountTab from "@/components/settings/AccountTab";
import IntegrationsTab from "@/components/settings/IntegrationsTab";
import AppearanceTab from "@/components/settings/AppearanceTab";
import PipelineTab from "@/components/settings/PipelineTab";
import type { PartnerSettings } from "@/lib/types";
import type { Partner } from "@/lib/auth";

type Tab = "account" | "integrations" | "appearance" | "pipeline";

const TABS: { id: Tab; label: string; icon: React.ElementType }[] = [
  { id: "account", label: "חשבון", icon: User },
  { id: "integrations", label: "חיבורים", icon: Plug },
  { id: "appearance", label: "מראה", icon: Paintbrush },
  { id: "pipeline", label: "צינור לידים", icon: Filter },
];

interface SettingsClientProps {
  partner: Partner;
  initialSettings: PartnerSettings;
  googleConfigured: boolean;
  apifyConfigured: boolean;
}

export default function SettingsClient({
  partner,
  initialSettings,
  googleConfigured,
  apifyConfigured,
}: SettingsClientProps) {
  const searchParams = useSearchParams();
  const tabParam = searchParams.get("tab") as Tab | null;
  const connected = searchParams.get("connected");
  const error = searchParams.get("error");

  const [activeTab, setActiveTab] = useState<Tab>(
    tabParam && TABS.some((t) => t.id === tabParam) ? tabParam : "account"
  );

  const [banner, setBanner] = useState<{ type: "success" | "error"; message: string } | null>(
    null
  );

  useEffect(() => {
    if (connected === "google") {
      setBanner({ type: "success", message: "חשבון Google חובר בהצלחה ✓" });
    } else if (error === "google_denied") {
      setBanner({ type: "error", message: "החיבור ל-Google בוטל" });
    } else if (error === "google_token_failed") {
      setBanner({ type: "error", message: "שגיאה בחיבור ל-Google — נסה שוב" });
    } else if (error === "google_not_configured") {
      setBanner({ type: "error", message: "Google OAuth לא מוגדר במשתני הסביבה" });
    }

    if (connected || error) {
      const timer = setTimeout(() => setBanner(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [connected, error]);

  return (
    <div className="flex flex-col gap-6">
      {banner && (
        <div
          role="alert"
          className={`rounded-lg border px-4 py-3 text-sm font-medium ${
            banner.type === "success"
              ? "border-green/30 bg-green-soft text-green"
              : "border-warn/30 bg-warn-soft text-warn"
          }`}
        >
          {banner.message}
        </div>
      )}

      <div className="flex gap-1 border-b border-border pb-0">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => setActiveTab(id)}
            className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-medium transition-colors focus:outline-none ${
              activeTab === id
                ? "border-accent text-accent"
                : "border-transparent text-muted hover:text-foreground"
            }`}
          >
            <Icon size={15} />
            {label}
          </button>
        ))}
      </div>

      <div>
        {activeTab === "account" && <AccountTab partner={partner} />}
        {activeTab === "integrations" && (
          <IntegrationsTab
            settings={initialSettings}
            googleConfigured={googleConfigured}
            apifyConfigured={apifyConfigured}
          />
        )}
        {activeTab === "appearance" && <AppearanceTab />}
        {activeTab === "pipeline" && <PipelineTab settings={initialSettings} />}
      </div>
    </div>
  );
}
