"use client";

import { useState } from "react";
import IntegrationCard from "@/components/settings/IntegrationCard";
import type { PartnerSettings } from "@/lib/types";

interface IntegrationsTabProps {
  settings: PartnerSettings;
  googleConfigured: boolean;
  apifyConfigured: boolean;
}

export default function IntegrationsTab({ settings, googleConfigured, apifyConfigured }: IntegrationsTabProps) {
  const [makeWebhookUrl, setMakeWebhookUrl] = useState(settings.makeWebhookUrl ?? "");
  const [makeApiKey, setMakeApiKey] = useState(settings.makeApiKey ?? "");
  const [makeSaving, setMakeSaving] = useState(false);
  const [makeSaved, setMakeSaved] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  async function handleGoogleConnect() {
    setGoogleLoading(true);
    window.location.href = "/api/auth/google";
  }

  async function handleGoogleDisconnect() {
    setGoogleLoading(true);
    await fetch("/api/settings/integrations", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ googleConnected: false }),
    });
    window.location.reload();
  }

  async function handleMakeSave() {
    setMakeSaving(true);
    setMakeSaved(false);
    await fetch("/api/settings/integrations", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ makeWebhookUrl, makeApiKey }),
    });
    setMakeSaving(false);
    setMakeSaved(true);
    setTimeout(() => setMakeSaved(false), 3000);
  }

  return (
    <div className="flex flex-col gap-4">
      <IntegrationCard
        icon="🗓"
        name="Google (Calendar, Gmail, Drive)"
        description="יצירת אירועים ביומן, שליחת מיילים ושמירת קבצים — כל שלושת השירותים בחיבור אחד."
        connected={settings.googleConnected}
        connectedLabel={settings.googleEmail ? `מחובר כ: ${settings.googleEmail}` : undefined}
        scopes={
          settings.googleConnected ? ["יומן", "Gmail", "Drive"] : undefined
        }
        onConnect={handleGoogleConnect}
        onDisconnect={handleGoogleDisconnect}
        connectLabel="חיבור Google"
        loading={googleLoading}
        disabled={!googleConfigured}
        disabledReason={
          !googleConfigured
            ? "נדרש להגדיר GOOGLE_CLIENT_ID ו-GOOGLE_CLIENT_SECRET במשתני הסביבה"
            : undefined
        }
      />

      <IntegrationCard
        icon="💬"
        name="WhatsApp"
        description="לחיצה על מספר טלפון של ליד תפתח שיחת WhatsApp Web ישירות."
        connected
        connectedLabel="פועל אוטומטית — לא נדרש חיבור"
        deepLink="https://web.whatsapp.com"
      />

      <div className="panel flex flex-col gap-4 p-5">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-border bg-surface-2 text-2xl">
            ⚙️
          </div>
          <div>
            <p className="font-semibold text-foreground">Make.com</p>
            <p className="text-sm text-muted">
              אוטומציות ה-webhook שמעבירות לידים מ-Apify לאירטייבל.
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-muted">Webhook URL</label>
            <input
              type="url"
              value={makeWebhookUrl}
              onChange={(e) => { setMakeWebhookUrl(e.target.value); setMakeSaved(false); }}
              placeholder="https://hook.eu2.make.com/..."
              dir="ltr"
              className="w-full rounded-lg border border-border bg-background px-3 py-2 font-mono text-sm text-foreground transition focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-muted">API Key</label>
            <input
              type="password"
              value={makeApiKey}
              onChange={(e) => { setMakeApiKey(e.target.value); setMakeSaved(false); }}
              placeholder="••••••••••••"
              dir="ltr"
              className="w-full rounded-lg border border-border bg-background px-3 py-2 font-mono text-sm text-foreground transition focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
            />
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleMakeSave}
              disabled={makeSaving}
              className="btn-primary px-4 py-1.5 text-sm disabled:opacity-50"
            >
              {makeSaving ? "שומר..." : "שמור"}
            </button>
            {makeSaved && (
              <span className="text-sm font-medium text-green">נשמר בהצלחה ✓</span>
            )}
          </div>
        </div>
      </div>

      <div className="panel flex items-start gap-4 p-5">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-border bg-surface-2 text-2xl">
          🕷️
        </div>
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-foreground">Apify</span>
            {apifyConfigured ? (
              <span className="flex items-center gap-1 rounded-full border border-green/30 bg-green-soft px-2 py-0.5 text-xs font-medium text-green">
                מחובר
              </span>
            ) : (
              <span className="rounded-full border border-border bg-surface-2 px-2 py-0.5 text-xs font-medium text-muted">
                לא מחובר
              </span>
            )}
          </div>
          <p className="text-sm text-muted">
            סורק Google Maps ומזהה עסקים ללא אתר. ה-token מוגדר במשתני הסביבה.
          </p>
          <p className="text-xs text-muted-2">
            להחלפת ה-token יש לעדכן APIFY_API_TOKEN במשתני הסביבה ב-Vercel.
          </p>
        </div>
      </div>
    </div>
  );
}
