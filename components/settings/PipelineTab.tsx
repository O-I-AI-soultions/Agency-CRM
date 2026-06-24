"use client";

import { useState } from "react";
import type { PartnerSettings, ScrapeHistoryRecord } from "@/lib/types";
import { computeYieldRate } from "@/lib/types";

interface PipelineTabProps {
  settings: PartnerSettings;
  scrapeHistory: ScrapeHistoryRecord[];
}

// How many of the most recent scrape runs to average over for the rollup
// card below. `listScrapeHistory` already returns runs sorted newest-first,
// so this is simply the first N records.
const RECENT_RUNS_FOR_AVERAGE = 10;

function computeAverageYieldRate(runs: ScrapeHistoryRecord[]): number | null {
  const recent = runs.slice(0, RECENT_RUNS_FOR_AVERAGE);
  if (recent.length === 0) return null;

  const total = recent.reduce((sum, run) => sum + computeYieldRate(run.leadsFound, run.limit), 0);
  return total / recent.length;
}

export default function PipelineTab({ settings, scrapeHistory }: PipelineTabProps) {
  const averageYieldRate = computeAverageYieldRate(scrapeHistory);
  const [city, setCity] = useState(settings.scrapeDefaultCity ?? "");
  const [niche, setNiche] = useState(settings.scrapeDefaultNiche ?? "");
  const [limit, setLimit] = useState(settings.scrapeDefaultLimit ?? 50);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSave() {
    setSaving(true);
    setSaved(false);
    setError(null);
    try {
      const res = await fetch("/api/settings/pipeline", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          scrapeDefaultCity: city || null,
          scrapeDefaultNiche: niche || null,
          scrapeDefaultLimit: limit || null,
        }),
      });
      if (!res.ok) throw new Error("שגיאה בשמירה");
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch {
      setError("שגיאה בשמירה — נסה שוב");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="panel p-5">
        <h3 className="mb-4 font-semibold text-foreground">ברירות מחדל לסריקה</h3>
        <p className="mb-4 text-sm text-muted">
          ערכים אלו ימולאו מראש בטופס הסריקה בעמוד הלידים.
        </p>

        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-foreground">עיר</label>
            <input
              type="text"
              value={city}
              onChange={(e) => { setCity(e.target.value); setSaved(false); }}
              placeholder='למשל: "תל אביב"'
              className="w-full max-w-xs rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground transition focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-foreground">נישה</label>
            <input
              type="text"
              value={niche}
              onChange={(e) => { setNiche(e.target.value); setSaved(false); }}
              placeholder='למשל: "מסעדות", "ספרות", "חנויות"'
              className="w-full max-w-xs rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground transition focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-foreground">מספר תוצאות</label>
            <input
              type="number"
              value={limit}
              onChange={(e) => { setLimit(parseInt(e.target.value, 10) || 0); setSaved(false); }}
              min={1}
              max={500}
              className="w-full max-w-xs rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground transition focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
            />
            <p className="text-xs text-muted">מקסימום 500 תוצאות לסריקה אחת.</p>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="btn-primary px-4 py-2 text-sm disabled:opacity-50"
            >
              {saving ? "שומר..." : "שמור ברירות מחדל"}
            </button>
            {saved && (
              <span className="text-sm font-medium text-green">נשמר ✓</span>
            )}
            {error && (
              <span className="text-sm font-medium text-warn">{error}</span>
            )}
          </div>
        </div>
      </div>

      <div className="panel p-5">
        <h3 className="mb-1 font-semibold text-foreground">תפוקת סריקות</h3>
        <p className="mb-4 text-sm text-muted">
          ממוצע תפוקה ({"לידים שנמצאו חלקי מספר תוצאות מבוקש"}) על פני {RECENT_RUNS_FOR_AVERAGE} הסריקות האחרונות.
        </p>
        {averageYieldRate === null ? (
          <p className="text-sm text-muted">אין עדיין היסטוריית סריקות.</p>
        ) : (
          <p className="text-2xl font-black tabular-nums text-foreground">
            {Math.round(averageYieldRate)}%
          </p>
        )}
      </div>

      <div className="panel p-5 opacity-50">
        <h3 className="mb-1 font-semibold text-foreground">כללי עדיפות לידים</h3>
        <p className="text-sm text-muted">
          הגדרת כללים אוטומטיים להקצאת עדיפות לפי דירוג, עיר, או נישה — בקרוב.
        </p>
        <span className="mt-2 inline-block rounded-full border border-border px-2 py-0.5 text-xs text-muted">
          בקרוב
        </span>
      </div>
    </div>
  );
}
