"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Search, Loader2, CheckCircle2, XCircle } from "lucide-react";

type ScrapeStatus = "idle" | "running" | "succeeded" | "failed";

// Bug 3 fix: bound how long/how many times we poll the status endpoint so
// the UI never gets stuck on "הסריקה פועלת..." forever.
const POLL_INTERVAL_MS = 5000;
const MAX_CONSECUTIVE_POLL_FAILURES = 5;
const MAX_TOTAL_POLL_DURATION_MS = 5 * 60 * 1000; // 5 minutes safety timeout

export default function ScrapeForm() {
  const router = useRouter();
  const [niche, setNiche] = useState("");
  const [city, setCity] = useState("");
  const [limit, setLimit] = useState(15);
  const [status, setStatus] = useState<ScrapeStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const [leadsFound, setLeadsFound] = useState<number | null>(null);

  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const safetyTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const finalizeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isMountedRef = useRef(true);

  useEffect(() => {
    return () => {
      isMountedRef.current = false;
      if (pollRef.current) clearInterval(pollRef.current);
      if (safetyTimeoutRef.current) clearTimeout(safetyTimeoutRef.current);
      if (finalizeTimeoutRef.current) clearTimeout(finalizeTimeoutRef.current);
    };
  }, []);

  const stopPolling = () => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
    if (safetyTimeoutRef.current) {
      clearTimeout(safetyTimeoutRef.current);
      safetyTimeoutRef.current = null;
    }
    if (finalizeTimeoutRef.current) {
      clearTimeout(finalizeTimeoutRef.current);
      finalizeTimeoutRef.current = null;
    }
  };

  async function markRunFailed(historyRecordId: string, message: string) {
    stopPolling();
    setError(message);
    setStatus("failed");
    try {
      await fetch("/api/scrape/complete", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ historyRecordId, failed: true }),
      });
    } catch {
      // best-effort — the UI already reflects the failure
    }
    router.refresh();
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLeadsFound(null);

    if (!niche.trim() || !city.trim()) {
      setError("נא למלא ניישה ועיר");
      return;
    }

    setStatus("running");

    try {
      const startRes = await fetch("/api/scrape/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ niche, city, limit }),
      });

      if (!startRes.ok) {
        const body = await startRes.json().catch(() => null);
        setError(body?.error ?? "הסריקה נכשלה. נסה שוב.");
        setStatus("failed");
        return;
      }

      const { runId, historyRecordId, leadCountBefore } = await startRes.json();

      let consecutiveFailures = 0;

      // Top-level safety timeout: regardless of poll outcomes, stop polling
      // and mark the run as failed after MAX_TOTAL_POLL_DURATION_MS so the
      // UI never gets stuck indefinitely.
      safetyTimeoutRef.current = setTimeout(() => {
        markRunFailed(
          historyRecordId,
          "הסריקה לוקחת יותר זמן מהצפוי. ייתכן שהסריקה עדיין רצה ברקע ב-Apify."
        );
      }, MAX_TOTAL_POLL_DURATION_MS);

      pollRef.current = setInterval(async () => {
        try {
          const statusRes = await fetch(`/api/scrape/status?runId=${runId}`);
          if (!statusRes.ok) {
            consecutiveFailures += 1;
            if (consecutiveFailures >= MAX_CONSECUTIVE_POLL_FAILURES) {
              await markRunFailed(
                historyRecordId,
                "לא ניתן היה לבדוק את סטטוס הסריקה. ייתכן שהסריקה עדיין רצה ברקע ב-Apify."
              );
            }
            return;
          }

          consecutiveFailures = 0;

          const { status: runStatus } = await statusRes.json();

          if (runStatus === "RUNNING") return;

          stopPolling();

          if (runStatus === "SUCCEEDED") {
            finalizeTimeoutRef.current = setTimeout(async () => {
              finalizeTimeoutRef.current = null;
              try {
                const leadsCount = await fetchLeadCountDiff(leadCountBefore);

                await fetch("/api/scrape/complete", {
                  method: "PATCH",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ historyRecordId, leadsFound: leadsCount }),
                });

                if (!isMountedRef.current) return;
                setLeadsFound(leadsCount);
                setStatus("succeeded");
                router.refresh();
              } catch {
                if (!isMountedRef.current) return;
                await markRunFailed(historyRecordId, "הסריקה נכשלה. נסה שוב.");
              }
            }, 10000);
          } else {
            setError("הסריקה נכשלה. נסה שוב.");
            setStatus("failed");
            await fetch("/api/scrape/complete", {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ historyRecordId, failed: true }),
            });
            router.refresh();
          }
        } catch {
          consecutiveFailures += 1;
          if (consecutiveFailures >= MAX_CONSECUTIVE_POLL_FAILURES) {
            await markRunFailed(
              historyRecordId,
              "לא ניתן היה לבדוק את סטטוס הסריקה. ייתכן שהסריקה עדיין רצה ברקע ב-Apify."
            );
          }
        }
      }, POLL_INTERVAL_MS);
    } catch {
      setStatus("failed");
    }
  }

  async function fetchLeadCountDiff(leadCountBefore: number): Promise<number> {
    const res = await fetch("/api/scrape/lead-count");
    if (!res.ok) return 0;
    const { count } = await res.json();
    return Math.max(0, count - leadCountBefore);
  }

  function resetForm() {
    setStatus("idle");
    setError(null);
    setLeadsFound(null);
  }

  return (
    <div className="panel p-6">
      <h2 className="text-lg font-bold text-foreground">סריקה חדשה</h2>
      <p className="mt-1 text-sm text-muted">
        חיפוש עסקים ללא אתר באמצעות Apify, ויצירת לידים חדשים ב-Airtable
      </p>

      {status === "idle" && (
        <form onSubmit={handleSubmit} className="mt-4 grid gap-4 sm:grid-cols-3">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="niche" className="text-sm font-semibold text-foreground">
              ניישה (קטגוריה)
            </label>
            <input
              id="niche"
              type="text"
              value={niche}
              onChange={(e) => setNiche(e.target.value)}
              placeholder="לדוגמה: מספרות, מסעדות, קליניקות"
              className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted/70 focus:outline-none focus:ring-2 focus:ring-accent/40"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="city" className="text-sm font-semibold text-foreground">
              עיר
            </label>
            <input
              id="city"
              type="text"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              placeholder="לדוגמה: תל אביב, כפר סבא"
              className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted/70 focus:outline-none focus:ring-2 focus:ring-accent/40"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="limit" className="text-sm font-semibold text-foreground">
              מספר תוצאות
            </label>
            <input
              id="limit"
              type="number"
              min={1}
              max={50}
              value={limit}
              onChange={(e) => setLimit(Number(e.target.value))}
              className="rounded-lg border border-border bg-background px-3 py-2 text-sm font-mono text-foreground focus:outline-none focus:ring-2 focus:ring-accent/40"
            />
          </div>

          {error && (
            <p role="alert" aria-live="assertive" className="sm:col-span-3 rounded-lg border border-warn/30 bg-warn-soft px-3 py-2 text-sm font-medium text-warn">
              {error}
            </p>
          )}

          <div className="sm:col-span-3">
            <button type="submit" className="btn-primary">
              <Search size={16} /> הפעל סריקה
            </button>
          </div>
        </form>
      )}

      {status === "running" && (
        <div
          role="status"
          aria-live="polite"
          className="mt-4 flex items-center gap-1.5 rounded-lg border border-amber/30 bg-amber-soft px-4 py-3 text-sm font-semibold text-foreground"
        >
          <Loader2 size={16} className="animate-spin text-amber" /> הסריקה פועלת... (עשויה לקחת 1-3 דקות)
        </div>
      )}

      {status === "succeeded" && (
        <div
          role="status"
          aria-live="polite"
          className="mt-4 flex flex-wrap items-center gap-1.5 rounded-lg border border-accent/30 bg-accent-soft px-4 py-3 text-sm font-semibold text-accent-strong"
        >
          <CheckCircle2 size={16} /> הסריקה הושלמה — נוצרו <span className="font-mono">{leadsFound ?? 0}</span> לידים חדשים!
          <button
            type="button"
            onClick={resetForm}
            className="btn-outline ms-3 text-xs"
          >
            סריקה נוספת
          </button>
        </div>
      )}

      {status === "failed" && (
        <div
          role="alert"
          aria-live="assertive"
          className="mt-4 flex flex-wrap items-center gap-1.5 rounded-lg border border-warn/30 bg-warn-soft px-4 py-3 text-sm font-semibold text-warn"
        >
          <XCircle size={16} /> {error ?? "הסריקה נכשלה. נסה שוב."}
          <button
            type="button"
            onClick={resetForm}
            className="btn-danger ms-3 text-xs"
          >
            נסה שוב
          </button>
        </div>
      )}
    </div>
  );
}
