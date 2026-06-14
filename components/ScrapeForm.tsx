"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Search, Loader2, CheckCircle2, XCircle } from "lucide-react";

type ScrapeStatus = "idle" | "running" | "succeeded" | "failed";

export default function ScrapeForm() {
  const router = useRouter();
  const [niche, setNiche] = useState("");
  const [city, setCity] = useState("");
  const [limit, setLimit] = useState(15);
  const [status, setStatus] = useState<ScrapeStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const [leadsFound, setLeadsFound] = useState<number | null>(null);

  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, []);

  const stopPolling = () => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  };

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
        setStatus("failed");
        return;
      }

      const { runId, historyRecordId, leadCountBefore } = await startRes.json();

      pollRef.current = setInterval(async () => {
        try {
          const statusRes = await fetch(`/api/scrape/status?runId=${runId}`);
          if (!statusRes.ok) return;

          const { status: runStatus } = await statusRes.json();

          if (runStatus === "RUNNING") return;

          stopPolling();

          if (runStatus === "SUCCEEDED") {
            setTimeout(async () => {
              try {
                const leadsCount = await fetchLeadCountDiff(leadCountBefore);

                await fetch("/api/scrape/complete", {
                  method: "PATCH",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ historyRecordId, leadsFound: leadsCount }),
                });

                setLeadsFound(leadsCount);
                setStatus("succeeded");
                router.refresh();
              } catch {
                setStatus("failed");
              }
            }, 10000);
          } else {
            setStatus("failed");
            await fetch("/api/scrape/complete", {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ historyRecordId, failed: true }),
            });
            router.refresh();
          }
        } catch {
          // keep polling on transient errors
        }
      }, 5000);
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
    <div className="rounded-2xl border border-border bg-surface p-6 shadow-sm">
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
              className="rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted/70 focus:outline-none focus:ring-2 focus:ring-accent/40"
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
              className="rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted/70 focus:outline-none focus:ring-2 focus:ring-accent/40"
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
              className="rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-accent/40"
            />
          </div>

          {error && (
            <p role="alert" aria-live="assertive" className="sm:col-span-3 text-sm font-medium text-warn">
              {error}
            </p>
          )}

          <div className="sm:col-span-3">
            <button
              type="submit"
              className="inline-flex items-center gap-1.5 rounded-full bg-accent px-5 py-2.5 text-sm font-bold text-white transition-colors hover:bg-accent-strong focus:outline-none focus:ring-2 focus:ring-accent/40"
            >
              <Search size={16} /> הפעל סריקה
            </button>
          </div>
        </form>
      )}

      {status === "running" && (
        <div
          role="status"
          aria-live="polite"
          className="mt-4 flex items-center gap-1.5 rounded-xl border border-amber/30 bg-amber-soft px-4 py-3 text-sm font-semibold text-foreground"
        >
          <Loader2 size={16} className="animate-spin text-amber" /> הסריקה פועלת... (עשויה לקחת 1-3 דקות)
        </div>
      )}

      {status === "succeeded" && (
        <div
          role="status"
          aria-live="polite"
          className="mt-4 flex flex-wrap items-center gap-1.5 rounded-xl border border-accent/30 bg-accent-soft px-4 py-3 text-sm font-semibold text-accent-strong"
        >
          <CheckCircle2 size={16} /> הסריקה הושלמה — נוצרו {leadsFound ?? 0} לידים חדשים!
          <button
            type="button"
            onClick={resetForm}
            className="ms-3 rounded-full border border-accent/30 px-3 py-1.5 text-xs font-bold text-accent-strong transition-colors hover:bg-accent/10 focus:outline-none focus:ring-2 focus:ring-accent/40"
          >
            סריקה נוספת
          </button>
        </div>
      )}

      {status === "failed" && (
        <div
          role="alert"
          aria-live="assertive"
          className="mt-4 flex flex-wrap items-center gap-1.5 rounded-xl border border-warn/30 bg-warn-soft px-4 py-3 text-sm font-semibold text-warn"
        >
          <XCircle size={16} /> הסריקה נכשלה. נסה שוב.
          <button
            type="button"
            onClick={resetForm}
            className="ms-3 rounded-full border border-warn/30 px-3 py-1.5 text-xs font-bold text-warn transition-colors hover:bg-warn/10 focus:outline-none focus:ring-2 focus:ring-accent/40"
          >
            נסה שוב
          </button>
        </div>
      )}
    </div>
  );
}
